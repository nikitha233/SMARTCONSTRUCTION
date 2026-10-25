using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;
using ConstructionApi.Models;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/stages")]
[Authorize]
public class StagesController : ControllerBase
{
    private readonly AppDbContext _db;
    public StagesController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<StageDto>>> GetAll([FromQuery] int? projectId)
    {
        var query = _db.ConstructionStages.AsNoTracking().AsQueryable();
        if (projectId.HasValue) query = query.Where(s => s.ProjectId == projectId.Value);
        var stages = await query.OrderBy(s => s.StageOrder)
            .Select(s => ToDto(s)).ToListAsync();
        return Ok(stages);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<StageDto>> GetById(int id)
    {
        var s = await _db.ConstructionStages.AsNoTracking().FirstOrDefaultAsync(s => s.Id == id);
        if (s == null) return NotFound();
        return Ok(ToDto(s));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager,SiteEngineer")]
    public async Task<ActionResult<StageDto>> Create(CreateStageDto dto)
    {
        var stage = new ConstructionStage
        {
            ProjectId = dto.ProjectId, StageName = dto.StageName, StageOrder = dto.StageOrder,
            PlannedStartDate = dto.PlannedStartDate, PlannedEndDate = dto.PlannedEndDate,
            AssignedEngineer = dto.AssignedEngineer, Notes = dto.Notes
        };
        _db.ConstructionStages.Add(stage);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = stage.Id }, ToDto(stage));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,ProjectManager,SiteEngineer")]
    public async Task<ActionResult<StageDto>> Update(int id, UpdateStageDto dto)
    {
        var stage = await _db.ConstructionStages.FindAsync(id);
        if (stage == null) return NotFound();
        stage.StageName = dto.StageName; stage.StageOrder = dto.StageOrder;
        stage.PlannedStartDate = dto.PlannedStartDate; stage.PlannedEndDate = dto.PlannedEndDate;
        stage.ActualStartDate = dto.ActualStartDate; stage.ActualEndDate = dto.ActualEndDate;
        stage.CompletionPercentage = dto.CompletionPercentage;
        stage.AssignedEngineer = dto.AssignedEngineer; stage.Status = dto.Status;
        stage.Notes = dto.Notes; stage.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(stage));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<IActionResult> Delete(int id)
    {
        var stage = await _db.ConstructionStages.FindAsync(id);
        if (stage == null) return NotFound();
        _db.ConstructionStages.Remove(stage);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static StageDto ToDto(ConstructionStage s) => new(
        s.Id, s.ProjectId, s.StageName, s.StageOrder,
        s.PlannedStartDate, s.PlannedEndDate, s.ActualStartDate, s.ActualEndDate,
        s.CompletionPercentage, s.AssignedEngineer, s.Status, s.Notes);
}
