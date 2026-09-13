# overeem-resume

A chat on [overeem.io](https://overeem.io) where visitors ask about Gerwin Overeem's experience, how he works and what he is looking for, and can request an intro meeting. Nuxt 4 on Vercel, with Claude Sonnet 5 through Vercel AI Gateway.

- What it does and why: [`docs/spec.md`](docs/spec.md)
- How it looks: [`docs/design/index.html`](docs/design/index.html) (open it in a browser)
- The build order and its status: [`docs/plan.md`](docs/plan.md)

> In development; see the plan for which steps are done.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

1. Install the dependencies:

   ```bash
   npm install
   ```

2. Create your local environment file and fill it in. Every variable is explained in the file itself:

   ```bash
   cp .env.example .env
   ```

   The chat needs `AI_GATEWAY_API_KEY` (and AI Gateway credits: Claude Sonnet 5 is not in the free tier). Meeting requests also need `RESEND_API_KEY`, `MEETING_RECIPIENT` and `MEETING_FROM`; without them the chat still works, but a meeting request fails and the chat offers the email address instead.

3. Start the dev server and open http://localhost:3000:

   ```bash
   npm run dev
   ```

## Checks

```bash
npm test            # unit tests (Vitest)
npm run typecheck   # TypeScript
npm run build       # production build
```

## Project structure

```
app/                     # the page: components, composables, styles
i18n/locales/            # all UI copy, Dutch and English
server/                  # the chat API and its helpers
  assets/content/        # the CV and about.md the chat answers from
shared/                  # what page and server share: limits, locales, message types
public/                  # favicons and images from overeem.io
docs/                    # spec, plan, design and the CV conversion
test/                    # unit tests
```

## Deploy

The site runs on Vercel (Hobby). Every push to `main` deploys to production; every other branch and pull request gets its own preview URL.

### Connect the repository

1. In Vercel: **Add New… → Project → Import Git Repository**, and pick this repository.
2. Vercel detects Nuxt; keep the default build settings.
3. Add the environment variables below *before* the first deploy, then deploy.

The function region (`fra1`, Frankfurt) is set in `nuxt.config.ts` (`nitro.vercel.functions.regions`), not in the dashboard.

### Environment variables

Set these under **Project → Settings → Environment Variables**, for both **Production** and **Preview**:

| Variable | Value |
|---|---|
| `RESEND_API_KEY` | the Resend API key |
| `MEETING_RECIPIENT` | Gerwin's own email address |
| `MEETING_FROM` | a sender on the verified domain, e.g. `cv-chat@overeem.io` |
| `NUXT_PUBLIC_CONTACT_EMAIL` | the email address shown in the footer (the one in the CV) |
| `NUXT_PUBLIC_LINKEDIN_URL` | the LinkedIn profile URL |
| `LANGSMITH_TRACING` | `true` |
| `LANGSMITH_API_KEY` | the LangSmith API key |
| `LANGSMITH_ENDPOINT` | `https://eu.api.smith.langchain.com` |
| `LANGSMITH_PROJECT` | `cv-chat` for Production; a separate project such as `cv-chat-preview` for Preview keeps test conversations apart |

Do **not** set these on Vercel:

- `AI_GATEWAY_API_KEY`: on Vercel the gateway is reached with the deployment's own OIDC token (on by default under **Settings → Security → Secure backend access with OIDC federation**).
- `CV_PII_DENYLIST`: it holds personal data, and Vercel exposes every variable to the running functions. It is only used locally.

A change to a variable takes effect with the next deployment (**Deployments → … → Redeploy**).

### Web Analytics

**Project → Analytics → Enable.** The page loads Vercel's script only in builds on Vercel; it sets no cookies.

### Preview deployments

Vercel protects preview URLs with **Vercel Authentication** by default (**Settings → Deployment Protection**): only people logged in to the Vercel team can open them. That is fine for testing. For automated checks from outside, create a **Protection Bypass for Automation** secret there and send it as the `x-vercel-protection-bypass` header. Vercel also adds `X-Robots-Tag: noindex` to preview URLs, so they are not indexed.

### Rate limit (production)

**Firewall → Configure → New Rule:** if *Request Path* equals `/api/chat`, then **Rate Limit**: 20 requests per 10 minutes, fixed window, keyed on IP address, action *Too Many Requests* (429). The firewall only applies to the production deployment.

**Bot Protection** (Firewall → Bot Management) is on, in challenge mode: real browsers pass without noticing, and so do the bots in [Vercel's verified-bot directory](https://vercel.com/docs/bot-management#verified-bots) (search engines, LinkedIn's link preview); everything else (curl, scripts) gets a challenge. Hand-made requests to production, such as the "Limits" tests, are therefore sent from the browser's console on the site itself.

### Domain

Moving `overeem.io` from GitHub Pages to Vercel happens at go-live (step 13 of the plan). The DNS stays where it is; only the web records change.

1. **Project → Settings → Domains:** add `overeem.io` and `www.overeem.io` (redirect `www` to the bare domain). Vercel then shows the records to set.
2. At the DNS provider, replace the GitHub Pages `A` records on the bare domain with the `A` record Vercel shows, and point `www` with a `CNAME` to the value Vercel shows. Leave the mail records alone: the mail provider's `MX` and `TXT` records, and Resend's records on `send` and `resend._domainkey`.
3. Wait until Vercel shows both domains as valid; it then issues the certificates itself (Let's Encrypt). Until the old records' TTL has passed, some visitors still get the old site.
4. Add a CAA record on the bare domain: `0 issue "letsencrypt.org"`. It covers every name under `overeem.io`, so a service that ever needs a certificate for a subdomain from another authority needs its own `issue` line.
5. Only after the switch, remove the custom domain from the old GitHub Pages site. Removing it while the DNS still points to GitHub would let another GitHub user claim the domain.

### Check a deployment

- The page loads in both languages and both themes, and a question gets a streamed answer.
- The page's response headers in the browser's network tab (Bot Protection challenges `curl` on production) show the security headers, `Cache-Control: private, no-cache`, HSTS and compression (see `docs/spec.md`, "Safety & cost").
- The conversation appears in LangSmith as one thread (under the project for that environment).
- **Observability** (Vercel) shows the `/api/chat` invocations running in `fra1`, and the AI Gateway dashboard shows the requests and credit balance.
- A meeting request arrives in the inbox (this sends a real email).
