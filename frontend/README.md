This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Deployment (Cloudflare Workers, vinext)

```bash
npm run build            # vinext build
npx wrangler deploy
```

The API requires a Bearer token for every data endpoint and has no public read
routes, so the public read-only view signs in server-side with one account:

| Variable | Kind | Purpose |
| --- | --- | --- |
| `SIMPASCA_API_URL` | plain | API base URL, defaults to `https://api.simpasca.shiddiq.dev` |
| `SIMPASCA_PUBLIC_USERNAME` | secret | Account visitors read with |
| `SIMPASCA_PUBLIC_PASSWORD` | secret | Its password |

```bash
npx wrangler secret put SIMPASCA_PUBLIC_USERNAME
npx wrangler secret put SIMPASCA_PUBLIC_PASSWORD
```

Without both secrets the site stays behind `/login`; with them, visitors read
every page and every write control is hidden. The API has no roles yet, so keep
that account's password server-side only. `npm run seed` fills a fresh API with
sample data and asks for a staff login.

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
