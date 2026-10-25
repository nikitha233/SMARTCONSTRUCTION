using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Data;
using ConstructionApi.DTOs;
using ConstructionApi.Models;
using System.Security.Claims;

namespace ConstructionApi.Controllers;

[ApiController]
[Route("api/materials")]
[Authorize]
public class MaterialsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MaterialsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaterialDto>>> GetAll(
        [FromQuery] string? category, [FromQuery] string? stockStatus, [FromQuery] string? search)
    {
        var query = _db.Materials.Where(m => m.IsActive).AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(m => m.Category == category);
        if (!string.IsNullOrEmpty(search)) query = query.Where(m => m.Name.Contains(search));
        if (stockStatus == "low") query = query.Where(m => m.CurrentStock <= m.MinimumStockThreshold);

        var items = await query.OrderBy(m => m.Name).Select(m => ToDto(m)).ToListAsync();
        return Ok(items);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MaterialDto>> GetById(int id)
    {
        var m = await _db.Materials.FindAsync(id);
        if (m == null) return NotFound();
        return Ok(ToDto(m));
    }

    [HttpPost]
    [Authorize(Roles = "Admin,StoreManager")]
    public async Task<ActionResult<MaterialDto>> Create(CreateMaterialDto dto)
    {
        var material = new Material
        {
            Name = dto.Name, Category = dto.Category, Unit = dto.Unit,
            MinimumStockThreshold = dto.MinimumStockThreshold, UnitCost = dto.UnitCost,
            Supplier = dto.Supplier, StorageLocation = dto.StorageLocation
        };
        _db.Materials.Add(material);
        await _db.SaveChangesAsync();
        return CreatedAtAction(nameof(GetById), new { id = material.Id }, ToDto(material));
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin,StoreManager")]
    public async Task<ActionResult<MaterialDto>> Update(int id, UpdateMaterialDto dto)
    {
        var material = await _db.Materials.FindAsync(id);
        if (material == null) return NotFound();
        material.Name = dto.Name; material.Category = dto.Category; material.Unit = dto.Unit;
        material.MinimumStockThreshold = dto.MinimumStockThreshold; material.UnitCost = dto.UnitCost;
        material.Supplier = dto.Supplier; material.StorageLocation = dto.StorageLocation;
        material.IsActive = dto.IsActive; material.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync();
        return Ok(ToDto(material));
    }

    [HttpGet("{id}/transactions")]
    public async Task<ActionResult> GetTransactions(int id)
    {
        var txns = await _db.MaterialTransactions
            .Where(t => t.MaterialId == id)
            .Include(t => t.Material)
            .Include(t => t.Project)
            .OrderByDescending(t => t.TransactionDate)
            .Select(t => new MaterialTransactionDto(t.Id, t.MaterialId, t.Material.Name,
                t.ProjectId, t.Project != null ? t.Project.Name : null,
                t.TransactionType, t.Quantity, t.UnitCost, t.TotalCost,
                t.TransactionDate, t.Notes, t.RecordedBy))
            .ToListAsync();
        return Ok(txns);
    }

    private static MaterialDto ToDto(Material m) => new(
        m.Id, m.Name, m.Category, m.Unit, m.CurrentStock, m.MinimumStockThreshold,
        m.UnitCost, m.Supplier, m.StorageLocation, m.IsActive);
}

[ApiController]
[Route("api/material-transactions")]
[Authorize]
public class MaterialTransactionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MaterialTransactionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaterialTransactionDto>>> GetAll(
        [FromQuery] int? materialId, [FromQuery] int? projectId)
    {
        var query = _db.MaterialTransactions.Include(t => t.Material).Include(t => t.Project).AsQueryable();
        if (materialId.HasValue) query = query.Where(t => t.MaterialId == materialId.Value);
        if (projectId.HasValue) query = query.Where(t => t.ProjectId == projectId.Value);

        var items = await query.OrderByDescending(t => t.TransactionDate)
            .Select(t => new MaterialTransactionDto(t.Id, t.MaterialId, t.Material.Name,
                t.ProjectId, t.Project != null ? t.Project.Name : null,
                t.TransactionType, t.Quantity, t.UnitCost, t.TotalCost,
                t.TransactionDate, t.Notes, t.RecordedBy))
            .ToListAsync();
        return Ok(items);
    }

    [HttpPost]
    [Authorize(Roles = "Admin,StoreManager")]
    public async Task<IActionResult> Create(CreateMaterialTransactionDto dto)
    {
        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var material = await _db.Materials.FindAsync(dto.MaterialId);
            if (material == null) return NotFound(new { message = "Material not found" });

            decimal newStock = material.CurrentStock;
            if (dto.TransactionType == "Purchase" || dto.TransactionType == "Return")
                newStock += dto.Quantity;
            else if (dto.TransactionType == "Consumption" || dto.TransactionType == "Adjustment")
                newStock -= dto.Quantity;

            if (newStock < 0)
                return BadRequest(new { message = "Insufficient stock. Cannot go below zero." });

            var userName = User.FindFirstValue(ClaimTypes.Name) ?? "Unknown";
            var txn = new MaterialTransaction
            {
                MaterialId = dto.MaterialId, ProjectId = dto.ProjectId,
                TransactionType = dto.TransactionType, Quantity = dto.Quantity,
                UnitCost = dto.UnitCost, TotalCost = dto.Quantity * dto.UnitCost,
                TransactionDate = dto.TransactionDate, Notes = dto.Notes, RecordedBy = userName
            };
            _db.MaterialTransactions.Add(txn);
            material.CurrentStock = newStock;
            material.UpdatedAt = DateTime.UtcNow;

            await _db.SaveChangesAsync();
            await transaction.CommitAsync();
            return Created("", new { message = "Transaction recorded", newStock });
        }
        catch
        {
            await transaction.RollbackAsync();
            throw;
        }
    }
}
