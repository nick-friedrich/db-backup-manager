# Database Backup Manager - Backend

A powerful PostgreSQL backup manager with automated scheduling, Docker support, and version detection.

## 🚀 Features

- 🔄 **Automated Scheduling** - Cron-based backup scheduling with timezone support
- 🐳 **Docker Integration** - Version-specific pg_dump using Docker containers
- 📊 **Version Detection** - Automatic PostgreSQL version detection and storage
- 📁 **File Management** - Backup file storage, download, and cleanup
- 🌐 **REST API** - Complete CRUD operations for connections and schedules
- ⚡ **Built with Bun** - High-performance runtime with Elysia framework
- 🔒 **Secure** - Better Auth integration with user isolation

## 🛠 Tech Stack

- **[Bun](https://bun.sh)** - Runtime, package manager, and build tool
- **[Elysia](https://elysiajs.com)** - Fast and lightweight web framework
- **[Better Auth](https://better-auth.com)** - Authentication and user management
- **[Drizzle ORM](https://orm.drizzle.team)** - Type-safe database operations
- **[PostgreSQL](https://postgresql.org)** - Primary database
- **[Docker](https://docker.com)** - Version-specific pg_dump execution

## 📋 Prerequisites

- **Bun** >= 1.0.0
- **PostgreSQL** >= 16
- **Docker** (for version-specific backups)

## ⚡ Quick Start

### 1. Install Dependencies

```bash
# From monorepo root
bun install
```

### 2. Start Database

```bash
# Start PostgreSQL
docker-compose up -d
```

### 3. Environment Setup

```bash
# Create .env file
DATABASE_URL="postgres://postgres:postgres@localhost:5432/postgres"
BASE_URL="http://localhost:3000"
BETTER_AUTH_SECRET="your-secret-key"
```

### 4. Run Migrations

```bash
cd apps/dbm-backend
bun run drizzle-kit migrate
```

### 5. Start Server

```bash
# From monorepo root
bun run dev:dbm:backend

# Or from this directory
bun run dev
```

Server starts at `http://localhost:3000` 🎉

## 🔧 API Endpoints

### Database Connections

- `GET /connections` - List user's database connections
- `POST /connections` - Create new database connection
- `GET /connections/:id` - Get specific connection
- `PUT /connections/:id` - Update connection
- `DELETE /connections/:id` - Delete connection
- `POST /connections/:id/test` - Test connection and detect version

### Backup Schedules

- `GET /schedules` - List backup schedules
- `POST /schedules` - Create new schedule
- `GET /schedules/:id` - Get specific schedule
- `PUT /schedules/:id` - Update schedule
- `DELETE /schedules/:id` - Delete schedule
- `POST /schedules/:id/run` - Manually trigger backup

### Backup Files

- `GET /backups` - List backup files with pagination
- `GET /backups/:id` - Get backup file details
- `GET /backups/:id/download` - Download backup file
- `DELETE /backups/:id` - Delete backup file
- `GET /backups/stats/summary` - Get backup statistics

## 🔄 Backup Process

### Version Detection

1. **Connection Test**: Queries `SELECT version()` to detect PostgreSQL version
2. **Version Storage**: Major version (e.g., "16") stored in database
3. **Docker Selection**: Uses appropriate `postgres:VERSION` image

### Backup Execution

1. **Docker Check**: Verifies Docker availability
2. **Container Run**: Executes pg_dump in version-specific container
3. **File Storage**: Saves backup to local filesystem
4. **Database Record**: Creates backup file record with metadata

### Scheduling

1. **Cron Parsing**: Supports standard cron expressions
2. **Timezone Support**: Respects user-defined timezones
3. **Job Management**: Tracks last/next run times
4. **Error Handling**: Captures and stores error messages

## 🗃 Database Schema

```sql
-- Database connections
backup_connection (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  host TEXT NOT NULL,
  port INTEGER NOT NULL,
  database TEXT NOT NULL,
  username TEXT NOT NULL,
  password TEXT NOT NULL,
  postgresql_version TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id TEXT REFERENCES auth.user(id)
)

-- Backup schedules
backup_schedule (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  cron_expression TEXT NOT NULL,
  timezone TEXT DEFAULT 'UTC',
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP,
  next_run_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  connection_id TEXT REFERENCES backup_connection(id),
  user_id TEXT REFERENCES auth.user(id)
)

-- Backup files
backup_file (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size_bytes INTEGER NOT NULL,
  status TEXT NOT NULL, -- 'pending', 'completed', 'failed'
  error_message TEXT,
  started_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  schedule_id TEXT REFERENCES backup_schedule(id),
  user_id TEXT REFERENCES auth.user(id)
)
```

## 🐳 Docker Integration

### Automatic Version Detection

```typescript
// Version detection during connection test
const versionResult = await client.query('SELECT version()');
const versionMatch = versionString.match(/PostgreSQL (\d+)\./);
const majorVersion = versionMatch ? versionMatch[1] : null;
```

### Docker Backup Execution

```bash
# Example Docker command generated
docker run --rm \
  -v "/app/backups:/backups" \
  -e "PGPASSWORD=secret" \
  postgres:16 \
  pg_dump --host=host --port=5432 --username=user \
  --dbname=database --file=/backups/backup.sql
```

## 📊 Monitoring

### Backup Statistics

- Total backups count
- Completed vs failed backups
- Storage usage in MB
- Success rate tracking

### Health Checks

```bash
# Server health
curl http://localhost:3000/

# Database connection
curl http://localhost:3000/health/db
```

## 🔒 Security

- **User Isolation** - All data scoped to authenticated user
- **Password Storage** - TODO: Encrypt passwords in production
- **File Access** - Download authentication required
- **CORS Protection** - Configurable allowed origins
- **Input Validation** - Request validation with Elysia

## 🧪 Development

### Available Scripts

```bash
bun run dev          # Development server
bun run drizzle-kit  # Database operations
bun run dk          # Drizzle kit shorthand
```

### Testing

```bash
# Run tests (when available)
bun test

# Manual testing with curl
curl http://localhost:3000/health
```

### Project Structure

```
apps/dbm-backend/
├── src/
│   ├── controller/
│   │   └── database_backupmanager/
│   │       ├── backup_controller.ts
│   │       ├── connection_controller.ts
│   │       └── schedule_controller.ts
│   ├── services/
│   │   ├── backup-executor.ts
│   │   └── backup-scheduler.ts
│   ├── db/
│   │   ├── index.ts
│   │   └── schema.ts
│   ├── lib/
│   │   ├── auth.ts
│   │   └── auth-plugin.ts
│   └── server.ts
├── drizzle/         # Database migrations
├── backups/         # Backup file storage (excluded from git)
└── package.json
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📚 Related Projects

- **Frontend**: `apps/dbm-frontend` - React UI for backup management
- **Schema**: `packages/dbschema` - Shared database schemas
- **Auth**: `apps/auth-backend` - Authentication service

---

Built with ❤️ using Bun, Elysia, and Docker