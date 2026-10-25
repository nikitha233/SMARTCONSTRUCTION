using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class ConstructionStage
{
    public int Id { get; set; }

    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    [Required, MaxLength(200)]
    public string StageName { get; set; } = string.Empty;

    public int StageOrder { get; set; }
    public DateTime PlannedStartDate { get; set; }
    public DateTime PlannedEndDate { get; set; }
    public DateTime? ActualStartDate { get; set; }
    public DateTime? ActualEndDate { get; set; }

    [Range(0, 100)]
    public int CompletionPercentage { get; set; } = 0;

    public string AssignedEngineer { get; set; } = string.Empty;
    public string Status { get; set; } = "NotStarted"; // NotStarted, InProgress, Completed, Delayed
    public string Notes { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<ProgressUpdate> ProgressUpdates { get; set; } = new List<ProgressUpdate>();
}
