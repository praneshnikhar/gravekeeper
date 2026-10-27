import "dotenv/config";

/** Model used to write epitaphs. Override with GK_MODEL. */
export const GK_MODEL = process.env.GK_MODEL || "gemini-3.8-flash";

/** gothic | melancholic | wry */
export const GK_TONE = process.env.GK_TONE || "gothic";

/** how many deceased per Gemini call */
export const GK_BATCH = Number(process.env.GK_BATCH || 6);

/** abort a knip run after this many ms */
export const KNIP_TIMEOUT = Number(process.env.GK_KNIP_TIMEOUT || 240_000);

export function requireGeminiKey(): string {
  const key = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!key) {
    console.error(
      "\nNo GEMINI_API_KEY found. Add it to a .env file next to package.json:\n\n" +
        "    GEMINI_API_KEY=...\n"
    );
    process.exit(2);
  }
  return key;
}
