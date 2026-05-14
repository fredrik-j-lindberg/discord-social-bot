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

## Commits

Use [Conventional Commits](https://www.conventionalcommits.org/):

- Format: `<type>(<optional scope>): <short summary>`
- Common types: `feat`, `fix`, `refactor`, `chore`, `docs`, `test`
- Use a bullet-point body for non-trivial changes, summarising each meaningful change
- Group only related changes in a single commit — if changes serve different purposes, split them into separate commits
- Example:

  ```
  feat: add /interests command with self-assignable interest roles

  - Add /interests command — opens multi-select modal for members
  - Add /config setting:Interests for admin role picker
  - Add roleSelect modal input type to shared modal helper
  ```

## Documentation Maintenance

Keep documentation in sync with every change — do not leave docs stale. After any implementation change, immediately update:

- **`README.md`** — for architecture, conventions, setup, commands, features, or environment variable changes
- **`.github/copilot-instructions.md`** (this file) — for agent-specific coding guidance changes
- **`.github/agents/dora-dev.agent.md`** — for changes to codebase knowledge or development patterns
