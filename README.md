# Discord Social Bot

## Introduction

This is a Discord bot built to cater to some specific needs I had a hard time finding good solutions for in existing bots.

## Features

- **Event syncing with a role**

  If your event has a `roleId="<idhere>"` in its description, whenever someone adds themselves to the event they receive the role, and vice versa

- **Event reminders**

  If your event has a `channelId="<idhere>"` as well as `shouldRemind="true"` in its description, a reminder for the event will be sent ~24 hours before, pinging the ones set as interested

- **User data**

  _Note: Much of the userdata fields are required to opt in for on guild by guild basis in the guild config._
  - Via /pii a user can enter user data about themselves
  - Via /whois you can view info about a user
  - Via /userdata you can list specific userdata

  - Bot will wish happy birthday to those who have their birthday today

    _Note: This requires the birthdayWishes channel to be set in the guild config_

## Getting Started

### Pre-requisites:

- Node 21 (nvm recommended)
- pnpm
- Discord bot credentials (ask repo author or setup your own bot)

### Quick start

To run the bot locally, follow the steps below:

1. Clone this repository to your local machine:
   ```bash
   git clone https://github.com/fredrik-j-lindberg/discord-social-bot.git
   ```
2. Enter the new directory
3. Make sure you are on the right node version
   ```bash
   nvm use
   ```
4. Install all packages
   ```bash
   pnpm install
   ```
5. Create the .env file. See the example [env file](./.env.example)
6. Run the bot
   ```bash
   pnpm start
   ```

## Router

The /src/router folder houses routers that are responsible for routing user interactions to the right place.

This is the entrypoint for any command or modal or similar, and the routers are set up in a way to automatically import the relevant files from the subfolders.

### Adding new commands

1. Add a new command file under /src/router/commands containing relevant logic. Example files as reference:
   - [ping](./src/router/commands/ping.ts) - Very basic command
   - [userdata](./src/router/commands/userdata.ts) - Command with argument
   - [pii](./src/router/commands/pii.ts) - Command which triggers modal. See [Adding a new modal](#adding-a-new-modal) for context around modals

2. Run `pnpm refreshCommands`

   Note that it refreshes it with the credentials currently stored in `.env`, if you for example run the local version of the bot you'll need to make sure to refresh the commands for the production bot as well when you are ready to do so

### Adding a new modal

Modals are Discord native form dialogs that allow you to collect user input in a nice way.

You can add a new modal by creating a new file under /src/router/modals containing relevant logic. Use [piiModal](./src/router/modals/piiModal.ts) as reference

## Modifying database schema

This repo uses [Drizzle](https://orm.drizzle.team/) as the database ORM, and the database schema is configured in code

In order to modify the database schema, do the following steps:

1. Modify the [schema.ts](./src/lib/database/schema.ts) file. See the drizzle docs for more info on this.
2. Generate a new database migration with the command:

```bash
pnpm db:schema-generate --name=<name>
```

3. Confirm that the migration file looks reasonable and won't break anything once applied
4. Run the migration:

```bash
pnpm db:schema-migrate
```

Now your database should be up to date with the latest migration.

# TODO

- Feats:
  - Update nickname when user is updated via events
  - Guild config improvements
    - Move guildconfigs to database?
    - Make it configurable via commands
  - Event gcal syncing?
- Improved devx
  - Look into linting improvements
    - unnecessary conditionals?
  - Formatting improvements
    - No semi?
