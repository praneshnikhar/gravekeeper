import { GoogleGenAI } from "@google/genai";
import type { Census, Deceased, EpitaphEntry, Graveyard } from "./types.ts";
import { GK_BATCH, GK_MODEL, GK_TONE, requireGeminiKey } from "./config.ts";

const dateOrUnknown = (iso: string | null): string => {
  if (!iso) return "unknown";
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const daysResting = (iso: string | null): number | null => {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
};

const toneBrief: Record<string, string> = {
  gothic: "solemn, candlelit, poetic but never purple to the point of parody",
  melancholic: "quiet, tender, wistful — a eulogy read at dawn",
  wry: "dryly funny, affectionate, a eulogy that gets a knowing nod from mourners",
};

function shrink(deceased: Deceased) {
  return {
    id: deceased.id,
    type: deceased.type,
    path: deceased.path,
    died: deceased.type === "file"
      ? "this whole file"
      : `still-in-use file, but these exports were never imported: ${deceased.symbols.slice(0, 12).join(", ")}`,
    lines: deceased.lines,
    bornAt: dateOrUnknown(deceased.bornAt),
    lastSighting: dateOrUnknown(deceased.lastSighting),
    daysResting: daysResting(deceased.lastSighting),
    commits: deceased.commits,
    authors: deceased.authors.slice(0, 5),
  };
}

const SYSTEM = `You are the Gravekeeper: a kindly old sexton who tends the code cemetery.
You are given facts about deceased code (unused files / never-imported exports) mined from a repository's git history.
Write each one a funeral epitaph.
Rules:
- Voice: {TONE}.
- epitaph: at most 45 words, addresses the code as it is about to be laid to rest, mention one real detail (its birth date, its author count, its resting days, its filename). No exclamation marks.
- causeOfDeath: at most 6 words, deadpan clinical ("orphanned at creation", "last commit never rescued it").
- finalWords: at most 14 words, the code's own last words, lowercase unless a proper noun. Something it would murmur.
- Never mention frameworks or the location to us; this is a burial ground, not a code review.
Return ONLY a JSON array, one object per deceased, fields: id, epitaph, causeOfDeath, finalWords.`.replace("{TONE}", toneBrief[GK_TONE] ? toneBrief[GK_TONE] : toneBrief.gothic);

function extractJsonArray(text: string): unknown[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1) throw new Error("No JSON array in model response: " + text.slice(0, 160));
  return JSON.parse(text.slice(start, end + 1)) as unknown[];
}

async function writeBatch(
  ai: GoogleGenAI,
  batch: Deceased[],
  repoName: string
): Promise<EpitaphEntry[]> {
  const contents =
    `Repository: ${repoName}. ${batch.length} of the fallen follow.\n\n` +
    JSON.stringify(batch.map(shrink), null, 1);
  const res = await ai.models.generateContent({
    model: GK_MODEL,
    contents,
    config: { systemInstruction: SYSTEM, temperature: 0.9 },
  });
  const arr = extractJsonArray(res.text ?? "");
  return arr
    .filter((e): e is Record<string, unknown> => typeof e === "object" && e !== null)
    .map((e) => ({
      id: String(e.id ?? ""),
      type: (batch.find((b) => b.id === e.id)?.type ?? "symbol") as "file" | "symbol",
      path: String(e.path ?? batch.find((b) => b.id === e.id)?.path ?? ""),
      symbols: batch.find((b) => b.id === e.id)?.symbols ?? [],
      epitaph: String(e.epitaph ?? "").trim(),
      causeOfDeath: String(e.causeOfDeath ?? "").trim(),
      finalWords: String(e.finalWords ?? "").trim(),
    }))
    .filter((e) => e.id && e.epitaph);
}

/** Write epitaphs for everyone in a census by calling batches to the configured model. */
export async function writeEpitaphs(census: Census): Promise<Graveyard> {
  if (!census.deceased.length) throw new Error("Census is empty — nothing to bury. Run `gravekeeper scan`.");
  const key = requireGeminiKey();
  const ai = new GoogleGenAI({ apiKey: key });
  const epitaphs: EpitaphEntry[] = [];
  let failures = 0;

  for (let i = 0; i < census.deceased.length; i += GK_BATCH) {
    const batch = census.deceased.slice(i, i + GK_BATCH);
    process.stdout.write(
      `   … entering the crypt for ${Math.min(i + GK_BATCH, census.deceased.length)}/${census.deceased.length}\r`
    );
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        epitaphs.push(...(await writeBatch(ai, batch, census.repoName)));
        break;
      } catch (err) {
        if (attempt === 3) {
          failures += batch.length;
          console.log(`\n   ! batch failed three times, moving on: ${String(err).slice(0, 120)}`);
        } else {
          await new Promise((r) => setTimeout(r, 2500 * attempt));
        }
      }
    }
  }
  process.stdout.write("\n");
  if (failures) console.log(`   ! ${failures} deceased received no epitaph.`);

  return { repoName: census.repoName, root: census.root, scannedAt: census.scannedAt, epitaphs, census };
}
