using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class EquipmentMaintenanceRecord
{
    public int Id { get; set; }

    public int EquipmentId { get; set; }
    public Equipment Equipment { get; set; } = null!;

    public DateTime MaintenanceDate { get; set; }
    public string MaintenanceType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;

    [Column(TypeName = "decimal(18,2)")]
    public decimal Cost { get; set; }

    public string PerformedBy { get; set; } = string.Empty;
    public DateTime? NextMaintenanceDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
