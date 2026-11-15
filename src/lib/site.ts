// The public address of the site, used for link previews and anywhere
// else a full URL is needed on the server.
//
// Set NEXT_PUBLIC_SITE_URL if you add a custom domain. Otherwise Vercel
// supplies its production domain, and local dev falls back to localhost.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000");

export const SITE_NAME = "Grandma's Bracket";
export const SITE_TAGLINE =
  "Brackets made so easy, even your grandma could do it.";
export const SITE_DESCRIPTION =
  "Run a family field day in minutes: add teams, pick your games, and get brackets, round robins, judged scoring and a live leaderboard. No accounts needed.";
