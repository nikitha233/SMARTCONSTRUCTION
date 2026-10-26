using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ConstructionApi.Data;
using ConstructionApi.DTOs;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/dashboard")]
[Authorize(Roles = "Admin,ProjectManager")]
public class DashboardController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly IMemoryCache _cache;

    public DashboardController(AppDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    [HttpGet]
    public async Task<ActionResult<DashboardDto>> Get()
    {
        if (_cache.TryGetValue(AppDbContext.DashboardCacheKey, out DashboardDto? cached) && cached is not null)
            return Ok(cached);

        var projectSummary = await _db.Projects.AsNoTracking()
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Active = g.Count(p => p.Status == "InProgress"),
                Completed = g.Count(p => p.Status == "Completed"),
                AverageCompletion = g.Average(p => (double)p.CompletionPercentage),
                Estimated = g.Sum(p => p.EstimatedBudget),
                Actual = g.Sum(p => p.ActualCost)
            })
            .SingleOrDefaultAsync();

        var totalProjects = projectSummary?.Total ?? 0;
        var activeProjects = projectSummary?.Active ?? 0;
        var completedProjects = projectSummary?.Completed ?? 0;
        var avgCompletion = (decimal)(projectSummary?.AverageCompletion ?? 0);
        var totalEstimated = projectSummary?.Estimated ?? 0;
        var totalActual = projectSummary?.Actual ?? 0;

        var lowStockMaterials = await _db.Materials.AsNoTracking()
            .CountAsync(m => m.IsActive && m.CurrentStock <= m.MinimumStockThreshold);
        var availableEquipment = await _db.Equipment.AsNoTracking()
            .CountAsync(e => e.IsActive && e.Availability == "Available");

        var recentProjects = await _db.Projects.AsNoTracking()
            .OrderByDescending(p => p.CreatedAt).Take(5)
            .Select(p => new ProjectSummaryDto(p.Id, p.Name, p.Status, p.CompletionPercentage,
                p.EstimatedBudget, p.ActualCost, p.PlannedCompletionDate))
            .ToListAsync();

        var lowStockAlerts = await _db.Materials.AsNoTracking()
            .Where(m => m.IsActive && m.CurrentStock <= m.MinimumStockThreshold)
            .Select(m => new MaterialAlertDto(m.Id, m.Name, m.Category, m.CurrentStock, m.MinimumStockThreshold, m.Unit))
            .ToListAsync();

        var maintenanceAlerts = await _db.Equipment.AsNoTracking()
            .Where(e => e.IsActive && e.NextMaintenanceDate != null && e.NextMaintenanceDate <= DateTime.UtcNow.AddDays(30))
            .Select(e => new EquipmentAlertDto(e.Id, e.Name, e.EquipmentCode, e.NextMaintenanceDate))
            .ToListAsync();

        // Monthly expenses for last 6 months
        var sixMonthsAgo = DateTime.UtcNow.AddMonths(-6);
        var monthlyExpenses = await _db.Expenses.AsNoTracking()
            .Where(e => e.ExpenseDate >= sixMonthsAgo)
            .GroupBy(e => new { e.ExpenseDate.Year, e.ExpenseDate.Month })
            .Select(g => new { Year = g.Key.Year, Month = g.Key.Month, Total = g.Sum(e => e.Amount) })
            .OrderBy(g => g.Year).ThenBy(g => g.Month)
            .ToListAsync();

        var monthlyExpenseDtos = monthlyExpenses
            .Select(g => new MonthlyExpenseDto($"{g.Year}-{g.Month:D2}", g.Total))
            .ToList();

        var dashboard = new DashboardDto(
            totalProjects, activeProjects, completedProjects, Math.Round(avgCompletion, 1),
            totalEstimated, totalActual, totalEstimated - totalActual,
            lowStockMaterials, availableEquipment,
            recentProjects, lowStockAlerts, maintenanceAlerts, monthlyExpenseDtos);

        _cache.Set(AppDbContext.DashboardCacheKey, dashboard, TimeSpan.FromSeconds(45));
        return Ok(dashboard);
    }
}
