# ServerBot

## Setup (Dev)
### Postgres
1. Copy .env.template and rename it to .env
2. run `docker compose up -d`

### Discord Bot
1. Copy config.template.json and rename it to config.json
2. Fill in the values as required
4. run `npm run db:sync`
5. run `npm run dev`

## Config
All discord bot config values are settable via an env file, however the config is preferred if it is there. This means if a value is missing from the
config file, the env will then be checked. All settings within the env begin with `APP` meaning `guild_id` would become `APP_GUILD_ID`.