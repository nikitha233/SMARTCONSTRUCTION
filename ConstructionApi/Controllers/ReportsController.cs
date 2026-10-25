using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/reports")]
[Authorize]
public class ReportsController : ControllerBase
{
    private readonly AppDbContext _db;
    public ReportsController(AppDbContext db) => _db = db;

    [HttpGet("project-summary")]
    public async Task<ActionResult> ProjectSummary([FromQuery] int? projectId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var query = _db.Projects.AsNoTracking().AsQueryable();
        if (projectId.HasValue) query = query.Where(p => p.Id == projectId.Value);

        var report = await query.Select(p => new
        {
            p.Id, p.Name, p.ProjectCode, p.ClientName, p.Status, p.CompletionPercentage,
            p.EstimatedBudget, p.ActualCost, RemainingBudget = p.EstimatedBudget - p.ActualCost,
            BudgetUtilization = p.EstimatedBudget > 0 ? Math.Round(p.ActualCost / p.EstimatedBudget * 100, 1) : 0,
            p.StartDate, p.PlannedCompletionDate, p.ActualCompletionDate,
            StageCount = p.ConstructionStages.Count(),
            CompletedStages = p.ConstructionStages.Count(s => s.Status == "Completed"),
            TotalExpenses = p.Expenses.Sum(e => (decimal?)e.Amount) ?? 0m
        }).ToListAsync();
        return Ok(report);
    }

    [HttpGet("inventory")]
    public async Task<ActionResult> InventoryReport()
    {
        var report = await _db.Materials.AsNoTracking().Where(m => m.IsActive).Select(m => new
        {
            m.Id, m.Name, m.Category, m.Unit, m.CurrentStock, m.MinimumStockThreshold,
            m.UnitCost, TotalValue = m.CurrentStock * m.UnitCost,
            StockStatus = m.CurrentStock <= m.MinimumStockThreshold ? "Low" : "Adequate",
            m.Supplier, m.StorageLocation
        }).ToListAsync();
        return Ok(report);
    }

    [HttpGet("expenses")]
    public async Task<ActionResult> ExpenseReport(
        [FromQuery] int? projectId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var query = _db.Expenses.AsNoTracking().AsQueryable();
        if (projectId.HasValue) query = query.Where(e => e.ProjectId == projectId.Value);
        if (fromDate.HasValue) query = query.Where(e => e.ExpenseDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(e => e.ExpenseDate <= toDate.Value);

        var expenseDtos = await query.OrderByDescending(e => e.ExpenseDate).Select(e => new
        {
            e.Id,
            e.ProjectId,
            ProjectName = e.Project != null ? e.Project.Name : "",
            e.Category,
            e.Description,
            e.Amount,
            e.ExpenseDate,
            e.PaymentMethod,
            e.ReferenceNumber,
            e.RecordedBy,
            e.CreatedAt
        }).ToListAsync();

        var byCategory = await query.GroupBy(e => e.Category)
            .Select(g => new { Category = g.Key, Total = g.Sum(e => e.Amount), Count = g.Count() })
            .ToListAsync();
        var total = byCategory.Sum(g => g.Total);

        return Ok(new { expenses = expenseDtos, total, byCategory });
    }

    [HttpGet("attendance")]
    public async Task<ActionResult> AttendanceReport(
        [FromQuery] int? workerId, [FromQuery] int? projectId,
        [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var query = _db.WorkerAttendances.AsNoTracking().AsQueryable();
        if (workerId.HasValue) query = query.Where(a => a.WorkerId == workerId.Value);
        if (projectId.HasValue) query = query.Where(a => a.ProjectId == projectId.Value);
        if (fromDate.HasValue) query = query.Where(a => a.AttendanceDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(a => a.AttendanceDate <= toDate.Value);

        var recordDtos = await query.OrderByDescending(a => a.AttendanceDate).Select(a => new
        {
            a.Id,
            a.WorkerId,
            WorkerName = a.Worker != null ? a.Worker.FullName : "",
            a.ProjectId,
            ProjectName = a.Project != null ? a.Project.Name : "",
            a.AttendanceDate,
            a.Status,
            a.WageForDay,
            a.Notes
        }).ToListAsync();

        var summary = await query.GroupBy(a => new { a.WorkerId, a.Worker.FullName })
            .Select(g => new
            {
                WorkerId = g.Key.WorkerId,
                WorkerName = g.Key.FullName,
                TotalDays = g.Count(),
                PresentDays = g.Count(a => a.Status == "Present"),
                AbsentDays = g.Count(a => a.Status == "Absent"),
                HalfDays = g.Count(a => a.Status == "HalfDay"),
                TotalWage = g.Sum(a => a.WageForDay)
            }).ToListAsync();

        return Ok(new { records = recordDtos, summary });
    }

    [HttpGet("equipment-utilization")]
    public async Task<ActionResult> EquipmentUtilization()
    {
        var report = await _db.Equipment.AsNoTracking()
            .Where(e => e.IsActive)
            .Select(e => new
            {
            e.Id, e.Name, e.EquipmentCode, e.Category, e.Availability,
            TotalAssignments = e.EquipmentAssignments.Count(),
            ActiveAssignments = e.EquipmentAssignments.Count(a => a.IsActive),
            e.NextMaintenanceDate,
            MaintenanceDue = e.NextMaintenanceDate.HasValue && e.NextMaintenanceDate.Value <= DateTime.UtcNow.AddDays(30)
            }).ToListAsync();
        return Ok(report);
    }
}
