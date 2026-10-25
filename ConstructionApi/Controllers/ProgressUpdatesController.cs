using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;
using ConstructionApi.Models;
using System.Security.Claims;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/progress-updates")]
[Authorize]
public class ProgressUpdatesController : ControllerBase
{
    private readonly AppDbContext _db;
    public ProgressUpdatesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProgressUpdateDto>>> GetAll(
        [FromQuery] int? projectId, [FromQuery] DateTime? fromDate, [FromQuery] DateTime? toDate)
    {
        var query = _db.ProgressUpdates.AsNoTracking().AsQueryable();
        if (projectId.HasValue) query = query.Where(pu => pu.ProjectId == projectId.Value);
        if (fromDate.HasValue) query = query.Where(pu => pu.UpdateDate >= fromDate.Value);
        if (toDate.HasValue) query = query.Where(pu => pu.UpdateDate <= toDate.Value);

        var items = await query.OrderByDescending(pu => pu.UpdateDate)
            .Select(pu => new ProgressUpdateDto(pu.Id, pu.ProjectId, pu.Project.Name, pu.ConstructionStageId,
                pu.ConstructionStage != null ? pu.ConstructionStage.StageName : null, pu.UpdateDate,
                pu.CompletionPercentage, pu.WorkCompletedToday, pu.WorkPlannedForTomorrow,
                pu.IssuesAndDelays, pu.SafetyObservations, pu.ResponsibleEngineer, pu.PhotoPath, pu.CreatedAt))
            .ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProgressUpdateDto>> GetById(int id)
    {
        var pu = await _db.ProgressUpdates.AsNoTracking().Where(x => x.Id == id)
            .Select(x => new ProgressUpdateDto(x.Id, x.ProjectId, x.Project.Name, x.ConstructionStageId,
                x.ConstructionStage != null ? x.ConstructionStage.StageName : null, x.UpdateDate,
                x.CompletionPercentage, x.WorkCompletedToday, x.WorkPlannedForTomorrow,
                x.IssuesAndDelays, x.SafetyObservations, x.ResponsibleEngineer, x.PhotoPath, x.CreatedAt))
            .FirstOrDefaultAsync();
        if (pu == null) return NotFound();
        return Ok(pu);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager,SiteEngineer")]
    public async Task<IActionResult> Create(CreateProgressUpdateDto dto)
    {
        var engineer = User.FindFirstValue(ClaimTypes.Name);
        var update = new ProgressUpdate
        {
            ProjectId = dto.ProjectId, ConstructionStageId = dto.ConstructionStageId,
            UpdateDate = dto.UpdateDate, CompletionPercentage = dto.CompletionPercentage,
            WorkCompletedToday = dto.WorkCompletedToday, WorkPlannedForTomorrow = dto.WorkPlannedForTomorrow,
            IssuesAndDelays = dto.IssuesAndDelays, SafetyObservations = dto.SafetyObservations,
            ResponsibleEngineer = dto.ResponsibleEngineer ?? engineer ?? "Unknown"
        };
        _db.ProgressUpdates.Add(update);

        // Update stage completion if a stage is referenced
        if (dto.ConstructionStageId.HasValue)
        {
            var stage = await _db.ConstructionStages.FindAsync(dto.ConstructionStageId.Value);
            if (stage != null)
            {
                stage.CompletionPercentage = dto.CompletionPercentage;
                stage.Status = dto.CompletionPercentage == 100 ? "Completed" : "InProgress";
                if (stage.ActualStartDate == null) stage.ActualStartDate = dto.UpdateDate;
                stage.UpdatedAt = DateTime.UtcNow;
            }
        }

        // Update project completion percentage as weighted average of stages
        var stages = await _db.ConstructionStages.AsNoTracking()
            .Where(s => s.ProjectId == dto.ProjectId)
            .Select(s => new { s.Id, s.CompletionPercentage })
            .ToListAsync();
        if (stages.Count > 0)
        {
            var avg = (int)stages.Average(s =>
                s.Id == dto.ConstructionStageId ? dto.CompletionPercentage : s.CompletionPercentage);
            var project = await _db.Projects.FindAsync(dto.ProjectId);
            if (project != null) { project.CompletionPercentage = avg; project.UpdatedAt = DateTime.UtcNow; }
        }

        await _db.SaveChangesAsync();
        return Created("", new { update.Id });
    }

    private static ProgressUpdateDto ToDto(ProgressUpdate pu) => new(
        pu.Id, pu.ProjectId, pu.Project?.Name ?? "", pu.ConstructionStageId,
        pu.ConstructionStage?.StageName, pu.UpdateDate, pu.CompletionPercentage,
        pu.WorkCompletedToday, pu.WorkPlannedForTomorrow, pu.IssuesAndDelays,
        pu.SafetyObservations, pu.ResponsibleEngineer, pu.PhotoPath, pu.CreatedAt);
}
