# C13 lot 1 : fidélité de lecture des .iwb et coût du réglage z

## Méthode

Un exemple Cargo temporaire, hors dépôt et retiré avant le commit, appelle `read_svg` (dialecte IWB) puis `parse` en
natif sur chacun des 55 fichiers de `~/telechargements-roomboard/iwb/` (5 leçons, 50 fichiers de la suite de test).
Pour les ZIP, `content.xml` est extrait par `unzip -Cp` ; les images ne sont pas résolues en natif ; les fichiers source
ne sont jamais copiés dans le dépôt (le tableau ne porte que des noms, des nombres et des avertissements). « Objets
lus » compte les membres de groupe.

## Fidélité de lecture

| fichier | forme | pages | objets lus | avertissements | résultat |
|---|---|---|---|---|---|
| 14-16 Biology.iwb | ZIP | 4 | 20 | 6 | lu |
| 7-11 Maths 3.iwb | SVG | 3 | 46 | 2 | lu |
| 7-11 geography.iwb | ZIP | 8 | 78 | 19 | lu |
| History 11-14.iwb | ZIP | 7 | 55 | 21 | lu |
| Or Gates.iwb | ZIP | 11 | 48 | 17 | lu |
| 100_pages.iwb | SVG | 100 | 100 | 0 | lu |
| 10_pages.iwb | SVG | 10 | 10 | 0 | lu |
| 2_pages.iwb | SVG | 2 | 2 | 0 | lu |
| additional.iwb | ZIP | 1 | 2 | 1 | lu |
| audio.iwb | ZIP | 1 | 2 | 1 | lu |
| background.iwb | SVG | 2 | 4 | 0 | lu |
| background2.iwb | ZIP | 4 | 12 | 4 | lu |
| blank.iwb | SVG | 1 | 0 | 0 | lu |
| circle.iwb | SVG | 1 | 40 | 0 | lu |
| comments.iwb | SVG | 1 | 1 | 0 | lu |
| container.iwb | SVG | 1 | 12 | 1 | lu |
| creator.iwb | SVG | 1 | 1 | 1 | lu |
| description.iwb | SVG | 1 | 1 | 1 | lu |
| ellipse.iwb | SVG | 1 | 42 | 0 | lu |
| empty_folders.iwb | ZIP | 1 | 1 | 0 | lu |
| fill.iwb | SVG | 3 | 20 | 1 | lu |
| flash.iwb | ZIP | 1 | 1 | 1 | lu |
| groups.iwb | SVG | 3 | 17 | 2 | lu |
| images.iwb | ZIP | 3 | 28 | 1 | lu |
| layering.iwb | SVG | 1 | 6 | 0 | lu |
| line.iwb | SVG | 2 | 50 | 0 | lu |
| links.iwb | ZIP | 4 | 16 | 4 | lu |
| locking.iwb | SVG | 2 | 9 | 2 | lu |
| nonzip.iwb | SVG | 1 | 1 | 0 | lu |
| owner.iwb | SVG | 1 | 1 | 1 | lu |
| polygon.iwb | SVG | 1 | 48 | 1 | lu |
| polyline.iwb | SVG | 3 | 58 | 0 | lu |
| rectangle.iwb | SVG | 2 | 49 | 1 | lu |
| rectangle2.iwb | SVG | — | — | — | refusé : fichier endommagé : XML mal formé (ill-formed document: expected `</svg:page>`, but `</svg:pageset>` was found) |
| repeat_attributes.iwb | SVG | 1 | 4 | 0 | lu |
| repeat_attributes2.iwb | SVG | 1 | 2 | 0 | lu |
| replicate.iwb | SVG | 1 | 6 | 1 | lu |
| requiredExtensions.iwb | ZIP | 5 | 15 | 4 | lu |
| revealer.iwb | SVG | 1 | 2 | 1 | lu |
| rotation.iwb | SVG | 1 | 18 | 0 | lu |
| rotation2.iwb | SVG | 1 | 3 | 0 | lu |
| single_page.iwb | SVG | 1 | 1 | 0 | lu |
| text.iwb | SVG | 10 | 49 | 1 | lu |
| text2.iwb | SVG | 1 | 1 | 0 | lu |
| text3.iwb | SVG | 1 | 8 | 1 | lu |
| thumbnails.iwb | ZIP | 1 | 1 | 0 | lu |
| videos.iwb | ZIP | 1 | 2 | 1 | lu |
| viewbox_accurate_1280_1024_bottom.iwb | SVG | 1 | 2 | 0 | lu |
| viewbox_height_width.iwb | SVG | 1 | 1 | 0 | lu |
| viewbox_large.iwb | SVG | 1 | 1 | 0 | lu |
| viewbox_not_pixels_negative.iwb | SVG | 1 | 1 | 0 | lu |
| viewbox_not_zeroed.iwb | SVG | 1 | 2 | 0 | lu |
| viewbox_offscreen_object.iwb | SVG | 1 | 2 | 1 | lu |
| viewbox_partial_object.iwb | SVG | 1 | 2 | 1 | lu |
| viewbox_small.iwb | SVG | 1 | 1 | 0 | lu |


