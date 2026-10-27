# Gravekeeper — continuation context

> Read this first if you're returning to the project. Last updated: Oct 27, 2026 (late night IST).

## What Gravekeeper is

**Día de los Muertos for your dead code.** A Node 24 CLI that scans any JS/TS repo for dead files / dead exports / unused deps (via **knip**), mines **git forensics** per grave (birth commit, last sighting, authors, lines), asks an LLM to write funeral epitaphs from those facts, and renders a **candlelit HTML cemetery** + `graveyard.md`. Built for the DEV Hacktoberfest Week 4 challenge — theme "**Ghost in the Machine**" (spooky *or* honoring the past).

## Working dir

`/Users/pranesh/coding2/gravekeeper`

## What works today (verified)

- `node src/index.ts scan ../cve-lens` → **7 whole files · 13 dead exports · 4 orphaned deps** (census + git forensics OK; census at `../cve-lens/.gravekeeper/census.json`)
- `node src/index.ts scan ../Portfolio2Jul` → **82 whole dead files · 19 orphaned deps**
- `node src/index.ts render ../<repo>` → `graveyard.html` (screenshot-verified: dark candlelit cemetery, tombstones, filters) + `graveyard.md`
- `node src/index.ts full ../<repo> --skip-ai` → whole rite without the model
- Typecheck clean (`npx tsc --noEmit`), CLI help works, git history: `1815600` (v0.1) → `1e6552c` (v2 SDK migration)

## Blocked on ONE thing: the Gemini key

`src/epitaphs.ts` is fully wired to **`@google/genai@2.31.0`** → `ai.interactions.create({ model, system_instruction, generation_config, input })`, default model **`gemini-3.8-flash`** (env `GK_MODEL`), batch 6 (`GK_BATCH`), tone gothic (GK_TONE), 3 retries, failures leave unmarked graves — code is done and typechecks.

**Auth history so tomorrow nobody relearns it:** we tested 5 paths (x-goog-api-key header, Bearer, ?key=, legacy v1beta `models:generateContent`, new v1beta `interactions` + v2 SDK) against the user's `AQ.` auth keys and got **401 ACCESS_TOKEN_TYPE_UNSUPPORTED every time** — the key string itself is bad (probably truncated in paste; Google officially supports `AQ.` auth keys since Sept 2026 per ai.google.dev docs updated Oct 27). Server-side check even flagged `ACCESS_TOKEN_TYPE_UNSUPPORTED` via REST too.

**Next step for the model:** user generates a FRESH key at [aistudio.google.com/api-keys](https://aistudio.google.com/api-keys) (copy button, full string), puts it in `gravekeeper/.env` (`GEMINI_API_KEY=...` — file is gitignored), then:

```bash
node src/index.ts write ../cve-lens          # ~4 batches for 20 graves
node src/index.ts render ../cve-lens         # marked cemetery
open ../cve-lens/.gravekeeper/graveyard.html
```

Then screenshot for the post + save agent session (DevRelay) + update the DEV draft.

## Deadline & submission requirements (DEV Week 4)

- **Submissions due Fri Oct 31, 11:59 PM PDT** (= Nov 1 ~12:29 PM IST) — user is registered (DEV event + MLH Hacktoberfest 2026).
- Judging: **Writing Quality (weighted most heavy)** → Relevance (open-source AI at core) → Creativity → Technical Execution.
- Template: submission post must include **tags `devchallenge` + `hf26challenge`**, explain theme interpretation + open-innovation argument, show demo.
- Honest open story: census is all-local (knip + git, nothing leaves machine), MIT, offline single-file render, provider swappable via one env var. Epitaph model is currently cloud Gemini (user's explicit choice over Nemotron/OpenRouter alternatives) — write-up must not claim open-weight inference.
- Judging creativity edge: theme is "honors the past" — funerals for code is the fresh angle; buried lines count is the hook (4,912 in a single article title).

## DECISIONS the user made (don't relitigate)

- Model = **Gemini API** (not Nemotron/Nebius, not local Ollama, not OpenRouter Gemma) — flagged the tradeoff twice; final call made.
- **Nebius × NVIDIA hackathon dropped** (user registered on Devpost but chose DEV Week 4 only).
- GitHub repo: user asked for **private** for now (change to public before the DEV post goes live — judges benefit, and template asks for links to code/demo).

## TODO (tomorrow)

1. Fresh Gemini key → `.env` → `write` on `cve-lens` AND `Portfolio2Jul` → check epitaph quality (strict JSON parser is in `src/epitaphs.ts`).
2. Re-render, screenshot marked cemetery (playwright blocked on file://; use the localhost http.server trick — it was started with `python3 -m http.server 8137 --bind 127.0.0.1` inside `.gravekeeper`).
3. Flip GitHub repo to public (user confirms), push final commits.
4. Update DEV draft `create_article` (template + tags + screenshots + `{% agent_session %}` embed after `submit_agent_session`), user reviews, publishes before deadline. AI disclosure stays `some_ai`.

## Repo map

```
src/index.ts      — commander CLI (scan / write / render / full)
src/census.ts     — knip spawn+parse (new array JSON schema + legacy shape), git forensics (simple-git)
src/epitaphs.ts   — v2 interactions API, batch writer, strict-ish JSON extraction
src/template.ts   — single-file HTML cemetery (no CDN, offline)
src/markdown.ts   — graveyard.md memorial
src/config.ts     — GK_MODEL / GK_TONE / GK_BATCH / GEMINI_API_KEY loader (dotenv)
src/types.ts, src/util.ts
```
