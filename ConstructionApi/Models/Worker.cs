using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class Worker
{
    public int Id { get; set; }

    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;
    public string JobTitle { get; set; } = string.Empty;
    public DateTime JoiningDate { get; set; }

    [Column(TypeName = "decimal(18,2)")]
    public decimal DailyWage { get; set; }

    public string EmploymentStatus { get; set; } = "Active"; // Active, Inactive, Suspended

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<WorkerAttendance> WorkerAttendances { get; set; } = new List<WorkerAttendance>();
    public ICollection<ProjectWorkerAssignment> ProjectWorkerAssignments { get; set; } = new List<ProjectWorkerAssignment>();
}