**Synthèse : 54 lus, 1 refusé** (`rectangle2.iwb`, refus attendu CR5 : XML mal formé). 55 lignes de données.
Totaux des 54 fichiers lus : 222 pages, 905 objets, 99 avertissements.

`7-11 Maths 3.iwb` : 3 pages (attendu 3, S2).

### Avertissements par fichier

- `14-16 Biology.iwb` : page 1 : 1 verrou non lu ; page 2 : 1 animation Flash non lue ; page 2 : 1 verrou non lu ; page 3 : 12 verrous non lus ; page 3 : 2 alignements de texte non lus ; page 4 : 2 verrous non lus
- `7-11 Maths 3.iwb` : page 1 : 9 verrous non lus ; page 2 : 9 verrous non lus
- `7-11 geography.iwb` : page 1 : 4 verrous non lus ; page 1 : 2 alignements de texte non lus ; page 2 : 10 verrous non lus ; page 2 : 1 alignement de texte non lu ; page 2 : 3 images d'un format non lu (EMF, WMF…) ; page 3 : 3 liens perdus (contenu lu) ; page 3 : 9 verrous non lus ; page 3 : 1 image d'un format non lu (EMF, WMF…) ; page 4 : 1 lien perdu (contenu lu) ; page 4 : 10 verrous non lus ; page 5 : 1 lien perdu (contenu lu) ; page 5 : 7 verrous non lus ; page 5 : 9 images d'un format non lu (EMF, WMF…) ; page 6 : 1 lien perdu (contenu lu) ; page 6 : 13 verrous non lus ; page 6 : 1 image d'un format non lu (EMF, WMF…) ; page 7 : 7 verrous non lus ; page 8 : 20 verrous non lus ; page 8 : 8 remplissages de polygones non lus
- `History 11-14.iwb` : page 1 : 1 lien perdu (contenu lu) ; page 1 : 19 verrous non lus ; page 1 : 2 alignements de texte non lus ; page 2 : 4 liens perdus (contenu lu) ; page 2 : 8 verrous non lus ; page 2 : 2 remplissages de polygones non lus ; page 2 : 2 images d'un format non lu (EMF, WMF…) ; page 3 : 4 liens perdus (contenu lu) ; page 3 : 7 verrous non lus ; page 3 : 2 alignements de texte non lus ; page 3 : 2 images d'un format non lu (EMF, WMF…) ; page 4 : 4 liens perdus (contenu lu) ; page 4 : 10 verrous non lus ; page 4 : 2 images d'un format non lu (EMF, WMF…) ; page 5 : 4 liens perdus (contenu lu) ; page 5 : 9 verrous non lus ; page 5 : 2 images d'un format non lu (EMF, WMF…) ; page 6 : 4 liens perdus (contenu lu) ; page 6 : 9 verrous non lus ; page 6 : 2 images d'un format non lu (EMF, WMF…) ; page 7 : 3 verrous non lus
- `Or Gates.iwb` : page 1 : 8 verrous non lus ; page 2 : 5 verrous non lus ; page 3 : 6 verrous non lus ; page 4 : 6 verrous non lus ; page 5 : 7 verrous non lus ; page 6 : 6 verrous non lus ; page 7 : 1 animation Flash non lue ; page 7 : 6 verrous non lus ; page 8 : 1 animation Flash non lue ; page 8 : 2 verrous non lus ; page 9 : 1 animation Flash non lue ; page 9 : 2 verrous non lus ; page 10 : 1 verrou non lu ; page 11 : 1 vidéo non lue ; page 11 : 1 animation Flash non lue ; page 11 : 1 lien perdu (contenu lu) ; page 11 : 3 verrous non lus
- `additional.iwb` : page 1 : 1 lien perdu (contenu lu)
- `audio.iwb` : page 1 : 2 sons non lus
- `background2.iwb` : page 1 : 1 objet de fond gardé comme objet ; page 2 : 1 objet de fond gardé comme objet ; page 3 : 1 objet de fond gardé comme objet ; page 4 : 1 objet de fond gardé comme objet
- `container.iwb` : page 1 : 3 remplissages de polygones non lus
- `creator.iwb` : 1 bloc de métadonnées non lu
- `description.iwb` : 1 bloc de métadonnées non lu
- `fill.iwb` : page 3 : 1 remplissage de polygone non lu
- `flash.iwb` : page 1 : 1 animation Flash non lue
- `groups.iwb` : page 2 : 1 remplissage de polygone non lu ; page 3 : 1 remplissage de polygone non lu
- `images.iwb` : page 1 : 4 images d'un format non lu (EMF, WMF…)
- `links.iwb` : page 1 : 2 liens perdus (contenu lu) ; page 2 : 1 lien perdu (contenu lu) ; page 3 : 2 liens perdus (contenu lu) ; page 4 : 2 liens perdus (contenu lu)
- `locking.iwb` : page 1 : 1 lien perdu (contenu lu) ; page 1 : 2 verrous non lus
- `owner.iwb` : 1 bloc de métadonnées non lu
- `polygon.iwb` : page 1 : 23 remplissages de polygones non lus
- `rectangle.iwb` : page 2 : 1 révélateur non lu
- `replicate.iwb` : page 1 : 1 duplicateur non lu
- `requiredExtensions.iwb` : page 1 : 1 vidéo non lue ; page 2 : 1 animation Flash non lue ; page 4 : 1 son non lu ; page 5 : 1 son non lu
- `revealer.iwb` : page 1 : 1 révélateur non lu
- `text.iwb` : page 5 : 3 alignements de texte non lus
- `text3.iwb` : page 1 : 4 objets d'un type non lu
- `videos.iwb` : page 1 : 2 vidéos non lues
- `viewbox_offscreen_object.iwb` : page 1 : 1 remplissage de polygone non lu
- `viewbox_partial_object.iwb` : page 1 : 1 remplissage de polygone non lu

