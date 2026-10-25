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
[Authorize]
public class ExpensesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ExpensesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ExpenseDto>>> GetAll(
        [FromQuery] int? projectId, [FromQuery] string? category,
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var query = _db.Expenses.Include(e => e.Project).AsQueryable();
        if (projectId.HasValue) query = query.Where(e => e.ProjectId == projectId.Value);
        if (!string.IsNullOrEmpty(category)) query = query.Where(e => e.Category == category);
        if (fromDate.HasValue) query = query.Where(e => e.ExpenseDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(e => e.ExpenseDate <= toDate.Value);

        var items = await query.OrderByDescending(e => e.ExpenseDate)
            .Select(e => new ExpenseDto(e.Id, e.ProjectId, e.Project.Name, e.Category, e.Description,
                e.Amount, e.ExpenseDate, e.PaymentMethod, e.ReferenceNumber, e.RecordedBy, e.CreatedAt))
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ExpenseDto>> GetById(int id)
    {
        var e = await _db.Expenses.Include(x => x.Project).FirstOrDefaultAsync(x => x.Id == id);
        if (e == null) return NotFound();
        return Ok(new ExpenseDto(e.Id, e.ProjectId, e.Project.Name, e.Category, e.Description,
            e.Amount, e.ExpenseDate, e.PaymentMethod, e.ReferenceNumber, e.RecordedBy, e.CreatedAt));
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
            project.ActualCost = await _db.Expenses.Where(e => e.ProjectId == projectId).SumAsync(e => e.Amount);
            project.UpdatedAt = DateTime.UtcNow;
            await _db.SaveChangesAsync();
        }
        return NoContent();
    }
}
