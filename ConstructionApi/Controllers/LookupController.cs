using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/lookup")]
[Authorize(Roles = "Admin,ProjectManager,SiteEngineer,StoreManager")]
public class LookupController : ControllerBase
{
    private readonly AppDbContext _db;

    public LookupController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult> Get()
    {
        var projects = await _db.Projects.AsNoTracking()
            .OrderBy(p => p.Name)
            .Select(p => new ProjectLookupDto(p.Id, p.Name))
            .ToListAsync();
        var workers = User.IsInRole("Admin") || User.IsInRole("ProjectManager") || User.IsInRole("SiteEngineer")
            ? await _db.Workers.AsNoTracking()
                .OrderBy(w => w.FullName)
                .Select(w => new WorkerLookupDto(w.Id, w.FullName))
                .ToListAsync()
            : [];

        return Ok(new { projects, workers });
    }
}
