using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class Project
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required, MaxLength(50)]
    public string ProjectCode { get; set; } = string.Empty;

    public string Description { get; set; } = string.Empty;
    public string BuildingType { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string SiteAddress { get; set; } = string.Empty;
    public string City { get; set; } = string.Empty;

    public DateTime StartDate { get; set; }
    public DateTime PlannedCompletionDate { get; set; }
    public DateTime? ActualCompletionDate { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal EstimatedBudget { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal ActualCost { get; set; }

    public string ProjectManager { get; set; } = string.Empty;
    public string Status { get; set; } = "Planning"; // Planning, InProgress, OnHold, Completed, Cancelled
    public int CompletionPercentage { get; set; } = 0;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    // Navigation
    public ICollection<ConstructionStage> ConstructionStages { get; set; } = new List<ConstructionStage>();
    public ICollection<Expense> Expenses { get; set; } = new List<Expense>();
    public ICollection<ProgressUpdate> ProgressUpdates { get; set; } = new List<ProgressUpdate>();
    public ICollection<ProjectWorkerAssignment> ProjectWorkerAssignments { get; set; } = new List<ProjectWorkerAssignment>();
    public ICollection<EquipmentAssignment> EquipmentAssignments { get; set; } = new List<EquipmentAssignment>();
    public ICollection<MaterialTransaction> MaterialTransactions { get; set; } = new List<MaterialTransaction>();
}
