using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class ProgressUpdate
{
    public int Id { get; set; }

    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public int? ConstructionStageId { get; set; }
    public ConstructionStage? ConstructionStage { get; set; }

    public DateTime UpdateDate { get; set; }

    [Range(0, 100)]
    public int CompletionPercentage { get; set; }

    public string WorkCompletedToday { get; set; } = string.Empty;
    public string WorkPlannedForTomorrow { get; set; } = string.Empty;
    public string IssuesAndDelays { get; set; } = string.Empty;
    public string SafetyObservations { get; set; } = string.Empty;
    public string ResponsibleEngineer { get; set; } = string.Empty;
    public string PhotoPath { get; set; } = string.Empty;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
