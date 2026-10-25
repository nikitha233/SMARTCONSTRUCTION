using System.ComponentModel.DataAnnotations;

namespace ConstructionApi.Models;

public class ProjectWorkerAssignment
{
    public int Id { get; set; }

    public int ProjectId { get; set; }
    public Project Project { get; set; } = null!;

    public int WorkerId { get; set; }
    public Worker Worker { get; set; } = null!;

    public DateTime AssignedDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
