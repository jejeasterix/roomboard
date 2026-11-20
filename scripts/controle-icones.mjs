#!/usr/bin/env node
// Icônes de l'installeur (OD47) : chaque fichier de bundle.icon existe, et la liste contient
// un .ico valide en 16, 32, 48 et 256 px (sans lui, le bundle Windows échoue :
// « Couldn't find a .ico icon »).
import { readFileSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

const conf = process.argv[2];
if (!conf) {
  console.error("usage : controle-icones.mjs <tauri.conf.json>");
  process.exit(2);
}
const erreurs = [];
const icones = JSON.parse(readFileSync(conf, "utf8"))?.bundle?.icon;
if (!Array.isArray(icones) || icones.length === 0) {
  erreurs.push("bundle.icon absent ou vide");
} else {
  const base = dirname(resolve(conf));
  for (const ic of icones) {
    if (!existsSync(resolve(base, ic))) erreurs.push(`fichier absent : ${ic}`);
  }
  // Même règle que tauri-build : extension .ico en minuscules.
  const ico = icones.filter((ic) => ic.endsWith(".ico"));
  if (ico.length === 0) erreurs.push("aucun .ico dans bundle.icon");
  for (const ic of ico) {
    const chemin = resolve(base, ic);
    if (!existsSync(chemin)) continue;
    const b = readFileSync(chemin);
    if (b.length < 6 || b.readUInt16LE(0) !== 0 || b.readUInt16LE(2) !== 1) {
      erreurs.push(`${ic} : en-tête ICO invalide`);
      continue;
    }
    const n = b.readUInt16LE(4);
    const tailles = new Set();
    for (let i = 0; i < n && 6 + 16 * (i + 1) <= b.length; i++) {
      const l = b[6 + 16 * i];
      tailles.add(l === 0 ? 256 : l);
    }
    for (const t of [16, 32, 48, 256]) {
      if (!tailles.has(t)) erreurs.push(`${ic} : taille ${t} px absente`);
    }
  }
}
if (erreurs.length) {
  for (const e of erreurs) console.error(`controle-icones : ${e}`);
  process.exit(1);
}
console.log("controle-icones : OK");
