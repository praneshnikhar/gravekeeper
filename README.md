# ⚰️ Gravekeeper

**Día de los Muertos for your dead code.**

Every repository that lived long enough has a cemetery: files nobody imports anymore, exported functions whose callers were all deleted, dependencies swept in for one task that never checked out. Static analyzers call them "errors." Gravekeeper calls them what they are — **the dead** — and gives them the send-off the calendar demands.

It finds the unclaimed bodies, reads their life story out of git history, and writes each one a funeral epitaph. Then it renders the whole thing as a candlelit cemetery you can walk through in a browser — tombstone cards, candle glow, marigold palette — plus a `graveyard.md` you can commit next to the removing PR so the reason those lines are gone never evaporates with the conversation that decided it.

## Quick start

```bash
npm install

# 1. The census (no AI, no network calls): static analysis + git forensics
node src/index.ts scan path/to/your/repo

# 2. The epitaphs (LLM step) — put your key in a .env first:
#    GEMINI_API_KEY=...   (free at https://aistudio.google.com/apikey)
node src/index.ts write path/to/your/repo

# 3. The cemetery (single-file HTML, works offline)
node src/index.ts render path/to/your/repo
open path/to/your/repo/.gravekeeper/graveyard.html

# or all three at once:
node src/index.ts full path/to/your/repo --skip-ai   # scan + unmarked graves
```

No build step: Node 24+ executes the TypeScript sources directly. The whole tool is zero-install relative to your project — it never writes outside `<repo>/.gravekeeper/`. [MIT licensed](LICENSE) so nothing here gets locked behind anything.

## Under the hood

1. **Census** (`scan`) — runs [knip](https://knip.dev) inside the target repo for a hard, AST-grounded census of dead files, dead exports/types, and unused dependencies. "Dead" here means statically unreachable, not stylistically suspect.
2. **Forensics** — for every grave, git history is mined locally: birth date (first commit), last sighting (last commit), total commits, author list, line counts. The facts every epitaph leans on are dates *your* repo already knew.
3. **Epitaphs** (`write`) — batches the deceased records to the model with a sexton's voice and reads back strict JSON (`epitaph`, `causeOfDeath`, `finalWords`), with retries and per-grave failure isolation: a batch that never comes back leaves an *unmarked* grave, not a crashed rite. Model, tone, and batch size are env knobs in `src/config.ts` (`GK_MODEL`, `GK_TONE`, `GK_BATCH`).
4. **Interment** (`render`) — inlines census + epitaphs into one self-contained HTML page (no CDN, opens from disk) and a markdown memorial.

## The libretto

```
   … running knip inside cve-lens (may take a minute)
   … mining git history for 20 deceased
   full files:     7
   dead exports:   13
   orphaned deps:  4
   graves with no birth record: 0
```

## Planned rites (v2)

- `gravekeeper bury` — after human review, delete every marked grave and commit the removal with its epitaphs attached.
- More graveyards beyond JS/TS by binding other open-source analyzers (ruff, vulture, deadgrep).
- `open` mode for GitHub Pages burials, so a team can visit their cemetery from anywhere.

## License

[MIT](LICENSE) — visitation hours are permanent.
