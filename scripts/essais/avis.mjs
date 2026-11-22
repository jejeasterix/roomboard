// Avertissements d'ouverture regroupés par sorte (essai de fidélité C13, scripts/essais/c13-fidelite.mjs).

const cell = (s) => String(s).replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();

/** Mot au singulier : « rideaux » → « rideau », « verticaux » → « vertical », « lues » → « lue » ; sigles intacts. */
const singularWord = (w) => {
  if (!/^[a-zà-ÿ]{3,}$/.test(w)) return w;
  if (w.endsWith("eaux")) return w.slice(0, -1);
  if (w.endsWith("aux")) return `${w.slice(0, -3)}al`;
  return w.endsWith("s") && !w.endsWith("ss") ? w.slice(0, -1) : w;
};

/** Clé de regroupement d'un avertissement compté : chaque mot au singulier, « non lue » et « non lu » confondus. La clé
 *  sert à regrouper, jamais à afficher (« hors » y devient « hor », des deux côtés). */
const sortOf = (what) =>
  what
    .split(" ")
    .map(singularWord)
    .join(" ")
    .replace(/ non lue$/, " non lu");

/** Avertissements regroupés par sorte sur toutes les pages (« page 3 : 2 actions non lues » et « page 4 : 1 action non
 *  lue » → « 3 × action non lue »), plus fréquents d'abord ; le libellé montré est celui d'un avis reçu, au singulier
 *  (compte 1) s'il en existe un. */
export function byKind(msgs) {
  const sum = new Map();
  for (const m of msgs) {
    for (const line of m.split("\n").slice(1)) {
      const g = /^- (?:page \d+ : )?(\d+) (.+)$/.exec(line);
      const [n, key, label] = g ? [Number(g[1]), sortOf(g[2]), g[2]] : [1, line.replace(/^- /, ""), line.replace(/^- /, "")];
      const one = g !== null && n === 1;
      const was = sum.get(key);
      if (was === undefined) sum.set(key, { n, label, one });
      else {
        was.n += n;
        if (one && !was.one) Object.assign(was, { label, one });
      }
    }
  }
  return [...sum.values()].sort((a, b) => b.n - a.n).map((k) => `${k.n} × ${cell(k.label)}`).join(" ; ");
}
