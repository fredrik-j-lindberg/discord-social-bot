# Discord Social Bot

## Introduction

This is a Discord bot built to cater to some specific needs I had a hard time finding good solutions for in existing bots

## Features

- **Event syncing with a role**

  If your event has a `roleId="<idhere>"` in its description, whenever someone adds themselves to the event they receive the role, and vice versa

- **Event reminders**

  If your event has a `channelId="<idhere>"` as well as `shouldRemind="true"` in its description, a reminder for the event will be sent ~24 hours before, pinging the ones set as interested

- **User data**

  - Via /pii a user can enter user data about themselves
  - Via /userdata you can view users data that they have shared

    _Note: This requires the guild config to have enabled the birthdayInput field in "piiFields"_

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

# Adding new commands

1. Add your command file containing relevant logic. Example files as reference:

   - [ping](./src/router/commands/ping.ts) - Very basic command
   - [userdata](./src/router/commands/userdata.ts) - Command with argument
   - [pii](./src/router/commands/pii.ts) - Command which triggers modal

2. Run `pnpm refreshCommands`

   Note that it refreshes it with the credentials currently stored in `.env`, if you for example run the local version of the bot you'll need to make sure to refresh the commands for the production bot as well when you are ready to do so

# TODO

- Feats:
  - Command to get user data of person
  - Support getting height (and other) data from /userdata
  - Update nickname when user is updated via events
  - Guild config improvements
    - Move guildconfigs to airtable (new base)
    - Make it configurable via commands
- Docs
  - Add router section to readme
- Improved devx
  - Move modals and crons to router folder as well?
  - Make routers handle replies to avoid conflicting replies (return string from execute?)
  - Enforce import type syntax
  - Look into linting improvements
    - import order
    - circular dependencies
    - unnecessary conditionals?
  - Formatting improvements
    - No semi?
