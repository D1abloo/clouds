# Contributing to CloudOps Control Center

Thank you for contributing. This monorepo uses npm workspaces.

## Development setup

1. Node.js 20+ and Docker
2. `npm install` at repository root
3. `cp .env.example .env` and adjust values
4. `./scripts/dev-up.sh`
5. `./scripts/migrate.sh` and `./scripts/seed.sh`
6. `npm run dev:backend`, `npm run dev:frontend`, `npm run dev:workers`

## Branching

- `main` — stable
- `feature/<name>` — new features
- `fix/<name>` — bug fixes

## Commit messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat(scope): description`
- `fix(scope): description`
- `docs:`, `chore:`, `refactor:`, `test:` as needed

## Code style

- TypeScript strict mode where configured
- NestJS modules follow existing `apps/backend-api` layout
- Run `./scripts/test.sh` before opening a PR
- Do not commit secrets; use `.env` locally and Kubernetes secrets in cluster

## Pull requests

1. Keep changes focused
2. Update docs when behavior or env vars change
3. Ensure `npm run lint` and `./scripts/test.sh` pass
4. Link related issues when applicable

## Security

Report vulnerabilities privately to the maintainers; do not open public issues for undisclosed security bugs.
