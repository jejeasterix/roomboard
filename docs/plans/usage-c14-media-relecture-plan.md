# Corrections de la relecture du plan (à appliquer en plus de ta section ; elles priment sur le plan)

R1 (bloquant, T8 + T10) — chemin du document ouvert par dépôt ou par lancement. Contrat figé :
le gestionnaire `.roomboard` de `platform/import.ts` passe `path: f.path ?? null` à l'ouverture
(`openDocument({ name, bytes, target: null, path })`, champ `path?: string | null` ajouté au type de la demande
d'ouverture). T10 (workspace / container-io) prend comme chemin du document, pour résoudre les liens relatifs :
`target?.kind === "tauri" ? target.path : path ?? null`. Test rouge de chaque côté : T8 « un .roomboard déposé avec
f.path transmet path » ; T10 « un document ouvert par dépôt avec path résout sa vidéo liée relative ».

R2 (T10) — « Insérer les pages d'un fichier » (`app/fragments.ts:115-121`) : un asset `linked` de l'autre document
est **refusé avec un message** (même règle que la copie d'un média lié), rien d'inséré pour ce média, le reste inséré.
Test rouge. `fragments.ts` et `fragments.test.ts` s'ajoutent aux fichiers touchés de T10.

R3 (T8) — en coque, `blob()` rend un Blob sans type (`host-tauri.ts:88`, `:152`) : le gestionnaire média retype le
Blob par `sniff.mime` (comme `imageHandler`) avant la sonde et l'insertion ; le `mediaType` vient de `sniff.mime`.
Test rouge « un Blob sans type est retypé par sniff.mime ».

R4 (T8) — `link.run` quand `linkMedia` rejette (`NotGranted`, `NotMedia`, `Io`) : avis d'import « vidéo non liée :
<raison> », rien d'inséré pour ce fichier, les fichiers suivants traités. Test rouge « linkMedia rejette : message,
rien inséré, fichier suivant traité ».

R5 (T8, dans media-import.ts) — `sniffMedia` exclut les marques d'image (heic, heix, mif1, msf1, avif, avis…) aussi
dans les **marques compatibles**, pas seulement la majeure, comme `sniffImage` (`image-import.ts:62-67`). Cas
« miaf majeure + heic compatible → image » ajouté à la table M11.

R6 (toutes) — preuves : filtre sur `C14` ou le nom exact des tests (`grep -E "C14|Test Files|Tests |FAIL|×"`), pas
un `tail -80` qui coupe les noms.

R7 (T7) — la carte du son affiche le **nom** du média (M20), pas « Son » ; le badge « lecture » n'est pas dessiné
dans l'export PDF (option de rendu d'export) ; test pour chacun.

R8 (T9) — la commande lecture d'un média lié introuvable est grisée dès l'ouverture (M31), pas seulement après le
premier clic. Test.

R9 (T10) — assertion négative : le conteneur écrit d'un document à vidéo liée ne contient pas les octets de la vidéo.

R10 (T11) — le fichier de 101 Mo de l'essai se construit dans la page (Blob de zéros sous un en-tête WebM, dépôt
par DataTransfer dans la page), pas par `dropFile` (`Array.from` de 101 Mo).
