# Discord Social Bot — Workspace Instructions

## Codebase Reference

See `README.md` for project architecture, repository structure, coding conventions, database setup, and feature documentation.

## Coding Conventions

- Wrap async operations with `actionWrapper()` for consistent error handling
- Use Zod for runtime validation at boundaries
- Database queries go through service files, not directly in commands
- Always run `pnpm verify` after making changes (runs lint, type checking, and tests)
- Use the Discord helpers in `src/lib/discord/` for guild operations — do not call discord.js APIs directly:
  - `getMember` / `getMembersInRole` from `~/lib/discord/user` — fetching guild members
  - `addRole` / `removeRole` / `getRole` from `~/lib/discord/roles` — managing member roles
  - `createRoleMention` / `createUserMention` / `createDiscordTimestamp` / `createCopyableText` etc. from `~/lib/discord/message` — formatting Discord message strings; do not write inline `<@&id>` or `<@id>` templates directly
  - If a suitable helper does not exist, add it to the appropriate file in `src/lib/discord/` following the existing pattern

## Documentation Maintenance

When making changes that affect architecture, conventions, project structure, or features, update the relevant documentation:

- **`README.md`** — for architecture, conventions, setup, commands, features, or environment variable changes
- **`.github/copilot-instructions.md`** (this file) — for agent-specific coding guidance changes
- **`.github/agents/dora-dev.agent.md`** — for changes to codebase knowledge or development patterns
