## CV conversion: `cv.pdf` → `cv.md`

**Goal:** turn the designed CV (PDF) into clean markdown for the chat context, in a way that is repeatable with one command and reviewable via `git diff`.

**Priority:** not required for v1. For v1, a one-off conversion done with Claude Code (then manually reviewed and committed) is acceptable. Build this script the next time the CV changes.

### Flow

1. Place the PDF at `private/cv.pdf`. `private/` is in `.gitignore` (the PDF contains a phone number and date of birth) and sits outside `server/assets/`, so it is never bundled into the deployment.
2. Run `npm run cv:update`.
3. The script (`scripts/cv-to-md.ts`) sends the PDF through Vercel AI Gateway with the AI SDK (`generateText`, the PDF as a file part) together with a fixed prompt (see below). Check the current docs for PDF input.
4. The script fails unless the finish reason is `stop`, so truncated output is never written.
5. The script runs the PII guard on the generated markdown **in memory** (see below). If it fails, nothing is written and the script exits non-zero.
6. Only then does the script write `server/assets/content/cv.md`.
7. Review the changes with `git diff server/assets/content/cv.md` before committing.

### Conversion prompt (fixed, versioned in the repo)

- Convert the CV to markdown using **exactly** this structure and heading order:
  `# Profiel`, `# Expertise`, `# Techniek`, `# Werkervaring` (one `##` per client, with role, period, location, description, and tools), `# Opleidingen`, `# Talen`, `# Hobby's`
