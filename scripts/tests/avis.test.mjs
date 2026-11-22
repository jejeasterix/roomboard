// Regroupement des avertissements par sorte de l'essai de fidélité C13 (scripts/essais/avis.mjs).
import assert from "node:assert/strict";
import { test } from "node:test";
import { byKind } from "../essais/avis.mjs";

const notice = (...lines) => ["f : ouvert avec n avertissements :", ...lines.map((l) => `- ${l}`)].join("\n");

test("singulier et pluriel d'une même sorte comptent sur une seule ligne", () => {
  const msgs = [
    notice(
      "page 1 : 2 images TIFF non lues",
      "page 2 : 1 image TIFF non lue",
      "page 3 : 3 propriétés illisibles ignorées",
      "page 4 : 1 propriété illisible ignorée",
      "page 5 : 2 rideaux non lus",
      "page 6 : 1 rideau non lu",
      "page 7 : 2 textes verticaux non lus",
      "page 8 : 1 texte vertical non lu",
      "page 9 : 2 pages illisibles laissées vides",
      "page 9 : 1 page illisible laissée vide",
    ),
  ];
  assert.equal(
    byKind(msgs),
    "4 × propriété illisible ignorée ; 3 × image TIFF non lue ; 3 × rideau non lu ; 3 × texte vertical non lu ; 3 × page illisible laissée vide",
  );
});

test("sigles et ponctuation gardés, pluriel montré tel quel sans singulier reçu, ligne sans nombre comptée une fois", () => {
  const msgs = [notice("page 1 : 2 sons ou vidéos non lus", "page 2 : 1 repère XY non lu", "page 3 : 2 repères XY non lus", "côté de page hors bornes : 1920 × 1080")];
  assert.equal(byKind(msgs), "3 × repère XY non lu ; 2 × sons ou vidéos non lus ; 1 × côté de page hors bornes : 1920 × 1080");
});

test("mots invariables jamais coupés : le libellé montré est celui d'un avis réel, au singulier s'il en existe un", () => {
  const msgs = [notice("page 1 : 2 images distantes ou hors de l'archive non chargées", "page 2 : 1 image distante ou hors de l'archive non chargée", "page 3 : 3 assets trop gros")];
  assert.equal(byKind(msgs), "3 × image distante ou hors de l'archive non chargée ; 3 × assets trop gros");
});
