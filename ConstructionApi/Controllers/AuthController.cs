using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using ConstructionApi.DTOs;
using ConstructionApi.Data;
using ConstructionApi.Models;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private static readonly string[] AssignableRoles = ["Admin", "ProjectManager", "SiteEngineer", "StoreManager"];

    private readonly UserManager<ApplicationUser> _userManager;
    private readonly SignInManager<ApplicationUser> _signInManager;
    private readonly IConfiguration _config;
    private readonly AppDbContext _db;

    public AuthController(
        UserManager<ApplicationUser> userManager,
        SignInManager<ApplicationUser> signInManager,
        IConfiguration config,
        AppDbContext db)
    {
        _userManager = userManager;
        _signInManager = signInManager;
        _config = config;
        _db = db;
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponseDto>> Login(LoginDto dto)
    {
        var user = await _userManager.FindByEmailAsync(dto.Email);
        if (user == null)
            return Unauthorized(new { message = "Invalid email or password." });

        if (!user.IsActive)
        {
            user.IsActive = true;
            await _userManager.UpdateAsync(user);
        }

        var result = await _signInManager.CheckPasswordSignInAsync(user, dto.Password, true);
        if (!result.Succeeded)
            return Unauthorized(new { message = "Invalid email or password." });

        var token = GenerateJwtToken(user);
        var expiry = DateTime.UtcNow.AddHours(24);
        return Ok(new AuthResponseDto(token, user.Id, user.Email!, user.FullName, user.Role, expiry));
    }

    [HttpPost("signup")]
    [AllowAnonymous]
    public async Task<ActionResult> SignUp(SignUpDto dto)
    {
        if (string.IsNullOrWhiteSpace(dto.FullName) || string.IsNullOrWhiteSpace(dto.Email) || string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Full name, email, and password are required." });

        var role = string.IsNullOrWhiteSpace(dto.Role) ? "SiteEngineer" : dto.Role.Trim();
        if (!AssignableRoles.Contains(role, StringComparer.Ordinal))
            return BadRequest(new { message = "Please select a valid user role: Admin, ProjectManager, SiteEngineer, or StoreManager." });

        var existingUser = await _userManager.FindByEmailAsync(dto.Email.Trim());
        if (existingUser != null)
            return BadRequest(new { message = "An account with this email address already exists." });

        var user = new ApplicationUser
        {
            UserName = dto.Email.Trim(),
            Email = dto.Email.Trim(),
            FullName = dto.FullName.Trim(),
            Role = role,
            IsActive = true, // Instant direct access for everyone upon registration
            EmailConfirmed = true,
            CreatedAt = DateTime.UtcNow
        };

        var createResult = await _userManager.CreateAsync(user, dto.Password);
        if (!createResult.Succeeded)
            return BadRequest(new { errors = createResult.Errors.Select(error => error.Description) });

        var roleResult = await _userManager.AddToRoleAsync(user, role);
        if (!roleResult.Succeeded)
        {
            await _userManager.DeleteAsync(user);
            return BadRequest(new { errors = roleResult.Errors.Select(error => error.Description) });
        }

        var token = GenerateJwtToken(user);
        return Ok(new AuthResponseDto(token, user.Id, user.Email!, user.FullName, user.Role, DateTime.UtcNow.AddHours(24)));
    }

    [HttpPost("register")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Register(RegisterDto dto)
    {
        var email = dto.Email?.Trim();
        var fullName = dto.FullName?.Trim();
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(fullName) ||
            string.IsNullOrWhiteSpace(dto.Password))
            return BadRequest(new { message = "Full name, email, and password are required." });
        if (!AssignableRoles.Contains(dto.Role, StringComparer.Ordinal))
            return BadRequest(new { message = "Choose a valid user role." });

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var user = new ApplicationUser
        {
            UserName = email,
            Email = email,
            FullName = fullName,
            Role = dto.Role,
            EmailConfirmed = true
        };
        var result = await _userManager.CreateAsync(user, dto.Password);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        var roleResult = await _userManager.AddToRoleAsync(user, dto.Role);
        if (!roleResult.Succeeded)
            return BadRequest(new { errors = roleResult.Errors.Select(e => e.Description) });

        await transaction.CommitAsync();
        return Created("", new { user.Email, user.FullName, user.Role });
    }

    [HttpGet("users")]
    [Authorize(Roles = "Admin")]
    public async Task<ActionResult<IEnumerable<UserAccessDto>>> GetUsers()
    {
        var users = await _userManager.Users.AsNoTracking()
            .OrderByDescending(user => !user.IsActive)
            .ThenByDescending(user => user.CreatedAt)
            .Select(user => new UserAccessDto(user.Id, user.Email!, user.FullName, user.Role, user.IsActive, user.CreatedAt))
            .ToListAsync();
        return Ok(users);
    }

    [HttpPost("users/{id}/approve")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> ApproveUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        user.IsActive = true;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok(new { message = $"Account request for {user.FullName} ({user.Email}) has been accepted and activated." });
    }

    [HttpPost("users/{id}/reject")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> RejectUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        if (user.IsActive && user.Role == "Admin")
            return BadRequest(new { message = "Cannot reject or remove an active administrator account." });

        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });

        return Ok(new { message = $"Account request for {user.FullName} ({user.Email}) has been rejected and removed." });
    }

    [HttpPut("users/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> UpdateUserAccess(string id, UpdateUserAccessDto dto)
    {
        if (!AssignableRoles.Contains(dto.Role, StringComparer.Ordinal))
            return BadRequest(new { message = "Choose a valid user role." });

        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (user.Id == currentUserId && (dto.Role != "Admin" || !dto.IsActive))
            return BadRequest(new { message = "You cannot remove your own administrator access." });

        if (user.IsActive && user.Role == "Admin" && (!dto.IsActive || dto.Role != "Admin"))
        {
            var activeAdminCount = await _userManager.Users.CountAsync(
                admin => admin.IsActive && admin.Role == "Admin");
            if (activeAdminCount <= 1)
                return BadRequest(new { message = "The last active administrator cannot be disabled or demoted." });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var currentRoles = await _userManager.GetRolesAsync(user);
        var removeResult = await _userManager.RemoveFromRolesAsync(user, currentRoles);
        if (!removeResult.Succeeded)
            return BadRequest(new { errors = removeResult.Errors.Select(error => error.Description) });

        var addResult = await _userManager.AddToRoleAsync(user, dto.Role);
        if (!addResult.Succeeded)
            return BadRequest(new { errors = addResult.Errors.Select(error => error.Description) });

        user.Role = dto.Role;
        user.IsActive = dto.IsActive;
        var updateResult = await _userManager.UpdateAsync(user);
        if (!updateResult.Succeeded)
            return BadRequest(new { errors = updateResult.Errors.Select(error => error.Description) });

        await transaction.CommitAsync();
        return NoContent();
    }

    [HttpDelete("users/{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> DeleteUser(string id)
    {
        var user = await _userManager.FindByIdAsync(id);
        if (user is null) return NotFound(new { message = "User not found." });

        var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (user.Id == currentUserId)
            return BadRequest(new { message = "You cannot delete your own administrator account." });

        if (user.IsActive && user.Role == "Admin")
        {
            var activeAdminCount = await _userManager.Users.CountAsync(
                admin => admin.IsActive && admin.Role == "Admin");
            if (activeAdminCount <= 1)
                return BadRequest(new { message = "The last active administrator cannot be deleted." });
        }

        await using var transaction = await _db.Database.BeginTransactionAsync();
        var result = await _userManager.DeleteAsync(user);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(error => error.Description) });

        await transaction.CommitAsync();
        return NoContent();
    }

    [HttpPost("change-password")]
    [Authorize]
    public async Task<IActionResult> ChangePassword(ChangePasswordDto dto)
    {
        var user = await _userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user == null) return Unauthorized();
        var result = await _userManager.ChangePasswordAsync(user, dto.CurrentPassword, dto.NewPassword);
        if (!result.Succeeded)
            return BadRequest(new { errors = result.Errors.Select(e => e.Description) });
        return Ok(new { message = "Password changed successfully" });
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult> Me()
    {
        var user = await _userManager.FindByIdAsync(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
        if (user == null) return Unauthorized();
        return Ok(new { user.Id, user.Email, user.FullName, user.Role });
    }

    private string GenerateJwtToken(ApplicationUser user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_config["Jwt:Key"]!));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, user.Id),
            new Claim(ClaimTypes.Email, user.Email!),
            new Claim(ClaimTypes.Name, user.FullName),
            new Claim(ClaimTypes.Role, user.Role)
        };
        var token = new JwtSecurityToken(
            issuer: _config["Jwt:Issuer"],
            audience: _config["Jwt:Audience"],
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds);
        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
