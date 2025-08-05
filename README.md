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

- **Random stuff**
  - If a message contains the text "christian server" the bot will respond with a cross, which is a reference to the legacy pg-13 status of the Eithon community

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

## Repository structure

### Events

Discord.js emits Discord events that we can act on. Our listeners for this can be found under `/src/events`. Here is an example of the pattern used to setup an event:

```
📂 events
┣ 📂 interactionCreate - The event that we want to listen to
┃ ┣ 📂 listeners - Files in this dir are automatically picked up as listeners.
┃ ┃ ┣ 📜 commandRouter.ts - Listens to the events but only proceeds with command interactions
┃ ┃ ┗ 📜 modalSubmitRouter.ts - Listens to the events but only proceeds with command interactions
┃ ┣ 📜 index.ts - Just exporting the event file for better looking imports
┃ ┗ 📜 interactionCreateEvent.ts - Hooks up all the listeners to the event and wraps them with basic error handling and logging.
```

If you want to add a listener to an event we already have listeners for, simply copy a `/events/<eventName>/listeners/<listener>` file and tweak it.

If you want to add listeners for a new event, copy a `/events/<eventName>` folder and tweak it, then call the new registration method from [src/events/index.ts](src/events/index.ts)

### Commands

The `./src/commands` folder houses all of the bot commands. All files under this folder are automatically imported by the [commandRouter](./src/events/interactionCreate/listeners/commandRouter.ts) interactionCreate listener.

The command router will handle some basic error handling for your command, as well as facilitates replying capabilities. Anything returned by the execute function of a command module will be used as the reply to the user

#### Adding new commands

1. Add a new command file under `/src/commands` containing relevant logic. Example files as reference:
   - [ping](./src/commands/ping.ts) - Very basic command
   - [userdata](./src/commands/userdata.ts) - Command with argument
   - [pii](./src/commands/pii.ts) - Command which triggers modal. See [Adding a new modal](#adding-a-new-modal) for context around modals

2. Run `pnpm refreshCommands`

   For Discord to pick up your new command, you need to run the refresh script. Otherwise users won't be able to see and autocomplete the command.

   Note that it refreshes it with the credentials currently stored in `.env`, if you for example run the local version of the bot you'll need to make sure to refresh the commands for the production bot as well when you are ready to do so

### Modals

Modals are Discord native form dialogs that allow you to collect user input in a nice way.

You can add a new modal by creating a new file under `/src/modals` containing relevant logic. Use [piiModal](./src/modals/piiModal.ts) as reference

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

## Linting & formatting

This project is heavily reliant on linting via typescript eslint and prettier. Without eslint formatting on save you'll have an annoying time coding in this repository.

There are also some helpful scripts for this:

- `pnpm lint` - make sure that eslint is happy
- `pnpm check-types` - make sure typescript is happy
- `pnpm verify` - convenience script for running the above two
- `pnpm lint:fix` - auto fix what is possible to auto fix

## TODO

- Feats:
  - Add image scraping capabilities (scraping a google photos album)
  - Add mcp capabilities (being able to ask the bot for a specific piece of user info etc)
    - Note that as long as we use an API for the LLM we need to make this opt in
  - Guild config improvements
    - Move guildconfigs to database?
    - Make it configurable via commands
  - Event gcal syncing?
- Improved devx
  - Look into linting improvements
    - unnecessary conditionals?
- Make /pii ephemeral (so only you can see your input and failures)
- Use autocomplete handling in /userdata (similar to /whois) to make the options guild-specific
