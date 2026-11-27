# Cadrage — OG27 : restes d'OG19, d'OG14 et d'OG24

Voie courte : cinq restes connus, sans fonction neuve. Aucune question ne parvenait à Jérôme pendant le tour : chaque
choix est tranché ici, avec sa raison.

## Points

1. **Ascenseur d'une page au fond PDF A4** (reste moyen d'OG24, choix P2 de la PR 68). Une page Paysage dont le fond PDF
   A4 est plus haut que large s'affiche « portrait » (le segment le dit). Elle suit désormais la règle du portrait :
   ajustée en largeur, avec l'ascenseur, bas du fond à 16 px du bas de la vue.
2. **Recalage de l'ascenseur** (reste faible d'OG24). Quand un îlot du haut bouge, l'ajustement et l'ascenseur se
   recalent à l'image suivante, sans attendre un défilement.
3. **Une seule aide pour les raccourcis affichés** (reste faible d'OG19). `ariaKeys` du menu ☰ est retiré ; la ligne du
   menu lit `buttonShortcut` (texte et `aria-keyshortcuts`), comme les boutons de la barre.
4. **Fichier d'état du lot 2** (reste faible d'OG14). `docs/sessions/personnalisation-2-etat.md` passe de « clôture » à
   « livré », avec la PR 67 et sa fusion `cddbde4`.
5. **Miniature d'une page portrait** (constat du canal sur `portrait-pleine-largeur/apres-milieu.png`). Constat vérifié :
   la page portrait, blanche, était contenue dans une boîte 16:9 blanche elle aussi ; on ne voyait que la boîte, donc un
   paysage. La miniature montre maintenant la forme réelle de la page.

## Choix tranchés seul

- **D1 — Portrait = forme affichée.** L'ascenseur et l'ajustement lisent `pageLayoutOf` (cadre plus haut que large,
  fond compris), plus le seul segment choisi. Décision du canal sur l'évidence (Jérôme : « En mode portrait la page doit
  remplir l'écran et un ascenseur permet de monté / descendre »). Réversible : rétablir le test `height > width` de la
  page dans `engine.ts` (`scrollState`).
- **D2 — Seule une vue encore ajustée se réajuste.** Une vue que l'utilisateur a défilée ou zoomée garde sa caméra ;
  seul l'ascenseur relit ses bornes (sa position change donc d'autant). Raison : ne jamais déplacer ce que la main a placé.
  Les pages quittées encore ajustées suivent aussi : elles se montrent sous le nouveau haut.
- **D3 — Détection par `MutationObserver`.** Attributs d'un îlot ou d'un groupe de coin (`left`, `top`, `data-compact`,
  repli…), arrivée ou départ d'un îlot ; un appel par image au plus. L'intérieur d'un îlot (boutons) ne réveille rien.
  Écarté : un `ResizeObserver` par îlot (une taille d'îlot change par un attribut de l'îlot, déjà suivi ; la fenêtre,
  elle, est suivie par le `ResizeObserver` de la scène).
- **D4 — Menu sous macOS : `Meta`.** La ligne du menu annonçait `Control+N` sous macOS alors qu'elle affiche `⌘N` ; elle
  annonce maintenant `Meta+N`, comme la barre. Les touches nommées (flèches, Suppr, Échap) suivent la table `ARIA`.
- **D5 — Miniature : boîte gardée, page à sa forme.** La boîte 16:9 reste (même hauteur pour toute page, T20), en gris
  `--rf-gray-50` ; la page y porte son blanc et son filet de 1 px `--rf-gray-300`, à sa forme réelle, centrée.
  Écarté : une boîte à la forme de la page (en Moyennes, 313 px de haut par page portrait : liste trois fois plus longue).
- **D6 — Point 4 sans garde automatique.** Une garde « aucun état à « clôture » dans `main` » bloquerait les chantiers
  des autres ouvriers en pleine clôture ; le fichier est relu à la main.

## Gestes et raccourcis

Aucun geste neuf. Déplacer un îlot du haut : poignée au doigt, au stylet ou à la souris (L2-9) ; au clavier, flèches de
la poignée (16 px, Maj 64 px) et Début pour le recentrer (L2-10). L'ascenseur garde ses gestes (OG24).

## Hypothèses à revoir

- Un îlot qui change de hauteur sans changer un attribut à lui (contenu qui passe sur deux lignes) ne déclenche pas le
  recalage ; il se fait au prochain changement d'attribut, de taille de la scène ou au prochain défilement.
- La miniature d'une page plus large que 16:9 (PDF très large) reste contenue (`object-fit: contain`) ; son filet suit
  alors la boîte de l'image, pas la page.
