using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class MaterialTransaction
{
    public int Id { get; set; }

    public int MaterialId { get; set; }
    public Material Material { get; set; } = null!;

    public int? ProjectId { get; set; }
    public Project? Project { get; set; }

    [Required]
    public string TransactionType { get; set; } = string.Empty; // Purchase, Consumption, Adjustment, Return

    [Column(TypeName = "decimal(18,3)")]
    public decimal Quantity { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal UnitCost { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal TotalCost { get; set; }

    public DateTime TransactionDate { get; set; }
    public string Notes { get; set; } = string.Empty;
    public string RecordedBy { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
