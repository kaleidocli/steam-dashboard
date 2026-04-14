# Steam Dashboard

A Steam profile dashboard built with Next.js, React, Tailwind CSS, and Prisma. Enter a Steam ID64 or vanity profile name to load a player overview, library metrics, recent activity, backlog insights, and a tag-based breakdown of the user's game collection.

![Steam Dashboard Screenshot](https://i.imgur.com/tn0pTMo.png)


## Overview

This project renders a Steam analytics dashboard on the server and pulls data from the Steam Web API. It combines profile, owned game, and recent activity data with SteamSpy tag metadata to present a more visual snapshot of a user's library and play habits.

The UI is organized like a modern gaming dashboard with:

- A profile header with avatar, status, join date, region, and Steam profile link
- Summary cards for total games, hours played, average hours per played game, and backlog/completion rate
- A top-hours chart for the most-played titles
- A playtime distribution breakdown across the user's library
- A tag analysis section powered by SteamSpy tag data
- A recent activity panel for games played in the last two weeks
- A backlog table highlighting unplayed games

## Features

- Search by Steam ID64 or custom Steam vanity name
- Server-rendered dashboard page using the App Router
- API route for Steam user summary lookups at `/api/steam-user`
- Steam Web API integration for profile, owned games, and recent games
- SteamSpy integration for tag-based library analysis
- In-memory response caching plus Next.js fetch revalidation
- Remote image support for Steam avatar/CDN assets
- Prisma setup for storing Steam users in PostgreSQL

## Tech Stack

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS 4
- Prisma 7
- PostgreSQL

## Project Structure

```text
src/
  app/
    page.tsx                  # Server-rendered dashboard entry
    api/steam-user/route.ts   # JSON API for profile lookups
  features/steam-dashboard/
    api/                      # Steam + SteamSpy data loading
    components/               # Dashboard UI
    utils/                    # Metrics and tag helpers
prisma/
  schema.prisma               # Database schema
```

## Environment Variables

Create a `.env.local` file and add the following:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/steam_dashboard?schema=public"
STEAM_API_KEY="your_steam_web_api_key"
```

This project also uses `DIRECT_URL` in `prisma/schema.prisma` for direct database access, so include it if your Prisma setup requires a separate direct connection string.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Add your environment variables in `.env.local`.

3. Generate the Prisma client:

```bash
npm run prisma:generate
```

4. Apply database migrations:

```bash
npm run prisma:migrate
```

5. Start the development server:

```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000).

## Available Scripts

- `npm run dev` starts the local development server
- `npm run build` creates a production build
- `npm run start` runs the production server
- `npm run lint` runs ESLint
- `npm run format` formats the project
- `npm run prisma:generate` generates the Prisma client
- `npm run prisma:migrate` creates/applies local Prisma migrations
- `npm run prisma:studio` opens Prisma Studio

## API Notes

### `GET /api/steam-user`

Returns Steam summary data for a requested user.

Query params:

- `user`: Steam ID64 or vanity name

Example:

```text
/api/steam-user?user=gaben
```

## Caching

Steam API requests are cached in two layers:

- Next.js `fetch` caching with revalidation
- In-memory Maps for repeated requests during runtime

Defaults and overrides:

- Default Steam API cache TTL: `300` seconds
- Maximum Steam API cache TTL: `86400` seconds
- Override with `STEAM_API_CACHE_TTL_SECONDS`
- Enable request-level cache logging with `STEAM_API_CACHE_DEBUG=1`

SteamSpy responses are also cached to reduce repeated tag lookups.

## Database

The Prisma schema currently includes a `SteamUser` model with:

- `steamId`
- `persona`
- `createdAt`

This gives the project a starting point for persisting Steam user records alongside the live dashboard experience.

## Notes

- Steam profile data availability depends on the target user's privacy settings
- Tag analysis is based on the SteamSpy `tags` field, not genre labels
- The app expects a valid Steam Web API key before Steam data can be loaded
