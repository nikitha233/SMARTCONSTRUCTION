using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;
using ConstructionApi.Models;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/equipment")]
[Authorize]
public class EquipmentController : ControllerBase
{
    private readonly AppDbContext _db;
    public EquipmentController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<EquipmentDto>>> GetAll(
        [FromQuery] string? category, [FromQuery] string? availability)
    {
        var query = _db.Equipment.Where(e => e.IsActive).AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(e => e.Category == category);
        if (!string.IsNullOrEmpty(availability)) query = query.Where(e => e.Availability == availability);

        var items = await query.OrderBy(e => e.Name).Select(e => ToDto(e)).ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<EquipmentDto>> GetById(int id)
    {
        var e = await _db.Equipment.FindAsync(id);
        if (e == null) return NotFound();
        return Ok(ToDto(e));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<EquipmentDto>> Create(CreateEquipmentDto dto)
    {
        if (await _db.Equipment.AnyAsync(e => e.EquipmentCode == dto.EquipmentCode))
            return BadRequest(new { message = "Equipment code already exists" });

        var equipment = new Equipment
        {
            Name = dto.Name,
            EquipmentCode = dto.EquipmentCode,
            Category = dto.Category,
            OwnershipType = string.IsNullOrEmpty(dto.OwnershipType) ? "Owned" : dto.OwnershipType,
            Condition = string.IsNullOrEmpty(dto.Condition) ? "Good" : dto.Condition,
            Availability = string.IsNullOrEmpty(dto.Availability) ? "Available" : dto.Availability,
            RentalCostPerDay = dto.RentalCostPerDay,
            NextMaintenanceDate = dto.NextMaintenanceDate
        };
        _db.Equipment.Add(equipment);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = equipment.Id }, ToDto(equipment));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,ProjectManager")]
    public async Task<ActionResult<EquipmentDto>> Update(int id, UpdateEquipmentDto dto)
    {
        var equipment = await _db.Equipment.FindAsync(id);
        if (equipment == null) return NotFound();
        equipment.Name = dto.Name;
        equipment.Category = dto.Category;
        if (!string.IsNullOrEmpty(dto.OwnershipType)) equipment.OwnershipType = dto.OwnershipType;
        if (!string.IsNullOrEmpty(dto.Condition)) equipment.Condition = dto.Condition;
        if (!string.IsNullOrEmpty(dto.Availability)) equipment.Availability = dto.Availability;
        equipment.RentalCostPerDay = dto.RentalCostPerDay;
        equipment.MaintenanceDate = dto.MaintenanceDate;
        equipment.NextMaintenanceDate = dto.NextMaintenanceDate;
        equipment.IsActive = dto.IsActive;
        equipment.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(equipment));
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete(int id)
    {
        var equipment = await _db.Equipment.FindAsync(id);
        if (equipment == null) return NotFound();
        _db.Equipment.Remove(equipment);
        await _db.SaveChangesAsync();
        return NoContent();
    }

    [HttpGet("{id}/maintenance")]
    public async Task<ActionResult> GetMaintenance(int id)
    {
        var records = await _db.EquipmentMaintenanceRecords
            .Where(r => r.EquipmentId == id)
            .OrderByDescending(r => r.MaintenanceDate)
            .ToListAsync();
        return Ok(records);
    }

    [HttpPost("{id}/maintenance")]
    [Authorize(Roles = "Admin,ProjectManager,SiteEngineer")]
    public async Task<IActionResult> AddMaintenance(int id, [FromBody] CreateEquipmentMaintenanceDto dto)
    {
        var equipment = await _db.Equipment.FindAsync(id);
        if (equipment == null) return NotFound();
        var record = new EquipmentMaintenanceRecord
        {
            EquipmentId = id,
            MaintenanceDate = dto.MaintenanceDate,
            MaintenanceType = dto.MaintenanceType ?? "Routine Servicing",
            Description = dto.Description ?? "",
            Cost = dto.Cost,
            PerformedBy = dto.PerformedBy ?? "Technician",
            NextMaintenanceDate = dto.NextMaintenanceDate,
            CreatedAt = DateTime.UtcNow
        };
        _db.EquipmentMaintenanceRecords.Add(record);
        if (dto.NextMaintenanceDate.HasValue)
        {
            equipment.NextMaintenanceDate = dto.NextMaintenanceDate;
            equipment.MaintenanceDate = dto.MaintenanceDate;
        }
        await _db.SaveChangesAsync();
        return Created("", record);
    }

    private static EquipmentDto ToDto(Equipment e) => new(
        e.Id, e.Name, e.EquipmentCode, e.Category, e.OwnershipType,
        e.Condition, e.Availability, e.RentalCostPerDay, e.MaintenanceDate,
        e.NextMaintenanceDate, e.IsActive);
}