- Copy the text **verbatim**. Do not summarise, rephrase, translate, or add anything.
- Omit the phone number, date of birth, nationality, home address, and the photo.
- Keep the email address and LinkedIn URL (the chat may share these; see the spec's behaviour rules).
- Output only the markdown, with no preamble or code fences.

Settings: model `anthropic/claude-sonnet-5`, a stronger model than the chat's: the conversion runs a few times a year and must copy text verbatim, so here quality matters more than price. Pinned to Anthropic with `providerOptions: { gateway: { only: ["anthropic"] } }`, a generous `maxOutputTokens` (e.g. 16000), and authenticated with `AI_GATEWAY_API_KEY` from the local `.env`. No `temperature`: Sonnet 5 rejects non-default sampling parameters with an HTTP 400. Output can therefore differ slightly between runs; the `git diff` review in step 7 is what catches that.

### PII guard (enforced in code, not by the model)

`scripts/check-content.ts` exports `checkContent(file, text)`, which returns the violations for one file's text. A violation names the file, the line number and the check (e.g. "denylist entry 2", "phone pattern"), never the matched text, so a failing check does not put the PII into terminal or build logs. Two entry points use it:

- `cv:update` calls it on the generated markdown before writing (flow step 5).
- `npm run cv:check` calls it on the files on disk: `server/assets/content/cv.md` and `server/assets/content/about.md`.

Checks:

- **All files:** fail on anything that looks like a Dutch mobile number. This check does not use the normalized text below, where CV date ranges would collapse into one digit run. It uses a lightly prepared copy that unifies look-alike characters and collapses whitespace, so a double space, a tab or an indented line wrap counts as one separator. Line breaks are never removed, so line numbers stay the same:

  ```ts
  const prepare = (s: string) => s
    .replace(/\r\n?/g, '\n')      // CRLF and CR become LF
    .replace(/\p{Cf}/gu, '')      // zero-width and other format characters are dropped
    .replace(/[^\S\n]+/gu, ' ')   // runs of NBSP, tabs and other spaces become one plain space
    .replace(/ ?\n ?/g, '\n')     // spaces around a line break are dropped
    .replace(/\p{Pd}/gu, '-');    // en dash, em dash and other dashes become a hyphen

  const PHONE = /(?<![\p{L}\p{N}+])(?:(?:\+31|0031)[ .\-]?(?:\(0\)[ .\-]?|0)?6|\(06\)|06(?![\/.\-](?:19|20)\d\d(?!\p{N})))(?:[ .\-\/]\n?|\n)?\d(?:(?:[ .\-]\n?|\n)?\d){7}(?!\p{N})/u
  ```

  The prefix is `06`, `(06)`, or `+31`/`0031` with an optional `(0)` or trunk `0`, then `6`, with at most one space, dot or dash after `+31`/`0031` and after `(0)` (so `+31 6`, `+31-6`, `+31.6`, `0031-6`, `+31 (0)6`, `+31 06`, `+3106` and `0031 06` all count). A bare `06` directly followed by a slash, dot or dash and a year (`19xx` or `20xx`) that is not followed by another digit is a month and year, not a prefix: `06/2014`, `06.2014` and `06-2014` never start a number, so `06/2014\n2020`, `06/2014 1234 AB` and `06/2014-2020` pass. The price is that a number written as `06-2014 5678` (subscriber digits that start like a year, grouped after a separator) is not caught by the pattern; Gerwin's own number is still caught by the denylist in any grouping, and `06-20145678` still matches. The prefix is optionally followed by one separator (space, dot, dash or slash). The eight remaining digits are compact or have at most one space, dot or dash between them, and a line break may sit anywhere a separator can. The number may not touch another digit on either side. A date range such as `06/2014 - 08/2019` therefore does not match: ` - ` is more than one separator, and a slash is only allowed right after the prefix.
- **All files:** fail on any string from `CV_PII_DENYLIST`: the real phone number, the date of birth in every format it could appear in, and the home address (as a full line, plus street with house number and postcode as separate entries). Entries are separated by `|`, since addresses contain commas; env only, never committed. Both the entries and the text are normalized before a substring match: Unicode NFKC, lowercase, then every character that is not a letter or digit is removed (including line breaks, NBSP and zero-width characters), so `(06) 1234 5678`, `06/12345678` and `06-1234 5678` all match `0612345678`. The whole file is normalized as one string, so an entry wrapped across lines still matches; the guard keeps the original offset of each normalized character to report the line where the match starts. An entry that is a Dutch phone number (`0` plus nine digits after normalizing) is also matched with that `0` replaced by `31`, which catches `+31 6 1234 5678` and `0031 6 1234 5678`. The date of birth is caught here rather than by a date pattern, because a generic date pattern would also match the dates in the CV itself.
- **Fail closed:** the guard exits non-zero when `CV_PII_DENYLIST` is unset, or when no non-empty entry remains after splitting and normalizing (so `""`, `"|"` or `" | "` fail too), so a missing denylist can never pass silently.
- **`cv.md` only:** fail if any required heading from the structure above is missing (catches truncated or restructured output). `about.md` has its own structure and is not checked for these headings.

The guard runs only on Gerwin's machine, never on Vercel. `CV_PII_DENYLIST` lives only in the gitignored local `.env` and is never set in Vercel, because Vercel exposes every environment variable to the running server functions as well as the build. The `build` script does not run `cv:check`. Manual edits to the content files are covered by a pre-commit hook that runs `cv:check` whenever `server/assets/content/` is staged.

### Additions elsewhere in the spec

**Files**
```
private/                 # gitignored, holds cv.pdf
scripts/cv-to-md.ts      # conversion
scripts/check-content.ts # PII + structure guard
```

**Env** (local `.env` only, never Vercel)
```
CV_PII_DENYLIST=
AI_GATEWAY_API_KEY=       # also used by the chat in local development
```

**Test plan**
- [ ] `cv:update` twice on the same PDF → only trivial differences in the diff
- [ ] Output with an injected phone number or date of birth → guard fails, nothing written
- [ ] Output with a missing heading → guard fails, nothing written
- [ ] `cv:check` flags PII added by hand to `about.md`
- [ ] `cv:check` with `CV_PII_DENYLIST` unset, or set to `|` → fails
- [ ] Staging a content file with PII added by hand → pre-commit hook blocks the commit
- [ ] `CV_PII_DENYLIST` does not appear in the Vercel project's environment variables
- [ ] Denylisted phone number written as `(06) 1234 5678`, `06/12345678`, `+31 6 1234 5678` or `0031 6 1234 5678`, with an NBSP between digits, or wrapped across two lines → guard fails, reporting the line where it starts
- [ ] Unknown mobile number written with a trunk zero (`+31 06 1234 5678`, `+3106 12345678`, `0031 06 1234 5678`) → phone pattern fails
- [ ] Unknown mobile number with a double space, a tab or an indented line wrap as separator (`06  12345678`, `+31  6 12345678`, `06-\n 12345678`) → phone pattern fails, reporting the right line
- [ ] A June date followed by another number (`06/2014\n2020`, `06/2014 1234 AB`, `06/2014-2020`) → passes
- [ ] Someone else's mobile number → phone pattern fails, in each of these forms: `0612345678`, `06 12 34 56 78`, `(06) 12345678`, `06.1234.5678`, `+316 1234 5678`, `+31-6-12345678`, `+31.6.12345678`, `0031-6-12345678`, `+31 (0)6-12345678`, `06-` + line break (LF or CRLF) + `12345678`, `06–12345678` (en dash), with an NBSP, or with a zero-width character between digits
- [ ] CV date ranges → phone pattern passes: `06/2014 - 08/2019`, `06/2014 – 08/2019`, `06/2014 — 08/2019`, `06-2014 - 08-2019`, `06.2014-08.2019`, `06-2014-08-2019`, `06/2014 - heden`, and a range with NBSPs or a zero-width space around the dash
- [ ] Home address wrapped across two lines → guard fails
- [ ] A failing check prints file, line and check name only, never the matched value
- [ ] The full address, written with and without its comma, is caught
- [ ] `about.md` without the CV headings → passes
- [ ] `private/cv.pdf` is not tracked by git
