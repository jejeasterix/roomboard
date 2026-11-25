# Essais C11b en coque — capture du bureau et envoi au tableau (S5)

Pour : séances de Jérôme (PC Windows 10 22H2 et 11, Mac sous macOS 14, poste Linux X11 avec et sans compositeur, VM en
session GNOME Wayland). Rien de ceci ne se joue sur la VM en automatique : le code Windows et macOS (`xcap`, autorisation
« Enregistrement de l'écran ») n'y est pas compilé (cadrage P35). Construire la coque comme dans
`docs/essais/coque-windows.md` (§ 2) ou `coque-macos.md`, sur la branche du chantier. Cocher chaque ligne ; noter l'écart
en une phrase. Les fiches C11a (`c11a-coque.md`) restent à jouer avant celle-ci.

## C11b-1 — Envoyer au tableau, bureau vivant (Windows 10, Windows 11, macOS 14, Linux X11)
- [ ] Ouvrir un tableau de 2 pages, montrer la page 1, « Annotation du bureau », écrire sur le bureau (un mot, un cercle autour d'une icône).
- [ ] « Envoyer au tableau » : l'annotation se ferme ; le tableau montre la page 2 de 3, avec le bureau en fond, ajusté à la largeur de la page.
- [ ] Dans l'image du fond : ni la barre RoomBoard, ni la fenêtre d'annotation, ni l'encre (nos fenêtres sont absentes de la capture).
- [ ] Design L4 : le cadre violet est absent de l'image envoyée au tableau (aucun liseré violet sur les bords de l'image ; cadre affiché dans Réglages).
- [ ] Le trait est par-dessus, au même endroit que sur le bureau (le cercle entoure la même icône) ; Sélection le sélectionne comme objet.
- [ ] Bandeau « Envoyé au tableau : page 2 » en bas à droite de la scène, aucune boîte système (design L4) ; Ctrl+Z retire la page entière (fond et encre) en une fois ; Ctrl+Y la remet.
- [ ] Clignotement de nos fenêtres pendant la capture (≈ 250 ms, HC11b-9) : noter s'il gêne.
- [ ] Enregistrer, fermer, rouvrir : la page 2 a son fond et son trait.
- [ ] Zoomer ou faire défiler dans l'annotation avant d'écrire, puis envoyer : l'encre reste sur le bureau capturé (P13, HC11b-13).

## C11b-2 — Envoyer dans un nouvel onglet ; profil « Annotation au démarrage »
- [ ] En annotation, « Envoyer dans un nouvel onglet » : un onglet « Capture du bureau » d'une page est montré ; l'onglet d'origine est inchangé.
- [ ] L'onglet « Annotation » garde son encre après l'envoi (P8) ; « Quitter l'annotation » le garde aussi, sans rien envoyer.
- [ ] Profil « Annotation au démarrage », relancer : « Envoyer au tableau » ouvre un nouvel onglet ; « Envoyer dans un nouvel onglet » est grisé.
- [ ] Ni encre ni capture possible : avis « rien à envoyer », aucune page ajoutée.

## C11b-3 — Figer le bureau (Windows 10, Windows 11, macOS 14, Linux X11)
- [ ] « Figer le bureau » : la fenêtre devient opaque ; déplacer une fenêtre sous l'annotation : l'image ne bouge plus.
- [ ] Le bouton est enfoncé et dit « Bureau vivant » ; avec Sélection, cliquer un trait le sélectionne ; aucun clic ne passe au bureau.
- [ ] « Envoyer au tableau » en figé : page avec l'image figée, l'encre au même endroit.
- [ ] Quitter, rentrer : l'entrée est figée (même image) ; « Bureau vivant » : la transparence revient, sans fond ; le clic à travers revient avec Sélection.
- [ ] L'onglet « Annotation » montré sur le tableau affiche le fond figé ; Ctrl+S l'enregistre ; le rouvrir montre fond et encre.

## C11b-4 — Repli figé sans transparence (Linux X11)
- [ ] X11 sans compositeur (Openbox sans picom, ou `xfwm4 --replace --compositor=off`) : l'entrée capture d'abord et entre figée ; le bouton dit « Recapturer le bureau » ; un clic recapture le bureau (nouvelle image).
- [ ] X11 avec compositeur (picom, Mutter, KWin) : l'entrée est vivante et transparente.
- [ ] Transparence non peinte malgré un compositeur (pilote GPU) : le noter ; « Figer le bureau » reste à la main (HC11b-6).

## C11b-5 — Autorisation macOS (macOS 14)
- [ ] Première capture (« Envoyer au tableau » ou « Figer le bureau ») : invite du système « Enregistrement de l'écran ».
- [ ] Sans autorisation : page blanche avec l'encre, avis « capture du bureau impossible (autorisation “Enregistrement de l'écran” refusée : l'accorder dans Réglages Système › Confidentialité et sécurité, puis relancer RoomBoard) : page à fond blanc ».
- [ ] « Figer le bureau » sans autorisation : même avis, l'annotation reste vivante.
- [ ] Accorder dans Réglages Système › Confidentialité et sécurité, relancer RoomBoard : la capture contient le bureau et les fenêtres des autres applications (pas seulement le fond d'écran).
- [ ] Si un Mac sous macOS 15 est disponible : noter le comportement (`CGWindowListCreateImage` marqué obsolète, HC11b-16).

## C11b-6 — XWayland et Wayland (VM Ubuntu, session GNOME Wayland)
- [ ] Relancée en mode compatibilité (XWayland) : « Envoyer au tableau » donne une page blanche avec l'encre et l'avis « capture du bureau impossible (Wayland) : page à fond blanc ».
- [ ] « Figer le bureau » sous XWayland : même avis, l'annotation reste vivante.
- [ ] Wayland natif : l'annotation reste indisponible (C11a-7) ; aucune entrée de capture dans la barre du tableau.

## C11b-7 — Deux écrans, échelles différentes, 4K
- [ ] Deux écrans (100 % et 150 % sous Windows ; Retina et écran externe sous macOS) : sur chaque écran (« Écran suivant »), envoyer : la capture vient de l'écran de l'annotation, sans décalage de l'encre.
- [ ] Barre en bas, à gauche ou à droite (profil) : la capture couvre la zone d'annotation seulement, pas la bande de la barre (HC11b-11).
- [ ] Écran 4K : noter le poids du `.roomboard` après un envoi et le temps entre le clic et la page montrée (HC11b-10).

## C11b-8 — Fichiers temporaires (P24)
- [ ] Après un envoi, le dossier `captures` du cache de l'application est vide (Windows `%LOCALAPPDATA%\org.roomboard.app\captures`, macOS `~/Library/Caches/org.roomboard.app/captures`, Linux `~/.cache/org.roomboard.app/captures`).
- [ ] Tuer RoomBoard pendant une capture (Gestionnaire des tâches, `kill -9`), relancer : un reste de plus d'une minute disparaît au lancement.
