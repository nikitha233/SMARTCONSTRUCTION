using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace ConstructionApi.Models;

public class WorkerAttendance
{
    public int Id { get; set; }

    public int WorkerId { get; set; }
    public Worker Worker { get; set; } = null!;

    public int? ProjectId { get; set; }
    public Project? Project { get; set; }

    public DateTime AttendanceDate { get; set; }
    public string Status { get; set; } = "Present"; // Present, Absent, HalfDay

    [Column(TypeName = "decimal(18,2)")]
    public decimal WageForDay { get; set; }

    public string Notes { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
