# Essais C11a en coque — annotation de bureau (S5)

Pour : séances de Jérôme (PC, Mac, poste Linux X11, VM en Wayland). Rien de ceci ne se joue sur la VM en automatique.
Construire la coque comme dans `docs/essais/coque-windows.md` (§ 2) ou `coque-macos.md`, sur la branche du chantier.
Cocher chaque ligne ; noter l'écart en une phrase.

## C11a-1 — Démarrage en annotation (Windows 10 22H2, Windows 11, macOS 14, Linux X11)
- [ ] Profil « Annotation au démarrage », relancer : l'écran est couvert par l'annotation transparente, le bureau vivant se voit dessous.
- [ ] La barre seule est au premier plan, en bande du côté de son `dock`, cliquable ; aucune autre fenêtre RoomBoard ne la recouvre.
- [ ] Aucune entrée « annotate » dans la barre des tâches (Windows) ; aucun Space dédié (macOS).

## C11a-2 — Encre et stylet
- [ ] Écrire au stylet sur le bureau : le trait suit sans retard visible.
- [ ] Gomme partielle sur fond transparent : aucun aperçu pendant le geste ; l'effacement s'applique au relâchement. Écart à HC11-15, qui demandait `destination-out` : impossible, la couche live ne peut pas creuser la scène. À vérifier en coque : le bureau reste visible sous le passage de la gomme après le relâchement, sans traînée opaque.
- [ ] Mesure de pression et de latence avec `proto-stylet.html` ouvert dans la fenêtre transparente (P30) : noter les valeurs.
- [ ] Ctrl+Z, Ctrl+Y dans l'annotation : annulent et rétablissent les traits de la séance.

## C11a-3 — Bascule dessin / souris
- [ ] Sélection : cliquer une icône du bureau à travers la fenêtre ; elle répond.
- [ ] En mode souris, cliquer un trait : il se sélectionne (sondage 30 ms, léger retard au survol accepté, HC11-7).
- [ ] En mode dessin, le clic à travers est forcé à `ignore=false` par la page : un seul écrivain légitime de cet état côté page (le sondage de curseur ne le modifie pas tant que le mode dessin est actif). Vérifier qu'aucune zone de la fenêtre ne laisse passer le clic au bureau en mode dessin.
- [ ] Reprendre le Stylo : l'encre revient ; le bouton « Souris » / « Dessin » fait l'aller-retour.
- [ ] Toucher (doigt, TBI) un objet en mode souris : noter s'il passe au bureau (limite connue HC11-7).

## C11a-4 — Sortie et retour
- [ ] « Quitter l'annotation », puis Échap, puis Alt+F4 (Cmd+W) sur l'annotation : chaque fois le tableau revient, la fenêtre principale reprend sa taille et ses bords.
- [ ] L'onglet « Annotation » est dans les onglets avec les traits de la séance ; Ctrl+S l'enregistre ; le rouvrir montre les traits.
- [ ] Fermer l'onglet « Annotation » puis rentrer en annotation : une fenêtre neuve, vierge.
- [ ] Fermer l'application en annotation : sortie d'abord, puis la question de l'onglet modifié ; aucun processus RoomBoard ne reste (Gestionnaire des tâches, `ps`).

## C11a-5 — Zone de dépôt (comportement de S3)
- [ ] Depuis l'explorateur (Finder, gestionnaire de fichiers), déposer une image sur « Déposer ici » : l'annotation se ferme, l'image est sur la page montrée de l'onglet d'origine, avis « ajouté à la page N ».
- [ ] Rentrer, déposer un `.roomboard` : nouvel onglet ouvert et montré ; onglet d'origine inchangé.
- [ ] Déposer un fichier sur la zone transparente (hors barre) : rien ne se passe.

## C11a-6 — Deux écrans (échelles différentes si possible)
- [ ] L'annotation s'ouvre sur l'écran de la fenêtre principale.
- [ ] « Écran suivant » fait le tour des écrans ; la bande de barre garde sa place et son épaisseur sur chaque écran.
- [ ] Un seul écran : « Écran suivant » est grisé.

## C11a-7 — Wayland natif (VM Ubuntu, session GNOME Wayland)
- [ ] Profil « Annotation au démarrage » : démarrage sur le tableau, question « Annotation du bureau indisponible sous Wayland. Relancer en mode compatibilité ? ».
- [ ] Non : le tableau reste, l'entrée « Annotation du bureau » est absente de la barre.
- [ ] Oui : RoomBoard se relance (même fichier s'il était passé au lancement) ; sous XWayland, l'annotation fonctionne (refaire C11a-1 et C11a-3).
- [ ] Si la transparence n'est pas peinte (WebKitGTK) : le noter, puis jouer C11b-4 de `c11b-coque.md` (repli figé automatique sans compositeur ; avec compositeur, « Figer le bureau » à la main, HC11b-6).

## C11a-8 — Points d'essai de la revue (T13)
- [ ] Fenêtre principale maximisée : entrer en annotation puis sortir ; elle redevient maximisée (Windows, macOS, Linux X11).
- [ ] Fenêtre maximisée, entrer puis sortir, puis cliquer sur Restaurer : la taille d'avant la maximisation revient-elle ? (sous Linux, tao met `set_maximized` en file : la géométrie lue juste après `unmaximize` peut être celle de la fenêtre maximisée.)
- [ ] Deux écrans d'échelles différentes (Windows) : à la sortie, la taille et la position d'avant sont exactes.
- [ ] AppImage (Linux) : « Relancer en mode compatibilité » relance bien l'AppImage (`$APPIMAGE`), pas un chemin `/tmp/.mount_*`.
- [ ] Alt+F4 sur `annotate` est toujours empêché (la page principale cache la fenêtre) : si `annotate` est cachée ou la principale ne répond pas, la fermeture ne se fait pas ; noter si un cas réel se présente.

## Point de durcissement connu
La capacité `annotate` ne donne que `core:event:default` (listen, unlisten, emit, emit_to). Mais `build.rs` ne déclare pas de manifeste de commandes (`AppManifest`) : les commandes de l'application (`annotation_*`, `read_granted_file`, etc.) ne sont donc pas filtrées par capacité et la page `annotate`, qui invoque les commandes `annotation_*`, pourrait aussi appeler les autres. À durcir plus tard avec un manifeste de commandes.
