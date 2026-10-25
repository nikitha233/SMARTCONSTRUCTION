namespace ConstructionApi.DTOs;

public record PagedResult<T>(List<T> Items, int TotalCount, int Page, int PageSize);
public record ProjectLookupDto(int Id, string Name);
public record WorkerLookupDto(int Id, string FullName);

// Auth DTOs
public record LoginDto(string Email, string Password);
public record RegisterDto(string Email, string Password, string FullName, string Role);
public record SignUpDto(string Email, string Password, string FullName);
public record AuthResponseDto(string Token, string UserId, string Email, string FullName, string Role, DateTime Expiry);
public record ChangePasswordDto(string CurrentPassword, string NewPassword);

// Project DTOs
public record ProjectDto(
    int Id, string Name, string ProjectCode, string Description,
    string BuildingType, string ClientName, string SiteAddress, string City,
    DateTime StartDate, DateTime PlannedCompletionDate, DateTime? ActualCompletionDate,
    decimal EstimatedBudget, decimal ActualCost, string ProjectManager,
    string Status, int CompletionPercentage, DateTime CreatedAt, DateTime UpdatedAt);

public record CreateProjectDto(
    string Name, string ProjectCode, string Description,
    string BuildingType, string ClientName, string SiteAddress, string City,
    DateTime StartDate, DateTime PlannedCompletionDate,
    decimal EstimatedBudget, string ProjectManager, string Status);

public record UpdateProjectDto(
    string Name, string Description,
    string BuildingType, string ClientName, string SiteAddress, string City,
    DateTime StartDate, DateTime PlannedCompletionDate, DateTime? ActualCompletionDate,
    decimal EstimatedBudget, string ProjectManager, string Status, int CompletionPercentage);

// Construction Stage DTOs
public record StageDto(
    int Id, int ProjectId, string StageName, int StageOrder,
    DateTime PlannedStartDate, DateTime PlannedEndDate,
    DateTime? ActualStartDate, DateTime? ActualEndDate,
    int CompletionPercentage, string AssignedEngineer, string Status, string Notes);

public record CreateStageDto(
    int ProjectId, string StageName, int StageOrder,
    DateTime PlannedStartDate, DateTime PlannedEndDate,
    string AssignedEngineer, string Notes);

public record UpdateStageDto(
    string StageName, int StageOrder,
    DateTime PlannedStartDate, DateTime PlannedEndDate,
    DateTime? ActualStartDate, DateTime? ActualEndDate,
    int CompletionPercentage, string AssignedEngineer, string Status, string Notes);

// Material DTOs
public record MaterialDto(
    int Id, string Name, string Category, string Unit,
    decimal CurrentStock, decimal MinimumStockThreshold,
    decimal UnitCost, string Supplier, string StorageLocation, bool IsActive);

public record CreateMaterialDto(
    string Name, string Category, string Unit,
    decimal MinimumStockThreshold, decimal UnitCost,
    string Supplier, string StorageLocation);

public record UpdateMaterialDto(
    string Name, string Category, string Unit,
    decimal MinimumStockThreshold, decimal UnitCost,
    string Supplier, string StorageLocation, bool IsActive);

// Material Transaction DTOs
public record MaterialTransactionDto(
    int Id, int MaterialId, string MaterialName, int? ProjectId, string? ProjectName,
    string TransactionType, decimal Quantity, decimal UnitCost, decimal TotalCost,
    DateTime TransactionDate, string Notes, string RecordedBy);

public record CreateMaterialTransactionDto(
    int MaterialId, int? ProjectId, string TransactionType,
    decimal Quantity, decimal UnitCost, DateTime TransactionDate, string Notes);

// Worker DTOs
public record WorkerDto(
    int Id, string FullName, string PhoneNumber, string JobTitle,
    DateTime JoiningDate, decimal DailyWage, string EmploymentStatus);

public record CreateWorkerDto(
    string FullName, string PhoneNumber, string JobTitle,
    DateTime JoiningDate, decimal DailyWage, string EmploymentStatus);

