# AGENTS.md - Guidelines for AI Agents Working on llamaduit

This document provides essential guidelines for AI agents working on the llamaudit codebase.

## Critical Requirements

### 1. Docker Compose Stack

**You MUST use the Docker Compose stack for all development and testing.**

- **NEVER** run Node.js services directly on the host system
- **NEVER** install npm packages on the host system
- **ALWAYS** use Docker containers for all operations

### 2. Development Environment

Start the development environment:

```bash
# Start development services with hot reload
docker compose --profile dev up -d

# View logs
docker compose --profile dev logs -f
```

The services will be available at:
- Frontend: http://localhost:52000
- Backend: http://localhost:52001

### 3. Running Tests

**You MUST run tests before considering any task complete.**

```bash
# Run all tests (uses ephemeral test containers)
./run-tests.sh

# View last test output without re-running
./run-tests.sh --last

# Run only backend tests
./run-tests.sh --backend

# Run only frontend tests
./run-tests.sh --frontend
```

### 4. Leave Stack Running

**You MUST leave the Docker Compose stack up and running when you are finished.**

Do NOT run:
- `docker compose down`
- `docker compose stop`

When you complete your work, the stack should remain operational.

### 5. Fix Regressions

If your changes cause test failures:

1. Run `./run-tests.sh` to identify failures
2. Fix all failing tests before completing the task
3. Verify all tests pass with `./run-tests.sh`

## Project Structure

```
llamaudit/
├── backend/           # Express + Sequelize + TypeScript API
│   ├── src/
│   │   ├── config/    # Configuration and database setup
│   │   ├── models/    # Sequelize models
│   │   ├── routes/    # Express routes
│   │   ├── services/  # Business logic
│   │   ├── middleware/# Express middleware
│   │   └── index.ts   # Application entry point
│   └── tests/         # Jest tests
├── frontend/          # Next.js + Tailwind + TypeScript
│   ├── src/
│   │   ├── app/       # Next.js app router pages
│   │   ├── components/# React components
│   │   ├── contexts/  # React contexts
│   │   ├── hooks/     # Custom hooks
│   │   ├── lib/       # Utilities and API client
│   │   └── types/     # TypeScript types
│   └── public/        # Static assets
├── docker-compose.yml # Docker orchestration
├── run-tests.sh       # Test runner script
└── .env               # Environment variables
```

## Common Commands

### Backend Development

```bash
# Access backend container shell
docker compose --profile dev exec backend-dev sh

# Run backend tests in container
docker compose --profile dev exec backend-dev npm test

# Add a package
docker compose --profile dev exec backend-dev npm install <package>
```

### Frontend Development

```bash
# Access frontend container shell
docker compose --profile dev exec frontend-dev sh

# Run frontend tests in container
docker compose --profile dev exec frontend-dev npm test

# Add a package
docker compose --profile dev exec frontend-dev npm install <package>
```

### Database

```bash
# Connect to PostgreSQL
docker compose exec db psql -U llamaudit -d llamaudit

# View database logs
docker compose logs db
```

## Environment Variables

The `.env` file contains all configuration. Key variables:

- `OPENROUTER_API_KEY` - API key (instead of having to configure via settings)
- `DATABASE_*` - PostgreSQL connection settings
- `FRONTEND_URL` / `NEXT_PUBLIC_API_URL` - Service URLs

## Architecture Notes

### Backend

- **Express** for HTTP routing
- **Sequelize** ORM with PostgreSQL
- **OpenRouter** as an AI provider
- **Ollama** as an AI provider

### Frontend

- **Next.js 14** with App Router
- **Tailwind CSS** for styling
- **Framer Motion** for animations

## Testing Checklist

Before completing any task:

- [ ] Run `./run-tests.sh` and verify all tests pass
- [ ] Manually verify changes work in the browser (if UI changes)
- [ ] Check Docker containers are still running: `docker compose ps`
- [ ] Do NOT stop the Docker stack
