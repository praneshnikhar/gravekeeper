import { spawnSync } from "node:child_process";
import path from "node:path";
import { accessSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { simpleGit } from "simple-git";
import type { Census, Deceased } from "./types.ts";
import { KNIP_TIMEOUT } from "./config.ts";

type KnipItem = string | { name?: string; symbol?: string };
interface KnipIssuesEntry {
  exports?: KnipItem[];
  types?: KnipItem[];
  dependencies?: KnipItem[];
  duplicates?: KnipItem[];
}
interface KnipFileIssue {
  file?: string;
  files?: { name?: string }[];
  exports?: KnipItem[];
  types?: KnipItem[];
  dependencies?: KnipItem[];
  devDependencies?: KnipItem[];
}
interface KnipReport {
  // new shape (knip ≥ 8)
  issues?: KnipFileIssue[] | Record<string, KnipIssuesEntry>;
  // old shape (knip ≤ 7)
  files?: string[];
}

interface Harvest {
  deadFiles: Set<string>;
  symbolsByFile: Map<string, string[]>;
  deps: Set<string>;
}

const itemName = (item: KnipItem): string =>
  typeof item === "string" ? item : (item.name ?? item.symbol ?? "");

function harvest(report: KnipReport): Harvest {
  const out: Harvest = { deadFiles: new Set(), symbolsByFile: new Map(), deps: new Set() };
  const issues = report.issues;
  if (Array.isArray(issues)) {
    for (const entry of issues) {
      for (const f of entry.files ?? []) if (f?.name) out.deadFiles.add(f.name.replace(/^\.\//, ""));
      const entryPath = entry.file ?? "";
      const names = [...(entry.exports ?? []), ...(entry.types ?? [])].map(itemName).filter(Boolean);
      if (names.length && entryPath) {
        const prev = out.symbolsByFile.get(entryPath) ?? [];
        out.symbolsByFile.set(entryPath, [...prev, ...names]);
      }
      for (const cat of ["dependencies", "devDependencies"] as const) {
        for (const d of entry[cat] ?? []) {
          const name = itemName(d);
          if (name) out.deps.add(name);
        }
      }
    }
    return out;
  }
  // old object-shaped report
  for (const [rawPath, entry] of Object.entries(issues ?? {})) {
    const rel = rawPath.replace(/^\.\//, "");
    const names = [...(entry.exports ?? []), ...(entry.types ?? [])].map(itemName).filter(Boolean);
    if (names.length) out.symbolsByFile.set(rel, names);
  }
  for (const rel of report.files ?? []) out.deadFiles.add(rel.replace(/^\.\//, ""));
  return out;
}

function artifactExists(dir: string, file: string): boolean {
  try {
    accessSync(path.join(dir, file));
    return true;
  } catch {
    return false;
  }
}

/** Run knip inside the target repo and harvest its JSON report. */
function runKnip(root: string, notes: string[]): KnipReport {
  if (!artifactExists(root, "package.json")) {
    throw new Error(
      `No package.json in ${root}\nGravekeeper v1 speaks JS/TS only, via knip.`
    );
  }
  const res = spawnSync(
    "npx",
    ["-y", "knip@latest", "--reporter", "json", "--no-exit-code", "--no-progress"],
    { cwd: root, timeout: KNIP_TIMEOUT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }
  );
  const stdout = (res.stdout || "").trim();
  if (!stdout) {
    notes.push(`knip produced no report (exit ${res.status}).`);
    return {};
  }
  try {
    return JSON.parse(stdout) as KnipReport;
  } catch {
    notes.push("knip report was not valid JSON; its stdout was discarded.");
    if (res.stderr) notes.push("knip stderr: " + res.stderr.slice(0, 300));
    return {};
  }
}

interface GitRecord {
  bornAt: string | null;
  lastSighting: string | null;
  commits: number;
  authors: string[];
  lastAuthor: string | null;
  lastAuthorEmail: string | null;
  git: boolean;
}

async function forensics(root: string, relPath: string): Promise<GitRecord> {
  const empty: GitRecord = {
    bornAt: null,
    lastSighting: null,
    commits: 0,
    authors: [],
    lastAuthor: null,
    lastAuthorEmail: null,
    git: false,
  };
  try {
    const git = simpleGit({ baseDir: root });
    const log = await git.log({ file: relPath, maxCount: 500 });
    // all[] is newest-first; the last element is the birth commit
    const newest = log.all[0];
    const oldest = log.all[log.all.length - 1];
    const authors = [...new Set(log.all.map((c) => c.author_name))];
    return {
      bornAt: oldest ? oldest.date : null,
      lastSighting: newest ? newest.date : null,
      commits: log.total ?? log.all.length,
      authors,
      lastAuthor: newest ? newest.author_name : null,
      lastAuthorEmail: newest ? newest.author_email : null,
      git: true,
    };
  } catch {
    return empty;
  }
}

async function countLines(root: string, relPath: string): Promise<number | null> {
  try {
    const buf = await readFile(path.join(root, relPath), "utf8");
    return buf.split("\n").length;
  } catch {
    return null; // file may already be gone
  }
}

export async function buildCensus(root: string): Promise<Census> {
  root = path.resolve(root);
  const repoName = path.basename(root);
  const notes: string[] = [];
  console.log(`   … running knip inside ${repoName} (may take a minute)`);

  const report = runKnip(root, notes);
  const { deadFiles, symbolsByFile, deps } = harvest(report);

  const rows: Deceased[] = [];
  const seenPaths = new Set<string>();

  const mkDeceased = (type: "file" | "symbol", rel: string, symbols: string[]): Deceased => ({
    id: `${type}:${rel}`,
    type,
    path: rel,
    symbols,
    bornAt: null,
    lastSighting: null,
    commits: 0,
    authors: [],
    lastAuthor: null,
    lines: null,
    git: false,
    bornIn: null,
    lastAuthorEmail: null,
  });

  for (const rel of deadFiles) {
    if (seenPaths.has(rel)) continue;
    seenPaths.add(rel);
    rows.push(mkDeceased("file", rel, symbolsByFile.get(rel) ?? []));
  }
  for (const [rel, names] of symbolsByFile) {
    if (deadFiles.has(rel) || seenPaths.has(rel)) continue;
    seenPaths.add(rel);
    rows.push(mkDeceased("symbol", rel, [...new Set(names)]));
  }

  console.log(`   … mining git history for ${rows.length} deceased`);
  let unknownBirth = 0;
  for (const row of rows) {
    const rec = await forensics(root, row.path);
    Object.assign(row, rec);
    if (!rec.git) unknownBirth++;
    if (row.type === "file") row.lines = await countLines(root, row.path);
  }

  // longest-resting first
  rows.sort((a, b) => (a.lastSighting ?? "9999") .localeCompare(b.lastSighting ?? "9999"));

  return {
    repoName,
    root,
    scannedAt: new Date().toISOString(),
    scanner: "knip",
    stats: {
      deceasedFiles: rows.filter((r) => r.type === "file").length,
      deceasedSymbols: rows.filter((r) => r.type === "symbol").length,
      deceasedDeps: deps.size,
      unknownBirth,
    },
    deceased: rows,
    dependencies: [...deps].sort(),
    notes,
  };
}
