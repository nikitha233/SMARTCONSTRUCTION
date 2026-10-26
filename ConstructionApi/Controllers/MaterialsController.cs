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
[Authorize(Roles = "Admin,StoreManager")]
public class MaterialsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MaterialsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<PagedResult<MaterialDto>>> GetAll(
        [FromQuery] string? category, [FromQuery] string? stockStatus, [FromQuery] string? search,
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20,
        [FromQuery] string? sortBy = null, [FromQuery] string? sortDirection = null)
    {
        var query = _db.Materials.AsNoTracking().Where(m => m.IsActive).AsQueryable();
        if (!string.IsNullOrEmpty(category)) query = query.Where(m => m.Category == category);
        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(m => m.Name.ToLower().Contains(s) || m.Category.ToLower().Contains(s));
        }
        if (stockStatus == "low") query = query.Where(m => m.CurrentStock <= m.MinimumStockThreshold);

        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);
        var total = await query.CountAsync();
        page = Math.Min(page, Math.Max(1, (int)Math.Ceiling(total / (double)pageSize)));
        var descending = string.Equals(sortDirection, "desc", StringComparison.OrdinalIgnoreCase);
        var ordered = (sortBy?.ToLowerInvariant()) switch
        {
            "category" => descending ? query.OrderByDescending(m => m.Category) : query.OrderBy(m => m.Category),
            "stock" => descending ? query.OrderByDescending(m => m.CurrentStock) : query.OrderBy(m => m.CurrentStock),
            _ => descending ? query.OrderByDescending(m => m.Name) : query.OrderBy(m => m.Name)
        };
        var items = await ordered.Skip((page - 1) * pageSize).Take(pageSize)
            .Select(m => ToDto(m)).ToListAsync();
        return Ok(new PagedResult<MaterialDto>(items, total, page, pageSize));
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<MaterialDto>> GetById(int id)
    {
        var m = await _db.Materials.AsNoTracking().FirstOrDefaultAsync(m => m.Id == id);
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
            .AsNoTracking()
            .Where(t => t.MaterialId == id)
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
[Authorize(Roles = "Admin,StoreManager")]
public class MaterialTransactionsController : ControllerBase
{
    private readonly AppDbContext _db;
    public MaterialTransactionsController(AppDbContext db) => _db = db;

    [HttpGet]
    public async Task<ActionResult<IEnumerable<MaterialTransactionDto>>> GetAll(
        [FromQuery] int? materialId, [FromQuery] int? projectId)
    {
        var query = _db.MaterialTransactions.AsNoTracking().AsQueryable();
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
        if (dto.Quantity <= 0)
            return BadRequest(new { message = "Quantity must be greater than zero." });
        if (dto.UnitCost < 0)
            return BadRequest(new { message = "Unit cost cannot be negative." });
        if (dto.TransactionType is not ("Purchase" or "Consumption" or "Adjustment" or "Return"))
            return BadRequest(new { message = "Transaction type must be Purchase, Consumption, Adjustment, or Return." });

        using var transaction = await _db.Database.BeginTransactionAsync();
        try
        {
            var material = await _db.Materials.FindAsync(dto.MaterialId);
            if (material == null) return NotFound(new { message = "Material not found" });

            decimal newStock = material.CurrentStock;
            if (dto.TransactionType == "Purchase" || dto.TransactionType == "Return")
                newStock += dto.Quantity;
            else
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
