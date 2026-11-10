# Habit Tracker

A personal, single-user tool for ticking off daily Habits. See [GLOSSARY.md](GLOSSARY.md) for the domain language.

## Run it

```sh
TZ=Europe/London docker compose up --build
```

The app is served on http://localhost:3000. `TZ` decides where each Day starts and ends. The SQLite database lives in the `habit-data` volume, and migrations run automatically when the server starts.

## Develop

Needs Node 22 (`nvm use`) and pnpm.

```sh
pnpm install
pnpm dev          # http://localhost:3000, database in ./data
pnpm test         # Vitest, against a temporary SQLite file
pnpm typecheck
pnpm lint
pnpm db:generate  # after changing src/core/schema.ts
```

Domain logic lives in `src/core`. `createCore` takes the database, the current instant and the time zone, so tests can control all three.
