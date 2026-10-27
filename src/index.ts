#!/usr/bin/env node
import { promises as fs } from "node:fs";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { Command } from "commander";
import { buildCensus } from "./census.ts";
import { writeEpitaphs } from "./epitaphs.ts";
import { graveyardHTML } from "./template.ts";
import { graveyardMarkdown } from "./markdown.ts";
import { paths } from "./util.ts";
import type { Census, Graveyard } from "./types.ts";
import { GK_MODEL, GK_TONE } from "./config.ts";

const program = new Command();
program
  .name("gravekeeper")
  .description("Día de los Muertos for your dead code — a census, epitaphs, and a cemetery you can visit.")
  .version("0.1.0");

const save = (file: string, text: string) => fs.writeFile(file, text, "utf8");

function loadCensus(root: string): Promise<Census> {
  return fs.readFile(paths(root).census, "utf8").then((t) => JSON.parse(t) as Census);
}

program
  .command("scan <repoPath>")
  .description("count the dead: knip census + git forensics (no AI, no network calls)")
  .option("--skip-git", "skip mining git history for birth dates")
  .action(async (repoPath: string, opts: { skipGit?: boolean }) => {
    const root = path.resolve(repoPath);
    console.log(`🪦 ${path.basename(root)} — walking the yard…`);
    const census = await buildCensus(root);
    const p = paths(root);
    await mkdir(p.dir, { recursive: true });
    await save(p.census, JSON.stringify(census, null, 2));
    console.log(
      `   full files:     ${census.stats.deceasedFiles}\n` +
        `   dead exports:   ${census.stats.deceasedSymbols}\n` +
        `   orphaned deps:  ${census.stats.deceasedDeps}\n` +
        `   graves with no birth record: ${census.stats.unknownBirth}`
    );
    if (census.notes.length) census.notes.forEach((n) => console.log("   note: " + n));
    console.log(`   census.json → ${p.census}`);
  });

program
  .command("write <repoPath>")
  .description("ask the model for epitaphs (reads census.json from <repoPath>/.gravekeeper)")
  .action(async (repoPath: string) => {
    const root = path.resolve(repoPath);
    const census = await loadCensus(root);
    console.log(`🕯️ ${census.deceased.length} graves await their epitaphs · model=${GK_MODEL} tone=${GK_TONE}`);
    const g = await writeEpitaphs(census);
    const p = paths(root);
    await save(p.epitaphs, JSON.stringify(g, null, 2));
    console.log(`   epitaphs.json → ${p.epitaphs}`);
  });

program
  .command("render <repoPath>")
  .description("render the cemetery: graveyard.html + graveyard.md")
  .action(async (repoPath: string) => {
    const root = path.resolve(repoPath);
    const census = await loadCensus(root);
    let epitaphs: Graveyard["epitaphs"] = [];
    try {
      const g = JSON.parse(await fs.readFile(paths(root).epitaphs, "utf8")) as Graveyard;
      if (g.scannedAt !== census.scannedAt) console.log("   ! epitaphs are from an older scan; rendering what we have");
      epitaphs = g.epitaphs ?? [];
    } catch {
      console.log("   epitaphs.json not found — rendering unmarked graves (run `gravekeeper write` later)");
    }
    const g: Graveyard = { repoName: census.repoName, root, scannedAt: census.scannedAt, epitaphs, census };
    const p = paths(root);
    await save(p.html, graveyardHTML(g));
    await save(p.md, graveyardMarkdown(g));
    console.log(`   graveyard.html → ${p.html}\n   graveyard.md  → ${p.md}\n   open: file://${p.html}`);
  });

program
  .command("full <repoPath>")
  .description("scan → write → render, in one go")
  .option("--skip-ai", "skip the model call, leave graves unmarked")
  .action(async (repoPath: string, opts: { skipAi?: boolean }) => {
    const root = path.resolve(repoPath);
    console.log(`🪦 ${path.basename(root)} — full rite`);
    const census = await buildCensus(root);
    const p = paths(root);
    await mkdir(p.dir, { recursive: true });
    await save(p.census, JSON.stringify(census, null, 2));
    let epitaphs: Graveyard["epitaphs"] = [];
    if (!opts.skipAi && census.deceased.length) {
      const g = await writeEpitaphs(census);
      await save(p.epitaphs, JSON.stringify(g, null, 2));
      epitaphs = g.epitaphs;
    }
    const graveyard: Graveyard = { repoName: census.repoName, root, scannedAt: census.scannedAt, epitaphs, census };
    await save(p.html, graveyardHTML(graveyard));
    await save(p.md, graveyardMarkdown(graveyard));
    console.log(`\n   graveyard.html → ${p.html}\n   graveyard.md  → ${p.md}\n   open: file://${p.html}`);
  });

program.parseAsync(process.argv);
