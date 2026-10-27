import type { Graveyard } from "./types.ts";
import { daysAgo, daysBetween } from "./util.ts";

const esc = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function graveyardHTML(g: Graveyard): string {
  const { census, epitaphs } = g;
  const restingDays = census.deceased.map((d) => daysAgo(d.lastSighting) ?? 0);
  const oldestRest = Math.max(0, ...restingDays);
  const authors = new Map<string, number>();
  for (const d of census.deceased) for (const a of d.authors) authors.set(a, (authors.get(a) ?? 0) + 1);
  const gravediggersBy = [...authors.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const linesBuried = census.deceased.reduce((sum, d) => sum + (d.lines ?? 0), 0);

  const graves = census.deceased
    .map((d) => {
      const ep = epitaphs.find((e) => e.id === d.id);
      const rest = daysAgo(d.lastSighting);
      const span = daysBetween(d.bornAt, d.lastSighting);
      const stone = [
        `<article class="grave ${d.type}" tabindex="0">`,
        `  <div class="stone">`,
        `    <div class="cross">⚰️</div>`,
        `    <h3>${d.type === "file" ? "Entire file" : "Parting exports"}<br><code>${esc(d.path)}</code></h3>`,
        `    ${d.type === "symbol" ? `<p class="attr">${d.symbols.map((s) => `<mark>${esc(s)}</mark>`).join(" ")}</p>` : d.lines ? `<p class="attr">${d.lines} lines, unsummoned</p>` : ""}`,
        `    <div class="relics">`,
        `      <span>🕯️ rest ${rest === null ? "?" : rest}d</span>`,
        `      <span>📜 ${d.commits} commits</span>`,
        `      <span>🎂 ${d.bornAt ? d.bornAt.slice(0, 10) : "birth unknown"}${span ? ` · ${span}d lived` : ""}</span>`,
        `      ${d.authors.length ? `<span>👥 ${esc(d.authors.slice(0, 3).join(", "))}</span>` : ""}`,
        `    </div>`,
        `    <button class="reveal" type="button">read the epitaph</button>`,
        `  </div>`,
        `  <div class="eulogy ${ep ? "" : "unmarked"}">`,
        `    ${ep ? `<blockquote>${esc(ep.epitaph)}</blockquote><p class="cause">⚰️ ${esc(ep.causeOfDeath)}</p><p class="words">“${esc(ep.finalWords)}”</p>` : `<blockquote>This grave stands unmarked.</blockquote><p class="cause">the record was lost</p>`}`,
        `  </div>`,
        `</article>`,
      ].join("\n");
      return stone;
    })
    .join("\n");

  const data = JSON.stringify({ repoName: g.repoName, stats: census.stats }).replace(/<\//g, "<\\/");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>⚰️ Gravekeeper — ${esc(g.repoName)}</title>
<style>
  :root {
    --night: #0b0a0f; --stone: #17161d; --wax: #f4b860; --mari: #f59e0b;
    --ink: #cdc6c0; --dim: #8a837c; --input: hsl(0 0% 100% / .04);
  }
  * { box-sizing: border-box; margin: 0; }
  body {
    background:
      radial-gradient(1200px 500px at 50% -200px, #20161d00, transparent),
      radial-gradient(900px 420px at 85% 110%, #2a141f66, transparent),
      radial-gradient(700px 380px at 8% 115%, #1b151f66, transparent),
      var(--night);
    color: var(--ink);
    font: 15px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace;
    min-height: 100vh;
  }
  header { text-align: center; padding: 52px 16px 20px; position: relative; }
  .candles { font-size: 30px; letter-spacing: 18px; filter: drop-shadow(0 0 14px var(--wax)); animation: flicker 2.6s infinite; }
  @keyframes flicker {
    0%, 100% { opacity: .92; }
    8% { opacity: .55; }
    12% { opacity: .95; }
    45% { opacity: .8; }
    52% { opacity: .45; }
    56% { opacity: .9; }
  }
  h1 { color: #ece7df; font-size: clamp(26px, 4vw, 42px); font-weight: 600; letter-spacing: .5px; margin-top: 18px; }
  h1 em { color: var(--wax); font-style: normal; }
  .sub { color: var(--dim); max-width: 62ch; margin: 14px auto 0; }
  .stats { display: flex; flex-wrap: wrap; gap: 10px; justify-content: center; margin: 26px 0 8px; }
  .stats span { border: 1px solid #2c2a33; background: var(--input); padding: 7px 14px; border-radius: 999px; font-size: 12.5px; color: #e8dccb; }
  .stats b { color: var(--wax); }
  .gravediggers { color: var(--dim); font-size: 12px; margin-top: 10px; }
  .filters { display: flex; gap: 8px; justify-content: center; margin: 26px 0 10px; }
  .filters button { cursor: pointer; background: none; border: 1px solid #2c2a33; color: var(--dim); border-radius: 999px; padding: 6px 16px; font: inherit; font-size: 12.5px; }
  .filters button[aria-pressed="true"] { color: var(--wax); border-color: var(--wax); }
  main { max-width: 1080px; margin: 10px auto 60px; padding: 0 16px; display: grid; gap: 16px; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); }
  .grave { border: 1px solid #26242d; border-radius: 14px; background: var(--stone); overflow: hidden; outline: none; }
  .grave:focus-visible { border-color: var(--wax); }
  .stone { padding: 18px 18px 12px; }
  .cross { text-shadow: 0 0 16px var(--mari); }
  .grave h3 { color: #ded8cf; font-size: 13.5px; font-weight: 600; margin-top: 10px; letter-spacing: .2px; }
  .grave code { display: block; font-size: 11.5px; color: var(--wax); word-break: break-all; margin-top: 2px; }
  .attr { color: var(--dim); font-size: 11.5px; margin-top: 8px; }
  .attr mark { background: var(--input); border: 1px solid #2c2a33; border-radius: 6px; padding: 1px 6px; }
  .relics { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
  .relics span { color: var(--dim); font-size: 11px; border: 1px dashed #2c2a33; padding: 2px 8px; border-radius: 999px; }
  .reveal { margin-top: 12px; width: 100%; background: none; border: none; border-top: 1px solid #26242d; color: var(--wax); font: inherit; font-size: 11.5px; padding: 9px 0 2px; cursor: pointer; letter-spacing: .6px; }
  .eulogy { display: none; padding: 14px 18px 18px; border-top: 1px solid #26242d; background: #121117; }
  .grave.open .eulogy { display: block; }
  .eulogy blockquote { color: #e5ded2; font-size: 13.5px; white-space: pre-wrap; }
  .eulogy .cause { margin-top: 10px; color: var(--dim); font-size: 11.5px; }
  .eulogy .words { margin-top: 6px; color: #e8dccb; font-size: 12px; font-style: italic; }
  footer { text-align: center; color: var(--dim); font-size: 12px; padding: 30px 16px 46px; border-top: 1px solid #1d1c23; }
  @media (hover: hover) { .grave:hover .eulogy { display: block; } }
</style>
</head>
<body>
<header>
  <div class="candles" aria-hidden="true">🕯️🕯️🕯️</div>
  <h1>${esc(g.repoName)} — <em>code cemetery</em></h1>
  <p class="sub">For everything written but never called. Each stone below mattered enough that someone named it. They have waited in the dark. Tonight, someone finally read them.</p>
  <div class="stats">
    <span>⚰️ <b>${census.stats.deceasedFiles}</b> files</span>
    <span>🪦 <b>${census.stats.deceasedSymbols}</b> dead exports</span>
    <span>🕳️ <b>${census.stats.deceasedDeps}</b> orphaned deps</span>
    <span>📜 <b>${linesBuried || "—"} </b> lines buried</span>
    <span>🕯️ longest rest: <b>${oldestRest}d</b></span>
    <span>🔑 scanned <b>${census.scannedAt.slice(0, 10)}</b></span>
  </div>
  <p class="gravediggers">where the shovels hit last: ${gravediggersBy.map(([a, n]) => esc(a)).join(" · ") || "unrecorded"}</p>
</header>
<div class="filters">
  <button type="button" data-f="all" aria-pressed="true">all graves</button>
  <button type="button" data-f="file" aria-pressed="false">full files</button>
  <button type="button" data-f="symbol" aria-pressed="false">dead exports</button>
</div>
<main id="yard">${graves}</main>
<footer>
  🌼 <span>Rendered by <strong>Gravekeeper</strong></span> — ${census.scannedAt.slice(0, 10)} · everything on this page was computed locally from git history; the model was only asked to speak.<br>
  <i>“All code is temporary. Not all code knows it yet.”</i>
</footer>
<script>
  const S = ${data};
  document.querySelectorAll(".filters button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".filters button").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    const f = b.dataset.f;
    document.querySelectorAll(".grave").forEach((gr) => {
      gr.style.display = f === "all" || gr.classList.contains(f) ? "" : "none";
    });
  }));
  document.querySelectorAll(".reveal").forEach((r) => r.addEventListener("click", (e) => {
    e.stopPropagation();
    r.closest(".grave").classList.toggle("open");
  }));
  document.querySelectorAll(".grave").forEach((gr) => gr.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); gr.classList.toggle("open"); }
  }));
</script>
</body>
</html>`;
}
