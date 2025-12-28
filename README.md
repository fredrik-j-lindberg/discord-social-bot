# Discord Social Bot

## Introduction

This is a Discord bot built to cater to some specific needs I had a hard time finding good solutions for in existing bots.

## Features

### Event syncing with a role

If your event has a `roleId="<idhere>"` in its description, whenever someone adds themselves to the event they receive the role, and vice versa

### Event reminders

If your event has a `channelId="<idhere>"` as well as `shouldRemind="true"` in its description, a reminder for the event will be sent ~24 hours before, pinging the ones set as interested

### Member data

#### Managing and viewing member data

_Commands_

- Via /pii a user can enter member data about themselves
- Via /whois you can view info about a member
- Via /memberdata you can list specific memberdata

_Notes_

- Some native discord stats are included in the stats, such as:
  - account creation date
  - server join date
- Bot keeps track of some activity stats, such as:
  - favorite emojis
  - message count
  - reaction count
- Member data fields generally require opt in on a guild level. This is configured in the guild config.
- Member data is guild-scoped, so e.g. if you are in two separate guilds who both have the bot, the member data does not automatically sync between guilds. This is to make it possible for you to share data in guild X you do not necessarily want exposed in guild Y

#### Birthdays

Bot will wish happy birthday to those who have their birthday today

_Note: This requires the birthdayWishes channel to be set in the guild config and that the user has added their birthday via /pii_

### Server data

Via the /serverdata command you can access some information relating to the server. E.g. the most or least popular server emojis

### Inactivity monitor

Opt in functionality for all guilds is to enable inactivity monitoring. You opt in via `/config setting: Inactivity`, and can set:

- Days until members are deemed inactive
- Days as inactive before they are automatically kicked
- Invite link to make it easy for kicked members to re-join
- Inactive role id, which is added to the user when they are marked as inactive

Members will receive a heads-up when they are marked as inactive and when they are kicked. When kicked the message will also contain the invite link if one has been set via the /config command

### Random stuff

