export interface Deceased {
  /** stable id used to join census + epitaphs */
  id: string;
  /** tombstone type: a whole unused file, or a lone unused symbol inside an alive file */
  type: "file" | "symbol";
  /** repository-relative path */
  path: string;
  /** what exactly died here (export names / type names) */
  symbols: string[];
  bornAt: string | null;
  lastSighting: string | null;
  commits: number;
  authors: string[];
  lastAuthor: string | null;
  lines: number | null;
  /** true when a git history was available to mine */
  git: boolean;
  bornIn: string | null;
  lastAuthorEmail: string | null;
}

export interface Census {
  repoName: string;
  root: string;
  scannedAt: string;
  scanner: string;
  stats: {
    deceasedFiles: number;
    deceasedSymbols: number;
    deceasedDeps: number;
    unknownBirth: number;
  };
  deceased: Deceased[];
  dependencies: string[];
  notes: string[];
}

export interface EpitaphEntry {
  id: string;
  type: "file" | "symbol";
  path: string;
  symbols: string[];
  epitaph: string;
  causeOfDeath: string;
  finalWords: string;
}

export interface Graveyard {
  repoName: string;
  root: string;
  scannedAt: string;
  epitaphs: EpitaphEntry[];
  census: Census;
}
