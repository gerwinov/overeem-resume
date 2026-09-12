# PLAN — building cv-chat

The build order for `docs/spec.md`. The spec says what the app does; this plan says in which order it gets built and how each step is checked. When the app is live, this file can be archived; the spec stays.

Sources for every step:
- `docs/spec.md`: behaviour, limits, privacy, test plan
- `docs/design/index.html`: everything visual (open it in a browser); the spec wins where the two disagree (see the spec's "Design" section)
- `docs/cv-conversion.md`: the CV conversion and PII guard

## Working agreement

- **Claude stops after every step.** It does not start the next step until Gerwin has validated the current one and says to continue. A step is small enough to check in one sitting.
- At the end of a step Claude reports:
  - what was built and which files changed
  - how to validate it: the exact commands and what to look for
  - what is not done yet or deviates from the spec, and why
  - a proposed commit message, written to `MERGE_MSG`. Claude never commits or stages; Gerwin does.
- Findings from the adversarial review gate are handled before the step is reported as done.
- If a step shows that the spec is wrong or incomplete, Claude proposes the spec change first instead of building around it.
- Steps marked **Gerwin** are done by Gerwin; Claude can help, but the result depends on his accounts or his own words.

## Steps

### 1. Commit the documents (Gerwin)
- Commit `.gitignore` and `.claude/review-base` (message in `MERGE_MSG`), then `docs/`, then `public/` (favicons and banner).
- **Done when:** `git status` is clean.

### 2. Accounts and keys (Gerwin)
- GitHub: a repository for this project, pushed.
- Vercel (Hobby): an account, ready to import the project in step 11. AI Gateway: buy $10 of credits, auto top-up off. Create an `AI_GATEWAY_API_KEY` for local development.
- LangSmith: sign up on **eu.smith.langchain.com** (the EU region cannot be changed later), create project `cv-chat` and an API key.
- Resend: add `overeem.io` as a domain (EU region if offered), set the DNS records it asks for (SPF, DKIM), wait until it shows as verified, create an API key.
- **Done when:** all keys are in Gerwin's password manager and the Resend domain is verified. No keys go into the repo.

### 3. Scaffold, dummy content, `.env.example` and README (first version)
- Nuxt 4 app in this repository, keeping `docs/`, `public/`, `.claude/` and `.gitignore`. TypeScript strict.
- Modules and setup from the spec's stack: `@nuxtjs/i18n` (`no_prefix`, own cookie off), `@nuxtjs/color-mode` (`classSuffix: ""`), `@nuxt/fonts` (self-hosted Oxygen and Source Sans 3), Tailwind 4 through `@tailwindcss/vite`, Zod, `ai` 7 and `@ai-sdk/vue` 4 pinned to their major versions. Vitest for unit tests.
- Dummy content, so the app can be built before the real content exists (step 10): `server/assets/content/cv.md` and `about.md` with invented facts about Gerwin (so the prompt and UI work unchanged), with the same headings and structure as the real files (the CV headings from `docs/cv-conversion.md`, the seven `about.md` topics). Every file starts with the line `<!-- DUMMY CONTENT: replace in step 10 -->` and contains no real personal data. The dummy covers enough to test the behaviour rules: a few jobs with dates (for "years of experience"), a listed limitation, a "Not via the chat" topic, and an obvious gap to ask about.
- `.env.example`: every variable from the spec's "Env variables" section and from `docs/cv-conversion.md`, each with a comment saying what it is, where to get it, and whether it is needed locally, on Vercel or both. No real values.
- `README.md`, first version: what the project is (one paragraph, linking the spec), requirements (Node version), and how to run it locally: install, copy `.env.example` to `.env` and fill it in, `npm run dev`, `npm test`, `npm run typecheck`.
- Nothing with dummy content is deployed: the first deploy (step 11) comes after the real content (step 10).
- **Gerwin validates:** follows the README on a clean clone: the dev server starts and shows a placeholder page with self-hosted fonts (no request to Google in the network tab); `npm run build`, `npm test` and `npm run typecheck` pass.

### 4. Chat route (server, without the tool)
- `server/utils/prompt.ts`: system prompt from the content files, the behaviour rules and the dynamic part (date, UI language, meeting state).
- `server/api/chat.post.ts`: body validation (part types, limits), history cleaning, `streamText` with Haiku 4.5, provider `order` and `only`, `maxOutputTokens`, finish reason as message metadata, generic `onError`.
- Unit tests for body validation and history cleaning.
- **Gerwin validates:** with `curl` against the dev server, a question streams an answer; an oversized or malformed body returns HTTP 400 without a model call; against the dummy content, the chat answers from the files, computes years of experience from the dummy dates, is candid about the dummy limitation, declines the "Not via the chat" topic and says it doesn't know about the gap. Whether the answers are ones Gerwin would give is checked in step 10, with the real content.

### 5. Meeting tool
- `server/utils/meeting.ts`: Zod schema (with the header-injection rules), the per-request send state, Resend with fixed `to`, `from` and `subject`, plain-text body; `stopWhen` and `prepareStep` in the chat route.
- Unit tests for the schema and the send state (parallel calls, failed send, validation failure).
- **Gerwin validates:** requests a meeting through `curl` or a minimal test page: the email arrives with the right content and `reply-to`; "no, never mind", a second request, an empty message and an injected `Bcc:` all behave as the "Tool" section of the test plan says.

### 6. Conversation log
- `server/plugins/langsmith.ts`, chat ID as `thread_id`, flushing through `waitUntil`.
- **Gerwin validates:** a test conversation appears in LangSmith (EU) as one thread with the tool calls and without an IP address; with a wrong key the chat still works without delay.

### 7. Chat UI
- The page as in `docs/design/index.html`: banner header, conversation, input, footer; all states of the prototype (start, conversation, streaming, meeting sent, error, rate limited, cut off).
- `app/composables/useCvChat.ts` with the `@ai-sdk/vue` `Chat`, the transport (`locale`, 429 mapping), the rendering rules (text in tool steps hidden, confirmation line, failed turns), input behaviour, auto-scroll and "New conversation".
- **Gerwin validates:** side by side with the prototype on desktop and phone; runs through every state against the real API; the "Tool" UI items of the test plan.

### 8. Languages and theme
- `nl.json` and `en.json` with all copy; language detection (`localStorage`, `Accept-Language`, fallback English), the head script against the language flash, the switch.
- Theme switch, color-mode, Tailwind's `dark` variant, theme colors through `@theme`, the brand-yellow exception.
- **Gerwin validates:** the "Languages" and "Theme" sections of the test plan.

### 9. Privacy dialog, page metadata, accessibility, analytics
- The privacy dialog with the table from the spec (including the fallback providers and the "Where" column) and the conversation ID with a copy button.
- `<title>`, description, bilingual Open Graph and Twitter tags with a 1200×630 image, the existing favicons, canonical URL.
- The hidden live region, `aria-busy`, focus handling.
- Vercel Web Analytics through Vercel's plain script tag (`/_vercel/insights/script.js`, with `useHead`), loaded only in production, since the script exists only on Vercel deployments.
- **Gerwin validates:** the dialog with keyboard only; VoiceOver announces a complete answer once; the privacy table matches the spec's; the page source has the right meta tags.

### 10. Real content (Gerwin, Claude helps)
- Gerwin writes `server/assets/content/about.md` from the seven questions in the spec, replacing the dummy.
- One-off CV conversion with Claude Code, as `docs/cv-conversion.md` allows for v1: `private/cv.pdf` → `server/assets/content/cv.md`, with the required headings and without phone number, date of birth, nationality, home address or photo, replacing the dummy.
- If the dummy content led to example questions or copy that don't fit the real content, adjust them now.
- **Gerwin validates:** reads both files line by line: no personal data that should not be public, and `about.md` answers every example question and every hard question from the test plan. `grep -r "DUMMY CONTENT" server/assets/content` finds nothing. Locally, the "Content" section of the test plan gives answers he would give himself.

### 11. Deploy to a preview, README (deploy)
- Import the repository in Vercel, function region `fra1`, environment variables from `.env.example` (production and preview), Web Analytics on.
- `README.md` gets a "Deploy" section: connecting the repo, the environment variables per environment, the function region, the WAF rule (path, limit, window), the AI Gateway credits, the domain and DNS switch, and how to check a deployment.
- **Gerwin validates:** follows the README's deploy section; the preview URL works; the full test plan except "Limits" and the go-live items passes on the preview.

### 12. Go live
- List the URLs of the current overeem.io that are shared or indexed; keep or redirect each.
- Point the domain from GitHub Pages to Vercel, add the WAF rule, check the link preview in LinkedIn's Post Inspector.
- **Gerwin validates:** the "Limits" section and the remaining test plan items on production; the definition of done in the spec.

## After launch (not part of this plan)

The spec's "Later" list, plus the `cv:update` / `cv:check` scripts from `docs/cv-conversion.md` the next time the CV changes.
