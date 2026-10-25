using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    public DashboardController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get()
    {
        var totalProjects = await _db.Projects.CountAsync();
        var activeProjects = await _db.Projects.CountAsync(p => p.Status == "InProgress");
        var completedProjects = await _db.Projects.CountAsync(p => p.Status == "Completed");
        var avgCompletion = totalProjects > 0 ? (decimal)await _db.Projects.AverageAsync(p => (double)p.CompletionPercentage) : 0;
        var totalEstimated = await _db.Projects.SumAsync(p => p.EstimatedBudget);
        var totalActual = await _db.Projects.SumAsync(p => p.ActualCost);
        var lowStockMaterials = await _db.Materials.CountAsync(m => m.IsActive && m.CurrentStock <= m.MinimumStockThreshold);
        var availableEquipment = await _db.Equipment.CountAsync(e => e.IsActive && e.Availability == "Available");

        var recentProjects = await _db.Projects
            .OrderByDescending(p => p.CreatedAt).Take(5)
            .Select(p => new ProjectSummaryDto(p.Id, p.Name, p.Status, p.CompletionPercentage,
                p.EstimatedBudget, p.ActualCost, p.PlannedCompletionDate))
            .ToListAsync();

        var lowStockAlerts = await _db.Materials
            .Where(m => m.IsActive && m.CurrentStock <= m.MinimumStockThreshold)
            .Select(m => new MaterialAlertDto(m.Id, m.Name, m.Category, m.CurrentStock, m.MinimumStockThreshold, m.Unit))
            .ToListAsync();

        var maintenanceAlerts = await _db.Equipment
            .Where(e => e.IsActive && e.NextMaintenanceDate != null && e.NextMaintenanceDate <= DateTime.UtcNow.AddDays(30))
            .Select(e => new EquipmentAlertDto(e.Id, e.Name, e.EquipmentCode, e.NextMaintenanceDate))
            .ToListAsync();

        // Monthly expenses for last 6 months
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var monthlyExpenses = await _db.Expenses
            .Where(e => e.ExpenseDate >= sixMonthsAgo)
            .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
            .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Total = g.Sum(e => e.Amount) })
            .OrderBy(g => g.Year).ThenBy(g => g.Month)
            .ToListAsync();

        var monthlyExpenseDtos = monthlyExpenses
            .Select(g => new MonthlyExpenseDto($"{g.Year}-{g.Month:D2}", g.Total))
            .ToList();

        return Ok(new DashboardDto(
            totalProjects, activeProjects, completedProjects, Math.Round(avgCompletion, 1),
            totalEstimated, totalActual, totalEstimated - totalActual,
            lowStockMaterials, availableEquipment,
            recentProjects, lowStockAlerts, maintenanceAlerts, monthlyExpenseDtos));
    }
}
