// Avertissements d'ouverture regroupés par sorte (essai de fidélité C13, scripts/essais/c13-fidelite.mjs).

const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/** Mot au singulier : « rideaux » → « rideau », « verticaux » → « vertical », « lues » → « lue » ; sigles intacts. */
const singularWord = (w) => {
  if (!/^[a-zà-ÿ]{3,}$/.test(w)) return w;
  if (w.endsWith("eaux")) return w.slice(0, -1);
  if (w.endsWith("aux")) return `${w.slice(0, -3)}al`;
  return w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
};

/** Sorte d'un avertissement compté : chaque mot au singulier, « non lue » et « non lu » confondus. */
const sortOf = (what) =>
  what
    .split(" ")
    .map(singularWord)
    .join(" ")
    .replace(/ non lue$/, " non lu");

/** Avertissements regroupés par sorte sur toutes les pages (« page 3 : 2 actions non lues » → « action non lu »), plus fréquents d'abord. */
export function byKind(msgs) {
  const sum = new Map();
  for (const m of msgs) {
    for (const line of m.split("\n").slice(1)) {
      const g = /^- (?:page \d+ : )?(\d+) (.+)$/.exec(line);
      const [n, key] = g ? [Number(g[1]), sortOf(g[2])] : [1, line.replace(/^- /, "")];
      sum.set(key, (sum.get(key) ?? 0) + n);
    }
  }
  return [...sum].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n} × ${cell(k)}`).join(" ; ");
}
