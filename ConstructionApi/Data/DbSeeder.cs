using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ConstructionApi.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Configuration;

namespace ConstructionApi.Data;

public static class DbSeeder
{
    public static async Task SeedAsync(
        AppDbContext context,
        UserManager<ApplicationUser> userManager,
        RoleManager<IdentityRole> roleManager,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        // Ensure database is created
        await context.Database.EnsureCreatedAsync();
        string[] indexStatements =
        [
            "CREATE INDEX IF NOT EXISTS \"IX_Projects_Status\" ON \"Projects\" (\"Status\");",
            "CREATE INDEX IF NOT EXISTS \"IX_Expenses_ProjectId_ExpenseDate\" ON \"Expenses\" (\"ProjectId\", \"ExpenseDate\");",
            "CREATE INDEX IF NOT EXISTS \"IX_WorkerAttendances_WorkerId_AttendanceDate\" ON \"WorkerAttendances\" (\"WorkerId\", \"AttendanceDate\");",
            "CREATE INDEX IF NOT EXISTS \"IX_Materials_IsActive\" ON \"Materials\" (\"IsActive\");",
            "CREATE INDEX IF NOT EXISTS \"IX_Equipment_NextMaintenanceDate\" ON \"Equipment\" (\"NextMaintenanceDate\");"
        ];
        foreach (var statement in indexStatements)
            await context.Database.ExecuteSqlRawAsync(statement);

        // Seed Roles
        string[] roles = ["Admin", "ProjectManager", "SiteEngineer", "StoreManager"];
        foreach (var role in roles)
        {
            if (!await roleManager.RoleExistsAsync(role))
            {
                var result = await roleManager.CreateAsync(new IdentityRole(role));
                if (!result.Succeeded)
                    throw new InvalidOperationException($"Could not create the {role} role: {string.Join(", ", result.Errors.Select(error => error.Description))}");
            }
        }

        // Deactivate accounts created by older versions with published demo passwords.
        string[] legacyDemoEmails =
        [
            "admin@buildsmart.com",
            "pm@buildsmart.com",
            "engineer@buildsmart.com",
            "store@buildsmart.com"
        ];
        foreach (var email in legacyDemoEmails)
        {
            var legacyUser = await userManager.FindByEmailAsync(email);
            if (legacyUser is not null && legacyUser.IsActive)
            {
                legacyUser.IsActive = false;
                await userManager.UpdateAsync(legacyUser);
            }
        }

        // Ensure all registered user accounts are active (instant access for everyone)
        var pendingUsers = await userManager.Users
            .Where(u => !u.IsActive && !legacyDemoEmails.Contains(u.Email))
            .ToListAsync();
        foreach (var u in pendingUsers)
        {
            u.IsActive = true;
            await userManager.UpdateAsync(u);
        }

        // A development administrator is created only when explicitly enabled through local secrets.
        if (environment.IsDevelopment() && configuration.GetValue<bool>("Seed:Admin:Enabled"))
        {
            var email = configuration["Seed:Admin:Email"];
            var password = configuration["Seed:Admin:Password"];
            if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
                throw new InvalidOperationException("Seed:Admin:Email and Seed:Admin:Password are required when development admin seeding is enabled.");

            await SeedUser(userManager, email, password, "Local Development Admin", "Admin");
        }

        // Seed Projects
        if (!await context.Projects.AnyAsync())
        {
            var project = new Project
            {
                Name = "Green Valley Residential Building",
                ProjectCode = "GV-2024-001",
                Description = "A premium residential building project with 24 apartments across 6 floors, featuring modern amenities and sustainable design.",
                BuildingType = "Residential",
                ClientName = "Green Valley Developers Pvt Ltd",
                SiteAddress = "Plot No. 45, Sector 12, Green Valley",
                City = "Hyderabad",
                StartDate = new DateTime(2024, 1, 15),
                PlannedCompletionDate = new DateTime(2025, 6, 30),
                EstimatedBudget = 45000000m,
                ActualCost = 18500000m,
                ProjectManager = "Sarah Johnson",
                Status = "InProgress",
                CompletionPercentage = 42
            };
            context.Projects.Add(project);
            await context.SaveChangesAsync();

            // Seed Construction Stages
            var stages = new List<ConstructionStage>
            {
                new() { ProjectId = project.Id, StageName = "Site Preparation", StageOrder = 1, PlannedStartDate = new DateTime(2024, 1, 15), PlannedEndDate = new DateTime(2024, 2, 15), ActualStartDate = new DateTime(2024, 1, 16), ActualEndDate = new DateTime(2024, 2, 20), CompletionPercentage = 100, AssignedEngineer = "Ravi Kumar", Status = "Completed", Notes = "Completed with minor delay due to weather." },
                new() { ProjectId = project.Id, StageName = "Foundation", StageOrder = 2, PlannedStartDate = new DateTime(2024, 2, 16), PlannedEndDate = new DateTime(2024, 4, 15), ActualStartDate = new DateTime(2024, 2, 21), ActualEndDate = new DateTime(2024, 4, 25), CompletionPercentage = 100, AssignedEngineer = "Ravi Kumar", Status = "Completed", Notes = "Deep foundation completed. Soil test passed." },
                new() { ProjectId = project.Id, StageName = "Structural Framework", StageOrder = 3, PlannedStartDate = new DateTime(2024, 4, 16), PlannedEndDate = new DateTime(2024, 7, 31), ActualStartDate = new DateTime(2024, 4, 26), CompletionPercentage = 65, AssignedEngineer = "Ravi Kumar", Status = "InProgress", Notes = "Floors 1-4 framework complete." },
                new() { ProjectId = project.Id, StageName = "Brickwork and Walls", StageOrder = 4, PlannedStartDate = new DateTime(2024, 7, 1), PlannedEndDate = new DateTime(2024, 10, 31), CompletionPercentage = 15, AssignedEngineer = "Ravi Kumar", Status = "InProgress", Notes = "Started on lower floors." },
                new() { ProjectId = project.Id, StageName = "Roofing", StageOrder = 5, PlannedStartDate = new DateTime(2024, 10, 1), PlannedEndDate = new DateTime(2024, 12, 31), CompletionPercentage = 0, AssignedEngineer = "Ravi Kumar", Status = "NotStarted" },
                new() { ProjectId = project.Id, StageName = "Electrical and Plumbing", StageOrder = 6, PlannedStartDate = new DateTime(2024, 11, 1), PlannedEndDate = new DateTime(2025, 2, 28), CompletionPercentage = 0, AssignedEngineer = "Ravi Kumar", Status = "NotStarted" },
                new() { ProjectId = project.Id, StageName = "Flooring and Finishing", StageOrder = 7, PlannedStartDate = new DateTime(2025, 2, 1), PlannedEndDate = new DateTime(2025, 5, 31), CompletionPercentage = 0, AssignedEngineer = "Ravi Kumar", Status = "NotStarted" },
                new() { ProjectId = project.Id, StageName = "Inspection and Handover", StageOrder = 8, PlannedStartDate = new DateTime(2025, 5, 1), PlannedEndDate = new DateTime(2025, 6, 30), CompletionPercentage = 0, AssignedEngineer = "Ravi Kumar", Status = "NotStarted" }
            };
            context.ConstructionStages.AddRange(stages);
            await context.SaveChangesAsync();

            // Seed Expenses
            var expenses = new List<Expense>
            {
                new() { ProjectId = project.Id, Category = "Materials", Description = "Cement purchase - 500 bags", Amount = 250000m, ExpenseDate = new DateTime(2024, 2, 1), PaymentMethod = "Bank Transfer", ReferenceNumber = "REF-001", RecordedBy = "Admin User" },
                new() { ProjectId = project.Id, Category = "Labour", Description = "Site preparation workforce", Amount = 180000m, ExpenseDate = new DateTime(2024, 2, 10), PaymentMethod = "Cash", ReferenceNumber = "REF-002", RecordedBy = "Admin User" },
                new() { ProjectId = project.Id, Category = "Equipment Rental", Description = "Excavator rental - 15 days", Amount = 120000m, ExpenseDate = new DateTime(2024, 2, 15), PaymentMethod = "Bank Transfer", ReferenceNumber = "REF-003", RecordedBy = "Admin User" },
                new() { ProjectId = project.Id, Category = "Materials", Description = "Steel reinforcement bars", Amount = 850000m, ExpenseDate = new DateTime(2024, 3, 5), PaymentMethod = "Cheque", ReferenceNumber = "REF-004", RecordedBy = "Admin User" },
                new() { ProjectId = project.Id, Category = "Labour", Description = "Foundation workforce payment", Amount = 350000m, ExpenseDate = new DateTime(2024, 4, 1), PaymentMethod = "Bank Transfer", ReferenceNumber = "REF-005", RecordedBy = "Admin User" },
                new() { ProjectId = project.Id, Category = "Materials", Description = "Ready mix concrete - 200 cubic meters", Amount = 600000m, ExpenseDate = new DateTime(2024, 5, 10), PaymentMethod = "Bank Transfer", ReferenceNumber = "REF-006", RecordedBy = "Admin User" },
                new() { ProjectId = project.Id, Category = "Transportation", Description = "Material transport charges", Amount = 85000m, ExpenseDate = new DateTime(2024, 5, 20), PaymentMethod = "Cash", ReferenceNumber = "REF-007", RecordedBy = "Admin User" }
            };
            context.Expenses.AddRange(expenses);
            await context.SaveChangesAsync();

            // Seed Progress Updates
            var progressUpdates = new List<ProgressUpdate>
            {
                new() { ProjectId = project.Id, ConstructionStageId = stages[2].Id, UpdateDate = new DateTime(2024, 10, 20), CompletionPercentage = 40, WorkCompletedToday = "Completed column casting for Floor 3", WorkPlannedForTomorrow = "Continue beam work on Floor 4", IssuesAndDelays = "None", SafetyObservations = "All workers wearing PPE", ResponsibleEngineer = "Ravi Kumar" },
                new() { ProjectId = project.Id, ConstructionStageId = stages[2].Id, UpdateDate = new DateTime(2024, 10, 21), CompletionPercentage = 42, WorkCompletedToday = "Beam casting on Floor 3 completed", WorkPlannedForTomorrow = "Start slab work on Floor 3", IssuesAndDelays = "Minor concrete mixer delay", SafetyObservations = "Safety nets installed on all floors", ResponsibleEngineer = "Ravi Kumar" }
            };
            context.ProgressUpdates.AddRange(progressUpdates);
            await context.SaveChangesAsync();
        }

        // Seed Materials
        if (!await context.Materials.AnyAsync())
        {
            var materials = new List<Material>
            {
                new() { Name = "Cement (OPC 53 Grade)", Category = "Binding Material", Unit = "Bags (50kg)", CurrentStock = 320, MinimumStockThreshold = 100, UnitCost = 420m, Supplier = "ACC Cement Ltd", StorageLocation = "Warehouse A" },
                new() { Name = "Steel Reinforcement Bars (TMT 500D)", Category = "Structural", Unit = "MT", CurrentStock = 12.5m, MinimumStockThreshold = 5, UnitCost = 68000m, Supplier = "Tata Steel", StorageLocation = "Open Yard B" },
                new() { Name = "Bricks (Red Clay)", Category = "Masonry", Unit = "Nos", CurrentStock = 25000, MinimumStockThreshold = 5000, UnitCost = 8m, Supplier = "Local Brick Kiln", StorageLocation = "Open Yard A" },
                new() { Name = "River Sand", Category = "Aggregate", Unit = "Cubic Feet", CurrentStock = 180, MinimumStockThreshold = 50, UnitCost = 55m, Supplier = "Sand Suppliers Co.", StorageLocation = "Open Yard C" },
                new() { Name = "Coarse Aggregate (20mm)", Category = "Aggregate", Unit = "Cubic Feet", CurrentStock = 250, MinimumStockThreshold = 80, UnitCost = 45m, Supplier = "Quarry Works Ltd", StorageLocation = "Open Yard C" },
                new() { Name = "Exterior Wall Paint", Category = "Finishing", Unit = "Litres", CurrentStock = 45, MinimumStockThreshold = 200, UnitCost = 320m, Supplier = "Asian Paints", StorageLocation = "Warehouse B" },
                new() { Name = "Electrical Cable (6mm)", Category = "Electrical", Unit = "Meters", CurrentStock = 500, MinimumStockThreshold = 100, UnitCost = 85m, Supplier = "Havells India", StorageLocation = "Warehouse B" },
                new() { Name = "CPVC Plumbing Pipes (1 inch)", Category = "Plumbing", Unit = "Meters", CurrentStock = 300, MinimumStockThreshold = 50, UnitCost = 120m, Supplier = "Astral Pipes", StorageLocation = "Warehouse A" },
                new() { Name = "Floor Tiles (Vitrified 600x600)", Category = "Flooring", Unit = "Sq.Ft", CurrentStock = 1200, MinimumStockThreshold = 500, UnitCost = 65m, Supplier = "Johnson Tiles", StorageLocation = "Warehouse B" },
                new() { Name = "Plywood (18mm BWR Grade)", Category = "Wood Work", Unit = "Sheets", CurrentStock = 30, MinimumStockThreshold = 10, UnitCost = 1850m, Supplier = "Century Plyboards", StorageLocation = "Warehouse A" }
            };
            context.Materials.AddRange(materials);
            await context.SaveChangesAsync();
        }

        // Seed Workers
        if (!await context.Workers.AnyAsync())
        {
            var workers = new List<Worker>
            {
                new() { FullName = "Ramesh Kumar", PhoneNumber = "9876543210", JobTitle = "Bricklayer", JoiningDate = new DateTime(2024, 1, 20), DailyWage = 800m, EmploymentStatus = "Active" },
                new() { FullName = "Suresh Babu", PhoneNumber = "9876543211", JobTitle = "Carpenter", JoiningDate = new DateTime(2024, 2, 1), DailyWage = 900m, EmploymentStatus = "Active" },
                new() { FullName = "Mohan Lal", PhoneNumber = "9876543212", JobTitle = "Steel Fixer", JoiningDate = new DateTime(2024, 2, 5), DailyWage = 950m, EmploymentStatus = "Active" },
                new() { FullName = "Rajesh Singh", PhoneNumber = "9876543213", JobTitle = "Mason", JoiningDate = new DateTime(2024, 1, 25), DailyWage = 850m, EmploymentStatus = "Active" },
                new() { FullName = "Arun Sharma", PhoneNumber = "9876543214", JobTitle = "Plumber", JoiningDate = new DateTime(2024, 3, 10), DailyWage = 900m, EmploymentStatus = "Active" },
                new() { FullName = "Vijay Kumar", PhoneNumber = "9876543215", JobTitle = "Electrician", JoiningDate = new DateTime(2024, 3, 15), DailyWage = 950m, EmploymentStatus = "Active" },
                new() { FullName = "Anand Rao", PhoneNumber = "9876543216", JobTitle = "Helper", JoiningDate = new DateTime(2024, 1, 20), DailyWage = 550m, EmploymentStatus = "Active" },
                new() { FullName = "Prakash Nair", PhoneNumber = "9876543217", JobTitle = "Helper", JoiningDate = new DateTime(2024, 2, 10), DailyWage = 550m, EmploymentStatus = "Inactive" }
            };
            context.Workers.AddRange(workers);
            await context.SaveChangesAsync();
        }

        // Seed Equipment
        if (!await context.Equipment.AnyAsync())
        {
            var equipment = new List<Equipment>
            {
                new() { Name = "Concrete Mixer (1 Bag)", EquipmentCode = "EQ-001", Category = "Concrete Equipment", OwnershipType = "Owned", Condition = "Good", Availability = "Assigned", RentalCostPerDay = 0, NextMaintenanceDate = new DateTime(2024, 12, 1) },
                new() { Name = "Tower Crane (50T)", EquipmentCode = "EQ-002", Category = "Lifting Equipment", OwnershipType = "Rented", Condition = "Good", Availability = "Assigned", RentalCostPerDay = 15000m, NextMaintenanceDate = new DateTime(2024, 11, 15) },
                new() { Name = "Excavator (CAT 320)", EquipmentCode = "EQ-003", Category = "Earthwork Equipment", OwnershipType = "Rented", Condition = "Good", Availability = "Available", RentalCostPerDay = 12000m },
                new() { Name = "Diesel Generator (125 KVA)", EquipmentCode = "EQ-004", Category = "Power Equipment", OwnershipType = "Owned", Condition = "Good", Availability = "Assigned", RentalCostPerDay = 0, NextMaintenanceDate = new DateTime(2024, 11, 30) },
                new() { Name = "Scaffolding Set (Complete)", EquipmentCode = "EQ-005", Category = "Safety Equipment", OwnershipType = "Owned", Condition = "Fair", Availability = "Assigned", RentalCostPerDay = 0 },
                new() { Name = "Bulldozer (CAT D6)", EquipmentCode = "EQ-006", Category = "Earthwork Equipment", OwnershipType = "Rented", Condition = "Good", Availability = "Available", RentalCostPerDay = 14000m },
                new() { Name = "Plate Compactor", EquipmentCode = "EQ-007", Category = "Compaction Equipment", OwnershipType = "Owned", Condition = "Good", Availability = "Available", RentalCostPerDay = 0 }
            };
            context.Equipment.AddRange(equipment);
            await context.SaveChangesAsync();
        }
    }

    private static async Task SeedUser(UserManager<ApplicationUser> userManager, string email, string password, string fullName, string role)
    {
        if (await userManager.FindByEmailAsync(email) is null)
        {
            var user = new ApplicationUser
            {
                UserName = email,
                Email = email,
                FullName = fullName,
                Role = role,
                EmailConfirmed = true
            };
            var result = await userManager.CreateAsync(user, password);
            if (!result.Succeeded)
                throw new InvalidOperationException($"Could not create the development administrator: {string.Join(", ", result.Errors.Select(error => error.Description))}");

            var roleResult = await userManager.AddToRoleAsync(user, role);
            if (!roleResult.Succeeded)
                throw new InvalidOperationException($"Could not assign the {role} role: {string.Join(", ", roleResult.Errors.Select(error => error.Description))}");
        }
    }
}
