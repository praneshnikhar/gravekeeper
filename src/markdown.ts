import type { Graveyard } from "./types.ts";
import { daysAgo } from "./util.ts";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function graveyardMarkdown(g: Graveyard): string {
  const { census, epitaphs } = g;
  const lines: string[] = [];
  lines.push(`# ⚰️ ${g.repoName} — Code Cemetery`);
  lines.push("");
  lines.push(
    `Blessed by the Gravekeeper on ${new Date(census.scannedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}.`
  );
  lines.push("");
  lines.push(
    `This repository was found keeping **${census.stats.deceasedFiles} full files**, **${census.stats.deceasedSymbols} dead exports** and **${census.stats.deceasedDeps} orphaned dependencies** past their last sighting. Each received a reading from an LLM; none left the machine to get it.`
  );
  lines.push("");
  for (const d of census.deceased) {
    const ep = epitaphs.find((e) => e.id === d.id);
    lines.push(`## 🪦 \`${d.path}\``);
    lines.push("");
    lines.push(`*${d.type === "file" ? "Entire file" : d.symbols.map((s) => `\`${s}\``).join(", ")}*`);
    lines.push("");
    if (ep) {
      lines.push(`> ${ep.epitaph}`);
      lines.push("");
      lines.push(`- Cause of death: ${ep.causeOfDeath}`);
      lines.push(`- Last words: “${ep.finalWords}”`);
    } else {
      lines.push("> *This grave stands unmarked. The record was lost.*");
    }
    lines.push("");
    const resting = daysAgo(d.lastSighting);
    lines.push(
      `- Born: ${d.bornAt ? d.bornAt.slice(0, 10) : "unknown"} · Last sighting: ${
        d.lastSighting ? `${d.lastSighting.slice(0, 10)} (${resting} days rest)` : "unknown"
      } · Commits: ${d.commits} · Authors: ${d.authors.slice(0, 4).join(", ") || "unknown"}${
        d.lines ? ` · ${d.lines} lines` : ""
      }`
    );
    lines.push("");
  }
  if (census.dependencies.length) {
    lines.push(`## 🕳️ Orphaned dependencies (swept from the graveyard gate)`);
    lines.push("");
    lines.push(census.dependencies.map((d) => `[\`${d}\`]`).join(" "));
    lines.push("");
  }
  lines.push(`*Rendered by Gravekeeper. “All code is temporary. Not all code knows it yet.”*`);
  lines.push("");
  return lines.join("\n");
}
