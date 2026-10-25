using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using ConstructionApi.Models;

namespace ConstructionApi.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public const string DashboardCacheKey = "dashboard:data";

    private readonly IMemoryCache _cache;

    public AppDbContext(DbContextOptions<AppDbContext> options, IMemoryCache cache) : base(options)
    {
        _cache = cache;
    }

    public DbSet<Project> Projects { get; set; }
    public DbSet<ConstructionStage> ConstructionStages { get; set; }
    public DbSet<Material> Materials { get; set; }
    public DbSet<MaterialTransaction> MaterialTransactions { get; set; }
    public DbSet<Worker> Workers { get; set; }
    public DbSet<WorkerAttendance> WorkerAttendances { get; set; }
    public DbSet<ProjectWorkerAssignment> ProjectWorkerAssignments { get; set; }
    public DbSet<Equipment> Equipment { get; set; }
    public DbSet<EquipmentAssignment> EquipmentAssignments { get; set; }
    public DbSet<EquipmentMaintenanceRecord> EquipmentMaintenanceRecords { get; set; }
    public DbSet<Expense> Expenses { get; set; }
    public DbSet<ProgressUpdate> ProgressUpdates { get; set; }
    public DbSet<AuditLog> AuditLogs { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Project unique code
        modelBuilder.Entity<Project>()
            .HasIndex(p => p.ProjectCode)
            .IsUnique();
        modelBuilder.Entity<Project>().HasIndex(p => p.Status);

        // Equipment unique code
        modelBuilder.Entity<Equipment>()
            .HasIndex(e => e.EquipmentCode)
            .IsUnique();
        modelBuilder.Entity<Equipment>().HasIndex(e => e.NextMaintenanceDate);
        modelBuilder.Entity<Expense>().HasIndex(e => new { e.ProjectId, e.ExpenseDate });
        modelBuilder.Entity<WorkerAttendance>().HasIndex(a => new { a.WorkerId, a.AttendanceDate });
        modelBuilder.Entity<Material>().HasIndex(m => m.IsActive);

        // Cascade deletes configuration
        modelBuilder.Entity<ConstructionStage>()
            .HasOne(cs => cs.Project)
            .WithMany(p => p.ConstructionStages)
            .HasForeignKey(cs => cs.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Expense>()
            .HasOne(e => e.Project)
            .WithMany(p => p.Expenses)
            .HasForeignKey(e => e.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProgressUpdate>()
            .HasOne(pu => pu.Project)
            .WithMany(p => p.ProgressUpdates)
            .HasForeignKey(pu => pu.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProgressUpdate>()
            .HasOne(pu => pu.ConstructionStage)
            .WithMany(cs => cs.ProgressUpdates)
            .HasForeignKey(pu => pu.ConstructionStageId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<MaterialTransaction>()
            .HasOne(mt => mt.Material)
            .WithMany(m => m.MaterialTransactions)
            .HasForeignKey(mt => mt.MaterialId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<MaterialTransaction>()
            .HasOne(mt => mt.Project)
            .WithMany(p => p.MaterialTransactions)
            .HasForeignKey(mt => mt.ProjectId)
            .OnDelete(DeleteBehavior.SetNull);

        modelBuilder.Entity<WorkerAttendance>()
            .HasOne(wa => wa.Worker)
            .WithMany(w => w.WorkerAttendances)
            .HasForeignKey(wa => wa.WorkerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectWorkerAssignment>()
            .HasOne(pwa => pwa.Project)
            .WithMany(p => p.ProjectWorkerAssignments)
            .HasForeignKey(pwa => pwa.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ProjectWorkerAssignment>()
            .HasOne(pwa => pwa.Worker)
            .WithMany(w => w.ProjectWorkerAssignments)
            .HasForeignKey(pwa => pwa.WorkerId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EquipmentAssignment>()
            .HasOne(ea => ea.Equipment)
            .WithMany(e => e.EquipmentAssignments)
            .HasForeignKey(ea => ea.EquipmentId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EquipmentAssignment>()
            .HasOne(ea => ea.Project)
            .WithMany(p => p.EquipmentAssignments)
            .HasForeignKey(ea => ea.ProjectId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<EquipmentMaintenanceRecord>()
            .HasOne(emr => emr.Equipment)
            .WithMany(e => e.MaintenanceRecords)
            .HasForeignKey(emr => emr.EquipmentId)
            .OnDelete(DeleteBehavior.Cascade);
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        var hasChanges = ChangeTracker.HasChanges();
        var result = base.SaveChanges(acceptAllChangesOnSuccess);
        if (hasChanges) _cache.Remove(DashboardCacheKey);
        return result;
    }

    public override async Task<int> SaveChangesAsync(
        bool acceptAllChangesOnSuccess,
        CancellationToken cancellationToken = default)
    {
        var hasChanges = ChangeTracker.HasChanges();
        var result = await base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
        if (hasChanges) _cache.Remove(DashboardCacheKey);
        return result;
    }
}
