# BuildSmart Construction Management

BuildSmart is a construction management application with a React frontend, an ASP.NET Core API, and an Entity Framework Core database. The browser talks to the API over HTTP; the API authenticates users, checks their roles, reads and writes records, and returns JSON to the frontend.

## How the parts work together

```text
Browser (React + Vite, localhost:3000)
        │  /api requests, with JWT after sign-in
        ▼
ASP.NET Core API (localhost:5259)
        │  Entity Framework Core
        ▼
SQLite (ConstructionApi\construction.db by default)
```

- **Frontend:** React pages render the dashboard, projects, stages, progress updates, materials, workers, attendance, equipment, expenses, budgets, and reports. Axios API clients are in `src/services/api.js`.
- **Development connection:** Vite proxies requests beginning with `/api` to `http://localhost:5259`. This keeps browser API calls on the frontend origin during local development.
- **Backend:** ASP.NET Core controllers under `ConstructionApi\Controllers` expose JSON endpoints under `/api`. Entity Framework Core uses `AppDbContext` to map API operations to database tables.
- **Database:** with no connection string set, the API uses SQLite at `ConstructionApi\construction.db`. On startup, the seeder ensures the database exists, creates the standard identity roles, and adds sample construction records when the corresponding tables are empty. If a PostgreSQL connection string is configured, the API uses PostgreSQL instead.
- **Authentication:** ASP.NET Core Identity stores users and password hashes. A successful login returns a 24-hour JWT. The frontend stores the token locally and attaches it to API requests. The API validates that token and enforces authorization on protected endpoints.
- **Data updates:** API writes use Entity Framework Core `SaveChangesAsync`; related operations (such as material stock transactions) are saved together. A saved database change invalidates the cached dashboard summary.

## Run locally

Requirements: Node.js and the .NET 10 SDK. From the repository root, configure a JWT signing key and the first local administrator once. User Secrets keeps these values outside the source tree. Generate a private random signing key in PowerShell:

```powershell
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
$keyBytes = New-Object byte[] 48
$rng.GetBytes($keyBytes)
$rng.Dispose()
$jwtKey = [Convert]::ToBase64String($keyBytes)
dotnet user-secrets set --project .\ConstructionApi\ConstructionApi.csproj "Jwt:Key" $jwtKey
$adminEmail = Read-Host "Administrator email"
$adminPassword = Read-Host -Prompt "Administrator password" -AsSecureString
$adminPasswordText = [System.Net.NetworkCredential]::new('', $adminPassword).Password
dotnet user-secrets set --project .\ConstructionApi\ConstructionApi.csproj "Seed:Admin:Enabled" "true"
dotnet user-secrets set --project .\ConstructionApi\ConstructionApi.csproj "Seed:Admin:Email" $adminEmail
dotnet user-secrets set --project .\ConstructionApi\ConstructionApi.csproj "Seed:Admin:Password" $adminPasswordText
Remove-Variable adminPassword, adminPasswordText
```

Passwords must contain at least 8 characters, including an uppercase letter, a lowercase letter, and a digit. The seed creates this Admin only on Development startup and only if that email does not already exist. Keep the same JWT key between restarts; generating a new one invalidates existing tokens. Do not commit real secrets.

Open two PowerShell terminals at the repository root (`SMARTCONSTRUCTION-main`).

**Terminal 1 — API:**

```powershell
dotnet run --project .\ConstructionApi\ConstructionApi.csproj --launch-profile http
```

The API listens at `http://localhost:5259`. In Development, Swagger is available at `http://localhost:5259/swagger/index.html`.

**Terminal 2 — frontend:**

```powershell
cd .\frontend
npm ci
npm run dev
```

Open `http://localhost:3000`. Keep both terminal processes running while using the application.

For a different API URL, set `VITE_API_BASE_URL` for the frontend build/dev process. The default is `/api` (proxied to port 5259 by Vite).

## Shared login and roles

There is **one login page for all roles**. Users enter their email and password; the role already assigned to their account determines which actions the API permits. There is no role selector at login. Every role lands on the dashboard after sign-in; its summaries, quick links, and available navigation are tailored to the signed-in role.

| Role | Typical access |
| --- | --- |
| `Admin` | Full access; create accounts, assign roles, enable/disable or delete accounts, and perform authorized deletes. |
| `ProjectManager` | Manage projects, stages, workers, equipment, and expenses; record attendance, progress, and equipment maintenance; view dashboards and reports. |
| `SiteEngineer` | View projects; update stages and progress; record attendance and expenses; view equipment and add maintenance records. |
| `StoreManager` | View materials and create/update materials and stock transactions. |

The API is the source of truth for permissions. The frontend hides routes and actions users cannot access and shows an Access Denied page on restricted routes. API authorization independently rejects unauthorized requests with 401 (not signed in/expired token) or 403 (signed in, insufficient role). Tokens are checked against the current active account and role on each API request, so disabled accounts and changed roles lose access immediately. Five failed password attempts lock an account temporarily.

The Admin and ProjectManager dashboards show project, budget, equipment, and inventory summaries. The SiteEngineer dashboard summarizes construction stages, today's attendance, progress updates, and expense records. The StoreManager dashboard highlights inventory, low-stock alerts, and recent stock transactions. Signing out remains available from the shared sidebar for every role.

### Sign in and manage user accounts

Use the Admin email/password configured above at `http://localhost:3000/login`. In the sidebar, open **User access** to create an account, select one of the four roles, change a role, disable/enable an account, or delete an account. The current Admin cannot remove their own access, and the last active Admin cannot be disabled, demoted, or deleted. Users then sign in at the same login page with the account email and password. Passwords are stored as Identity password hashes, never as plaintext.

Self-signup on the login page creates a `SiteEngineer` account only. Users cannot choose or promote their own role; creating and assigning roles requires an authenticated Admin. Logout clears the browser's stored token and user data. Expired/invalid tokens are cleared automatically and redirect to login.

## Database configuration

- **SQLite (default):** leave `ConnectionStrings:DefaultConnection` empty. The API uses `ConstructionApi\construction.db`.
- **PostgreSQL:** set the API configuration value `ConnectionStrings__DefaultConnection` to a PostgreSQL connection string (for example, using a local environment variable or User Secrets), then restart the API.

The current startup setup uses Entity Framework Core `EnsureCreated` rather than database migrations. Back up the SQLite database before manually changing or replacing it. Authentication tables are part of the same Identity database.

## Useful commands

From the project root:

```powershell
dotnet build .\ConstructionApi\ConstructionApi.csproj
```

From the `frontend` folder:

```powershell
npm run build
npm run lint
```

There is currently no automated test project in the repository. Builds/lint can be run with the commands above.
