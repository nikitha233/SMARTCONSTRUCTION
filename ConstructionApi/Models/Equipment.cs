using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class Equipment
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string EquipmentCode { get; set; } = string.Empty;

    public string Category { get; set; } = string.Empty;
    public string OwnershipType { get; set; } = "Owned"; // Owned, Rented
    public string Condition { get; set; } = "Good"; // Good, Fair, Poor
    public string Availability { get; set; } = "Available"; // Available, Assigned, UnderMaintenance, Unavailable

    [Column(TypeName = "decimal(18,2)")]
    public decimal RentalCostPerDay { get; set; }

    public DateTime? MaintenanceDate { get; set; }
    public DateTime? NextMaintenanceDate { get; set; }
    public bool IsActive { get; set; } = true;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<EquipmentAssignment> EquipmentAssignments { get; set; } = new List<EquipmentAssignment>();
    public ICollection<EquipmentMaintenanceRecord> MaintenanceRecords { get; set; } = new List<EquipmentMaintenanceRecord>();
}
