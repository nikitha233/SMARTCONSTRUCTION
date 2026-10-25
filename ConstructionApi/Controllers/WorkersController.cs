using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;
using ConstructionApi.Models;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/workers")]
[Authorize]
public class WorkersController : ControllerBase
{
    private readonly AppDbContext _db;
    public WorkersController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<WorkerDto>>> GetAll(
        [FromQuery] string? search, [FromQuery] string? status,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null, [FromQuery] string? sortDirection = null)
    {
        var query = _db.Workers.AsNoTracking().AsQueryable();
        if (!string.IsNullOrEmpty(search))
            query = query.Where(w => w.FullName.Contains(search) || w.JobTitle.Contains(search));
        if (!string.IsNullOrEmpty(status))
            query = query.Where(w => w.EmploymentStatus == status);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await query.CountAsync();
        page = Math.Min(page, Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)));
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var ordered = (sortBy?.ToLowerInvariant()) switch
        {
            "jobtitle" => descending ? query.OrderByDescending(w => w.JobTitle) : query.OrderBy(w => w.JobTitle),
            "dailywage" => descending ? query.OrderByDescending(w => w.DailyWage) : query.OrderBy(w => w.DailyWage),
            _ => descending ? query.OrderByDescending(w => w.FullName) : query.OrderBy(w => w.FullName)
        };
        var items = await ordered.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(w => ToDto(w)).ToListAsync();
        return Ok(new PagedResult<WorkerDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WorkerDto>> GetById(int id)
    {
        var w = await _db.Workers.AsNoTracking().FirstOrDefaultAsync(w => w.Id == id);
        if (w == null) return NotFound();
        return Ok(ToDto(w));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<WorkerDto>> Create(CreateWorkerDto dto)
    {
        var worker = new Worker
        {
            FullName = dto.FullName, PhoneNumber = dto.PhoneNumber, JobTitle = dto.JobTitle,
            JoiningDate = dto.JoiningDate, DailyWage = dto.DailyWage, EmploymentStatus = dto.EmploymentStatus
        };
        _db.Workers.Add(worker);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = worker.Id }, ToDto(worker));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<WorkerDto>> Update(int id, UpdateWorkerDto dto)
    {
        var worker = await _db.Workers.FindAsync(id);
        if (worker == null) return NotFound();
        worker.FullName = dto.FullName; worker.PhoneNumber = dto.PhoneNumber;
        worker.JobTitle = dto.JobTitle; worker.DailyWage = dto.DailyWage;
        worker.EmploymentStatus = dto.EmploymentStatus; worker.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(worker));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var worker = await _db.Workers.FindAsync(id);
        if (worker == null) return NotFound();
        _db.Workers.Remove(worker);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    private static WorkerDto ToDto(Worker w) => new(
        w.Id, w.FullName, w.PhoneNumber, w.JobTitle, w.JoiningDate, w.DailyWage, w.EmploymentStatus);
}

[ApiController]
[Route("api/attendance")]
[Authorize]
public class AttendanceController : ControllerBase
{
    private readonly AppDbContext _db;
    public AttendanceController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<AttendanceDto>>> GetAll(
        [FromQuery] int? workerId, [FromQuery] int? projectId, [FromQuery] DateTime? date)
    {
        var query = _db.WorkerAttendances.AsNoTracking().AsQueryable();
        if (workerId.HasValue) query = query.Where(a => a.WorkerId == workerId.Value);
        if (projectId.HasValue) query = query.Where(a => a.ProjectId == projectId.Value);
        if (date.HasValue) query = query.Where(a => a.AttendanceDate.Date == date.Value.Date);

        var items = await query.OrderByDescending(a => a.AttendanceDate)
            .Select(a => new AttendanceDto(a.Id, a.WorkerId, a.Worker.FullName,
                a.ProjectId, a.Project != null ? a.Project.Name : null,
                a.AttendanceDate, a.Status, a.WageForDay, a.Notes))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    public async Task<IActionResult> Create(CreateAttendanceDto dto)
    {
        var worker = await _db.Workers.AsNoTracking().FirstOrDefaultAsync(w => w.Id == dto.WorkerId);
        if (worker == null) return NotFound(new { message = "Worker not found" });

        decimal wage = dto.Status switch
        {
            "Present" => worker.DailyWage,
            "HalfDay" => worker.DailyWage / 2,
            _ => 0
        };

        var attendance = new WorkerAttendance
        {
            WorkerId = dto.WorkerId, ProjectId = dto.ProjectId,
            AttendanceDate = dto.AttendanceDate, Status = dto.Status,
            WageForDay = wage, Notes = dto.Notes
        };
        _db.WorkerAttendances.Add(attendance);
        await _db.SaveChangesAsync();
        return Created("", new { id = attendance.Id, wageForDay = wage });
    }
}
