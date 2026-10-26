using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;
using ConstructionApi.Models;
using System.Security.Claims;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/expenses")]
[Authorize(Roles = "Admin,ProjectManager,SiteEngineer")]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExpensesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<ExpenseDto>>> GetAll(
        [FromQuery] int? projectId, [FromQuery] string? category,
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate,
        [FromQuery] string? search, [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null, [FromQuery] string? sortDirection = null)
    {
        var query = _db.Expenses.AsNoTracking().AsQueryable();
        if (projectId.HasValue) query = query.Where(e => e.ProjectId == projectId.Value);
        if (!string.IsNullOrEmpty(category)) query = query.Where(e => e.Category == category);
        if (fromDate.HasValue) query = query.Where(e => e.ExpenseDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(e => e.ExpenseDate <= toDate.Value);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(e => e.Description.ToLower().Contains(s) || e.Category.ToLower().Contains(s) ||
                e.ReferenceNumber.ToLower().Contains(s) || (e.Project != null && e.Project.Name.ToLower().Contains(s)));
        }

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await query.CountAsync();
        page = Math.Min(page, Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)));
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var ordered = (sortBy?.ToLowerInvariant()) switch
        {
            "amount" => descending ? query.OrderByDescending(e => e.Amount) : query.OrderBy(e => e.Amount),
            "category" => descending ? query.OrderByDescending(e => e.Category) : query.OrderBy(e => e.Category),
            "project" => descending ? query.OrderByDescending(e => e.Project!.Name) : query.OrderBy(e => e.Project!.Name),
            _ => query.OrderByDescending(e => e.ExpenseDate)
        };
        var items = await ordered.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(e => new ExpenseDto(e.Id, e.ProjectId, e.Project != null ? e.Project.Name : "", e.Category, e.Description,
                e.Amount, e.ExpenseDate, e.PaymentMethod, e.ReferenceNumber, e.RecordedBy, e.CreatedAt))
            .ToListAsync();
        return Ok(new PagedResult<ExpenseDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExpenseDto>> GetById(int id)
    {
        var e = await _db.Expenses.AsNoTracking()
            .Where(x => x.Id == id)
            .Select(x => new ExpenseDto(x.Id, x.ProjectId, x.Project != null ? x.Project.Name : "", x.Category,
                x.Description, x.Amount, x.ExpenseDate, x.PaymentMethod, x.ReferenceNumber, x.RecordedBy, x.CreatedAt))
            .FirstOrDefaultAsync();
        if (e == null) return NotFound();
        return Ok(e);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager,SiteEngineer")]
    public async Task<IActionResult> Create(CreateExpenseDto dto)
    {
        var userName = User.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
        var expense = new Expense
        {
            ProjectId = dto.ProjectId, Category = dto.Category, Description = dto.Description,
            Amount = dto.Amount, ExpenseDate = dto.ExpenseDate, PaymentMethod = dto.PaymentMethod,
            ReferenceNumber = dto.ReferenceNumber, RecordedBy = userName
        };
        _db.Expenses.Add(expense);

        // Update project actual cost
        var project = await _db.Projects.FindAsync(dto.ProjectId);
        if (project != null)
        {
            project.ActualCost = await _db.Expenses
                .AsNoTracking()
                .Where(e => e.ProjectId == dto.ProjectId)
                .SumAsync(e => e.Amount) + dto.Amount;
            project.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return Created("", new { expense.Id });
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> Update(int id, UpdateExpenseDto dto)
    {
        var expense = await _db.Expenses.FindAsync(id);
        if (expense == null) return NotFound();
        expense.Category = dto.Category; expense.Description = dto.Description;
        expense.Amount = dto.Amount; expense.ExpenseDate = dto.ExpenseDate;
        expense.PaymentMethod = dto.PaymentMethod; expense.ReferenceNumber = dto.ReferenceNumber;
        expense.UpdatedAt = DateTime.UtcNow;

        // Recalculate project actual cost
        var project = await _db.Projects.FindAsync(expense.ProjectId);
        if (project != null)
        {
            await _db.SaveChangesAsync(); // save expense first
            project.ActualCost = await _db.Expenses
                .AsNoTracking()
                .Where(e => e.ProjectId == expense.ProjectId)
                .SumAsync(e => e.Amount);
            project.UpdatedAt = DateTime.UtcNow;
        }
        await _db.SaveChangesAsync();
        return Ok(new { message = "Expense updated" });
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var expense = await _db.Expenses.FindAsync(id);
        if (expense == null) return NotFound();
        var projectId = expense.ProjectId;
        _db.Expenses.Remove(expense);
        await _db.SaveChangesAsync();

        // Recalculate project actual cost
        var project = await _db.Projects.FindAsync(projectId);
        if (project != null)
        {
            project.ActualCost = await _db.Expenses.AsNoTracking().Where(e => e.ProjectId == projectId).SumAsync(e => e.Amount);
            project.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }
}
