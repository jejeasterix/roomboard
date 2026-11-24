// Normalisation des sorties JSON de la CLI (cadrage cli, S5 ; cadrage cli-partage, S1) : déplacée de cli-essai.mjs,
// partagée avec cli-comparer.mjs.

/** Ids remplacés par leur rang d'apparition (stable entre deux fichiers) ; le champ `file` garde sa place, valeur neutre. */
export function normalise(valeur) {
  const rang = new Map();
  const id = (s) => {
    if (!rang.has(s)) rang.set(s, `#${rang.size}`);
    return rang.get(s);
  };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
  const marche = (v, cle) => {
    if (Array.isArray(v)) return v.map((x) => marche(x, cle));
    if (v !== null && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, marche(x, k)]));
    if (cle === "file") return "<fichier>";
    return typeof v === "string" && UUID.test(v) ? id(v) : v;
  };
  return marche(valeur, "");
}
