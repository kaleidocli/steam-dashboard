This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Steam API cache behavior

Steam API requests are cached using Next.js `fetch` data caching in `src/features/steam-dashboard/api/steam.ts`.

- Default cache TTL is `300` seconds (5 minutes).
- You can override it with `STEAM_API_CACHE_TTL_SECONDS` (for example `86400` for 1 day).
- Values are clamped to a maximum of `86400` seconds (1 day).
- Set `STEAM_API_CACHE_DEBUG=1` to print per-request cache debug logs (cache hit/miss, cache layer, TTL, duration, and cache-related headers).

> Note: cache lifetime also depends on your deployment's persistence model. Local development does not behave like production caching.

### Viewing cache debug logs

Run the app with `STEAM_API_CACHE_DEBUG=1` and watch the server terminal output:

```bash
STEAM_API_CACHE_DEBUG=1 npm run dev
```

Each Steam API request will emit a line similar to:

```text
[steam-cache] path=/IPlayerService/GetOwnedGames/v1/ ttl=300s cache=hit layer=memory duration=0ms
[steam-cache] path=/IPlayerService/GetOwnedGames/v1/ ttl=300s cache=miss layer=network duration=78ms age=15 cacheHeader=HIT
```

In production, view the same logs from your runtime's server logs (for example, `vercel logs` on Vercel or container logs in your host platform).
