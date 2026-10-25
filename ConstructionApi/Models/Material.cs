using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class Material
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;
    public string Unit { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,3)")]
    public decimal CurrentStock { get; set; } = 0;

    [Column(TypeName = "decimal(18,3)")]
    public decimal MinimumStockThreshold { get; set; } = 0;

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitCost { get; set; } = 0;

    public string Supplier { get; set; } = string.Empty;
    public string StorageLocation { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<MaterialTransaction> MaterialTransactions { get; set; } = new List<MaterialTransaction>();
}