public record UpdateWorkerDto(
    string FullName, string PhoneNumber, string JobTitle,
    decimal DailyWage, string EmploymentStatus);

// Attendance DTOs
public record AttendanceDto(
    int Id, int WorkerId, string WorkerName, int? ProjectId, string? ProjectName,
    DateTime AttendanceDate, string Status, decimal WageForDay, string Notes);

public record CreateAttendanceDto(
    int WorkerId, int? ProjectId, DateTime AttendanceDate, string Status, string Notes);

// Equipment DTOs
public record EquipmentDto(
    int Id, string Name, string EquipmentCode, string Category,
    string OwnershipType, string Condition, string Availability,
    decimal RentalCostPerDay, DateTime? MaintenanceDate, DateTime? NextMaintenanceDate, bool IsActive);

public record CreateEquipmentDto(
    string Name, string EquipmentCode, string Category,
    string? OwnershipType, string? Condition, string? Availability,
    decimal RentalCostPerDay, DateTime? NextMaintenanceDate);

public record UpdateEquipmentDto(
    string Name, string Category, string? OwnershipType, string? Condition,
    string? Availability, decimal RentalCostPerDay,
    DateTime? MaintenanceDate, DateTime? NextMaintenanceDate, bool IsActive);

public record CreateEquipmentMaintenanceDto(
    DateTime MaintenanceDate, string? MaintenanceType, string? Description,
    decimal Cost, string? PerformedBy, DateTime? NextMaintenanceDate);

// Expense DTOs
public record ExpenseDto(
    int Id, int ProjectId, string ProjectName, string Category, string Description,
    decimal Amount, DateTime ExpenseDate, string PaymentMethod,
    string ReferenceNumber, string RecordedBy, DateTime CreatedAt);

public record CreateExpenseDto(
    int ProjectId, string Category, string Description,
    decimal Amount, DateTime ExpenseDate, string PaymentMethod, string ReferenceNumber);

public record UpdateExpenseDto(
    string Category, string Description, decimal Amount,
    DateTime ExpenseDate, string PaymentMethod, string ReferenceNumber);

// Progress Update DTOs
public record ProgressUpdateDto(
    int Id, int ProjectId, string ProjectName, int? ConstructionStageId, string? StageName,
    DateTime UpdateDate, int CompletionPercentage,
    string WorkCompletedToday, string WorkPlannedForTomorrow,
    string IssuesAndDelays, string SafetyObservations, string ResponsibleEngineer,
    string PhotoPath, DateTime CreatedAt);

public record CreateProgressUpdateDto(
    int ProjectId, int? ConstructionStageId, DateTime UpdateDate, int CompletionPercentage,
    string WorkCompletedToday, string WorkPlannedForTomorrow,
    string IssuesAndDelays, string SafetyObservations, string ResponsibleEngineer);

// Dashboard DTO
public record DashboardDto(
    int TotalProjects, int ActiveProjects, int CompletedProjects,
    decimal AverageCompletion, decimal TotalEstimatedBudget, decimal TotalActualCost,
    decimal TotalRemainingBudget, int LowStockMaterials, int AvailableEquipment,
    List<ProjectSummaryDto> RecentProjects,
    List<MaterialAlertDto> LowStockAlerts,
    List<EquipmentAlertDto> MaintenanceAlerts,
    List<MonthlyExpenseDto> MonthlyExpenses);

public record ProjectSummaryDto(int Id, string Name, string Status, int CompletionPercentage, decimal EstimatedBudget, decimal ActualCost, DateTime PlannedCompletionDate);
public record MaterialAlertDto(int Id, string Name, string Category, decimal CurrentStock, decimal MinimumStockThreshold, string Unit);
public record EquipmentAlertDto(int Id, string Name, string EquipmentCode, DateTime? NextMaintenanceDate);
public record MonthlyExpenseDto(string Month, decimal Amount);
