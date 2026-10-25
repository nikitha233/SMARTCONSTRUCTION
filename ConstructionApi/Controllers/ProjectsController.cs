using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;
using ConstructionApi.Models;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/projects")]
[Authorize]
public class ProjectsController : ControllerBase
{
    private readonly AppDbContext _db;

    public ProjectsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<ProjectDto>>> GetAll(
        [FromQuery] string? status, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        var query = _db.Projects.AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(p => p.Status == status);
        if (!string.IsNullOrEmpty(search))
            query = query.Where(p => p.Name.Contains(search) || p.ProjectCode.Contains(search) || p.ClientName.Contains(search));

        var total = await query.CountAsync();
        var items = await query.OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(p => ToDto(p)).ToListAsync();

        Response.Headers["X-Total-Count"] = total.ToString();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<ProjectDto>> GetById(int id)
    {
        var p = await _db.Projects.FindAsync(id);
        if (p == null) return NotFound();
        return Ok(ToDto(p));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<ProjectDto>> Create(CreateProjectDto dto)
    {
        if (await _db.Projects.AnyAsync(p => p.ProjectCode == dto.ProjectCode))
            return BadRequest(new { message = "Project code already exists" });

        var project = new Project
        {
            Name = dto.Name, ProjectCode = dto.ProjectCode, Description = dto.Description,
            BuildingType = dto.BuildingType, ClientName = dto.ClientName,
            SiteAddress = dto.SiteAddress, City = dto.City,
            StartDate = dto.StartDate, PlannedCompletionDate = dto.PlannedCompletionDate,
            EstimatedBudget = dto.EstimatedBudget, ProjectManager = dto.ProjectManager,
            Status = dto.Status
        };
        _db.Projects.Add(project);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = project.Id }, ToDto(project));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<ProjectDto>> Update(int id, UpdateProjectDto dto)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null) return NotFound();

        project.Name = dto.Name; project.Description = dto.Description;
        project.BuildingType = dto.BuildingType; project.ClientName = dto.ClientName;
        project.SiteAddress = dto.SiteAddress; project.City = dto.City;
        project.StartDate = dto.StartDate; project.PlannedCompletionDate = dto.PlannedCompletionDate;
        project.ActualCompletionDate = dto.ActualCompletionDate;
        project.EstimatedBudget = dto.EstimatedBudget; project.ProjectManager = dto.ProjectManager;
        project.Status = dto.Status; project.CompletionPercentage = dto.CompletionPercentage;
        project.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        return Ok(ToDto(project));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var project = await _db.Projects.FindAsync(id);
        if (project == null) return NotFound();
        _db.Projects.Remove(project);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/stages")]
    public async Task<ActionResult> GetStages(int id)
    {
        var stages = await _db.ConstructionStages
            .Where(s => s.ProjectId == id)
            .OrderBy(s => s.StageOrder)
            .Select(s => new StageDto(s.Id, s.ProjectId, s.StageName, s.StageOrder,
                s.PlannedStartDate, s.PlannedEndDate, s.ActualStartDate, s.ActualEndDate,
                s.CompletionPercentage, s.AssignedEngineer, s.Status, s.Notes))
            .ToListAsync();
        return Ok(stages);
    }

    [HttpGet("{id}/expenses")]
    public async Task<ActionResult> GetExpenses(int id)
    {
        var expenses = await _db.Expenses
            .Where(e => e.ProjectId == id)
            .Include(e => e.Project)
            .OrderByDescending(e => e.ExpenseDate)
            .Select(e => new ExpenseDto(e.Id, e.ProjectId, e.Project.Name, e.Category, e.Description,
                e.Amount, e.ExpenseDate, e.PaymentMethod, e.ReferenceNumber, e.RecordedBy, e.CreatedAt))
            .ToListAsync();
        return Ok(expenses);
    }

    [HttpGet("{id}/progress-updates")]
    public async Task<ActionResult> GetProgressUpdates(int id)
    {
        var updates = await _db.ProgressUpdates
            .Where(pu => pu.ProjectId == id)
            .Include(pu => pu.Project)
            .Include(pu => pu.ConstructionStage)
            .OrderByDescending(pu => pu.UpdateDate)
            .Select(pu => new ProgressUpdateDto(pu.Id, pu.ProjectId, pu.Project.Name,
                pu.ConstructionStageId, pu.ConstructionStage != null ? pu.ConstructionStage.StageName : null,
                pu.UpdateDate, pu.CompletionPercentage, pu.WorkCompletedToday, pu.WorkPlannedForTomorrow,
                pu.IssuesAndDelays, pu.SafetyObservations, pu.ResponsibleEngineer, pu.PhotoPath, pu.CreatedAt))
            .ToListAsync();
        return Ok(updates);
    }

    private static ProjectDto ToDto(Project p) => new(
        p.Id, p.Name, p.ProjectCode, p.Description, p.BuildingType, p.ClientName,
        p.SiteAddress, p.City, p.StartDate, p.PlannedCompletionDate, p.ActualCompletionDate,
        p.EstimatedBudget, p.ActualCost, p.ProjectManager, p.Status, p.CompletionPercentage,
        p.CreatedAt, p.UpdatedAt);
}
