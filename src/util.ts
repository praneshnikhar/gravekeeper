export const daysAgo = (iso: string | null): number | null => {
  if (!iso) return null;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000));
};

export const daysBetween = (a: string | null, b: string | null): number | null => {
  if (!a || !b) return null;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
};

/** ` graveyard/` layout all commands agree on */
export const paths = (root: string) => ({
  dir: `${root}/.gravekeeper`,
  census: `${root}/.gravekeeper/census.json`,
  epitaphs: `${root}/.gravekeeper/epitaphs.json`,
  html: `${root}/.gravekeeper/graveyard.html`,
  md: `${root}/.gravekeeper/graveyard.md`,
});
