# cv-chat

A chat on [overeem.io](https://overeem.io) where visitors ask about Gerwin Overeem's experience, how he works and what he is looking for, and can request an intro meeting. Nuxt 4 on Vercel, with Claude Haiku through Vercel AI Gateway.

- What it does and why: [`docs/spec.md`](docs/spec.md)
- How it looks: [`docs/design/index.html`](docs/design/index.html) (open it in a browser)
- The build order and its status: [`docs/plan.md`](docs/plan.md)

> In development. The content in `server/assets/content/` is dummy content until step 10 of the plan.

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

   For the steps built so far, no variables are needed yet: the placeholder page runs without them.

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
public/                  # favicons and images from overeem.io
docs/                    # spec, plan, design and the CV conversion
test/                    # unit tests
```

## Deploy

To be written in step 11 of the plan.