## Coût de vitesse du réglage `z` (HU1-4, seuil 15 %)

Mesure par `performance.now()` dans un script instrumenté hors dépôt, qui ne chronomètre que : (1) l'export PDF
(clic sur « Exporter en PDF… » jusqu'au fichier enregistré) d'un PDF de 500 pages dont la page 2 est annotée ; (2) le
dépôt d'un `.xlsx` de 30 000 lignes × 10 colonnes jusqu'à l'insertion du tableau. Le lancement de Chromium n'est pas
compté. Trois passages par variante, Chromium headless, `nice -n 10`. La variante sans `z` (blocs
`[profile.release.package.*]` retirés de `Cargo.toml` en local, module formats de 3 222 523 o contre 3 021 707 o avec `z`)
n'a jamais été commitée ni servie hors de la mesure ; `Cargo.toml` est revenu à l'état de la branche.

| essai | `z` (3 passages, ms) | médiane `z` | sans `z` (3 passages, ms) | médiane sans `z` | écart |
|---|---|---|---|---|---|
| export PDF, 500 pages | 533, 726, 566 | 566 | 541, 773, 675 | 675 | `z` plus rapide de 16 % (bruit) |
| lecture `.xlsx`, 30 000 lignes | 14536, 14539, 14298 | 14536 | 14626, 15091, 14524 | 14626 | `z` plus rapide de 0,6 % |

Charge machine (`uptime`, 1 min) : série `z` de 3,6 à 3,4 ; série sans `z` de 9,4 à 7,6 (autres tâches du chantier en
cours sur la VM).

Verdict HU1-4 :
- export PDF : **mesure non probante** (dispersion entre passages de 36 % pour une même variante, supérieure au seuil de
  15 % ; charge différente entre les deux séries) ;
- lecture `.xlsx` : dispersion de 6 % au plus, aucun surcoût de `z` observé (écart de 0,6 %, en faveur de `z`) ; le
  temps de 14,5 s n'est pas prouvé dominé par le Wasm, donc ce résultat ne démontre pas à lui seul que `z` tient le seuil.

À trancher par l'orchestrateur ; rien n'a été changé.