- If a message contains the text "christian server" the bot will respond with a cross, which is a reference to the legacy pg-13 status of the Eithon community
- Via the /config command guild scoped configuration for the bot can be administered. For example it is possible to configure which channel log messages should end up in, as well as the [inactivity monitoring](#inactivity-monitor) configuration
- Photo uploads
  - /addtag - Add a tag that you can associate a photo with when uploading
  - /photo upload - Upload photo(s)
  - /photo view - View photos

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
┃ ┃ ┗ 📜 modalSubmitRouter.ts - Listens to the events but only proceeds with modal submit interactions
┃ ┣ 📜 index.ts - Just exporting the event file for better looking imports
┃ ┗ 📜 interactionCreateEvent.ts - Hooks up all the listeners to the event and wraps them with basic error handling and logging.
```

If you want to add a listener to an event we already have listeners for, simply copy a `/events/<eventName>/listeners/<listener>` file and tweak it.

If you want to add listeners for a new event, copy a `/events/<eventName>` folder and tweak it, then call the new registration method from [src/events/index.ts](src/events/index.ts)

### Commands

The `./src/commands` folder houses all of the bot commands. All files under this folder are automatically imported by the [commandRouter](./src/events/interactionCreate/listeners/commandRouter.ts) interactionCreate listener.

The command router will handle some basic error handling for your command, as well as facilitates replying capabilities. Anything returned by the execute function of a command module will be used as the reply to the user. Return an array of EmbedBuilder's to use the pagination feature (one embed for each page).

#### Adding new commands

1. Add a new command file under `/src/commands` containing relevant logic. Example files as reference:
   - [ping](./src/commands/ping.ts) - Very basic command
   - [memberdata](./src/commands/memberdata.ts) - Command with argument
   - [pii](./src/commands/pii.ts) - Command which triggers modal. See [Adding a new modal](#adding-a-new-modal) for context around modals

2. Run `pnpm refreshCommands`

   For Discord to pick up your new command, you need to run the refresh script. Otherwise users won't be able to see and autocomplete the command.

   Note that it refreshes it with the credentials currently stored in `.env`, if you for example run the local version of the bot you'll need to make sure to refresh the commands for the production bot as well when you are ready to do so

### Modals

Modals are Discord native form dialogs that allow you to collect user input in a nice way.

You can add a new modal by creating a new file under `/src/modals` containing relevant logic. Use [piiModal](./src/modals/piiModal.ts) as reference

## Database

This repo uses [Drizzle](https://orm.drizzle.team/) as the database ORM, and the database schema is configured in code

### Modifying database schema

In order to modify the database schema, follow the following steps:

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

### Inspect the database

Run `pnpm db:inspect` to run Drizzle studio locally, allowing you to inspect how the database looks.

## Linting & formatting

This project is heavily reliant on linting via typescript eslint and prettier. Without eslint formatting on save you'll have an annoying time coding in this repository.

There are also some helpful scripts for this:

- `pnpm lint` - make sure that eslint is happy
- `pnpm check-types` - make sure typescript is happy
- `pnpm verify` - convenience script for running the above two (and tests)
- `pnpm lint:fix` - auto fix what is possible to auto fix

## Testing

- `pnpm test` - run the Vitest test suite

## Logging

The bot logs to a few places:

- **Console** (pretty printed)
- **Log file** (JSON). Defaults to `./logs/app.log` but can be configured via the `LOG_FILE_PATH` env variable.
  - The `start` script currently override this to match the deployed setup.
  - In production, the file is scraped and sent to [Loki](#loki-grafana-cloud).
- **Guild webhook** (optional). Configure via `/config`.
  - For a log to be sent to a guild, it needs a `guildId` that matches that guild.

### Loki (Grafana Cloud)

In production we use Grafana Alloy to scrape the log file(s) and send them to Grafana Cloud Loki.

- Logs can be found [here](https://dorabot.grafana.net/a/grafana-lokiexplore-app/explore/service/dora-bot/logs?from=now-6h&to=now&var-ds=grafanacloud-logs&var-filters=service_name%7C%3D%7Cdora-bot&patterns=%5B%5D&var-lineFormat=&var-fields=&var-levels=&var-metadata=&var-jsonFields=&var-patterns=&var-lineFilterV2=&var-lineFilters=&timezone=browser&var-all-fields=&displayedFields=%5B%22msg%22,%22action%22,%22event%22%5D&urlColumns=%5B%22Time%22,%22Line%22,%22detected_level%22,%22msg%22,%22action%22,%22event%22%5D&visualizationType=%22table%22&sortOrder=%22Descending%22)
- A guide for configuring the scraping can be found [here](https://grafana.com/docs/grafana-cloud/send-data/logs/collect-logs-with-alloy/).
- We use logrotate to avoid the log files becoming too large. See a guide about it [here](https://betterstack.com/community/guides/logging/how-to-manage-log-files-with-logrotate-on-ubuntu-20-04/) & pino's recommendation for what config to use [here](https://getpino.io/#/docs/help?id=log-rotation)

## TODO

### Feats

- Improvements to inactivity check
  - Post the inactivity summary in a server channel
  - Consider if we should have a way to exempt users from the inactivity check
- Smhi integration?
- Instead of below, perhaps an integration with Cloudflare R2 to simply host images for us
- Add google photos integration. Edit: Turns out google photos is no longer possible to integrate with for the type of functionality I want, so to accomplish this we would need some sort of image scraping capabilities (scraping a google photos album).
  - Update: [POC branch here](https://github.com/fredrik-j-lindberg/discord-social-bot/tree/poc/web-scraper) - Failed to find reliable dates in the shared Google Photos album URL. The date found in the HTML proved to be the photo date rather than the upload date. A relative timestamp was found in the "comment section" of the album, so that is a potential next test. But then we would need to parse the relative text and figure out whether it warrants an announcement or not.
- Add MCP capabilities (being able to ask the bot for a specific piece of member info etc)
  - Note that as long as we use an API for the LLM we need to make this opt in
- Move remaining guildconfigs to database (see how it was done for inactivity and logs config in the /config command)
- Event gcal syncing?

### Misc

- Align action wrapper usage around database methods (e.g. the new services)
- Look through inline TODO comments in code
