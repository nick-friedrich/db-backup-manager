# Database Backup Manager

A powerful PostgreSQL backup manager with automated scheduling, Docker support, and version detection.

## 🚀 Quick Start

```bash
# Clone the repository
git clone https://github.com/nick-friedrich/db-backup-manager.git
cd db-backup-manager

# Install dependencies
bun install

# Start the application
bun run dev
```

## 📁 Project Structure

```
db-backup-manager/
├── apps/
│   ├── dbm-backend/      # Elysia.js API server
│   └── dbm-frontend/     # React web interface
├── packages/
│   └── sqlite_schema/    # Shared database schemas
├── docker-compose.yml
├── package.json
└── README.md
```

## 🔧 Features

- 🔄 **Automated Scheduling** - Cron-based backup scheduling with timezone support
- 🐳 **Docker Integration** - Version-specific pg_dump using Docker containers
- 📊 **Version Detection** - Automatic PostgreSQL version detection and storage
- 📁 **File Management** - Backup file storage, download, and cleanup
- 🌐 **REST API** - Complete CRUD operations for connections and schedules
- ⚡ **Built with Bun** - High-performance runtime with Elysia framework
- 🔒 **Secure** - Better Auth integration with user isolation
- 📦 **Import/Export** - Full data backup and restore functionality

## 📚 Documentation

- [Backend Documentation](./apps/dbm-backend/README.md) - API endpoints and server setup
- [Frontend Documentation](./apps/dbm-frontend/README.md) - UI components and development
- [Database Schemas](./packages/sqlite_schema/README.md) - Database schema documentation

## 🛠️ Development

### Backend Development

```bash
bun run dev:backend
```

### Frontend Development

```bash
bun run dev:frontend
```

### Run Both

```bash
bun run dev
```

## 🚀 Production Deployment

Attention: I built this for use in my local network, so it might not be suitable for production. Use with caution.

### Build for Production

```bash
# Build all components
bun run build

# Or build individually
bun run build:backend   # Creates binary at apps/dbm-backend/bin/server
bun run build:frontend # Creates dist files at apps/dbm-frontend/dist
```

### Start Production Services

```bash
# Start both services (backend on :3000, frontend on :5173)
bun run start

# Or start individually
bun run start:backend   # Backend API server
bun run start:frontend  # Frontend static file server
```

### Using Docker

```bash
docker-compose up -d
```

### Production Requirements

- **Database**: PostgreSQL instance running and accessible
- **Ports**: 3000 (API), 5173 (Frontend)
- **Environment**: Ensure `.env` files are configured in both apps
- **Dependencies**: Run `bun install` before building

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📝 License

MIT License - see LICENSE file for details

---

Built with ❤️ using Bun, Elysia, React, and Docker
