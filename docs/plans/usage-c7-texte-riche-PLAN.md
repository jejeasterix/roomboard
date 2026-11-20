# Plan d'exécution — usage-c7-texte-riche (texte riche par plages)

> Exécution : étage 3 de nouvelle-feature — l'orchestrateur lit la table, une tâche = sa section.

## Table des tâches

| id | titre | dépend de | fichiers touchés | worktree | subagent | preuve | scénario | section |
|----|-------|-----------|------------------|----------|----------|--------|----------|---------|
| T1 | Module cœur `rich_text.rs` : positions, différence, format, segments | — | `crates/roomboard-core/src/rich_text.rs`, `crates/roomboard-core/src/lib.rs` | isolé | concepteur-critique | `cargo test -p roomboard-core rich_text::` : ≥ 12 tests, `apply_text_diff_prefers_prefix` et `utf16_range_counts_surrogate_pairs` présents, `test result: ok` | S1, S4 | #tache-t1 |
| T2 | Contrat TS et module page `rich-text.ts` | — | `apps/web/src/core/api.ts`, `apps/web/src/core/rich-text.ts`, `apps/web/src/core/rich-text.test.ts` | isolé | concepteur-critique | `vitest run src/core/rich-text.test.ts` : 13 tests, « le préfixe passe d'abord » présent, 0 échec | S4 | #tache-t2 |
| T3 | `FormatText` et `SetText` par différence dans le cœur | T1 | `crates/roomboard-core/src/commands.rs`, `crates/roomboard-core/src/element.rs`, `crates/roomboard-core/src/document.rs`, `crates/roomboard-core/src/rich_text.rs` | isolé | concepteur-critique | `cargo test --workspace` : 0 échec ; `format_text_checks_in_order_without_transaction`, `set_text_keeps_range_attributes_outside_the_edit`, `set_text_and_format_keep_embeds` présents | S1 | #tache-t3 |
| T4 | Faux cœur : `spans`, `SetText` par différence, `FormatText` | T2 | `apps/web/src/core/fake-core.ts`, `apps/web/src/core/fake-core.test.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé | concepteur-critique | `vitest run src/core/fake-core.test.ts` : ≥ 4 tests du bloc « fakeCore — C7 », 0 échec ; `vitest run src/core/wasm-core.contract.test.ts` : 0 échec | S4, S2 | #tache-t4 |
| T5 | Mise en lignes par segments `layoutRich` | T2 | `apps/web/src/engine/text-layout.ts`, `apps/web/src/engine/text-layout.test.ts` | isolé | implementeur-tdd | `vitest run src/engine/text-layout.test.ts` : ≥ 15 tests, « S5 : « chat » en 48 » présent, 0 échec | S5 | #tache-t5 |
| T6 | Liaison Wasm `format_text` et scénarios du cœur | T3 | `crates/roomboard-wasm/src/lib.rs`, `crates/roomboard-core/tests/scenarios.rs`, `crates/roomboard-core/tests/compat_socle.rs` | isolé | concepteur-critique | `cargo test -p roomboard-wasm` : `wire_attrs_maps_values_and_refuses_bad_ones`, `format_text_inner_formats_and_reads_spans` présents ; `--test scenarios` : `s2_rich_text_survives_save_load` ; `--test compat_socle` : 3 tests ; build `wasm32` sans erreur | S2, S3 | #tache-t6 |
| T7 | Rendu Canvas 2D par segments, `FakeCtx` partagé | T5 | `apps/web/src/engine/render/canvas2d.ts`, `apps/web/src/engine/render/canvas2d.test.ts`, `apps/web/src/engine/render/fake-ctx.ts` | isolé | implementeur-tdd | `vitest run src/engine/render/canvas2d.test.ts` : bloc « C7 » ≥ 3 tests, « texte : une ligne par fillText » vert, 0 échec | S5, S3 | #tache-t7 |
| T8 | Outil Texte : hauteur sur les segments prévus | T4, T5 | `apps/web/src/engine/tools/text.ts`, `apps/web/src/engine/tools/text.test.ts`, `apps/web/src/app/text-editor.test.ts` | isolé | implementeur-tdd | `vitest run src/engine/tools/text.test.ts src/app/text-editor.test.ts` : « texte riche rouvert » présent, 0 échec | S5 | #tache-t8 |
| T9 | Adaptateur Wasm TS et contrat C7 sur le vrai module | T4, T6, T7, T8 | `apps/web/src/core/wasm-core.ts`, `apps/web/src/core/wasm-core.contract.test.ts` | isolé | concepteur-critique | `ROOMBOARD_WASM_REQUIRED=1 vitest run src/core/wasm-core.contract.test.ts` : « contrat C7 : vrai module wasm » ≥ 6 tests et « S3 (C7) » présents, 0 échec ; `scripts/verifier.sh` : `verifier.sh : OK`, taille du module relevée | S2, S3, S4 | #tache-t9 |

**Vagues proposées (au plus 3 en parallèle).** Vague 1 : T1, T2. Vague 2 : T3, T4, T5. Vague 3 : T6, T7, T8. Vague 4 : T9.
Fichiers disjoints dans chaque vague. Fichiers repris d'une vague à l'autre, donc jamais en parallèle :
`rich_text.rs` (T1 puis T3), `wasm-core.contract.test.ts` (T4 puis T9). Chemin critique : T1 → T3 → T6 → T9.

**Goal :** les textes du tableau portent des attributs par plage (gras, italique, souligné, couleur, taille, police),
gardés par `SetText` (différence) et à l'enregistrement, posés par `FormatText`, mis en lignes et rendus par segments.

**Architecture :** les attributs sont ceux du `Y.Text` `content` de l'élément texte (aucun champ neuf, aucune
migration). Côté cœur, la logique vit dans `crates/roomboard-core/src/rich_text.rs` (positions converties en décalages
Yrs, embeds comptés) ; `commands.rs` n'y gagne qu'une variante, un bras et une méthode. Côté page, la seule copie TS de
la règle est `apps/web/src/core/rich-text.ts` (faux cœur et outil Texte) ; `layoutRich` est l'unique mise en lignes
(hauteur de boîte et rendu), `layoutText` en est le cas d'un segment.

**Tech Stack :** Rust (yrs 0.28.1, serde, serde-wasm-bindgen 0.6), wasm-bindgen 0.2.130, TypeScript, Vitest.

**Spec :** `docs/plans/usage-c7-texte-riche-cadrage.md` (décisions T1 à T16, scénarios S1 à S5, carte d'impact).

## Global Constraints

- G1 TDD : test rouge d'abord, vu rouge par la commande de la tâche. Aucun test sauté (`skip`, `#[ignore]`), désactivé, ni seuil baissé.
- G2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` en tête de chaque commande ; toutes les commandes dans le dossier `$WT` que l'orchestrateur donne (`cd "$WT" && …`).
- G3 Preuve bornée qui prouve qu'un test a tourné. Rust : `cargo test -p <crate> <filtre> 2>&1 | grep -E "^test |test result" | tail -20` (au moins une ligne `test … ok`, nom attendu présent, `test result: ok`). TS : `pnpm --filter @roomboard/web exec vitest run <fichier> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Tests " | tail -20` (`Tests  N passed`, N ≥ 1, nom attendu présent). Ne pas utiliser `pnpm --filter @roomboard/web test -- <fichier>` : le fichier y est ignoré et toute la suite tourne (vérifié le 2026-11-20).
- G4 Aucune dépendance ajoutée (U39) ; jamais de dépendance AGPL, GPL ou LGPL.
- G5 Aucun build Tauri ni Android.
- G6 Rust : `cargo fmt --all`, puis `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -- -D warnings` propres avant le commit.
- G7 Commits : un fichier par `git add <chemin>`, jamais `git add -A`, `git add .`, `git commit -a` ; auteur `jejeasterix <jejeasterix@users.noreply.github.com>` ; message en anglais terminé par `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Commande type : `cd "$WT" && git add <f1> && git add <f2> && git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit -m "<message>" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"`.
- G8 Contrat Wasm : `wasm-core.contract.test.ts` ne joue le vrai module que s'il est construit dans `apps/web/src/wasm/` (ignoré par git) ; `ROOMBOARD_WASM_REQUIRED=1` l'exige. Construction : `scripts/verifier.sh` lignes 26-29. Seule T9 construit le module ; un worktree neuf n'en a pas (bloc sauté, attendu).
- G9 Hors périmètre : éditeur riche C7b (contenteditable, barre de mise en forme, choix de police dans l'interface). `apps/web/src/app/text-editor.ts` est inchangé : le `<textarea>` reste brut.
- G10 Format : `schema` 1, `formatVersion` 1, aucune migration, aucun champ d'élément neuf ; `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` est lue, jamais régénérée (jamais `ROOMBOARD_REGENERER_FIXTURES=1`).
- G11 Ajouts groupés (T14, pour le rebase de C9) : variante en fin d'enum, bras en fin de `match` ou de `switch`, méthode en fin de bloc `impl`, bloc `describe` neuf en fin de fichier de test.
- G12 Rapport de tâche en français, avec une ligne `Réutilisation : appelé <module>` ou `Réutilisation : écart — <pourquoi>` par ligne `Réutilise :` de la section.
- G13 `tsc` (donc `pnpm --filter @roomboard/web build`) est rouge de T2 à T9 : le contrat change avant ses appelants ; `vitest` ne vérifie pas les types. T9 le rend vert. Ne pas réparer `tsc` hors de sa tâche.
- G14 VM chargée : un test qui échoue sur un délai est rejoué une fois.
- G15 Message `BadFormat`, identique dans le cœur et le faux cœur : `mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)`.
- G16 Installation d'un worktree neuf (tâches TS) : `cd "$WT" && pnpm install --frozen-lockfile`.

## Review Focus

1. Un mot formaté remplacé en entier (« chat » rouge → « loup ») prend les attributs du caractère qui le précède, donc
   aucun (T5) : tests `set_text_replacing_a_whole_range_takes_previous_char_attrs` (T3) et « un mot formaté remplacé en
   entier » (T2).
2. Caractères répétés à la jonction (« ab », b gras → « abb ») : le préfixe passe d'abord, le « b » neuf suit le « b »
   gras (T4) : tests `apply_text_diff_prefers_prefix` (T1) et « le préfixe passe d'abord » (T2).
3. Ligne vide après un `\n` d'une autre taille : hauteur de la taille de ce `\n`, sinon de l'élément (T9, HC7-9) :
   test « ligne vide à la taille du \n » (T5).
4. Police au nom composé (« Comic Sans MS ») : mise entre guillemets devant Atkinson, gras et italique dans l'ordre CSS
   (T10, T15) : test « police nommée devant Atkinson » (T5).
5. Taille écrite en entier par une autre version (`Any::Number(Int)`) : lue comme une taille, jamais perdue (T8, K8) :
   test `read_spans_reads_integer_size` (T1).

## Carte des fichiers

| fichier | responsabilité | tâche |
|---|---|---|
| `crates/roomboard-core/src/rich_text.rs` (neuf) | `TextAttr`, `SpanAttrs`, `TextSpanView` ; contrôle des valeurs ; table des positions ; différence ; format ; lecture des segments | T1, T3 (test des embeds) |
| `crates/roomboard-core/src/lib.rs` | `pub mod rich_text;` | T1 |
| `crates/roomboard-core/src/commands.rs` | `Command::FormatText`, `CommandError::BadFormat`, `cmd_format_text`, `cmd_set_text` par différence, `TextFields.spans`, tests S1 et T7 | T3 |
| `crates/roomboard-core/src/element.rs` | `TextView.spans` | T3 |
| `crates/roomboard-core/src/document.rs` | `spans` dans la vue d'un texte | T3 |
| `crates/roomboard-wasm/src/lib.rs` | `WireValue`, `wire_attrs`, `format_text`, `format_text_inner`, tests | T6 |
| `crates/roomboard-core/tests/scenarios.rs` | S2 au niveau du cœur | T6 |
| `crates/roomboard-core/tests/compat_socle.rs` | S3 : texte du socle en un segment | T6 |
| `apps/web/src/core/api.ts` | `FormatText`, `TextData.spans`, `TextSpan`, `TextAttrs`, `TextAttrsPatch` | T2 |
| `apps/web/src/core/rich-text.ts` (neuf) | `plainSpans`, `editSpans`, `cleanPatch`, `validPatch`, `validColor`, `validFont`, `utf16Bounds`, `formatSpans`, `sameSpans` | T2 |
| `apps/web/src/core/fake-core.ts` | faux cœur : `spans`, `SetText`, `FormatText`, JSON sans `spans` | T4 |
| `apps/web/src/core/wasm-core.ts` | `toElementView` (`spans`), `apply` (`FormatText`) | T9 |
| `apps/web/src/engine/text-layout.ts` | `Face`, `textFont(size, face?)`, `Measure`, `SegmentStyle`, `RichLine`, `layoutRich`, `richBoxHeight`, `layoutText` délégué | T5 |
| `apps/web/src/engine/render/canvas2d.ts` | `paintText` par segments, cache des lignes | T7 |
| `apps/web/src/engine/render/fake-ctx.ts` (neuf) | `FakeCtx`, `DrawnText`, `asCtx` (aide de test) | T7 |
| `apps/web/src/engine/tools/text.ts` | `TextEditSession.spans`, hauteur par `layoutRich` | T8 |
| tests TS (`rich-text.test.ts`, `fake-core.test.ts`, `text-layout.test.ts`, `canvas2d.test.ts`, `tools/text.test.ts`, `text-editor.test.ts`, `wasm-core.contract.test.ts`) | voir chaque tâche | T2, T4, T5, T7, T8, T9 |

---

<a id="tache-t1"></a>
### Tâche T1 — Module cœur `rich_text.rs` : positions, différence, format, segments

**Objectif.** Créer le module pur du cœur qui lit et écrit les attributs de plage d'un `Y.Text` : contrôle des valeurs
(T2, T15), table « position dans le contenu → décalage Yrs » (octets UTF-8, 1 par embed, T6, T16), différence de
`SetText` en points de code avec héritage du caractère précédent (T4, T5), format d'une plage (T7), lecture des segments
normalisés puis fusionnés (T8). Aucune commande ici : T3 les branche.

**Fichiers.**
- Créer : `crates/roomboard-core/src/rich_text.rs`
- Modifier : `crates/roomboard-core/src/lib.rs` (une ligne)

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Réutilise : `yrs` 0.28.1 `Text` (`yrs-0.28.1/src/types/text.rs:275`, `:361`, `:372`, `:420`) — `insert_with_attributes(&self, &mut TransactionMut, u32, &str, Attrs)`, `remove_range(&self, &mut TransactionMut, u32, u32)`, `format(&self, &mut TransactionMut, u32, u32, Attrs)`, `diff(&self, &T, YChange::identity) -> Vec<Diff<YChange>>`.
- Réutilise : `crates/roomboard-core/src/document.rs:495` (`collect_out`) — le patron `t.diff(txn, YChange::identity)` et le test `matches!(d.insert, Out::Any(Any::String(_)))` (l'appel Yrs, pas la fonction, qui collecte des ids d'asset).
- Réutilise : `crates/roomboard-core/src/element.rs:148` — `pub(crate) fn any_f64(a: &Any) -> Option<f64>` (lecture de `size`).
- Réutilise : `crates/roomboard-core/src/element.rs:214` — `pub(crate) fn finite_positive(v: f64) -> bool` (contrôle de `size`).
- Réutilise : aucun module existant (ligne « Différence, positions, format, segments (cœur) » du cadrage) — crée `crates/roomboard-core/src/rich_text.rs` avec exactement les interfaces produites ci-dessous.
- Produit (lu par T3 et T6) :
  - `pub enum TextAttr { Bold(bool), Italic(bool), Underline(bool), Color(Option<String>), Size(Option<f32>), Font(Option<String>) }` (`Debug, Clone, PartialEq`)
  - `pub struct SpanAttrs { pub bold: bool, pub italic: bool, pub underline: bool, pub color: Option<String>, pub size: Option<f64>, pub font: Option<String> }` (`Debug, Clone, PartialEq, Default, serde::Serialize`, champs au défaut omis)
  - `pub struct TextSpanView { pub text: String, pub attrs: SpanAttrs }` (`Debug, Clone, PartialEq, serde::Serialize`)
  - `pub(crate) fn valid_color(c: &str) -> bool`, `pub(crate) fn valid_font(f: &str) -> bool`
  - `pub(crate) fn valid_attrs(attrs: &[TextAttr]) -> bool`
  - `pub(crate) fn read_spans<T: ReadTxn>(txn: &T, text: &TextRef) -> Vec<TextSpanView>`
  - `pub(crate) fn apply_text_diff(txn: &mut TransactionMut, text: &TextRef, new: &str)`
  - `pub(crate) fn utf16_range<T: ReadTxn>(txn: &T, text: &TextRef, start: u32, len: u32) -> Option<(u32, u32)>` (rend `(index, len)` en unités Yrs ; `len = 0` → `Some((0, 0))`)
  - `pub(crate) fn format_changes<T: ReadTxn>(txn: &T, text: &TextRef, range: (u32, u32), attrs: &[TextAttr]) -> bool`
  - `pub(crate) fn apply_format(txn: &mut TransactionMut, text: &TextRef, range: (u32, u32), attrs: &[TextAttr])`

**Test et commande bornée.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core rich_text:: 2>&1 | grep -E "^test |test result" | tail -20`
— attendu : 12 tests `rich_text::tests::… ok`, dont `apply_text_diff_prefers_prefix`, `utf16_range_counts_surrogate_pairs`,
`read_spans_reads_integer_size` ; `test result: ok. 12 passed`.

**Preuve visuelle.** Aucune (cœur).

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord, vu rouge par la commande de la tâche. Aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH : `export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH` ; commandes dans `$WT`.
- G3 Preuve bornée Rust : `cargo test -p <crate> <filtre> 2>&1 | grep -E "^test |test result" | tail -20`.
- G4 Aucune dépendance ajoutée ; jamais AGPL, GPL, LGPL.
- G5 Aucun build Tauri ni Android.
- G6 `cargo fmt --all`, puis `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -- -D warnings` propres.
- G7 Commits un fichier par `git add`, auteur `jejeasterix <jejeasterix@users.noreply.github.com>`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G10 `schema` 1, aucune migration ; la fixture du socle n'est jamais régénérée.
- G11 Ajouts groupés : la ligne de `lib.rs` seule, à sa place alphabétique.
- G12 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :` (5 lignes).
- G14 Test sur délai rejoué une fois.

**Patron à ne pas reprendre.** Le remplacement total `remove_range(0, len)` puis `insert(0, content)`
(`crates/roomboard-core/src/commands.rs:586-589`) : il efface toutes les plages et les embeds. Et des positions de
caractère prises pour des décalages Yrs : le `Doc` compte en octets UTF-8 (`Doc::new()`, `document.rs:89` ;
`yrs-0.28.1/src/doc.rs:518`), un embed compte 1. Chemins de référence : `crates/roomboard-core/src/document.rs:482-520`
(lecture par `diff`) ; `yrs-0.28.1/src/types/text.rs:703-724` (`insert` : `unset_missing` met à `null` tout attribut
courant absent du jeu donné, d'où `insert_with_attributes` avec les attributs exacts du caractère précédent).

**Interdits.** Aucune modification de `commands.rs`, `element.rs`, `document.rs` (T3). Aucune nouvelle dépendance
(`unicode-segmentation` est hors chantier, C6a). Pas de `TextPrelim` avec attributs : la création reste celle du socle (T12).

**Terminé quand.** Les 12 tests passent, `fmt` et `clippy -D warnings` propres, deux commits faits, rapport avec 5
lignes `Réutilisation :`.

**Étapes.**

- [ ] **Étape 1 : déclarer le module** — dans `crates/roomboard-core/src/lib.rs`, ajouter entre `pub mod query;` et `pub mod shape;` :

```rust
pub mod rich_text;
```

- [ ] **Étape 2 : écrire les tests (rouges)** — créer `crates/roomboard-core/src/rich_text.rs` avec seulement l'en-tête,
  les imports et ce module de tests (les fonctions n'existent pas encore : la compilation échoue, c'est le rouge) :

```rust
//! Texte riche par plages (C7 ; U27 et DAU9 de `docs/plans/usage-cadrage.md`) : attributs Yrs du `Y.Text` `content`
//! d'un élément texte. Positions : points de code pour `SetText` (T4), unités UTF-16 pour `FormatText` (T6), converties
//! en décalages Yrs (octets UTF-8 des chaînes, 1 par embed : le `Doc` est en `OffsetKind::Bytes`, T16).
#![cfg_attr(not(test), allow(dead_code))] // retiré par T3, qui branche les commandes

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use std::sync::Arc;

    use yrs::types::text::YChange;
    use yrs::{Any, Doc, GetString, Number, Out, Text, TextRef, Transact};

    use super::*;

    const HEX64: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    fn doc_with(s: &str) -> (Doc, TextRef) {
        let doc = Doc::new();
        let text = doc.get_or_insert_text("t");
        text.insert(&mut doc.transact_mut(), 0, s);
        (doc, text)
    }

    fn spans(doc: &Doc, text: &TextRef) -> Vec<TextSpanView> {
        read_spans(&doc.transact(), text)
    }

    fn plain(t: &str) -> TextSpanView {
        TextSpanView {
            text: t.into(),
            attrs: SpanAttrs::default(),
        }
    }

    fn with(t: &str, attrs: SpanAttrs) -> TextSpanView {
        TextSpanView {
            text: t.into(),
            attrs,
        }
    }

    fn red() -> SpanAttrs {
        SpanAttrs {
            color: Some("#ff0000".into()),
            ..SpanAttrs::default()
        }
    }

    fn bold() -> SpanAttrs {
        SpanAttrs {
            bold: true,
            ..SpanAttrs::default()
        }
    }

    /// Garde de T6 et T16 : le `Doc` du cœur compte en octets UTF-8 (`Doc::new()`, `document.rs`).
    #[test]
    fn doc_offsets_are_utf8_bytes() {
        let (doc, text) = doc_with("é🐱");
        assert_eq!(text.len(&doc.transact()), 6);
    }

    #[test]
    fn utf16_range_counts_surrogate_pairs() {
        let (doc, text) = doc_with("Le 🐱 noir");
        let txn = doc.transact();
        assert_eq!(utf16_range(&txn, &text, 3, 2), Some((3, 4)));
        assert_eq!(utf16_range(&txn, &text, 0, 10), Some((0, 12)));
        assert_eq!(utf16_range(&txn, &text, 5, 5), Some((7, 5)));
        assert_eq!(utf16_range(&txn, &text, 10, 0), Some((0, 0)));
        assert_eq!(utf16_range(&txn, &text, 4, 1), None, "début au milieu de la paire");
        assert_eq!(utf16_range(&txn, &text, 3, 1), None, "fin au milieu de la paire");
        assert_eq!(utf16_range(&txn, &text, 8, 3), None, "au-delà de la longueur");
        assert_eq!(utf16_range(&txn, &text, u32::MAX, 1), None);
    }

    #[test]
    fn utf16_range_counts_embeds() {
        let (doc, text) = doc_with("abcd");
        let embed = Any::Map(Arc::new(HashMap::from([("k".to_string(), Any::from(1.0))])));
        text.insert_embed(&mut doc.transact_mut(), 2, embed);
        let txn = doc.transact();
        assert_eq!(text.get_string(&txn), "abcd");
        assert_eq!(utf16_range(&txn, &text, 2, 2), Some((3, 2)), "après l'embed");
        assert_eq!(utf16_range(&txn, &text, 1, 2), Some((1, 3)), "à travers l'embed");
    }

    /// S4 côté cœur : différence en points de code, préfixe d'abord, héritage du caractère précédent.
    #[test]
    fn apply_text_diff_prefix_then_suffix_in_code_points() {
        let (doc, text) = doc_with("Le 🐱 noir");
        {
            let mut txn = doc.transact_mut();
            apply_format(&mut txn, &text, (3, 4), &[TextAttr::Color(Some("#ff0000".into()))]);
            apply_text_diff(&mut txn, &text, "Le gros 🐱 noir");
        }
        assert_eq!(
            spans(&doc, &text),
            vec![plain("Le gros "), with("🐱", red()), plain(" noir")]
        );
        apply_text_diff(&mut doc.transact_mut(), &text, "Le gros 🐱🐱 noir");
        assert_eq!(
            spans(&doc, &text),
            vec![plain("Le gros "), with("🐱🐱", red()), plain(" noir")]
        );
    }

    /// Review Focus 2 (cadrage T4) : « ab » → « abb », b gras : le préfixe passe d'abord, le « b » neuf suit le gras.
    #[test]
    fn apply_text_diff_prefers_prefix() {
        let (doc, text) = doc_with("ab");
        {
            let mut txn = doc.transact_mut();
            apply_format(&mut txn, &text, (1, 1), &[TextAttr::Bold(true)]);
            apply_text_diff(&mut txn, &text, "abb");
        }
        assert_eq!(spans(&doc, &text), vec![plain("a"), with("bb", bold())]);
    }

    /// Cadrage T5 : inséré en tête, aucun attribut.
    #[test]
    fn apply_text_diff_head_insert_has_no_attrs() {
        let (doc, text) = doc_with("chat");
        {
            let mut txn = doc.transact_mut();
            apply_format(&mut txn, &text, (0, 4), &[TextAttr::Bold(true)]);
            apply_text_diff(&mut txn, &text, "Le chat");
        }
        assert_eq!(spans(&doc, &text), vec![plain("Le "), with("chat", bold())]);
    }

    /// Cadrage T5 : les attributs inconnus du caractère précédent passent aussi au texte inséré.
    #[test]
    fn apply_text_diff_inherits_unknown_attrs() {
        let (doc, text) = doc_with("");
        {
            let mut txn = doc.transact_mut();
            let attrs = HashMap::from([(Arc::from("href"), Any::from("https://exemple.org"))]);
            text.insert_with_attributes(&mut txn, 0, "lien", attrs);
            apply_text_diff(&mut txn, &text, "liens");
        }
        let txn = doc.transact();
        let chunks: Vec<(String, bool)> = text
            .diff(&txn, YChange::identity)
            .iter()
            .map(|c| {
                let s = match &c.insert {
                    Out::Any(Any::String(s)) => s.to_string(),
                    _ => String::new(),
                };
                let href = c.attributes.as_deref().and_then(|a| a.get("href")).is_some();
                (s, href)
            })
            .collect();
        assert!(chunks.iter().all(|(_, href)| *href), "{chunks:?}");
        assert_eq!(chunks.iter().map(|(s, _)| s.as_str()).collect::<String>(), "liens");
    }

    #[test]
    fn format_changes_sees_only_real_changes() {
        let (doc, text) = doc_with("Le chat noir");
        apply_format(
            &mut doc.transact_mut(),
            &text,
            (3, 4),
            &[TextAttr::Size(Some(48.0)), TextAttr::Bold(true)],
        );
        let txn = doc.transact();
        let changes = |r: (u32, u32), a: &[TextAttr]| format_changes(&txn, &text, r, a);
        assert!(!changes((3, 4), &[TextAttr::Size(Some(48.0)), TextAttr::Bold(true)]));
        assert!(!changes((0, 3), &[TextAttr::Bold(false), TextAttr::Color(None)]));
        assert!(!changes((3, 0), &[TextAttr::Italic(true)]));
        assert!(!changes((0, 12), &[]));
        assert!(changes((3, 4), &[TextAttr::Size(Some(36.0))]));
        assert!(changes((2, 2), &[TextAttr::Bold(true)]), "l'espace avant « chat » n'est pas gras");
        assert!(changes((3, 4), &[TextAttr::Bold(false)]));
    }

    /// Cadrage T2, T15 : formes permises de `color`, `font`, `size`.
    #[test]
    fn valid_attrs_follows_t15_domains() {
        let color = |c: &str| valid_attrs(&[TextAttr::Color(Some(c.into()))]);
        let font = |f: &str| valid_attrs(&[TextAttr::Font(Some(f.into()))]);
        let size = |s: f32| valid_attrs(&[TextAttr::Size(Some(s))]);
        for ok in ["#f00", "#ff0000", "#ff000080", "red", "rebeccapurple", "ABC"] {
            assert!(color(ok), "{ok}");
        }
        for bad in ["rgb(0,0,0)", "#ff00", "#gggggg", "re", "abcdefghijklmnopqrstu", "", HEX64] {
            assert!(!color(bad), "{bad}");
        }
        for ok in ["Georgia", "Comic Sans MS", "é"] {
            assert!(font(ok), "{ok}");
        }
        let long = "a".repeat(49);
        for bad in ["", long.as_str(), HEX64, "a;b", "a\"b", "a\\b", "a{b", "a}b", "a\nb"] {
            assert!(!font(bad), "{bad:?}");
        }
        assert!(size(72.0) && !size(0.0) && !size(-1.0) && !size(f32::NAN) && !size(f32::INFINITY));
        assert!(valid_attrs(&[
            TextAttr::Color(None),
            TextAttr::Font(None),
            TextAttr::Size(None),
            TextAttr::Bold(false)
        ]));
    }

    /// Cadrage T8 : un attribut connu hors domaine est retiré de la vue, jamais réécrit ; puis fusion des voisins.
    #[test]
    fn read_spans_normalizes_then_merges() {
        let (doc, text) = doc_with("ab");
        {
            let mut txn = doc.transact_mut();
            let junk = HashMap::from([
                (Arc::from("bold"), Any::from("oui")),
                (Arc::from("italic"), Any::Bool(false)),
                (Arc::from("size"), Any::from(-1.0)),
                (Arc::from("color"), Any::from("rgb(0,0,0)")),
                (Arc::from("font"), Any::from(HEX64)),
                (Arc::from("href"), Any::from("x")),
            ]);
            text.insert_with_attributes(&mut txn, 2, "cd", junk);
        }
        assert_eq!(spans(&doc, &text), vec![plain("abcd")]);
        let txn = doc.transact();
        assert!(
            text.diff(&txn, YChange::identity).iter().any(|c| c.attributes.is_some()),
            "le document n'est pas réécrit"
        );
    }

    /// Review Focus 5 (cadrage T8, K8) : une taille écrite en entier par une autre version est lue.
    #[test]
    fn read_spans_reads_integer_size() {
        let (doc, text) = doc_with("");
        let attrs = HashMap::from([(Arc::from("size"), Any::Number(Number::Int(48)))]);
        text.insert_with_attributes(&mut doc.transact_mut(), 0, "grand", attrs);
        let big = SpanAttrs {
            size: Some(48.0),
            ..SpanAttrs::default()
        };
        assert_eq!(spans(&doc, &text), vec![with("grand", big)]);
    }

    /// Cadrage T8, T12 : un texte sans attribut est un seul segment, même vide.
    #[test]
    fn read_spans_plain_text_is_one_span() {
        let (doc, text) = doc_with("Bonjour");
        assert_eq!(spans(&doc, &text), vec![plain("Bonjour")]);
        let (doc, text) = doc_with("");
        assert_eq!(spans(&doc, &text), vec![plain("")]);
    }
}
```

- [ ] **Étape 3 : voir rouge** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core rich_text:: 2>&1 | grep -E "error\[|test result" | tail -20`
  — attendu : `error[E0425]` (fonctions absentes), aucun `test result`.

- [ ] **Étape 4 : types et contrôles** — dans `rich_text.rs`, entre l'attribut `#![cfg_attr…]` et `#[cfg(test)]`, ajouter :

```rust
use std::cmp::Ordering;
use std::sync::Arc;

use yrs::types::text::YChange;
use yrs::types::Attrs;
use yrs::{Any, Out, ReadTxn, Text, TextRef, TransactionMut};

use crate::element::{any_f64, finite_positive};

/// Une entrée d'un patch `FormatText` (T7) : `false` ou `None` retirent l'attribut (retour au défaut, T3).
#[derive(Debug, Clone, PartialEq)]
pub enum TextAttr {
    Bold(bool),
    Italic(bool),
    Underline(bool),
    Color(Option<String>),
    Size(Option<f32>),
    Font(Option<String>),
}

/// Attributs connus d'un segment, normalisés à la lecture (T8) ; un champ au défaut n'est pas sérialisé.
#[derive(Debug, Clone, PartialEq, Default, serde::Serialize)]
pub struct SpanAttrs {
    #[serde(skip_serializing_if = "is_false")]
    pub bold: bool,
    #[serde(skip_serializing_if = "is_false")]
    pub italic: bool,
    #[serde(skip_serializing_if = "is_false")]
    pub underline: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub size: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub font: Option<String>,
}

fn is_false(b: &bool) -> bool {
    !*b
}

/// Segment de la vue d'un texte (T8) : morceaux de chaîne voisins aux attributs normalisés égaux, embeds sautés.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct TextSpanView {
    pub text: String,
    pub attrs: SpanAttrs,
}

/// `color` (T15) : `#rgb`, `#rrggbb`, `#rrggbbaa`, ou un nom CSS de 3 à 20 lettres ASCII.
pub(crate) fn valid_color(c: &str) -> bool {
    match c.strip_prefix('#') {
        Some(hex) => matches!(hex.len(), 3 | 6 | 8) && hex.bytes().all(|b| b.is_ascii_hexdigit()),
        None => (3..=20).contains(&c.len()) && c.bytes().all(|b| b.is_ascii_alphabetic()),
    }
}

/// `font` (T15) : un nom de famille seul, 1 à 48 caractères, sans `"`, `\`, `;`, `{`, `}` ni retour à la ligne.
pub(crate) fn valid_font(f: &str) -> bool {
    (1..=48).contains(&f.chars().count())
        && !f
            .chars()
            .any(|c| matches!(c, '"' | '\\' | ';' | '{' | '}' | '\n' | '\r'))
}

/// Valeurs permises d'un patch (T7, T15) ; `size` contrôlé après conversion en `f32` (1e39 devient infini).
pub(crate) fn valid_attrs(attrs: &[TextAttr]) -> bool {
    attrs.iter().all(|a| match a {
        TextAttr::Color(Some(c)) => valid_color(c),
        TextAttr::Font(Some(f)) => valid_font(f),
        TextAttr::Size(Some(s)) => finite_positive(f64::from(*s)),
        _ => true,
    })
}

/// Clé et valeur Yrs d'une entrée : `Any::Null` retire l'attribut ; un booléen ne s'écrit que `true` (T2).
fn entry(a: &TextAttr) -> (Arc<str>, Any) {
    let flag = |b: bool| if b { Any::Bool(true) } else { Any::Null };
    let (k, v) = match a {
        TextAttr::Bold(b) => ("bold", flag(*b)),
        TextAttr::Italic(b) => ("italic", flag(*b)),
        TextAttr::Underline(b) => ("underline", flag(*b)),
        TextAttr::Color(c) => ("color", c.as_deref().map_or(Any::Null, Any::from)),
        TextAttr::Size(s) => ("size", s.map_or(Any::Null, |v| Any::from(f64::from(v)))),
        TextAttr::Font(f) => ("font", f.as_deref().map_or(Any::Null, Any::from)),
    };
    (Arc::from(k), v)
}
```

- [ ] **Étape 5 : table des positions, lecture des segments** — à la suite :

```rust
/// Un caractère du contenu (embeds sautés) : décalage Yrs de son début et indice du morceau `diff` d'origine.
#[derive(Debug, Clone, Copy)]
struct CharAt {
    ch: char,
    yrs: u32,
    chunk: usize,
}

fn end(c: &CharAt) -> u32 {
    c.yrs + c.ch.len_utf8() as u32
}

/// Table des caractères et attributs bruts de chaque morceau, par `Text::diff` (même appel que `collect_out`) ; une
/// chaîne compte ses octets UTF-8, tout autre morceau (embed) compte 1 (T16).
fn char_table<T: ReadTxn>(txn: &T, text: &TextRef) -> (Vec<CharAt>, Vec<Attrs>) {
    let mut chars = Vec::new();
    let mut attrs = Vec::new();
    let mut at = 0u32;
    for d in text.diff(txn, YChange::identity) {
        let chunk = attrs.len();
        attrs.push(d.attributes.map(|a| *a).unwrap_or_default());
        match &d.insert {
            Out::Any(Any::String(s)) => {
                for ch in s.chars() {
                    chars.push(CharAt { ch, yrs: at, chunk });
                    at += ch.len_utf8() as u32;
                }
            }
            _ => at += 1,
        }
    }
    (chars, attrs)
}

/// Indice du caractère qui commence à l'unité UTF-16 `u` (la longueur du contenu pour sa fin) ; `None` au milieu d'une
/// paire de substitution ou au-delà.
fn index_at_utf16(chars: &[CharAt], u: u32) -> Option<usize> {
    let mut acc = 0u32;
    for (i, c) in chars.iter().enumerate() {
        match acc.cmp(&u) {
            Ordering::Equal => return Some(i),
            Ordering::Greater => return None,
            Ordering::Less => acc += c.ch.len_utf16() as u32,
        }
    }
    (acc == u).then_some(chars.len())
}

/// Plage `FormatText` (UTF-16) en `(index, len)` Yrs : du premier caractère à celui qui suit le dernier (un embed
/// intérieur est compris, T16) ; `len = 0` : `Some((0, 0))` ; borne au milieu d'une paire ou au-delà : `None` (T6).
pub(crate) fn utf16_range<T: ReadTxn>(
    txn: &T,
    text: &TextRef,
    start: u32,
    len: u32,
) -> Option<(u32, u32)> {
    let (chars, _) = char_table(txn, text);
    let first = index_at_utf16(&chars, start)?;
    let last = index_at_utf16(&chars, start.checked_add(len)?)?;
    if first == last {
        return Some((0, 0));
    }
    let a = chars[first].yrs;
    Some((a, end(&chars[last - 1]) - a))
}

/// Attributs connus normalisés (T8) : booléen seulement `true`, `size` fini > 0 (entier ou flottant), `color` et
/// `font` de la forme de T15 ; tout le reste est ignoré de la vue, jamais réécrit.
fn normalize(raw: Option<&Attrs>) -> SpanAttrs {
    let Some(a) = raw else {
        return SpanAttrs::default();
    };
    let flag = |k: &str| matches!(a.get(k), Some(Any::Bool(true)));
    let string = |k: &str, ok: fn(&str) -> bool| match a.get(k) {
        Some(Any::String(s)) if ok(s) => Some(s.to_string()),
        _ => None,
    };
    SpanAttrs {
        bold: flag("bold"),
        italic: flag("italic"),
        underline: flag("underline"),
        color: string("color", valid_color),
        size: a.get("size").and_then(any_f64).filter(|v| finite_positive(*v)),
        font: string("font", valid_font),
    }
}

/// Segments de la vue (T8) : morceaux de chaîne normalisés puis fusionnés ; embeds sautés ; texte vide ou sans
/// chaîne : un seul segment vide sans attribut.
pub(crate) fn read_spans<T: ReadTxn>(txn: &T, text: &TextRef) -> Vec<TextSpanView> {
    let mut out: Vec<TextSpanView> = Vec::new();
    for d in text.diff(txn, YChange::identity) {
        let Out::Any(Any::String(s)) = &d.insert else {
            continue;
        };
        let attrs = normalize(d.attributes.as_deref());
        if let Some(last) = out.last_mut().filter(|l| l.attrs == attrs) {
            last.text.push_str(s);
        } else {
            out.push(TextSpanView {
                text: s.to_string(),
                attrs,
            });
        }
    }
    if out.is_empty() {
        out.push(TextSpanView {
            text: String::new(),
            attrs: SpanAttrs::default(),
        });
    }
    out
}
```

- [ ] **Étape 6 : différence et format** — à la suite :

```rust
/// Plus long préfixe commun, puis plus long suffixe commun des deux restes (sans chevaucher le préfixe), en points de
/// code (T4).
fn common_ends(old: &[char], new: &[char]) -> (usize, usize) {
    let p = old.iter().zip(new).take_while(|(a, b)| a == b).count();
    let room = old.len().min(new.len()) - p;
    let s = old
        .iter()
        .rev()
        .zip(new.iter().rev())
        .take(room)
        .take_while(|(a, b)| a == b)
        .count();
    (p, s)
}

/// `SetText` sur un texte existant (T4, T5, T16) : supprime les morceaux de chaîne du milieu ancien (de droite à
/// gauche ; un embed du milieu est gardé), insère le milieu neuf juste après le dernier caractère du préfixe avec les
/// attributs bruts de ce caractère (connus et inconnus) ; en tête, aucun attribut. Contenu égal : rien.
pub(crate) fn apply_text_diff(txn: &mut TransactionMut, text: &TextRef, new: &str) {
    let (chars, attrs) = char_table(&*txn, text);
    let old: Vec<char> = chars.iter().map(|c| c.ch).collect();
    let fresh: Vec<char> = new.chars().collect();
    let (p, s) = common_ends(&old, &fresh);
    let mut runs: Vec<(u32, u32)> = Vec::new();
    for c in &chars[p..old.len() - s] {
        let n = c.ch.len_utf8() as u32;
        match runs.last_mut() {
            Some((start, len)) if *start + *len == c.yrs => *len += n,
            _ => runs.push((c.yrs, n)),
        }
    }
    for (start, len) in runs.into_iter().rev() {
        text.remove_range(txn, start, len);
    }
    let middle: String = fresh[p..fresh.len() - s].iter().collect();
    if middle.is_empty() {
        return;
    }
    let (at, inherited) = match p.checked_sub(1).map(|i| chars[i]) {
        Some(c) => (end(&c), attrs[c.chunk].clone()),
        None => (0, Attrs::new()),
    };
    text.insert_with_attributes(txn, at, &middle, inherited);
}

fn same_value(current: Option<&Any>, wanted: &Any) -> bool {
    match (current, wanted) {
        (None | Some(Any::Null), Any::Null) => true,
        (Some(c), w) => c == w || matches!((any_f64(c), any_f64(w)), (Some(a), Some(b)) if a == b),
        (None, _) => false,
    }
}

/// Vrai si un morceau de la plage Yrs (embed compris) a une valeur brute différente de celle que le patch écrirait ;
/// plage vide ou patch vide : faux (aucune étape, D38).
pub(crate) fn format_changes<T: ReadTxn>(
    txn: &T,
    text: &TextRef,
    range: (u32, u32),
    attrs: &[TextAttr],
) -> bool {
    if range.1 == 0 || attrs.is_empty() {
        return false;
    }
    let wanted: Vec<(Arc<str>, Any)> = attrs.iter().map(entry).collect();
    let mut at = 0u32;
    for d in text.diff(txn, YChange::identity) {
        let len = match &d.insert {
            Out::Any(Any::String(s)) => s.len() as u32,
            _ => 1,
        };
        let overlaps = at < range.0 + range.1 && range.0 < at + len;
        at += len;
        if !overlaps {
            continue;
        }
        let current = d.attributes.as_deref();
        if wanted
            .iter()
            .any(|(k, v)| !same_value(current.and_then(|a| a.get(k)), v))
        {
            return true;
        }
    }
    false
}

/// Écrit le patch sur la plage Yrs (`Text::format`) ; l'appelant a vérifié `format_changes`.
pub(crate) fn apply_format(
    txn: &mut TransactionMut,
    text: &TextRef,
    range: (u32, u32),
    attrs: &[TextAttr],
) {
    let map: Attrs = attrs.iter().map(entry).collect();
    text.format(txn, range.0, range.1, map);
}
```

- [ ] **Étape 7 : voir vert** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core rich_text:: 2>&1 | grep -E "^test |test result" | tail -20`
  — attendu : 12 `ok`, `test result: ok. 12 passed`. Si `apply_text_diff_head_insert_has_no_attrs` échoue (attribut
  hérité en tête), ne pas changer la règle : passer en tête un `Attrs` qui met à `Any::Null` chaque clé du premier
  morceau, et le dire au rapport.

- [ ] **Étape 8 : format et lint** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo fmt --all && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -5`
  — attendu : aucune sortie de `fmt --check`, `Finished` sans `warning` ni `error`.

- [ ] **Étape 9 : commits**

```bash
cd "$WT" && git add crates/roomboard-core/src/lib.rs && git add crates/roomboard-core/src/rich_text.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): rich_text module for range attributes, code-point diff and UTF-16 ranges" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t2"></a>
### Tâche T2 — Contrat TS et module page `rich-text.ts`

**Objectif.** Étendre le contrat `api.ts` (commande `FormatText`, `TextData.spans`, types des segments) et créer
`apps/web/src/core/rich-text.ts`, seule copie TS des règles du cœur (différence en points de code, héritage, patch,
bornes UTF-16), utilisée par le faux cœur (T4), l'adaptateur Wasm (T9) et l'outil Texte (T8).

**Fichiers.**
- Modifier : `apps/web/src/core/api.ts` (en-tête `:1-8`, union `Command` `:29-62`, `TextData` `:65`, fin de fichier)
- Créer : `apps/web/src/core/rich-text.ts`, `apps/web/src/core/rich-text.test.ts`

**Interfaces.**
- Consomme : rien d'une autre tâche.
- Réutilise : `apps/web/src/core/api.ts:29-62`, `:65` — étendre : `{ readonly type: "FormatText"; readonly id: string; readonly start: number; readonly len: number; readonly attrs: TextAttrsPatch; readonly boxHeight?: number }` en fin d'union ; `TextData.spans: readonly TextSpan[]`.
- Réutilise : aucun module existant (ligne « Opérations sur segments côté page » du cadrage) — crée `apps/web/src/core/rich-text.ts` aux interfaces ci-dessous.
- Produit (dans `api.ts`) : `TextAttrs = { bold?: true; italic?: true; underline?: true; color?: string; size?: number; font?: string }` ; `TextAttrsPatch = { bold?: boolean | null; italic?: boolean | null; underline?: boolean | null; color?: string | null; size?: number | null; font?: string | null }` ; `TextSpan = { text: string; attrs: TextAttrs }` (tous `readonly`).
- Produit (dans `rich-text.ts`) : `plainSpans(content: string): TextSpan[]` ; `sameAttrs(a: TextAttrs, b: TextAttrs): boolean` ; `editSpans(spans: readonly TextSpan[], content: string): TextSpan[]` ; `cleanPatch(patch: TextAttrsPatch): TextAttrsPatch` ; `validColor(c: string): boolean` ; `validFont(f: string): boolean` ; `validPatch(patch: TextAttrsPatch): boolean` ; `utf16Bounds(content: string, start: number, len: number): boolean` ; `formatSpans(spans: readonly TextSpan[], start: number, len: number, patch: TextAttrsPatch): TextSpan[]` ; `sameSpans(a: readonly TextSpan[], b: readonly TextSpan[]): boolean`.

**Test et commande bornée.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm --filter @roomboard/web exec vitest run src/core/rich-text.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Tests " | tail -20`
— attendu : `Tests  13 passed (13)`, dont « le préfixe passe d'abord » et « un mot formaté remplacé en entier ».

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord ; aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH et dossier `$WT` ; G16 `pnpm install --frozen-lockfile` dans un worktree neuf.
- G3 Preuve bornée TS : `pnpm --filter @roomboard/web exec vitest run <fichier> --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Tests " | tail -20` ; jamais `pnpm --filter @roomboard/web test -- <fichier>`.
- G4 Aucune dépendance ajoutée.
- G7 Commits un fichier par `git add`, auteur `jejeasterix`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G9 Hors périmètre : C7b ; `<textarea>` brut.
- G11 `FormatText` en fin d'union, types neufs en fin de `api.ts`.
- G12 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :` (2 lignes).
- G13 `tsc` devient rouge après cette tâche (appelants pas encore à jour) : attendu, ne pas le réparer ici.
- G14 Test sur délai rejoué une fois.
- G15 Le message `BadFormat` n'est pas dans ce module (il vit dans `fake-core.ts`, T4).

**Patron à ne pas reprendre.** Une différence sur les unités UTF-16 (`s[i] === t[i]`, `s.length`) : elle coupe une
paire de substitution (« 🐱 » → « 🐶 » partage sa moitié haute) ; et un suffixe cherché avant le préfixe (« ab » →
« abb » insérerait au mauvais endroit). Chemins de référence : `crates/roomboard-core/src/rich_text.rs`
(`common_ends`, `apply_text_diff`, écrits par T1 ; si T1 n'est pas encore fusionnée, la règle est celle du cadrage T4-T5,
`docs/plans/usage-c7-texte-riche-cadrage.md:24-25`) ; points de code par `Array.from` comme `graphemes`
(`apps/web/src/engine/text-layout.ts:26-32`).

**Interdits.** Ne pas toucher `fake-core.ts`, `wasm-core.ts` ni le moteur. Aucune règle de mise en lignes ici.

**Terminé quand.** 13 tests verts, deux commits, rapport avec 2 lignes `Réutilisation :`.

**Étapes.**

- [ ] **Étape 1 : contrat** — dans `apps/web/src/core/api.ts` :
  - après la ligne 8 (`// C2 : …`), ajouter :

```ts
// C7 : FormatText (patch d'attributs sur une plage UTF-16, une étape) ; TextData.spans = segments du texte (U27, DAU9).
```

  - remplacer la ligne `  | { readonly type: "SetBackdrop"; readonly page: string; readonly backdrop: BackdropInput | null };` par :

```ts
  | { readonly type: "SetBackdrop"; readonly page: string; readonly backdrop: BackdropInput | null }
  /** C7 : start, len en unités UTF-16 du contenu ; attrs = patch (absent ou undefined : inchangé ; false, null : retiré). */
  | {
      readonly type: "FormatText";
      readonly id: string;
      readonly start: number;
      readonly len: number;
      readonly attrs: TextAttrsPatch;
      /** Hauteur de boîte mesurée par la page, écrite si elle change. */
      readonly boxHeight?: number;
    };
```

  - remplacer `export interface TextData { readonly content: string; readonly size: number; readonly boxWidth: number; readonly boxHeight: number }` par :

```ts
export interface TextData {
  readonly content: string;
  readonly size: number;
  readonly boxWidth: number;
  readonly boxHeight: number;
  /** C7 : segments ; un texte sans attribut = un seul segment { text: content, attrs: {} }. */
  readonly spans: readonly TextSpan[];
}
```

  - en fin de fichier, ajouter :

```ts
/** Attributs d'un segment (C7, T2-T3) ; absent = défaut : couleur et taille de l'élément, police du socle, faux. */
export interface TextAttrs {
  readonly bold?: true;
  readonly italic?: true;
  readonly underline?: true;
  readonly color?: string;
  readonly size?: number;
  readonly font?: string;
}
/** Patch de FormatText (T7) : clé absente = inchangée ; false ou null = retiré. */
export interface TextAttrsPatch {
  readonly bold?: boolean | null;
  readonly italic?: boolean | null;
  readonly underline?: boolean | null;
  readonly color?: string | null;
  readonly size?: number | null;
  readonly font?: string | null;
}
export interface TextSpan { readonly text: string; readonly attrs: TextAttrs }
```

- [ ] **Étape 2 : tests (rouges)** — créer `apps/web/src/core/rich-text.test.ts` :

```ts
import { describe, expect, it } from "vitest";
import type { TextAttrsPatch, TextSpan } from "./api";
import { cleanPatch, editSpans, formatSpans, plainSpans, sameSpans, utf16Bounds, validColor, validFont, validPatch } from "./rich-text";

const plain = (text: string): TextSpan => ({ text, attrs: {} });
const RED = { color: "#ff0000" } as const;
const RB = { color: "#ff0000", bold: true } as const;
const redCat = (): TextSpan[] => [plain("Le "), { text: "chat", attrs: RB }, plain(" noir")];
const HEX64 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

describe("rich-text : segments côté page (C7)", () => {
  it("plainSpans : un seul segment sans attribut, même vide", () => {
    expect(plainSpans("Bonjour")).toEqual([plain("Bonjour")]);
    expect(plainSpans("")).toEqual([plain("")]);
  });

  it("editSpans (S1) : « gros » sans attribut, « chat » garde les siens, le « s » hérite du « t »", () => {
    const gros = editSpans(redCat(), "Le gros chat noir");
    expect(gros).toEqual([plain("Le gros "), { text: "chat", attrs: RB }, plain(" noir")]);
    expect(editSpans(gros, "Le gros chats noir")).toEqual([plain("Le gros "), { text: "chats", attrs: RB }, plain(" noir")]);
  });

  it("editSpans (S4) : différence en points de code, jamais en unités UTF-16", () => {
    const cat: TextSpan[] = [plain("Le "), { text: "🐱", attrs: RED }, plain(" noir")];
    const gros = editSpans(cat, "Le gros 🐱 noir");
    expect(gros).toEqual([plain("Le gros "), { text: "🐱", attrs: RED }, plain(" noir")]);
    expect(editSpans(gros, "Le gros 🐱🐱 noir")).toEqual([plain("Le gros "), { text: "🐱🐱", attrs: RED }, plain(" noir")]);
  });

  it("editSpans : un emoji remplacé par un autre ne garde rien par sa moitié haute", () => {
    expect(editSpans([{ text: "🐱", attrs: RED }], "🐶")).toEqual([plain("🐶")]);
  });

  // Review Focus 2 (cadrage T4).
  it("Review Focus 2 : « ab » → « abb », b gras : le préfixe passe d'abord", () => {
    expect(editSpans([plain("a"), { text: "b", attrs: { bold: true } }], "abb")).toEqual([plain("a"), { text: "bb", attrs: { bold: true } }]);
  });

  // Review Focus 1 (cadrage T5).
  it("Review Focus 1 : un mot formaté remplacé en entier prend les attributs du caractère qui le précède", () => {
    expect(editSpans(redCat(), "Le loup noir")).toEqual([plain("Le loup noir")]);
  });

  it("editSpans : insertion en tête sans attribut ; contenu vidé : un segment vide", () => {
    expect(editSpans([{ text: "chat", attrs: { bold: true } }], "Le chat")).toEqual([plain("Le "), { text: "chat", attrs: { bold: true } }]);
    expect(editSpans(redCat(), "")).toEqual([plain("")]);
  });

  it("cleanPatch retire les clés undefined, garde false et null (T7)", () => {
    expect(cleanPatch({ bold: undefined, italic: true, color: null, underline: false })).toStrictEqual({ italic: true, color: null, underline: false });
  });

  it("validPatch : clés et valeurs de T7 et T15", () => {
    const ok: TextAttrsPatch[] = [{}, { bold: true }, { bold: false, italic: null }, { color: "#ff000080" }, { color: "rebeccapurple" }, { size: 72 }, { size: null }, { font: "Comic Sans MS" }, { font: null }];
    for (const p of ok) expect(validPatch(p)).toBe(true);
    const bad: unknown[] = [{ href: "x" }, { bold: "oui" }, { color: "rgb(0,0,0)" }, { color: 5 }, { color: HEX64 }, { size: 0 }, { size: Number.NaN }, { size: 1e39 }, { font: "" }, { font: "a;b" }, { font: HEX64 }];
    for (const p of bad) expect(validPatch(p as TextAttrsPatch)).toBe(false);
  });

  it("validColor et validFont : formes de T15 (font compté en points de code)", () => {
    expect([validColor("#f00"), validColor("#ff00"), validColor("re"), validColor("ABC")]).toEqual([true, false, false, true]);
    expect([validFont("é".repeat(48)), validFont("é".repeat(49)), validFont("a\nb"), validFont('a"b')]).toEqual([true, false, false, false]);
  });

  it("utf16Bounds : entiers dans le texte, jamais au milieu d'une paire de substitution (T6)", () => {
    const s = "Le 🐱 noir";
    expect([utf16Bounds(s, 3, 2), utf16Bounds(s, 10, 0), utf16Bounds(s, 5, 5)]).toEqual([true, true, true]);
    expect([utf16Bounds(s, 4, 1), utf16Bounds(s, 3, 1), utf16Bounds(s, 8, 3), utf16Bounds(s, -1, 1), utf16Bounds(s, 1.5, 1)]).toEqual([false, false, false, false, false]);
  });

  it("formatSpans : pose, retire par false et null, taille arrondie en f32 comme le cœur", () => {
    const base = plainSpans("Le chat noir");
    const red = formatSpans(base, 3, 4, { color: "#ff0000", bold: true });
    expect(red).toEqual(redCat());
    expect(formatSpans(red, 3, 4, { bold: false })).toEqual([plain("Le "), { text: "chat", attrs: RED }, plain(" noir")]);
    expect(formatSpans(red, 3, 4, { bold: null, color: null })).toEqual(base);
    expect(formatSpans(base, 0, 2, { size: 12.3 })[0]).toEqual({ text: "Le", attrs: { size: Math.fround(12.3) } });
  });

  it("sameSpans : mêmes textes et mêmes attributs, quel que soit l'ordre des clés", () => {
    const red = redCat();
    expect(sameSpans(formatSpans(red, 3, 4, { bold: true }), red)).toBe(true);
    expect(sameSpans([{ text: "a", attrs: { bold: true, color: "red" } }], [{ text: "a", attrs: { color: "red", bold: true } }])).toBe(true);
    expect(sameSpans(red, plainSpans("Le chat noir"))).toBe(false);
  });
});
```

- [ ] **Étape 3 : voir rouge** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web exec vitest run src/core/rich-text.test.ts 2>&1 | tail -8`
  — attendu : `FAIL` (module `./rich-text` introuvable).

- [ ] **Étape 4 : module** — créer `apps/web/src/core/rich-text.ts` :

```ts
// Texte riche par plages côté page (C7, cadrage T4 à T7) : seule copie TS des règles du cœur
// (`crates/roomboard-core/src/rich_text.rs`), pour la fausse liaison et l'outil Texte ; D33 : le contrat compare les
// deux. Différence en points de code (`Array.from`), positions de FormatText en unités UTF-16.
import type { TextAttrs, TextAttrsPatch, TextSpan } from "./api";

const KEYS = ["bold", "italic", "underline", "color", "size", "font"] as const;

export const plainSpans = (content: string): TextSpan[] => [{ text: content, attrs: {} }];

export const sameAttrs = (a: TextAttrs, b: TextAttrs): boolean => KEYS.every((k) => a[k] === b[k]);

interface Char {
  readonly ch: string;
  readonly attrs: TextAttrs;
}

const charsOf = (spans: readonly TextSpan[]): Char[] => spans.flatMap((s) => Array.from(s.text, (ch) => ({ ch, attrs: s.attrs })));

/** Voisins aux attributs égaux fusionnés ; aucun caractère : un segment vide sans attribut (comme `read_spans`). */
function spansOf(chars: readonly Char[]): TextSpan[] {
  const out: TextSpan[] = [];
  for (const c of chars) {
    const last = out[out.length - 1];
    if (last && sameAttrs(last.attrs, c.attrs)) out[out.length - 1] = { text: last.text + c.ch, attrs: last.attrs };
    else out.push({ text: c.ch, attrs: c.attrs });
  }
  return out.length === 0 ? plainSpans("") : out;
}

/**
 * Segments après `SetText` (T4, T5) : plus long préfixe commun, puis plus long suffixe commun des restes, en points de
 * code ; le milieu neuf prend les attributs du caractère qui le précède, aucun en tête.
 */
export function editSpans(spans: readonly TextSpan[], content: string): TextSpan[] {
  const old = charsOf(spans);
  const fresh = Array.from(content);
  let p = 0;
  while (p < old.length && p < fresh.length && old[p]?.ch === fresh[p]) p++;
  const room = Math.min(old.length, fresh.length) - p;
  let s = 0;
  while (s < room && old[old.length - 1 - s]?.ch === fresh[fresh.length - 1 - s]) s++;
  const inherited: TextAttrs = p === 0 ? {} : (old[p - 1]?.attrs ?? {});
  const middle = fresh.slice(p, fresh.length - s).map((ch) => ({ ch, attrs: inherited }));
  return spansOf([...old.slice(0, p), ...middle, ...old.slice(old.length - s)]);
}

/** Une clé à `undefined` vaut une clé absente (T7) : serde-wasm-bindgen la lirait comme `null`, donc comme un retrait. */
export function cleanPatch(patch: TextAttrsPatch): TextAttrsPatch {
  return Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as TextAttrsPatch;
}

const COLOR = /^(#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|[A-Za-z]{3,20})$/;
/** T15 : `#rgb`, `#rrggbb`, `#rrggbbaa`, ou un nom CSS de 3 à 20 lettres ASCII (`valid_color` du cœur). */
export const validColor = (c: string): boolean => COLOR.test(c);
/** T15 : 1 à 48 points de code, sans `"`, `\`, `;`, `{`, `}` ni retour à la ligne (`valid_font` du cœur). */
export function validFont(f: string): boolean {
  const n = Array.from(f).length;
  return n >= 1 && n <= 48 && !/["\\;{}\n\r]/.test(f);
}
/** Le cœur reçoit `size` en f32 : 1e39 y devient infini. */
const validSize = (v: number): boolean => {
  const f = Math.fround(v);
  return Number.isFinite(f) && f > 0;
};

/** Même règle que `wire_attrs` (liaison) puis `valid_attrs` (cœur) ; à appeler sur un patch nettoyé. */
export function validPatch(patch: TextAttrsPatch): boolean {
  return Object.entries(patch).every(([k, v]) => {
    if (v === null) return (KEYS as readonly string[]).includes(k);
    switch (k) {
      case "bold":
      case "italic":
      case "underline":
        return typeof v === "boolean";
      case "color":
        return typeof v === "string" && validColor(v);
      case "size":
        return typeof v === "number" && validSize(v);
      case "font":
        return typeof v === "string" && validFont(v);
      default:
        return false;
    }
  });
}

const isHigh = (u: number): boolean => u >= 0xd800 && u <= 0xdbff;
const isLow = (u: number): boolean => u >= 0xdc00 && u <= 0xdfff;
const boundary = (s: string, i: number): boolean => i === 0 || i === s.length || !(isHigh(s.charCodeAt(i - 1)) && isLow(s.charCodeAt(i)));

/** Bornes de FormatText (T6) : entiers ≥ 0, dans le texte, jamais au milieu d'une paire de substitution. */
export function utf16Bounds(content: string, start: number, len: number): boolean {
  if (!Number.isInteger(start) || !Number.isInteger(len) || start < 0 || len < 0) return false;
  const end = start + len;
  return end <= content.length && boundary(content, start) && boundary(content, end);
}

function patched(attrs: TextAttrs, patch: TextAttrsPatch): TextAttrs {
  const out: Record<string, unknown> = { ...attrs };
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === false || v === undefined) delete out[k];
    else out[k] = k === "size" && typeof v === "number" ? Math.fround(v) : v;
  }
  return out as TextAttrs;
}

/** Patch posé sur les caractères dont l'unité UTF-16 de début est dans [start, start + len) ; bornes déjà vérifiées. */
export function formatSpans(spans: readonly TextSpan[], start: number, len: number, patch: TextAttrsPatch): TextSpan[] {
  let at = 0;
  const chars = charsOf(spans).map((c) => {
    const inside = at >= start && at < start + len;
    at += c.ch.length;
    return inside ? { ch: c.ch, attrs: patched(c.attrs, patch) } : c;
  });
  return spansOf(chars);
}

export const sameSpans = (a: readonly TextSpan[], b: readonly TextSpan[]): boolean =>
  a.length === b.length &&
  a.every((s, i) => {
    const t = b[i];
    return t !== undefined && s.text === t.text && sameAttrs(s.attrs, t.attrs);
  });
```

- [ ] **Étape 5 : voir vert** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm --filter @roomboard/web exec vitest run src/core/rich-text.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Tests " | tail -20`
  — attendu : `Tests  13 passed (13)`.

- [ ] **Étape 6 : commits**

```bash
cd "$WT" && git add apps/web/src/core/api.ts && git add apps/web/src/core/rich-text.ts && git add apps/web/src/core/rich-text.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): FormatText contract, text spans and rich-text helpers" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t3"></a>
### Tâche T3 — `FormatText` et `SetText` par différence dans le cœur

**Objectif.** Brancher `rich_text.rs` dans les commandes : variante `Command::FormatText` et erreur `BadFormat` (T7),
`SetText` par différence dans la même transaction que les champs (T4), `spans` dans la vue (T8). Jouer S1 au niveau du
cœur et l'ordre des contrôles de T7 ; prouver la survie d'un embed (T16).

**Fichiers.**
- Modifier : `crates/roomboard-core/src/commands.rs` (imports `:1-20`, enum `:64-104`, `CommandError` `:110-122`, `Display` `:124-163`, `TextFields`/`read_text` `:203-227`, `apply` `:418-450`, `cmd_set_text` `:586-589`, fin du bloc `impl Document` avant `#[cfg(test)]` `:935`, tests `:1423`, `:1756`, fin du module de tests)
- Modifier : `crates/roomboard-core/src/element.rs` (`TextView` `:110-119`, imports)
- Modifier : `crates/roomboard-core/src/document.rs` (`element`, branche `text`, `:275-280`)
- Modifier : `crates/roomboard-core/src/rich_text.rs` (retrait de l'attribut `cfg_attr`, un test en fin de module)

**Interfaces.**
- Consomme (T1) : `rich_text::{TextAttr, SpanAttrs, TextSpanView, valid_attrs, read_spans, apply_text_diff, utf16_range, format_changes, apply_format}` aux signatures de T1.
- Réutilise : `crates/roomboard-core/src/commands.rs:746` (`done(&mut self, Change) -> Change`), `:751` (`unchanged(&self) -> Change`), `crates/roomboard-core/src/document.rs:364` (`transact_local(&self) -> TransactionMut`), `:458` (`find_element<T: ReadTxn>(&self, &T, &str) -> Option<FoundElement>`) — appelés par `cmd_format_text`.
- Réutilise : `crates/roomboard-core/src/element.rs:214` — `finite_positive(v: f64) -> bool` (contrôle de `box_height` ; le `positive` privé de `commands.rs` reste intact).
- Réutilise : `crates/roomboard-core/src/commands.rs:212` (`read_text`, `TextFields`) — étendu du champ `pub spans: Vec<TextSpanView>` (fichier touché).
- Réutilise : `crates/roomboard-core/src/element.rs:113` (`TextView`) — étendu du champ `pub spans: Vec<TextSpanView>` (fichier touché).
- Produit (lu par T6) : `Command::FormatText { id: String, start: u32, len: u32, attrs: Vec<TextAttr>, box_height: Option<f64> }` ; `CommandError::BadFormat` (message G15) ; `TextView.spans: Vec<TextSpanView>` sérialisé `spans`.

**Test et commande bornée.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core format_text 2>&1 | grep -E "^test |test result" | tail -20`
(≥ 5 tests, `format_text_checks_in_order_without_transaction` présent) ; `cargo test -p roomboard-core set_text 2>&1 | grep -E "^test |test result" | tail -20`
(≥ 12 tests, `set_text_keeps_range_attributes_outside_the_edit`, `set_text_and_format_keep_embeds` présents) ; puis
`cargo test --workspace 2>&1 | grep -E "test result|FAILED|error\[" | tail -20` (que des `test result: ok`). Tests à
garder verts, cités au rapport : `set_text_replaces_content_in_one_step`, `set_text_unchanged_is_no_step`,
`set_text_each_effect_is_one_transaction`, `set_text_rejects_bad_input_without_transaction` (`commands.rs:1769-1867`),
`hit_test_and_bounds_include_text` (`query.rs:881`), `save_is_deterministic`, `reload_with_strokes_keeps_bytes`
(`format/mod.rs:433`, `:443`), `socle_fixture_resaves_identically`, `socle_fixture_has_two_pages_and_three_kinds`
(`tests/compat_socle.rs:103`, `:113`), `set_text_inner_creates_and_removes` (`roomboard-wasm/src/lib.rs:793`).

**Preuve visuelle.** Aucune (cœur).

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord ; aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH et dossier `$WT`.
- G3 Preuve bornée Rust (`grep -E "^test |test result" | tail -20`).
- G4 Aucune dépendance ajoutée.
- G5 Aucun build Tauri ni Android.
- G6 `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -- -D warnings` propres.
- G7 Commits un fichier par `git add`, auteur `jejeasterix`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G10 `schema` 1, aucun champ d'élément neuf ; `insert_text` (création) inchangé : un texte neuf n'écrit aucun attribut (T12).
- G11 `FormatText` en fin d'enum, `BadFormat` en fin d'enum et de `Display`, bras en fin de `match`, `cmd_format_text` en fin de bloc `impl`, tests neufs en fin du module de tests.
- G12 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :` (4 lignes).
- G14 Test sur délai rejoué une fois.
- G15 Message `BadFormat` exact (ci-dessous).

**Patron à ne pas reprendre.** Ouvrir `transact_local()` avant de savoir si la commande a un effet (étape vide, D38),
ou vérifier l'élément avant le patch (l'ordre de T7 est patch, `boxHeight`, élément, bornes, le même que
`fake-core.ts`). Chemins de référence : `crates/roomboard-core/src/commands.rs:547-601` (`cmd_set_text` : plan sous une
lecture fermée, puis au plus une écriture) ; compteur de transactions `writes` (`commands.rs:998-1019`).

**Interdits.** Ne pas toucher `insert_text` (`commands.rs:603-`), `query.rs`, `history.rs`, `format/`. Pas de seconde
transaction dans `SetText` ni dans `FormatText`.

**Terminé quand.** Tests neufs et tests à garder verts passent, `cargo test --workspace` vert, `fmt` et `clippy` propres,
l'attribut `#![cfg_attr(not(test), allow(dead_code))]` retiré de `rich_text.rs`, commits faits, rapport avec 4 lignes
`Réutilisation :`.

**Étapes.**

- [ ] **Étape 1 : vue et lecture des segments** —
  - `element.rs` : ajouter `use crate::rich_text::TextSpanView;` aux imports, et à `TextView`, après `box_height` :

```rust
    /// Segments (C7, T8) : attributs normalisés, embeds sautés ; un seul segment sans attribut pour un texte du socle.
    pub spans: Vec<TextSpanView>,
```

  - `commands.rs`, imports : ajouter `use crate::rich_text::{self, TextAttr};` ; dans `TextFields`, après `content` :
    `pub spans: Vec<rich_text::TextSpanView>,` ; dans `read_text`, après `content: text.get_string(txn),` :
    `spans: rich_text::read_spans(txn, &text),`.
  - `document.rs`, dans la construction de `TextView` de la branche `Some("text")`, après `box_height: t.box_height,` : `spans: t.spans,`.
  - `commands.rs:1423` : sous `use crate::element::{ShapeView, TextView, IDENTITY};`, ajouter
    `use crate::rich_text::{SpanAttrs, TextSpanView};` ; dans `set_text_creates_text_in_one_step` (`:1756`), le littéral devient :

```rust
            Some(TextView {
                content: "Bonjour".into(),
                size: 36.0,
                box_width: 600.0,
                box_height: 45.0,
                spans: vec![TextSpanView {
                    text: "Bonjour".into(),
                    attrs: SpanAttrs::default()
                }]
            })
```

- [ ] **Étape 2 : tests S1 et T7 (rouges)** — en fin du module `tests` de `commands.rs` (avant sa dernière `}`), ajouter :

```rust
    // --- C7 : texte riche (FormatText, SetText par différence) ---

    const BAD_FORMAT_MESSAGE: &str = "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)";

    fn format_cmd(id: &str, start: u32, len: u32, attrs: Vec<TextAttr>) -> Command {
        Command::FormatText {
            id: id.into(),
            start,
            len,
            attrs,
            box_height: None,
        }
    }

    fn spans_of(d: &Document, id: &str) -> Vec<TextSpanView> {
        d.element(id).and_then(|e| e.text).expect("texte").spans
    }

    fn span(text: &str, attrs: SpanAttrs) -> TextSpanView {
        TextSpanView {
            text: text.into(),
            attrs,
        }
    }

    fn red_bold() -> SpanAttrs {
        SpanAttrs {
            bold: true,
            color: Some("#ff0000".into()),
            ..SpanAttrs::default()
        }
    }

    fn red_bold_patch() -> Vec<TextAttr> {
        vec![TextAttr::Color(Some("#ff0000".into())), TextAttr::Bold(true)]
    }

    /// S1 : « Le chat noir » avec « chat » (3, 4) rouge et gras.
    fn red_cat(d: &mut Document) -> (String, String) {
        let p = first(d);
        let id = d.apply(text_cmd(&p, None, "Le chat noir")).expect("texte").ids[0].clone();
        d.apply(format_cmd(&id, 3, 4, red_bold_patch())).expect("format");
        (p, id)
    }

    #[test]
    fn format_text_is_one_step_and_reads_spans() {
        let mut d = Document::blank();
        let p = first(&d);
        let id = d.apply(text_cmd(&p, None, "Le chat noir")).expect("texte").ids[0].clone();
        let n = writes(&d);
        let c = d.apply(format_cmd(&id, 3, 4, red_bold_patch())).expect("format");
        assert_eq!((c.pages, c.ids, c.removed), (vec![p], vec![id.clone()], vec![]));
        assert_eq!(n.since(), 1);
        assert_eq!(
            spans_of(&d, &id),
            vec![
                span("Le ", SpanAttrs::default()),
                span("chat", red_bold()),
                span(" noir", SpanAttrs::default())
            ]
        );
    }

    #[test]
    fn set_text_keeps_range_attributes_outside_the_edit() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chat noir")).expect("gros");
        assert_eq!(
            spans_of(&d, &id),
            vec![
                span("Le gros ", SpanAttrs::default()),
                span("chat", red_bold()),
                span(" noir", SpanAttrs::default())
            ]
        );
    }

    #[test]
    fn set_text_diff_is_one_step() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        let n = writes(&d);
        let c = d.apply(text_cmd(&p, Some(id.clone()), "Le gros chat noir")).expect("gros");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(n.since(), 1, "différence et champs : une transaction");
        assert!(d.undo());
        assert_eq!(
            spans_of(&d, &id),
            vec![
                span("Le ", SpanAttrs::default()),
                span("chat", red_bold()),
                span(" noir", SpanAttrs::default())
            ]
        );
    }

    /// HU2-15 : le texte inséré prend les attributs du caractère qui le précède.
    #[test]
    fn set_text_inserted_text_inherits_previous_char() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chat noir")).expect("gros");
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chats noir")).expect("chats");
        assert_eq!(
            spans_of(&d, &id),
            vec![
                span("Le gros ", SpanAttrs::default()),
                span("chats", red_bold()),
                span(" noir", SpanAttrs::default())
            ]
        );
    }

    /// Review Focus 1 (cadrage T5) : un mot formaté remplacé en entier suit le caractère qui le précède (sans attribut).
    #[test]
    fn set_text_replacing_a_whole_range_takes_previous_char_attrs() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        d.apply(text_cmd(&p, Some(id.clone()), "Le loup noir")).expect("loup");
        assert_eq!(spans_of(&d, &id), vec![span("Le loup noir", SpanAttrs::default())]);
    }

    /// S1 : annuler trois fois rend « Le chat noir » sans attribut ; rétablir trois fois remet tout.
    #[test]
    fn s1_three_undos_restore_plain_text_and_redo_restores_all() {
        let mut d = Document::blank();
        let (p, id) = red_cat(&mut d);
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chat noir")).expect("gros");
        d.apply(text_cmd(&p, Some(id.clone()), "Le gros chats noir")).expect("chats");
        let full = spans_of(&d, &id);
        assert!(d.undo() && d.undo() && d.undo());
        assert_eq!(spans_of(&d, &id), vec![span("Le chat noir", SpanAttrs::default())]);
        assert!(d.redo() && d.redo() && d.redo());
        assert_eq!(spans_of(&d, &id), full);
    }

    /// T7 : 1) patch, 2) boxHeight, 3) élément, 4) bornes UTF-16 ; aucune transaction sur une erreur.
    #[test]
    fn format_text_checks_in_order_without_transaction() {
        let mut d = Document::blank();
        let p = first(&d);
        let stroke = commit(&mut d, &p, hline(100.0));
        let id = d.apply(text_cmd(&p, None, "Le 🐱 noir")).expect("texte").ids[0].clone();
        let n = writes(&d);
        let bold = || vec![TextAttr::Bold(true)];
        let with_height = |id: &str, h: f64| Command::FormatText {
            id: id.into(),
            start: 0,
            len: 1,
            attrs: vec![],
            box_height: Some(h),
        };
        let bad = Err(CommandError::BadFormat);
        let rgb = vec![TextAttr::Color(Some("rgb(0,0,0)".into()))];
        assert_eq!(d.apply(format_cmd("absent", 0, 1, rgb)), bad, "le patch passe avant l'élément");
        assert_eq!(d.apply(with_height("absent", -1.0)), bad);
        assert_eq!(d.apply(with_height("absent", f64::NAN)), bad);
        assert_eq!(
            d.apply(format_cmd("absent", 0, 1, bold())),
            Err(CommandError::UnknownElement("absent".into()))
        );
        assert_eq!(
            d.apply(format_cmd(&stroke, 0, 1, bold())),
            Err(CommandError::UnknownElement(stroke.clone()))
        );
        // « Le 🐱 noir » : 10 unités UTF-16, le 🐱 en 3-4
        for (start, len) in [(4, 1), (3, 1), (8, 3), (11, 0), (u32::MAX, 1)] {
            assert_eq!(d.apply(format_cmd(&id, start, len, bold())), bad, "bornes {start}, {len}");
        }
        let hex64 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
        for attrs in [
            vec![TextAttr::Font(Some(hex64.into()))],
            vec![TextAttr::Color(Some(hex64.into()))],
            vec![TextAttr::Size(Some(0.0))],
            vec![TextAttr::Size(Some(f32::NAN))],
        ] {
            assert_eq!(d.apply(format_cmd(&id, 0, 1, attrs)), bad);
        }
        assert_eq!(n.since(), 0);
    }

    /// D38 : mêmes attributs, plage vide, retrait d'attributs absents, patch vide, même hauteur : aucune transaction.
    #[test]
    fn format_text_no_change_is_no_step() {
        let mut d = Document::blank();
        let (_, id) = red_cat(&mut d);
        let n = writes(&d);
        let v = d.version();
        for cmd in [
            format_cmd(&id, 3, 4, red_bold_patch()),
            format_cmd(&id, 2, 0, vec![TextAttr::Bold(true)]),
            format_cmd(&id, 0, 3, vec![TextAttr::Bold(false), TextAttr::Color(None)]),
            format_cmd(&id, 0, 12, vec![]),
            Command::FormatText {
                id: id.clone(),
                start: 0,
                len: 0,
                attrs: vec![],
                box_height: Some(45.0),
            },
        ] {
            let c = d.apply(cmd).expect("sans effet");
            assert!(c.ids.is_empty() && c.pages.is_empty());
        }
        assert_eq!(d.version(), v);
        assert_eq!(n.since(), 0);
    }

    #[test]
    fn format_text_box_height_alone_is_one_step() {
        let mut d = Document::blank();
        let (_, id) = red_cat(&mut d);
        let n = writes(&d);
        let height = |d: &Document| d.element(&id).and_then(|e| e.text).map(|t| t.box_height);
        let c = d
            .apply(Command::FormatText {
                id: id.clone(),
                start: 0,
                len: 0,
                attrs: vec![],
                box_height: Some(60.0),
            })
            .expect("hauteur");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(n.since(), 1);
        assert_eq!(height(&d), Some(60.0));
        d.apply(Command::FormatText {
            id: id.clone(),
            start: 3,
            len: 4,
            attrs: vec![TextAttr::Size(Some(48.0))],
            box_height: Some(75.0),
        })
        .expect("taille et hauteur");
        assert_eq!(n.since(), 2, "format et hauteur : une transaction");
        assert!(d.undo());
        assert_eq!(height(&d), Some(60.0));
        assert_eq!(spans_of(&d, &id)[1], span("chat", red_bold()));
    }

    #[test]
    fn format_text_error_has_readable_message() {
        assert_eq!(CommandError::BadFormat.to_string(), BAD_FORMAT_MESSAGE);
    }
```

- [ ] **Étape 3 : voir rouge** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core format_text 2>&1 | grep -E "error\[|test result" | tail -10`
  — attendu : `error[E0599]` ou `error[E0559]` (`FormatText`, `BadFormat` absents).

- [ ] **Étape 4 : commande et erreur** — dans `commands.rs` :
  - en fin de l'enum `Command`, après la variante `SetBackdrop { … },` :

```rust
    /// Attributs de plage d'un texte (C7, U27) : `start`, `len` en unités UTF-16 du contenu ; `attrs` = patch (T7) ;
    /// `box_height` : hauteur de boîte mesurée par la page, écrite si elle change.
    FormatText {
        id: String,
        start: u32,
        len: u32,
        attrs: Vec<TextAttr>,
        box_height: Option<f64>,
    },
```

  - en fin de `CommandError`, après `BadImage,` : `BadFormat,` ; en fin du `match` de `Display`, après le bras `BadImage` :

```rust
            CommandError::BadFormat => write!(
                f,
                "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)"
            ),
```

  - en fin du `match cmd` de `apply`, après le bras `Command::SetBackdrop { … } => { … }` :

```rust
            Command::FormatText {
                id,
                start,
                len,
                attrs,
                box_height,
            } => self.cmd_format_text(&id, (start, len), &attrs, box_height),
```

  - en fin du bloc `impl Document` (après `cmd_delete`, avant la `}` qui précède `#[cfg(test)]`) :

```rust
    /// `FormatText` (C7, T7) : contrôles dans l'ordre du cadrage, le même que `fake-core.ts` (patch, `box_height`,
    /// élément, bornes) ; rien ne change (plage vide, mêmes attributs, même hauteur) : aucune transaction (D38) ; sinon
    /// une seule, format puis hauteur. Comme `cmd_set_text` : plan sous une lecture fermée, puis au plus une écriture.
    fn cmd_format_text(
        &mut self,
        id: &str,
        range: (u32, u32),
        attrs: &[TextAttr],
        box_height: Option<f64>,
    ) -> Result<Change, CommandError> {
        if !rich_text::valid_attrs(attrs) || box_height.is_some_and(|h| !finite_positive(h)) {
            return Err(CommandError::BadFormat);
        }
        let (found, current, at, formats) = {
            let txn = self.read();
            let unknown = || CommandError::UnknownElement(id.to_string());
            let found = self.find_element(&txn, id).ok_or_else(unknown)?;
            let current = read_text(&txn, &found.element).ok_or_else(unknown)?;
            let at = rich_text::utf16_range(&txn, &current.text, range.0, range.1)
                .ok_or(CommandError::BadFormat)?;
            let formats = rich_text::format_changes(&txn, &current.text, at, attrs);
            (found, current, at, formats)
        };
        let height = box_height.filter(|h| *h != current.box_height);
        if !formats && height.is_none() {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            if formats {
                rich_text::apply_format(&mut txn, &current.text, at, attrs);
            }
            if let Some(h) = height {
                found
                    .element
                    .insert(&mut txn, "boxHeight", In::Any(Any::from(h)));
            }
        }
        Ok(self.done(Change {
            pages: vec![found.page_id],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }
```

- [ ] **Étape 5 : `SetText` par différence** — dans `cmd_set_text`, remplacer les trois lignes

```rust
            let len = current.text.len(&txn);
            current.text.remove_range(&mut txn, 0, len);
            current.text.insert(&mut txn, 0, t.content);
```

  par

```rust
            // T4, T5, T16 : différence en points de code, héritage du caractère précédent, embeds gardés.
            rich_text::apply_text_diff(&mut txn, &current.text, t.content);
```

  Puis retirer de `rich_text.rs` la ligne `#![cfg_attr(not(test), allow(dead_code))] // retiré par T3, …`. Si
  `Text` (`yrs`) n'est plus utilisé dans `commands.rs`, le retirer des imports (clippy le dira).

- [ ] **Étape 6 : voir vert** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core format_text 2>&1 | grep -E "^test |test result" | tail -20 && cargo test -p roomboard-core set_text 2>&1 | grep -E "^test |test result" | tail -20`
  — attendu : `format_text_*` ≥ 5 `ok` ; `set_text_*` ≥ 11 `ok` (le douzième, `set_text_and_format_keep_embeds`, vient à l'étape 7) ; `test result: ok`.

- [ ] **Étape 7 : test des embeds (T16)** — en fin du module `tests` de `rich_text.rs` :

```rust
    /// T16 : un embed (écrit par une autre version) survit à `SetText` et `FormatText` autour et à travers ; il reste
    /// cité par `cited_assets`, ni la couleur ni la police ne le sont (T15).
    #[test]
    fn set_text_and_format_keep_embeds() {
        use crate::commands::{read_text, Command};
        use crate::document::Document;
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let set = |content: &str, id: Option<String>| Command::SetText {
            page: p.clone(),
            id,
            x: 0.0,
            y: 0.0,
            content: content.into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 45.0,
        };
        let fmt = |id: &str, start: u32, len: u32, attrs: Vec<TextAttr>| Command::FormatText {
            id: id.into(),
            start,
            len,
            attrs,
            box_height: None,
        };
        let id = d.apply(set("Le chat noir", None)).expect("texte").ids[0].clone();
        let text = {
            let txn = d.read();
            let f = d.find_element(&txn, &id).expect("élément");
            read_text(&txn, &f.element).expect("texte").text
        };
        {
            let mut txn = d.transact_local();
            let embed = Any::Map(Arc::new(HashMap::from([(
                "src".to_string(),
                Any::from(HEX64),
            )])));
            text.insert_embed(&mut txn, 3, embed);
        }
        let embeds = |d: &Document| {
            let txn = d.read();
            text.diff(&txn, YChange::identity)
                .iter()
                .filter(|c| !matches!(c.insert, Out::Any(Any::String(_))))
                .count()
        };
        // autour : FormatText sur « chat » (après l'embed), puis SetText qui insère juste avant lui
        let red_georgia = vec![
            TextAttr::Color(Some("#ff0000".into())),
            TextAttr::Font(Some("Georgia".into())),
        ];
        d.apply(fmt(&id, 3, 4, red_georgia)).expect("format");
        d.apply(set("Le gros chat noir", Some(id.clone()))).expect("insère");
        // à travers : suppression de part et d'autre de l'embed, puis format de tout le texte
        d.apply(set("Le noir", Some(id.clone()))).expect("supprime");
        d.apply(fmt(&id, 0, 7, vec![TextAttr::Bold(true)])).expect("format total");
        assert_eq!(embeds(&d), 1, "l'embed est gardé");
        let view = d.element(&id).and_then(|e| e.text).expect("vue");
        assert_eq!(view.content, "Le noir");
        assert_eq!(view.spans, vec![with("Le noir", bold())]);
        let cited: Vec<String> = d.cited_assets().into_iter().map(|a| a.id).collect();
        assert_eq!(cited, vec![HEX64.to_string()]);
    }
```

  Commande : `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-core set_text_and_format_keep_embeds 2>&1 | grep -E "^test |test result" | tail -5`
  — attendu : `test rich_text::tests::set_text_and_format_keep_embeds ... ok`. (Avec l'ancien `cmd_set_text`, l'embed
  disparaissait : la ligne `assert_eq!(embeds(&d), 1, …)` le prouve.)

- [ ] **Étape 8 : toute la suite, format, lint** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo fmt --all && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -3 && cargo test --workspace 2>&1 | grep -E "test result|FAILED|error\[" | tail -20`
  — attendu : aucun `FAILED`, que des `test result: ok` ; les tests à garder verts listés plus haut y sont.

- [ ] **Étape 9 : commits**

```bash
cd "$WT" && git add crates/roomboard-core/src/rich_text.rs && git add crates/roomboard-core/src/element.rs && \
git add crates/roomboard-core/src/document.rs && git add crates/roomboard-core/src/commands.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(core): FormatText command, SetText by diff and text spans in the view" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t4"></a>
### Tâche T4 — Faux cœur : `spans`, `SetText` par différence, `FormatText`

**Objectif.** La fausse liaison reproduit le cœur (D33) : `TextData.spans` créé, gardé par `SetText` (`editSpans`),
posé par `FormatText` avec le même ordre de contrôles et le même message (T7, G15) ; un JSON d'avant C7 sans `spans`
donne un seul segment ; `save` écrit les `spans`.

**Fichiers.**
- Modifier : `apps/web/src/core/fake-core.ts` (en-tête `:1-10`, imports `:11-30`, `MESSAGES` `:63-70`, `SetText` `:361-399`, fin du `switch` après `SetBackdrop` `:443-458`, `SavedElement` `:576-590`, `loadElement` `:627-640`)
- Modifier : `apps/web/src/core/fake-core.test.ts` (littéral `:142-148`, bloc neuf en fin de fichier)
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts` (littéral `:371` seulement)

**Interfaces.**
- Consomme (T2) : `plainSpans`, `editSpans`, `cleanPatch`, `validPatch`, `utf16Bounds`, `formatSpans`, `sameSpans` de `./rich-text` ; types `TextSpan`, `TextAttrsPatch`, `TextData` de `./api`.
- Réutilise : `apps/web/src/core/fake-core.ts:361` (`SetText`), `:272` (`step(mutate)`), `:268` (`unchanged()`), `:259` (`find(id)`) — appelle `rich-text.ts`, aucune règle réécrite (fichier touché).
- Produit : `fakeCore` qui accepte `{ type: "FormatText", … }` ; `MESSAGES.badFormat` = message G15.

**Test et commande bornée.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts --reporter=verbose 2>&1 | grep -E "C7|×|FAIL|Tests " | tail -20`
— attendu : 4 lignes « fakeCore — C7 … » en `✓`, `Tests  N passed`, 0 échec. Puis
`pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts src/engine/tools/text.test.ts src/app/text-editor.test.ts 2>&1 | tail -6`
— attendu : 0 échec ; « SetText : créer, remplacer, vider » (`wasm-core.contract.test.ts:362`), « save puis load garde
formes, textes et matrices » (`:592`) et `text-editor.test.ts:148` restent verts (blocs du vrai module sautés : pas de
`.wasm` dans un worktree neuf, G8).

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord ; aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH et dossier `$WT` ; G16 `pnpm install --frozen-lockfile`.
- G3 Preuve bornée TS (`exec vitest run … --reporter=verbose`) ; jamais `pnpm --filter @roomboard/web test -- <fichier>`.
- G4 Aucune dépendance ajoutée.
- G7 Commits un fichier par `git add`, auteur `jejeasterix`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G8 Ne pas construire le module Wasm ici.
- G10 JSON de la fausse liaison : un fichier sans `spans` se relit ; aucun autre champ neuf.
- G11 `case "FormatText"` en fin de `switch`, bloc `describe` neuf en fin de `fake-core.test.ts`.
- G12 Rapport : une ligne `Réutilisation : …` (1 ligne).
- G13 `tsc` reste rouge (`wasm-core.ts`, T9) : attendu.
- G14 Test sur délai rejoué une fois.
- G15 Message `BadFormat` exact.

**Patron à ne pas reprendre.** Une deuxième copie de la règle dans `fake-core.ts` (préfixe, suffixe, héritage écrits
ici) ou l'élément contrôlé avant le patch. Chemins de référence : `apps/web/src/core/fake-core.ts:361-399` (ordre des
contrôles de `SetText`, à imiter) ; `apps/web/src/core/rich-text.ts` (T2, seule copie de la règle) ;
`crates/roomboard-core/src/commands.rs` `cmd_format_text` (T3).

**Interdits.** Ne pas modifier `rich-text.ts`, `api.ts`, `wasm-core.ts`. Dans `wasm-core.contract.test.ts`, seul le
littéral de la ligne 371 change.

**Terminé quand.** Les 4 tests neufs passent, les tests cités restent verts, commits faits, rapport avec 1 ligne `Réutilisation :`.

**Étapes.**

- [ ] **Étape 1 : tests (rouges)** —
  - `fake-core.test.ts`, import : `import type { Command, CoreDocument, TextAttrsPatch } from "./api";` ; littéral de la
    ligne 147 : `text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45, spans: [{ text: "Bonjour", attrs: {} }] },`
  - `wasm-core.contract.test.ts:371` : `text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45, spans: [{ text: "Bonjour", attrs: {} }] },`
  - en fin de `fake-core.test.ts` :

```ts
describe("fakeCore — C7 (texte riche)", () => {
  const BAD_FORMAT =
    "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)";
  const setText = (d: CoreDocument, page: string, content: string, id: string | null = null) =>
    d.apply({ type: "SetText", page, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
  const spansOf = (d: CoreDocument, id: string) => {
    const e = d.element(id);
    return e?.kind === "text" ? e.text.spans : null;
  };
  const plain = (text: string) => ({ text, attrs: {} });
  const RB = { color: "#ff0000", bold: true } as const;

  it("C7 S1 : FormatText une étape ; SetText garde les plages ; le texte neuf hérite du caractère précédent ; annuler, rétablir", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = setText(d, p, "Le chat noir").ids[0] ?? "";
    expect(d.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { color: "#ff0000", bold: true } })).toMatchObject({ pages: [p], ids: [id], removed: [] });
    setText(d, p, "Le gros chat noir", id);
    expect(spansOf(d, id)).toEqual([plain("Le gros "), { text: "chat", attrs: RB }, plain(" noir")]);
    setText(d, p, "Le gros chats noir", id);
    const full = spansOf(d, id);
    expect(full).toEqual([plain("Le gros "), { text: "chats", attrs: RB }, plain(" noir")]);
    d.undo();
    d.undo();
    d.undo();
    expect(spansOf(d, id)).toEqual([plain("Le chat noir")]);
    d.redo();
    d.redo();
    d.redo();
    expect(spansOf(d, id)).toEqual(full);
  });

  it("C7 : une clé à undefined vaut une clé absente ; { bold: undefined } seul : aucune étape", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const id = setText(d, p, "Le chat noir").ids[0] ?? "";
    d.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { bold: true } });
    d.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { bold: undefined, italic: true } });
    expect(spansOf(d, id)).toEqual([plain("Le "), { text: "chat", attrs: { bold: true, italic: true } }, plain(" noir")]);
    const v = d.version();
    expect(d.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { bold: undefined } }).version).toBe(v);
    expect(d.version()).toBe(v);
  });

  it("C7 : contrôles dans l'ordre du cœur (patch, boxHeight, élément, bornes), sans étape", () => {
    const d = fakeCore.blank();
    const p = firstPage(d);
    const stroke = commit(d, p, 10);
    const id = setText(d, p, "Le 🐱 noir").ids[0] ?? "";
    const v = d.version();
    const fmt = (target: string, start: number, len: number, attrs: TextAttrsPatch, boxHeight?: number) => () =>
      d.apply({ type: "FormatText", id: target, start, len, attrs, ...(boxHeight === undefined ? {} : { boxHeight }) });
    expect(fmt("absent", 0, 1, { href: "x" } as unknown as TextAttrsPatch)).toThrow(BAD_FORMAT);
    expect(fmt("absent", 0, 1, {}, -1)).toThrow(BAD_FORMAT);
    expect(fmt("absent", 0, 1, { bold: true })).toThrow("élément inconnu : absent");
    expect(fmt(stroke, 0, 1, { bold: true })).toThrow(`élément inconnu : ${stroke}`);
    expect(fmt(id, 4, 1, { bold: true })).toThrow(BAD_FORMAT);
    expect(fmt(id, 8, 3, { bold: true })).toThrow(BAD_FORMAT);
    expect(d.version()).toBe(v);
  });

  it("C7 : JSON d'avant C7 sans spans : un seul segment sans attribut ; save écrit les spans", () => {
    const old = { pages: [{ id: "p1", elements: [{ id: "t1", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 0 }, text: { content: "Bonjour", size: 36, boxWidth: 600, boxHeight: 45 } }] }] };
    const d = fakeCore.load(new TextEncoder().encode(JSON.stringify(old)));
    expect(spansOf(d, "t1")).toEqual([plain("Bonjour")]);
    const saved = JSON.parse(new TextDecoder().decode(d.save("2026-11-20T00:00:00Z", "0.1.0"))) as { pages: { elements: { text?: { spans?: unknown } }[] }[] };
    expect(saved.pages[0]?.elements[0]?.text?.spans).toEqual([plain("Bonjour")]);
  });
});
```

- [ ] **Étape 2 : voir rouge** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web exec vitest run src/core/fake-core.test.ts 2>&1 | grep -E "FAIL|Tests " | tail -10`
  — attendu : les 4 tests « C7 » et « SetText … » (littéral) en échec.

- [ ] **Étape 3 : imports, message, en-tête** — dans `fake-core.ts` :
  - à la fin du commentaire d'en-tête (après la ligne qui finit par « réécrit tel quel. »), ajouter :

```ts
// C7 : segments (`spans`) gardés par SetText (différence de `rich-text.ts`), posés par FormatText ; JSON sans `spans` = un segment.
```

  - à l'import de types depuis `./api`, ajouter `TextSpan` ; ajouter la ligne
    `import { cleanPatch, editSpans, formatSpans, plainSpans, sameSpans, utf16Bounds, validPatch } from "./rich-text";`
  - en fin de `MESSAGES` :
    `badFormat: "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)",`

- [ ] **Étape 4 : `SetText`** — dans `case "SetText"` :
  - la ligne `const text: TextData = { content: cmd.content, size: cmd.size, boxWidth: cmd.boxWidth, boxHeight: cmd.boxHeight };` devient
    `const text: TextData = { content: cmd.content, size: cmd.size, boxWidth: cmd.boxWidth, boxHeight: cmd.boxHeight, spans: plainSpans(cmd.content) };`
  - la ligne `if (p && old) p.elements[i] = { ...old, style, text };` devient
    `if (p && old) p.elements[i] = { ...old, style, text: { ...text, spans: editSpans(t.spans, cmd.content) } };`

- [ ] **Étape 5 : `FormatText`** — en fin du `switch` de `apply`, après le `case "SetBackdrop": { … }` :

```ts
      case "FormatText": {
        // Ordre du cœur (T7) : patch nettoyé, boxHeight, élément, bornes ; rien ne change : aucune étape (D38).
        const patch = cleanPatch(cmd.attrs);
        if (!validPatch(patch)) throw new Error(MESSAGES.badFormat);
        if (cmd.boxHeight !== undefined && !positive(cmd.boxHeight)) throw new Error(MESSAGES.badFormat);
        const id = cmd.id;
        const found = this.find(id);
        const t = found?.element.text;
        if (!found || !t) throw new Error(`élément inconnu : ${id}`);
        if (!utf16Bounds(t.content, cmd.start, cmd.len)) throw new Error(MESSAGES.badFormat);
        const spans = formatSpans(t.spans, cmd.start, cmd.len, patch);
        const boxHeight = cmd.boxHeight ?? t.boxHeight;
        if (sameSpans(spans, t.spans) && boxHeight === t.boxHeight) return this.unchanged();
        const pageId = found.page.id;
        return this.step((s) => {
          const p = s.pages.find((q) => q.id === pageId);
          const i = p ? p.elements.findIndex((e) => e.id === id) : -1;
          const old = p?.elements[i];
          if (p && old?.text) p.elements[i] = { ...old, text: { ...old.text, spans, boxHeight } };
          return { pages: [pageId], ids: [id], removed: [] };
        });
      }
```

- [ ] **Étape 6 : enregistrer, relire** — dans `fake-core.ts` :
  - juste avant `interface SavedElement`, ajouter :

```ts
/** Texte enregistré ; `spans` absent dans un JSON d'avant C7. */
type SavedText = Omit<TextData, "spans"> & { readonly spans?: readonly TextSpan[] };
/** JSON d'avant C7 : sans `spans`, le texte est un seul segment sans attribut (T8, T12). */
const withSpans = (t: SavedText): TextData => ({ ...t, spans: Array.isArray(t.spans) ? t.spans : plainSpans(t.content) });
```

  - dans `SavedElement`, `text?: TextData;` devient `text?: SavedText;`
  - dans `loadElement`, dernier `return`, `...(e.text ? { text: e.text } : {}),` devient `...(e.text ? { text: withSpans(e.text) } : {}),`

- [ ] **Étape 7 : voir vert** — les deux commandes de « Test et commande bornée » ci-dessus ; attendu : 0 échec, 4 tests « C7 » `✓`.

- [ ] **Étape 8 : commits**

```bash
cd "$WT" && git add apps/web/src/core/fake-core.ts && git add apps/web/src/core/fake-core.test.ts && \
git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): fake core keeps text spans, applies FormatText and SetText by diff" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t5"></a>
### Tâche T5 — Mise en lignes par segments `layoutRich`

**Objectif.** Une seule mise en lignes (CL4-4) : `layoutRich(spans, base, boxWidth, measure)` coupe aux espaces comme
`layoutText`, un mot pouvant traverser plusieurs segments, mot trop long coupé par graphème ; hauteur de ligne = plus
grande taille × 1,25 ; ligne vide = taille du `\n` qui la termine, sinon de l'élément (T9). `layoutText` en devient le
cas d'un seul segment sans attribut et garde sa sortie. `Measure` et `textFont` gagnent une face facultative.

**Fichiers.**
- Modifier : `apps/web/src/engine/text-layout.ts` (fichier entier, réécrit ci-dessous)
- Modifier : `apps/web/src/engine/text-layout.test.ts` (import, bloc neuf en fin)

**Interfaces.**
- Consomme (T2) : types `TextAttrs`, `TextSpan` de `../core/api`.
- Réutilise : `apps/web/src/engine/text-layout.ts:34` (`layoutText`), `:26` (`graphemes`), `:17` (`measureWith`), `:11` (`textFont`) — étendus, aucune seconde implémentation (fichier touché).
- Produit (lu par T7, T8) :
  - `interface Face { readonly bold?: boolean; readonly italic?: boolean; readonly font?: string }`
  - `textFont(size: number, face?: Face): string` (`textFont(36)` inchangé)
  - `type Measure = (text: string, size: number, face?: Face) => number`
  - `measureWith(ctx: CanvasRenderingContext2D): Measure`
  - `interface SegmentStyle { readonly size: number; readonly bold: boolean; readonly italic: boolean; readonly underline: boolean; readonly font: string | null; readonly color: string | null }` (`color` null = couleur de l'élément ; `font` null = police du socle)
  - `interface RichSegment { readonly text: string; readonly style: SegmentStyle; readonly x: number; readonly width: number }`
  - `interface RichLine { readonly segments: readonly RichSegment[]; readonly top: number; readonly height: number; readonly size: number }`
  - `styleOf(attrs: TextAttrs, base: { readonly size: number }): SegmentStyle` ; `faceOf(s: SegmentStyle): Face | undefined`
  - `layoutRich(spans: readonly TextSpan[], base: { readonly size: number }, boxWidth: number, measure: Measure): RichLine[]`
  - `richBoxHeight(lines: readonly RichLine[]): number` ; `layoutText` et `textBoxHeight` gardés.

**Test et commande bornée.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm --filter @roomboard/web exec vitest run src/engine/text-layout.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Tests " | tail -20`
— attendu : `Tests  15 passed (15)` ; les 10 tests existants (`text-layout.test.ts:8-56`) restent verts ; « S5 : « chat »
en 48 » présent.

**Preuve visuelle.** Aucune (calcul pur).

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord ; aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH et dossier `$WT` ; G16 `pnpm install --frozen-lockfile`.
- G3 Preuve bornée TS (`exec vitest run … --reporter=verbose`) ; jamais `pnpm --filter @roomboard/web test -- <fichier>`.
- G4 Aucune dépendance ajoutée (`unicode-segmentation` hors chantier, C6a) ; `Intl.Segmenter` déjà employé.
- G7 Commits un fichier par `git add`, auteur `jejeasterix`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G9 Hors périmètre : C7b.
- G11 Bloc `describe` neuf en fin de `text-layout.test.ts`.
- G12 Rapport : une ligne `Réutilisation : …` (1 ligne).
- G13 `tsc` reste rouge ailleurs : attendu.
- G14 Test sur délai rejoué une fois.

**Interdits.** Garder `layoutText` à côté de `layoutRich` avec sa propre boucle (deux implémentations, CL4-4). Changer la
sortie de `layoutText` ou de `textFont(size)`. Toucher `canvas2d.ts` ou `tools/text.ts` (T7, T8).

**Terminé quand.** 15 tests verts, commits faits, rapport avec 1 ligne `Réutilisation :`.

**Étapes.**

- [ ] **Étape 1 : tests (rouges)** — dans `text-layout.test.ts`, l'import devient
  `import { faceOf, graphemes, layoutRich, layoutText, richBoxHeight, styleOf, textBoxHeight, textFont, type Face, type Measure, type RichLine } from "./text-layout";`
  et `import type { TextSpan } from "../core/api";` ; en fin de fichier :

```ts
describe("mise en lignes par segments (C7, T9)", () => {
  const ten: Measure = (s) => s.length * 10;
  const plainSpan = (text: string): TextSpan => ({ text, attrs: {} });
  const texts = (lines: readonly RichLine[]): string[][] => lines.map((l) => l.segments.map((s) => s.text));

  it("un mot à cheval sur deux segments n'est pas coupé entre eux", () => {
    const spans: TextSpan[] = [plainSpan("Le ch"), { text: "at", attrs: { bold: true } }, plainSpan(" noir")];
    const lines = layoutRich(spans, { size: 36 }, 60, ten);
    expect(texts(lines)).toEqual([["Le"], ["ch", "at"], ["noir"]]);
    expect(lines[1]?.segments.map((s) => s.style.bold)).toEqual([false, true]);
  });

  it("S5 : « chat » en 48 gras souligné rouge, boîte étroite : ligne de hauteur 48 × 1,25", () => {
    const spans: TextSpan[] = [plainSpan("Le "), { text: "chat", attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } }, plainSpan(" noir")];
    const lines = layoutRich(spans, { size: 36 }, 70, ten);
    expect(texts(lines)).toEqual([["Le ", "chat"], ["noir"]]);
    expect(lines.map((l) => [l.top, l.height, l.size])).toEqual([[0, 60, 48], [60, 45, 36]]);
    expect(lines[0]?.segments.map((s) => [s.x, s.width])).toEqual([[0, 30], [30, 40]]);
    expect(lines[0]?.segments[1]?.style).toEqual({ size: 48, bold: true, italic: false, underline: true, font: null, color: "#ff0000" });
    expect(richBoxHeight(lines)).toBe(105);
  });

  // Review Focus 3 (cadrage T9, HC7-9).
  it("Review Focus 3 : ligne vide à la taille du \\n qui la termine, sinon à celle de l'élément", () => {
    const spans: TextSpan[] = [plainSpan("a\n"), { text: "\n", attrs: { size: 72 } }, plainSpan("b")];
    expect(layoutRich(spans, { size: 36 }, 600, ten).map((l) => l.height)).toEqual([45, 90, 45]);
    const last = layoutRich([{ text: "a\n", attrs: { size: 72 } }], { size: 36 }, 600, ten);
    expect(last.map((l) => [l.size, l.height])).toEqual([[72, 90], [36, 45]]);
  });

  // Review Focus 4 (cadrage T10, T15).
  it("Review Focus 4 : police nommée devant Atkinson, gras et italique dans l'ordre CSS", () => {
    expect(textFont(48, { bold: true, italic: true, font: "Comic Sans MS" })).toBe('italic bold 48px "Comic Sans MS", "Atkinson Hyperlegible", system-ui, sans-serif');
    expect(textFont(36, {})).toBe(textFont(36));
    expect(textFont(36, faceOf(styleOf({}, { size: 36 })))).toBe('36px "Atkinson Hyperlegible", system-ui, sans-serif');
  });

  it("la mesure reçoit la face du segment ; un texte sans attribut est mesuré comme au socle", () => {
    const calls: [string, number, Face | undefined][] = [];
    const spy: Measure = (s, size, face) => {
      calls.push([s, size, face]);
      return s.length * 10;
    };
    layoutRich([plainSpan("a "), { text: "b", attrs: { bold: true, font: "Georgia" } }], { size: 36 }, 600, spy);
    expect(calls).toContainEqual(["b", 36, { bold: true, italic: false, font: "Georgia" }]);
    expect(calls).toContainEqual(["a ", 36, undefined]);
    expect(layoutText("aaaa bbbb cc", 36, 700, (s) => s.length * 100)).toEqual(["aaaa", "bbbb cc"]);
  });
});
```

- [ ] **Étape 2 : voir rouge** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web exec vitest run src/engine/text-layout.test.ts 2>&1 | grep -E "FAIL|Tests " | tail -8`
  — attendu : échec (`layoutRich` n'existe pas).

- [ ] **Étape 3 : réécrire `text-layout.ts`** — contenu complet :

```ts
/**
 * Mise en lignes du texte (D14, CL4-4, CL4-5, C7) : une seule implémentation (`layoutRich`) pour la hauteur de boîte
 * envoyée au cœur (outil Texte) et pour le rendu (Canvas 2D) ; `layoutText` en est le cas d'un seul segment sans
 * attribut. Coupure gloutonne aux espaces, un mot peut traverser plusieurs segments, mot trop long coupé par graphème.
 */
import type { TextAttrs, TextSpan } from "../core/api";

export const TEXT_FONT_FAMILY = '"Atkinson Hyperlegible", system-ui, sans-serif';
export const TEXT_SIZES: readonly number[] = [24, 36, 48, 72];
export const DEFAULT_TEXT_SIZE = 36;
export const TEXT_LINE_HEIGHT = 1.25;
export const DEFAULT_TEXT_BOX_WIDTH = 600;

/** Gras, italique, police d'un segment (C7) ; absente : le style du socle. */
export interface Face {
  readonly bold?: boolean;
  readonly italic?: boolean;
  readonly font?: string;
}

/** `[italic ][bold ]<taille>px <famille>` ; une police nommée passe devant Atkinson, qui reste le repli (T15, D27). */
export const textFont = (size: number, face?: Face): string =>
  `${face?.italic ? "italic " : ""}${face?.bold ? "bold " : ""}${size}px ${face?.font ? `"${face.font}", ${TEXT_FONT_FAMILY}` : TEXT_FONT_FAMILY}`;

/** Largeur d'un texte à une taille et une face, en unités monde (= px CSS de la police à cette taille). */
export type Measure = (text: string, size: number, face?: Face) => number;

/** Mesure par un contexte 2D : la même police que le rendu, puis `measureText`. */
export const measureWith =
  (ctx: CanvasRenderingContext2D): Measure =>
  (text, size, face) => {
    ctx.font = textFont(size, face);
    return ctx.measureText(text).width;
  };

let cache: { readonly ctor: typeof Intl.Segmenter; readonly seg: Intl.Segmenter } | null = null;

/** Graphèmes (emoji ZWJ, drapeaux, teintes entiers) ; repli par points de code sans Intl.Segmenter. */
export function graphemes(s: string): string[] {
  const ctor = (Intl as { Segmenter?: typeof Intl.Segmenter }).Segmenter;
  if (!ctor) return Array.from(s);
  if (cache?.ctor !== ctor) cache = { ctor, seg: new ctor(undefined, { granularity: "grapheme" }) };
  return Array.from(cache.seg.segment(s), (x) => x.segment);
}

/** Style résolu d'un segment (T3) : `color` null = couleur de l'élément, `font` null = police du socle. */
export interface SegmentStyle {
  readonly size: number;
  readonly bold: boolean;
  readonly italic: boolean;
  readonly underline: boolean;
  readonly font: string | null;
  readonly color: string | null;
}
export interface RichSegment {
  readonly text: string;
  readonly style: SegmentStyle;
  readonly x: number;
  readonly width: number;
}
export interface RichLine {
  readonly segments: readonly RichSegment[];
  readonly top: number;
  readonly height: number;
  /** Plus grande taille de la ligne (taille du `\n` ou de l'élément pour une ligne vide). */
  readonly size: number;
}

export const styleOf = (attrs: TextAttrs, base: { readonly size: number }): SegmentStyle => ({
  size: attrs.size ?? base.size,
  bold: attrs.bold === true,
  italic: attrs.italic === true,
  underline: attrs.underline === true,
  font: attrs.font ?? null,
  color: attrs.color ?? null,
});

const sameStyle = (a: SegmentStyle, b: SegmentStyle): boolean =>
  a.size === b.size && a.bold === b.bold && a.italic === b.italic && a.underline === b.underline && a.font === b.font && a.color === b.color;

/** Face mesurée et dessinée ; undefined pour le style du socle (même police, même mesure qu'au socle). */
export const faceOf = (s: SegmentStyle): Face | undefined =>
  s.bold || s.italic || s.font !== null ? { bold: s.bold, italic: s.italic, ...(s.font !== null ? { font: s.font } : {}) } : undefined;

interface Piece {
  readonly text: string;
  readonly style: SegmentStyle;
}

/** Concatène en fusionnant les voisins de même style (un seul segment sans attribut = une seule mesure, comme au socle). */
function append(pieces: readonly Piece[], more: readonly Piece[]): Piece[] {
  const out = [...pieces];
  for (const p of more) {
    if (p.text === "") continue;
    const last = out[out.length - 1];
    if (last && sameStyle(last.style, p.style)) out[out.length - 1] = { text: last.text + p.text, style: last.style };
    else out.push(p);
  }
  return out;
}

const textOf = (pieces: readonly Piece[]): string => pieces.map((p) => p.text).join("");

function trimEnd(pieces: readonly Piece[]): Piece[] {
  const out = [...pieces];
  for (let last = out[out.length - 1]; last; last = out[out.length - 1]) {
    const t = last.text.trimEnd();
    if (t !== "") {
      out[out.length - 1] = { text: t, style: last.style };
      break;
    }
    out.pop();
  }
  return out;
}

const widthOf = (pieces: readonly Piece[], measure: Measure): number =>
  pieces.reduce((w, p) => w + measure(p.text, p.style.size, faceOf(p.style)), 0);

const graphemePieces = (pieces: readonly Piece[]): Piece[] => pieces.flatMap((p) => graphemes(p.text).map((g) => ({ text: g, style: p.style })));

/** Morceaux de [a, b) (unités UTF-16 du paragraphe) ; les bornes tombent aux espaces, jamais dans une paire. */
function slicePieces(pieces: readonly Piece[], a: number, b: number): Piece[] {
  const out: Piece[] = [];
  let at = 0;
  for (const p of pieces) {
    const s = Math.max(a, at);
    const e = Math.min(b, at + p.text.length);
    if (s < e) out.push({ text: p.text.slice(s - at, e - at), style: p.style });
    at += p.text.length;
  }
  return out;
}

interface Paragraph {
  readonly pieces: readonly Piece[];
  /** Taille du `\n` qui termine le paragraphe ; null pour le dernier. */
  readonly end: number | null;
}

function paragraphs(spans: readonly TextSpan[], base: { readonly size: number }): Paragraph[] {
  const out: Paragraph[] = [];
  let current: Piece[] = [];
  for (const span of spans) {
    const style = styleOf(span.attrs, base);
    span.text.split("\n").forEach((part, i) => {
      if (i > 0) {
        out.push({ pieces: current, end: style.size });
        current = [];
      }
      current = append(current, [{ text: part, style }]);
    });
  }
  out.push({ pieces: current, end: null });
  return out;
}

/** La boucle de `layoutText` du socle, sur des morceaux stylés : mêmes coupures pour un seul segment sans attribut. */
function breakParagraph(pieces: readonly Piece[], boxWidth: number, measure: Measure): Piece[][] {
  const out: Piece[][] = [];
  let line: Piece[] = [];
  let at = 0;
  for (const token of textOf(pieces).split(/(\s+)/)) {
    const range = slicePieces(pieces, at, at + token.length);
    at += token.length;
    if (token === "") continue;
    const candidate = append(line, range);
    if (line.length === 0 || widthOf(trimEnd(candidate), measure) <= boxWidth) {
      line = candidate;
    } else {
      out.push(trimEnd(line));
      line = /^\s+$/.test(token) ? [] : range;
    }
    while (graphemePieces(trimEnd(line)).length > 1 && widthOf(trimEnd(line), measure) > boxWidth) {
      // par graphème (jamais au milieu d'un emoji) ; recherche dichotomique : la largeur croît avec le préfixe
      const points = graphemePieces(line);
      let lo = 1;
      let hi = points.length - 1;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (widthOf(append([], points.slice(0, mid)), measure) > boxWidth) hi = mid - 1;
        else lo = mid;
      }
      out.push(append([], points.slice(0, lo)));
      line = append([], points.slice(lo));
    }
  }
  out.push(trimEnd(line));
  return out;
}

function toLine(pieces: readonly Piece[], top: number, emptySize: number, measure: Measure): RichLine {
  let x = 0;
  const segments = pieces.map((p): RichSegment => {
    const width = measure(p.text, p.style.size, faceOf(p.style));
    const s = { text: p.text, style: p.style, x, width };
    x += width;
    return s;
  });
  const size = pieces.length === 0 ? emptySize : Math.max(...pieces.map((p) => p.style.size));
  return { segments, top, height: size * TEXT_LINE_HEIGHT, size };
}

/** Lignes d'un texte riche (T9) : hauteur = plus grande taille × 1,25 ; ligne vide = taille du `\n`, sinon de l'élément. */
export function layoutRich(spans: readonly TextSpan[], base: { readonly size: number }, boxWidth: number, measure: Measure): RichLine[] {
  const lines: RichLine[] = [];
  let top = 0;
  for (const para of paragraphs(spans, base)) {
    const broken = breakParagraph(para.pieces, boxWidth, measure);
    broken.forEach((pieces, i) => {
      const empty = i === broken.length - 1 && para.end !== null ? para.end : base.size;
      const line = toLine(pieces, top, empty, measure);
      lines.push(line);
      top += line.height;
    });
  }
  return lines;
}

export function layoutText(content: string, size: number, boxWidth: number, measure: Measure): string[] {
  return layoutRich([{ text: content, attrs: {} }], { size }, boxWidth, measure).map((l) => l.segments.map((s) => s.text).join(""));
}

export const textBoxHeight = (lines: number, size: number): number => Math.max(1, lines) * size * TEXT_LINE_HEIGHT;

/** Hauteur de boîte d'un texte riche : somme des lignes (au moins une, `layoutRich` en rend toujours une). */
export const richBoxHeight = (lines: readonly RichLine[]): number => lines.reduce((h, l) => h + l.height, 0);
```

- [ ] **Étape 4 : voir vert** — la commande de « Test et commande bornée » ; attendu `Tests  15 passed (15)`.

- [ ] **Étape 5 : commits**

```bash
cd "$WT" && git add apps/web/src/engine/text-layout.ts && git add apps/web/src/engine/text-layout.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): layoutRich, one line layout for rich text spans" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t6"></a>
### Tâche T6 — Liaison Wasm `format_text` et scénarios du cœur

**Objectif.** Exposer `FormatText` à la page (`format_text`, patch lu par `serde-wasm-bindgen`, `null` = retrait, clé
inconnue ou mauvais type = `BadFormat`) avec une méthode `_inner` testée en natif ; jouer S2 (aller-retour
`.roomboard`) dans `tests/scenarios.rs` et S3 (texte du socle en un segment) dans `tests/compat_socle.rs`.

**Fichiers.**
- Modifier : `crates/roomboard-wasm/src/lib.rs` (imports `:4-17`, types après `asset_ref` `:92-100`, `format_text` après `transform` `:318-320`, `format_text_inner` après `transform_inner` `:559-567`, tests en fin de module)
- Modifier : `crates/roomboard-core/tests/scenarios.rs` (imports, test en fin)
- Modifier : `crates/roomboard-core/tests/compat_socle.rs` (imports, test en fin)

**Interfaces.**
- Consomme (T3) : `Command::FormatText { id, start, len, attrs: Vec<TextAttr>, box_height: Option<f64> }`, `CommandError::BadFormat`, `TextView.spans` ; (T1) `roomboard_core::rich_text::{TextAttr, SpanAttrs, TextSpanView}`.
- Réutilise : `crates/roomboard-wasm/src/lib.rs:290` (`set_text`), `:535` (`set_text_inner`), `:25` (`to_js`), `:34` (`cmd_err`) — même patron pour `format_text` et `format_text_inner` (fichier touché).
- Réutilise : `crates/roomboard-core/tests/compat_socle.rs:91` — `fn socle_bytes() -> Vec<u8>` (fixture `tests/fixtures/socle-v1.roomboard`, aucune seconde fixture).
- Produit (lu par T9, signature vue dans `roomboard_wasm.d.ts`) : `Document.format_text(id: &str, start: u32, len: u32, attrs: JsValue, box_height: Option<f64>) -> Result<JsValue, JsError>` ; `Document::format_text_inner(&mut self, id: &str, start: u32, len: u32, attrs: Vec<TextAttr>, box_height: Option<f64>) -> Result<Change, CommandError>` ; `pub enum WireValue { Bool(bool), Number(f64), Text(String) }` ; `pub fn wire_attrs(patch: BTreeMap<String, Option<WireValue>>) -> Result<Vec<TextAttr>, CommandError>`.

**Test et commande bornée.**
- `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-wasm 2>&1 | grep -E "^test |test result" | tail -20` — attendu : `wire_attrs_maps_values_and_refuses_bad_ones ... ok`, `format_text_inner_formats_and_reads_spans ... ok`, `set_text_inner_creates_and_removes ... ok` (à garder vert), `test result: ok`.
- `cargo test -p roomboard-core --test scenarios 2>&1 | grep -E "^test |test result" | tail -20` — attendu : `s2_rich_text_survives_save_load ... ok`, `s3_text_stroke_shape_survive_save_load ... ok`.
- `cargo test -p roomboard-core --test compat_socle 2>&1 | grep -E "^test |test result" | tail -20` — attendu : 3 tests `ok` dont `socle_fixture_text_is_one_plain_span`.
- `cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -3` — attendu : `Finished`, aucun `error`.

**Preuve visuelle.** Aucune.

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord ; aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH et dossier `$WT`.
- G3 Preuve bornée Rust.
- G4 Aucune dépendance ajoutée (`serde`, `serde-wasm-bindgen` déjà dans `crates/roomboard-wasm/Cargo.toml`).
- G5 Aucun build Tauri ni Android (le build `wasm32` de la liaison est permis).
- G6 `cargo fmt --all --check` et `cargo clippy --workspace --all-targets -- -D warnings` propres.
- G7 Commits un fichier par `git add`, auteur `jejeasterix`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G8 Ne pas lancer `wasm-bindgen` ni écrire dans `apps/web/src/wasm/` (T9).
- G10 La fixture du socle est lue, jamais régénérée.
- G11 `format_text` après `transform`, `format_text_inner` après `transform_inner`, tests en fin de module et de fichier.
- G12 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :` (2 lignes).
- G14 Test sur délai rejoué une fois.

**Patron à ne pas reprendre.** Lire `attrs` en `HashMap<String, WireValue>` sans `Option` (un `null` deviendrait une
erreur au lieu d'un retrait), ou faire confiance à la page pour les types (une chaîne pour `bold` doit donner
`BadFormat`, contrôle 1 de T7). Chemins de référence : `crates/roomboard-wasm/src/lib.rs:290-316` (`set_text`) et
`:535-557` (`set_text_inner`, seule méthode testée en natif) ; `docs/plans/usage-c7-texte-riche-cadrage.md:72`.

**Interdits.** Aucun changement de signature de `set_text` ou `set_text_inner`. Pas de lecture de `attrs` dans le cœur
(la conversion vit dans la liaison).

**Terminé quand.** Les quatre commandes passent, `fmt` et `clippy` propres, commits faits, rapport avec 2 lignes `Réutilisation :`.

**Étapes.**

- [ ] **Étape 1 : tests de la liaison (rouges)** — en fin du module `tests` de `crates/roomboard-wasm/src/lib.rs` :

```rust
    fn patch(pairs: Vec<(&str, Option<WireValue>)>) -> BTreeMap<String, Option<WireValue>> {
        pairs.into_iter().map(|(k, v)| (k.to_string(), v)).collect()
    }

    /// T7 : `null` (None) et `false` retirent ; clé inconnue ou valeur au mauvais type : `BadFormat`.
    #[test]
    fn wire_attrs_maps_values_and_refuses_bad_ones() {
        assert_eq!(
            wire_attrs(patch(vec![
                ("bold", Some(WireValue::Bool(true))),
                ("color", None),
                ("size", Some(WireValue::Number(72.0))),
            ])),
            Ok(vec![
                TextAttr::Bold(true),
                TextAttr::Color(None),
                TextAttr::Size(Some(72.0))
            ])
        );
        assert_eq!(
            wire_attrs(patch(vec![
                ("bold", None),
                ("font", Some(WireValue::Text("Georgia".into()))),
                ("italic", Some(WireValue::Bool(false))),
            ])),
            Ok(vec![
                TextAttr::Bold(false),
                TextAttr::Font(Some("Georgia".into())),
                TextAttr::Italic(false)
            ])
        );
        for bad in [
            ("href", Some(WireValue::Text("x".into()))),
            ("bold", Some(WireValue::Text("oui".into()))),
            ("size", Some(WireValue::Text("72".into()))),
            ("color", Some(WireValue::Number(5.0))),
        ] {
            assert_eq!(wire_attrs(patch(vec![bad])), Err(CommandError::BadFormat));
        }
    }

    #[test]
    fn format_text_inner_formats_and_reads_spans() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = d
            .set_text_inner(
                &p,
                None,
                [100.0, 200.0],
                "Le chat noir",
                "#000000",
                36.0,
                [600.0, 45.0],
            )
            .expect("texte")
            .ids[0]
            .clone();
        let red = vec![TextAttr::Color(Some("#ff0000".into()))];
        let c = d
            .format_text_inner(&id, 3, 4, red, Some(60.0))
            .expect("format");
        assert_eq!(c.ids, vec![id.clone()]);
        let t = d.core.element(&id).and_then(|e| e.text).expect("texte");
        assert_eq!(t.box_height, 60.0);
        let texts: Vec<&str> = t.spans.iter().map(|s| s.text.as_str()).collect();
        assert_eq!(texts, vec!["Le ", "chat", " noir"]);
        assert_eq!(t.spans[1].attrs.color.as_deref(), Some("#ff0000"));
        assert_eq!(
            d.format_text_inner("absent", 0, 1, vec![TextAttr::Bold(true)], None),
            Err(CommandError::UnknownElement("absent".into()))
        );
    }
```

- [ ] **Étape 2 : voir rouge** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-wasm format_text 2>&1 | grep -E "error\[|test result" | tail -5`
  — attendu : `error[E0412]` / `error[E0425]` (`WireValue`, `wire_attrs`, `format_text_inner` absents).

- [ ] **Étape 3 : liaison** — dans `crates/roomboard-wasm/src/lib.rs` :
  - imports : `use std::collections::BTreeMap;` (sous `use std::fmt::Display;`) et `use roomboard_core::rich_text::TextAttr;`
  - après la fonction `asset_ref` :

```rust
/// Valeur d'un patch `FormatText` venue de la page (C7, T7) ; `null` arrive en `None` (retrait).
#[derive(Debug, Clone, PartialEq, serde::Deserialize)]
#[serde(untagged)]
pub enum WireValue {
    Bool(bool),
    Number(f64),
    Text(String),
}

/// Patch de la page → entrées du cœur (contrôle 1 de T7) : clé inconnue ou valeur au mauvais type : `BadFormat`. Les
/// valeurs hors domaine (couleur, police, taille) sont refusées ensuite par le cœur (`valid_attrs`).
pub fn wire_attrs(
    patch: BTreeMap<String, Option<WireValue>>,
) -> Result<Vec<TextAttr>, CommandError> {
    patch
        .into_iter()
        .map(|(k, v)| {
            Ok(match (k.as_str(), v) {
                ("bold", None) => TextAttr::Bold(false),
                ("bold", Some(WireValue::Bool(b))) => TextAttr::Bold(b),
                ("italic", None) => TextAttr::Italic(false),
                ("italic", Some(WireValue::Bool(b))) => TextAttr::Italic(b),
                ("underline", None) => TextAttr::Underline(false),
                ("underline", Some(WireValue::Bool(b))) => TextAttr::Underline(b),
                ("color", None) => TextAttr::Color(None),
                ("color", Some(WireValue::Text(s))) => TextAttr::Color(Some(s)),
                ("size", None) => TextAttr::Size(None),
                ("size", Some(WireValue::Number(n))) => TextAttr::Size(Some(n as f32)),
                ("font", None) => TextAttr::Font(None),
                ("font", Some(WireValue::Text(s))) => TextAttr::Font(Some(s)),
                _ => return Err(CommandError::BadFormat),
            })
        })
        .collect()
}
```

  - dans le bloc `#[wasm_bindgen] impl Document`, juste après `transform` :

```rust
    /// C7 : `attrs` = patch `TextAttrsPatch` sans clé `undefined` (retirées par `wasm-core.ts`, T7) ; `null` = retrait ;
    /// `start`, `len` en unités UTF-16 du contenu.
    pub fn format_text(
        &mut self,
        id: &str,
        start: u32,
        len: u32,
        attrs: JsValue,
        box_height: Option<f64>,
    ) -> Result<JsValue, JsError> {
        let patch: BTreeMap<String, Option<WireValue>> =
            serde_wasm_bindgen::from_value(attrs).map_err(|_| cmd_err(CommandError::BadFormat))?;
        let attrs = wire_attrs(patch).map_err(cmd_err)?;
        to_js(
            &self
                .format_text_inner(id, start, len, attrs, box_height)
                .map_err(cmd_err)?,
        )
    }
```

  - dans le bloc `impl Document` sans `wasm_bindgen` (celui de `set_text_inner`), juste après `transform_inner` :

```rust
    pub fn format_text_inner(
        &mut self,
        id: &str,
        start: u32,
        len: u32,
        attrs: Vec<TextAttr>,
        box_height: Option<f64>,
    ) -> Result<Change, CommandError> {
        self.run(Command::FormatText {
            id: id.to_string(),
            start,
            len,
            attrs,
            box_height,
        })
    }
```

- [ ] **Étape 4 : voir vert (liaison)** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo test -p roomboard-wasm 2>&1 | grep -E "^test |test result" | tail -20` ; attendu : les deux tests neufs et `set_text_inner_creates_and_removes` `ok`.

- [ ] **Étape 5 : scénarios du cœur** — en fin de `crates/roomboard-core/tests/scenarios.rs` (import ajouté en tête :
  `use roomboard_core::rich_text::TextAttr;`) :

```rust
/// S2 (C7) : six plages (gras, italique, souligné, couleur, taille 72, police « Georgia ») ; enregistrer, recharger :
/// mêmes segments, même contenu ; réenregistrer : mêmes octets.
#[test]
fn s2_rich_text_survives_save_load() {
    let mut d = Document::blank();
    let p = d.page_ids()[0].clone();
    let t = d
        .apply(Command::SetText {
            page: p,
            id: None,
            x: 100.0,
            y: 100.0,
            content: "aa bb cc dd ee ff".into(),
            color: "#000000".into(),
            size: 36.0,
            box_width: 600.0,
            box_height: 90.0,
        })
        .expect("texte")
        .ids[0]
        .clone();
    let patches = [
        TextAttr::Bold(true),
        TextAttr::Italic(true),
        TextAttr::Underline(true),
        TextAttr::Color(Some("#ff0000".into())),
        TextAttr::Size(Some(72.0)),
        TextAttr::Font(Some("Georgia".into())),
    ];
    for (i, a) in patches.into_iter().enumerate() {
        d.apply(Command::FormatText {
            id: t.clone(),
            start: 3 * i as u32,
            len: 2,
            attrs: vec![a],
            box_height: None,
        })
        .expect("format");
    }
    let before = d.element(&t).and_then(|e| e.text).expect("vue");
    assert_eq!(before.spans.len(), 11);
    let file = save(&d, &meta()).expect("save");
    let r = load(&file).expect("load");
    let after = r.element(&t).and_then(|e| e.text).expect("vue rechargée");
    assert_eq!(after.spans, before.spans);
    assert_eq!(after.content, "aa bb cc dd ee ff");
    assert!(
        save(&r, &meta()).expect("resave") == file,
        "réenregistrer change les octets"
    );
}
```

  en fin de `crates/roomboard-core/tests/compat_socle.rs` (import ajouté : `use roomboard_core::rich_text::{SpanAttrs, TextSpanView};`) :

```rust
/// S3 (C7, T12) : le texte du socle (troisième élément de la première page) est un seul segment sans attribut.
#[test]
fn socle_fixture_text_is_one_plain_span() {
    let doc = load(&socle_bytes()).expect("load");
    let p = doc.page_ids()[0].clone();
    let id = doc.element_ids(&p)[2].clone();
    let t = doc.element(&id).and_then(|e| e.text).expect("texte du socle");
    assert_eq!(
        t.spans,
        vec![TextSpanView {
            text: "Bonjour RoomBoard".into(),
            attrs: SpanAttrs::default()
        }]
    );
}
```

  Ces deux tests passent dès qu'ils compilent (T3 est fusionnée) : leur rouge est le constat qu'ils ne compilaient pas
  avant T1 et T3 ; le dire au rapport.

- [ ] **Étape 6 : voir vert, build wasm32, lint** — les commandes de « Test et commande bornée », puis
  `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && cargo fmt --all && cargo fmt --all --check && cargo clippy --workspace --all-targets -- -D warnings 2>&1 | tail -3`.

- [ ] **Étape 7 : commits**

```bash
cd "$WT" && git add crates/roomboard-wasm/src/lib.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(wasm): format_text binding with null-as-removal patch" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" && \
git add crates/roomboard-core/tests/scenarios.rs && git add crates/roomboard-core/tests/compat_socle.rs && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "test(core): rich text save/load round trip and plain socle text span" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t7"></a>
### Tâche T7 — Rendu Canvas 2D par segments, `FakeCtx` partagé

**Objectif.** `paintText` dessine les `RichLine` de `layoutRich` : un `fillText` par segment, police
`[italic ][bold ]<taille>px <famille>`, couleur du segment (sinon de l'élément), ligne de base alignée
(`(tailleMax − taille) × 0,8`), souligné en trait plein (`y + taille × 0,92`, épaisseur `taille / 16`) ; une ligne
d'une seule taille est dessinée exactement comme au socle (T10). Clé du cache des lignes étendue aux segments. Le
`FakeCtx` des tests sort dans `engine/render/fake-ctx.ts` (servira aussi au test de S3, T9) et note chaque `fillText`.

**Fichiers.**
- Créer : `apps/web/src/engine/render/fake-ctx.ts`
- Modifier : `apps/web/src/engine/render/canvas2d.ts` (imports `:6`, `:10`, `paintText` `:88-94`, `textLines` `:98-99`, aiguillage `:159-160`, `linesOf` `:240-247`)
- Modifier : `apps/web/src/engine/render/canvas2d.test.ts` (`FakeCtx` `:10-55` retiré, import, littéral `:194`, bloc neuf en fin)

**Interfaces.**
- Consomme (T5) : `layoutRich`, `measureWith`, `textFont`, `faceOf`, `type RichLine` de `../text-layout` ; (T2) `TextData.spans`, type `TextElement`.
- Réutilise : `apps/web/src/engine/render/canvas2d.ts:89` (`paintText`), `:240` (`linesOf`) — étendus : `paintText(ctx, lines: readonly RichLine[], color: string)` (fichier touché).
- Réutilise : `apps/web/src/engine/render/canvas2d.test.ts:10-55` (`FakeCtx`, `asCtx`) — déplacés (pas copiés) dans `engine/render/fake-ctx.ts`, comme `fake-gl.ts`.
- Produit (lu par T9) : `export class FakeCtx` (mêmes membres qu'aujourd'hui, plus `readonly texts: DrawnText[]`) ; `export interface DrawnText { readonly text: string; readonly x: number; readonly y: number; readonly font: string; readonly fill: string; readonly baseline: string }` ; `export const asCtx = (f: FakeCtx): CanvasRenderingContext2D` ; constantes `BASELINE_SHIFT = 0.8`, `UNDERLINE_OFFSET = 0.92` exportées de `canvas2d.ts`.

**Test et commande bornée.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts --reporter=verbose 2>&1 | grep -E "✓|×|FAIL|Tests " | tail -20`
— attendu : 3 tests « C7 » `✓` ; « texte : une ligne par fillText, interligne 1,25, police à la taille »
(`canvas2d.test.ts:243`) et « texte : lignes en cache par id » (`:276`) restent verts ; 0 échec.

**Preuve visuelle.** Aucune automatique (profil : « Aucune automatique pour l'instant ») ; pas de lecture `-Lire`
possible. Les coefficients de HC7-5 (0,8 ; 0,92 ; 1/16) sont à juger à la porte visuelle de fin de lot : le rapport le
signale à l'orchestrateur, qui la porte dans l'état.

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord ; aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH et dossier `$WT` ; G16 `pnpm install --frozen-lockfile`.
- G3 Preuve bornée TS (`exec vitest run … --reporter=verbose`) ; jamais `pnpm --filter @roomboard/web test -- <fichier>`.
- G4 Aucune dépendance ajoutée ; aucune police embarquée en plus d'Atkinson (D27).
- G5 Aucun build Tauri ni Android.
- G7 Commits un fichier par `git add`, auteur `jejeasterix`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G9 Hors périmètre : C7b ; `webgl2.ts` (l'encre seule) inchangé.
- G11 Bloc `describe` neuf en fin de `canvas2d.test.ts`.
- G12 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :` (2 lignes).
- G13 `tsc` reste rouge ailleurs : attendu.
- G14 Test sur délai rejoué une fois.

**Interdits.** Changer le format du journal existant de `FakeCtx` (`fillText <texte> <x>,<y>`, `fillRect <couleur>`) :
les tests existants en dépendent. Copier `FakeCtx` au lieu de le déplacer.

**Terminé quand.** Tests verts, commits faits, rapport avec 2 lignes `Réutilisation :` et la mention de la porte visuelle HC7-5.

**Étapes.**

- [ ] **Étape 1 : sortir `FakeCtx`** — créer `apps/web/src/engine/render/fake-ctx.ts` (la classe des lignes 10-44 de
  `canvas2d.test.ts`, inchangée sauf `fillText`, qui note aussi dans `texts`) :

```ts
// Faux contexte 2D des tests (sorti de `canvas2d.test.ts`, comme `fake-gl.ts`) : journal des appels, `measureText` à
// 10 unités par caractère ; `texts` note chaque fillText avec la police, la couleur et la ligne de base du moment.
export interface DrawnText {
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly font: string;
  readonly fill: string;
  readonly baseline: string;
}

export class FakeCtx {
  readonly canvas = { width: 0, height: 0 };
  readonly log: string[] = [];
  fillStyle = "";
  strokeStyle = "";
  lineWidth = 1;
  lineCap = "butt";
  lineJoin = "miter";
  save(): void { this.log.push("save"); }
  restore(): void { this.log.push("restore"); }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push(`setTransform ${[a, b, c, d, e, f].map((v) => +v.toFixed(4)).join(",")}`);
  }
  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.log.push(`transform ${[a, b, c, d, e, f].join(",")}`);
  }
  clearRect(): void { this.log.push("clearRect"); }
  readonly rects: number[][] = [];
  fillRect(x = 0, y = 0, w = 0, h = 0): void { this.rects.push([x, y, w, h]); this.log.push(`fillRect ${this.fillStyle}`); }
  beginPath(): void { this.log.push("beginPath"); }
  moveTo(): void { this.log.push("moveTo"); }
  lineTo(): void { this.log.push("lineTo"); }
  closePath(): void { this.log.push("closePath"); }
  rect(): void { this.log.push("rect"); }
  clip(): void { this.log.push("clip"); }
  fill(): void { this.log.push(`fill ${this.fillStyle}`); }
  stroke(): void { this.log.push(`stroke ${this.strokeStyle} ${this.lineWidth}`); }
  font = "";
  textBaseline = "alphabetic";
  ellipse(): void { this.log.push("ellipse"); }
  readonly texts: DrawnText[] = [];
  fillText(text: string, x: number, y: number): void {
    this.log.push(`fillText ${text} ${x},${y}`);
    this.texts.push({ text, x, y, font: this.font, fill: this.fillStyle, baseline: this.textBaseline });
  }
  measures = 0;
  measureText(text: string): { width: number } { this.measures++; return { width: text.length * 10 }; }
  setLineDash(d: number[]): void { this.log.push(`setLineDash ${d.join(",")}`); }
}

export const asCtx = (f: FakeCtx): CanvasRenderingContext2D => f as unknown as CanvasRenderingContext2D;
```

  Dans `canvas2d.test.ts`, supprimer la classe `FakeCtx` et la constante `asCtx`, et ajouter
  `import { asCtx, FakeCtx } from "./fake-ctx";`. Le littéral `t` de `VIEWS` (`:194`) gagne
  `spans: [{ text: "un deux\ntrois", attrs: {} }]` dans `text`. Commande :
  `pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts 2>&1 | tail -5` — attendu : tous verts (déplacement sans effet).

- [ ] **Étape 2 : tests C7 (rouges)** — import ajouté : `import type { ElementView, TextElement } from "../../core/api";`
  (remplace l'import de `ElementView`) ; en fin de `canvas2d.test.ts` :

```ts
const RICH: TextElement = {
  id: "rt",
  kind: "text",
  transform: [1, 0, 0, 1, 0, 0],
  style: { color: "#000000", width: 0 },
  text: {
    content: "Le chat noir",
    size: 36,
    boxWidth: 1000,
    boxHeight: 60,
    spans: [{ text: "Le ", attrs: {} }, { text: "chat", attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } }, { text: " noir", attrs: {} }],
  },
};

describe("Canvas2DRenderer — C7 (texte par segments)", () => {
  const draw = (view: ElementView): FakeCtx => {
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: (id) => (id === view.id ? view : null), outline: () => null });
    r.drawScene({ id: "p", elementIds: [view.id] }, IDENTITY, new Set());
    return scene;
  };

  it("S5 : un fillText par segment, police et couleur du segment, ligne de base alignée, souligné sous « chat »", () => {
    const scene = draw(RICH);
    const [le, chat, noir] = scene.texts;
    expect(le).toMatchObject({ text: "Le ", x: 0, font: '36px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" });
    expect(le?.y).toBeCloseTo(9.6);
    expect(chat).toEqual({ text: "chat", x: 30, y: 0, font: 'bold 48px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#ff0000", baseline: "top" });
    expect(noir).toMatchObject({ text: " noir", x: 70, fill: "#000000" });
    const underline = scene.rects.at(-1) ?? [];
    expect(underline[0]).toBe(30);
    expect(underline[1]).toBeCloseTo(44.16);
    expect(underline[2]).toBe(40);
    expect(underline[3]).toBe(3);
    expect(scene.log.filter((l) => l === "fillRect #ff0000")).toHaveLength(1);
  });

  it("une ligne d'une seule taille est dessinée comme au socle : même police, même y, aucun souligné", () => {
    const t = VIEWS["t"];
    if (!t) throw new Error("vue t");
    const scene = draw(t);
    expect(scene.texts).toEqual([
      { text: "un deux", x: 0, y: 0, font: '20px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" },
      { text: "trois", x: 0, y: 25, font: '20px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" },
    ]);
    const tail = scene.log.slice(scene.log.indexOf("transform 1,0,0,1,0,0"));
    expect(tail.some((l) => l.startsWith("fillRect"))).toBe(false);
  });

  it("cache : un changement de segments seul refait la mise en lignes", () => {
    let view: TextElement = RICH;
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: () => view, outline: () => null });
    const page = { id: "p", elementIds: ["rt"] };
    r.drawScene(page, IDENTITY, new Set());
    const first = scene.measures;
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBe(first);
    view = { ...RICH, text: { ...RICH.text, spans: [{ text: "Le chat noir", attrs: {} }] } };
    r.drawScene(page, IDENTITY, new Set());
    expect(scene.measures).toBeGreaterThan(first);
  });
});
```

  Commande : `pnpm --filter @roomboard/web exec vitest run src/engine/render/canvas2d.test.ts 2>&1 | grep -E "FAIL|Tests " | tail -8` — attendu : les 3 tests « C7 » en échec.

- [ ] **Étape 3 : rendu par segments** — dans `canvas2d.ts` :
  - ligne 6 (import des types de `../../core/api`) : inchangée (`TextData` reste utilisé par `linesOf`) ;
  - ligne 10 devient `import { faceOf, layoutRich, measureWith, textFont, type RichLine } from "../text-layout";`
  - remplacer `paintText` (`:88-94`) par :

```ts
/** Décalage de ligne de base d'un segment plus petit que sa ligne, position et épaisseur du souligné (HC7-5). */
export const BASELINE_SHIFT = 0.8;
export const UNDERLINE_OFFSET = 0.92;

/**
 * Texte (D14, CL4-4, C7) : mêmes lignes que la hauteur de boîte mesurée par l'outil (`layoutRich`) ; un fillText par
 * segment ; une ligne d'une seule taille est dessinée comme au socle (même police, `y` = haut de la ligne).
 */
function paintText(ctx: CanvasRenderingContext2D, lines: readonly RichLine[], color: string): void {
  ctx.textBaseline = "top";
  for (const line of lines) {
    for (const s of line.segments) {
      const st = s.style;
      const y = st.size === line.size ? line.top : line.top + (line.size - st.size) * BASELINE_SHIFT;
      ctx.font = textFont(st.size, faceOf(st));
      ctx.fillStyle = st.color ?? color;
      ctx.fillText(s.text, s.x, y);
      if (st.underline) ctx.fillRect(s.x, y + st.size * UNDERLINE_OFFSET, s.width, st.size / 16);
    }
  }
}
```

  - `textLines` : `private readonly textLines = new Map<string, { readonly key: string; readonly lines: readonly RichLine[] }>();`
    et son commentaire devient « Lignes des textes par id (clé : taille, largeur de boîte, segments), invalidées par `Change` comme `paths`. »
  - aiguillage `text` de `paintElement` : `paintText(ctx, this.linesOf(ctx, el.id, el.text), el.style.color);`
  - `linesOf` devient :

```ts
  private linesOf(ctx: CanvasRenderingContext2D, id: string, t: TextData): readonly RichLine[] {
    const key = `${t.size}|${t.boxWidth}|${JSON.stringify(t.spans)}`;
    const cached = this.textLines.get(id);
    if (cached && cached.key === key) return cached.lines;
    const lines = layoutRich(t.spans, { size: t.size }, t.boxWidth, measureWith(ctx));
    this.textLines.set(id, { key, lines });
    return lines;
  }
```

  Si `TEXT_LINE_HEIGHT` ou `layoutText` ne sont plus utilisés dans `canvas2d.ts`, les retirer de l'import.

- [ ] **Étape 4 : voir vert** — la commande de « Test et commande bornée » ; attendu : 0 échec, 3 tests « C7 » `✓`.

- [ ] **Étape 5 : commits**

```bash
cd "$WT" && git add apps/web/src/engine/render/fake-ctx.ts && git add apps/web/src/engine/render/canvas2d.ts && \
git add apps/web/src/engine/render/canvas2d.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): paint text by spans with aligned baselines and underline" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t8"></a>
### Tâche T8 — Outil Texte : hauteur sur les segments prévus

**Objectif.** À la validation, l'outil Texte calcule la hauteur de boîte avec `layoutRich` sur les segments prévus après
l'édition (`editSpans(session.spans, content)`, même règle que le cœur, T11) ; une boîte neuve part d'un segment sans
attribut (hauteur identique au socle). Le `<textarea>` reste brut (C7b).

**Fichiers.**
- Modifier : `apps/web/src/engine/tools/text.ts` (en-tête `:1-6`, imports `:7-10`, `TextEditSession` `:19-29`, `commit` `:69`, `open` `:102-115`)
- Modifier : `apps/web/src/engine/tools/text.test.ts` (test neuf en fin du `describe`)
- Modifier : `apps/web/src/app/text-editor.test.ts` (littéral `session` `:62-64` : champ `spans`, pour `tsc`)

**Interfaces.**
- Consomme (T2) : `editSpans`, `plainSpans` de `../../core/rich-text`, type `TextSpan` ; (T4) `fakeCore` qui accepte `FormatText` ; (T5) `layoutRich`, `richBoxHeight`.
- Réutilise : `apps/web/src/engine/tools/text.ts:69` — la hauteur devient `richBoxHeight(layoutRich(editSpans(s.spans, content), { size: s.size }, s.boxWidth, measure))` (fichier touché).
- Produit : `TextEditSession.spans: readonly TextSpan[]` (segments à l'ouverture).

**Test et commande bornée.** `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm --filter @roomboard/web exec vitest run src/engine/tools/text.test.ts src/app/text-editor.test.ts --reporter=verbose 2>&1 | grep -E "texte riche|hauteur|×|FAIL|Tests " | tail -20`
— attendu : « texte riche rouvert : la hauteur suit les segments prévus après l'édition (S5) » `✓` ; « validation : une
SetText avec la hauteur mesurée » et « hauteur sur plusieurs lignes » (`tools/text.test.ts:73-88`) verts ;
`text-editor.test.ts:148` vert ; 0 échec.

**Preuve visuelle.** Aucune (le `<textarea>` ne change pas).

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord ; aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH et dossier `$WT` ; G16 `pnpm install --frozen-lockfile`.
- G3 Preuve bornée TS (`exec vitest run … --reporter=verbose`) ; jamais `pnpm --filter @roomboard/web test -- <fichier>`.
- G4 Aucune dépendance ajoutée.
- G7 Commits un fichier par `git add`, auteur `jejeasterix`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- G9 Hors périmètre : C7b ; `apps/web/src/app/text-editor.ts` inchangé.
- G11 Test neuf en fin du `describe` de `tools/text.test.ts`.
- G12 Rapport : une ligne `Réutilisation : …` (1 ligne).
- G13 `tsc` reste rouge (`wasm-core.ts`, T9) : attendu.
- G14 Test sur délai rejoué une fois.

**Interdits.** Toucher `app/text-editor.ts`, `text-layout.ts`, `rich-text.ts`. Recalculer la hauteur sur le contenu brut
(`layoutText`) : un texte riche aurait une boîte trop basse.

**Terminé quand.** Tests verts, commit fait, rapport avec 1 ligne `Réutilisation :`.

**Étapes.**

- [ ] **Étape 1 : test (rouge)** — en fin du `describe("outil Texte (D14, CL4-3 à CL4-6)")` de `tools/text.test.ts` :

```ts
  it("texte riche rouvert : la hauteur suit les segments prévus après l'édition (S5)", () => {
    const { doc, page, host, tool, runs, click } = setup();
    const id = doc.apply({ type: "SetText", page, id: null, x: 100, y: 200, content: "Le chat noir", color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 }).ids[0] ?? "";
    doc.apply({ type: "FormatText", id, start: 3, len: 4, attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } });
    click(150, 210);
    expect(tool.editing()?.spans).toEqual([
      { text: "Le ", attrs: {} },
      { text: "chat", attrs: { size: 48, bold: true, underline: true, color: "#ff0000" } },
      { text: " noir", attrs: {} },
    ]);
    host.text = "Le gros chat noir";
    tool.requestCommit();
    expect(runs.at(-1)).toMatchObject({ type: "SetText", id, content: "Le gros chat noir", boxHeight: 60 });
  });
```

  Dans `app/text-editor.test.ts:62-64`, le littéral `session` gagne `spans: [{ text: "Bonjour", attrs: {} }],`.
  Commande : `pnpm install --frozen-lockfile >/dev/null && pnpm --filter @roomboard/web exec vitest run src/engine/tools/text.test.ts 2>&1 | grep -E "FAIL|Tests " | tail -5`
  — attendu : « texte riche rouvert » en échec (`spans` absent, `boxHeight` 45).

- [ ] **Étape 2 : implémentation** — dans `tools/text.ts` :
  - en-tête, `validation, hauteur mesurée par \`layoutText\`.` devient `validation, hauteur mesurée par \`layoutRich\` sur les segments prévus après l'édition (C7, T11).`
  - imports : `import type { Matrix, TextSpan } from "../../core/api";`, `import { editSpans, plainSpans } from "../../core/rich-text";`,
    `import { DEFAULT_TEXT_BOX_WIDTH, layoutRich, richBoxHeight, type Measure } from "../text-layout";`
  - `TextEditSession`, après `readonly initial: string;` :

```ts
  /** Segments à l'ouverture (C7, T11) : la hauteur prévoit ceux d'après l'édition ; boîte neuve : un segment vide. */
  readonly spans: readonly TextSpan[];
```

  - `commit`, la ligne de `boxHeight` devient :

```ts
    const boxHeight = richBoxHeight(layoutRich(editSpans(s.spans, content), { size: s.size }, s.boxWidth, measure));
```

  - `open`, texte touché : ajouter `spans: el.text.spans,` après `initial: el.text.content,` ; boîte neuve : l'objet devient
    `{ page, id: null, matrix: [1, 0, 0, 1, x, y], boxWidth: DEFAULT_TEXT_BOX_WIDTH, color: st.color, size: st.size, initial: "", spans: plainSpans("") }`.

- [ ] **Étape 3 : voir vert** — la commande de « Test et commande bornée » ; attendu : 0 échec.

- [ ] **Étape 4 : commits**

```bash
cd "$WT" && git add apps/web/src/engine/tools/text.ts && git add apps/web/src/engine/tools/text.test.ts && \
git add apps/web/src/app/text-editor.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): text tool measures box height on predicted spans" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

<a id="tache-t9"></a>
### Tâche T9 — Adaptateur Wasm TS et contrat C7 sur le vrai module

**Objectif.** Brancher `FormatText` dans `wasm-core.ts` (clés `undefined` retirées, bornes hors `u32` portées à
`u32::MAX`), contrôler `spans` dans `toElementView` (T8), puis jouer S2, S4 et S1 sur les deux cœurs et S3 (rendu du
texte du socle par le vrai module) ; construire le module, rendre `tsc` vert, passer `scripts/verifier.sh` et relever la
taille du module (HC7-7).

**Fichiers.**
- Modifier : `apps/web/src/core/wasm-core.ts` (imports `:4-20`, `toElementView` `case "text"` `:77-86`, `apply` fin du `switch` `:188-192`)
- Modifier : `apps/web/src/core/wasm-core.contract.test.ts` (imports `:4-7`, un `it` dans le bloc « contrat du vrai module wasm » après « fichier du socle » `:791-797`, deux blocs neufs en fin de fichier)

**Interfaces.**
- Consomme : (T2) `cleanPatch`, types `TextAttrs`, `TextAttrsPatch`, `TextSpan` ; (T4) faux cœur `FormatText` ; (T6) `Document.format_text(id, start, len, attrs, box_height?)` du module construit ; (T7) `FakeCtx`, `asCtx` de `../engine/render/fake-ctx`, `Canvas2DRenderer` ; `IDENTITY` de `../engine/camera`.
- Réutilise : `apps/web/src/core/wasm-core.ts:77` (`toElementView`, `case "text"`) — contrôle de `spans` par `toSpans`/`toAttrs` (fichier touché).
- Réutilise : `apps/web/src/core/wasm-core.contract.test.ts:63` (`initSync`, `loadWasm`), `:770-776` (`core`, `fixtureOf`) — le test de S3 est écrit dans ce bloc.
- Réutilise : `crates/roomboard-core/tests/fixtures/socle-v1.roomboard` — lue par `fixtureOf("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard")` (aucune seconde fixture).
- Réutilise : `apps/web/src/engine/render/fake-ctx.ts` (T7, déplacé de `canvas2d.test.ts:10-55`) — `new FakeCtx()`, `asCtx`, `texts`.
- Produit : `CoreDocument.apply({ type: "FormatText", … })` sur le vrai module ; `toElementView` qui lève « ElementView invalide » si `spans` manque ou dérive.

**Test et commande bornée.**
- Construction (G8) : `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm install --frozen-lockfile >/dev/null && cargo build -p roomboard-wasm --target wasm32-unknown-unknown --release 2>&1 | tail -2 && rm -rf apps/web/src/wasm && wasm-bindgen --target web --out-dir apps/web/src/wasm target/wasm32-unknown-unknown/release/roomboard_wasm.wasm && grep -c "format_text" apps/web/src/wasm/roomboard_wasm.d.ts`
  — attendu : `Finished`, puis un nombre ≥ 1.
- Contrat : `ROOMBOARD_WASM_REQUIRED=1 pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts --reporter=verbose 2>&1 | grep -E "C7|S3 \(C7\)|×|FAIL|Tests " | tail -20`
  — attendu : « contrat C7 : vrai module wasm » ≥ 6 tests `✓`, « contrat C7 : fausse liaison » ≥ 6 `✓`, « S3 (C7) » `✓`,
  0 échec ; « SetText : créer, remplacer, vider » (`:362`), « SetText avec un id » (`:385`), « save puis load garde
  formes, textes et matrices » (`:592`) et « AddShape, SetText et Transform : retour contrôlé » (`:97`) verts.
- Types : `pnpm --filter @roomboard/web build 2>&1 | tail -5` — attendu : aucun `error TS`, `built in`.
- Complet : `scripts/verifier.sh 2>&1 | tail -15` — attendu : `module Wasm : N octets (…)` puis `verifier.sh : OK`. Relever
  N au rapport, avec l'écart à 1 413 052 octets (module après C2 : 1 572 864 − 159 812) ; HC7-7 attend moins de 30 Ko.

**Preuve visuelle.** Aucune automatique (profil) ; S3 compare les appels de canvas à ceux du socle par le `FakeCtx`.

**Contraintes (recopiées).**
- G1 TDD : test rouge d'abord ; aucun test sauté, désactivé, ni seuil baissé.
- G2 PATH et dossier `$WT` ; G16 `pnpm install --frozen-lockfile`.
- G3 Preuve bornée TS (`exec vitest run … --reporter=verbose`) ; jamais `pnpm --filter @roomboard/web test -- <fichier>`.
- G4 Aucune dépendance ajoutée.
- G5 Aucun build Tauri ni Android (`verifier.sh` n'en lance pas).
- G6 `verifier.sh` contrôle `cargo fmt --check` et `clippy -D warnings` : ils doivent passer.
- G7 Commits un fichier par `git add`, auteur `jejeasterix`, message anglais + `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. `apps/web/src/wasm/` n'est jamais commité (ignoré par git).
- G8 Le contrat exige le module construit : `ROOMBOARD_WASM_REQUIRED=1` ; construction par les lignes 26-29 de `scripts/verifier.sh`.
- G10 La fixture du socle est lue, jamais régénérée.
- G11 Bras `FormatText` en fin de `switch` ; blocs `describe` neufs en fin de fichier.
- G12 Rapport : une ligne `Réutilisation : …` par ligne `Réutilise :` (4 lignes).
- G13 Cette tâche rend `tsc` vert : `pnpm --filter @roomboard/web build` passe.
- G14 Test sur délai rejoué une fois.
- G15 Message `BadFormat` exact, le même pour les deux cœurs.

**Patron à ne pas reprendre.** Un `as ElementView` ou un `text` recopié sans contrôler `spans` ; vérifier le nettoyage du
patch par `toEqual` (qui ignore les clés à `undefined`) au lieu de `toStrictEqual`. Chemins de référence :
`apps/web/src/core/wasm-core.ts:57-110` (contrôle de forme, une dérive lève) ; test à module factice
`apps/web/src/core/wasm-core.contract.test.ts:97-121` (ordre des arguments, retour contrôlé par `toChange`).

**Interdits.** Toucher le cœur, la liaison Rust, le faux cœur ou le moteur : un écart de parité trouvé ici se rapporte
(tâche et ligne fautives), il ne se corrige pas dans le test. Commiter `apps/web/src/wasm/`.

**Terminé quand.** Contrat vert sur les deux cœurs avec le vrai module exigé, `pnpm --filter @roomboard/web build` vert,
`scripts/verifier.sh : OK`, taille relevée, commits faits, rapport avec 4 lignes `Réutilisation :`.

**Étapes.**

- [ ] **Étape 1 : construire le module** — la commande « Construction » ci-dessus.

- [ ] **Étape 2 : tests de forme (rouges)** — dans `wasm-core.contract.test.ts`, l'import de types devient
  `import type { AssetRef, CoreDocument, CoreFactory, Matrix, ShapeKind, TextAttrs, TextAttrsPatch, TextSpan } from "./api";`
  et ajouter :

```ts
import { IDENTITY as CAMERA_IDENTITY } from "../engine/camera";
import { Canvas2DRenderer } from "../engine/render/canvas2d";
import { asCtx, FakeCtx } from "../engine/render/fake-ctx";
```

  En fin de fichier :

```ts
const BAD_FORMAT =
  "mise en forme invalide (attributs bold, italic, underline, color, size, font aux valeurs permises, plage du texte hors paire de substitution, hauteur finie > 0 attendus)";
const plainSpan = (text: string): TextSpan => ({ text, attrs: {} });

describe("contrat C7 : contrôle de forme des valeurs venues de Wasm", () => {
  it("toElementView : spans exigés et contrôlés (T8)", () => {
    const view = {
      id: "t1", kind: "text", transform: [1, 0, 0, 1, 0, 0], style: { color: "#000000", width: 0 },
      text: { content: "Le chat", size: 36, boxWidth: 600, boxHeight: 45, spans: [plainSpan("Le "), { text: "chat", attrs: { bold: true, italic: true, underline: true, color: "#ff0000", size: 48, font: "Georgia" } }] },
    };
    expect(toElementView(view)).toEqual(view);
    const withSpans = (spans: unknown) => ({ ...view, text: { ...view.text, spans } });
    expect(() => toElementView({ ...view, text: { content: "x", size: 36, boxWidth: 600, boxHeight: 45 } })).toThrow("ElementView invalide");
    const drifts: unknown[] = [[], "Le chat", [{ text: 1, attrs: {} }], [{ text: "a" }], [{ text: "a", attrs: { bold: false } }], [{ text: "a", attrs: { size: 0 } }], [{ text: "a", attrs: { color: 5 } }], [{ text: "a", attrs: { href: "x" } }]];
    for (const spans of drifts) expect(() => toElementView(withSpans(spans))).toThrow("ElementView invalide");
    expect(toElementView(withSpans([{ text: "a", attrs: { bold: undefined } }]))).toStrictEqual({ ...view, text: { ...view.text, spans: [plainSpan("a")] } });
  });

  it("FormatText : clés undefined retirées, bornes hors u32 portées à u32::MAX, retour contrôlé par toChange", () => {
    const drift = { pages: ["p1"], ids: ["e1"], full: false, version: 1 };
    const calls: unknown[][] = [];
    const doc = { format_text: (...args: unknown[]): unknown => { calls.push(args); return drift; } };
    const stub = { Document: { blank: () => doc, load: () => doc }, StrokeBuilder: class {}, version: () => "factice" };
    const d = createWasmCore(stub as unknown as WasmModule).blank();
    expect(() => d.apply({ type: "FormatText", id: "e1", start: 3, len: 4, attrs: { bold: undefined, italic: true } })).toThrow("Change invalide");
    expect(() => d.apply({ type: "FormatText", id: "e1", start: -1, len: 1.5, attrs: {}, boxHeight: 60 })).toThrow("Change invalide");
    expect(calls).toEqual([["e1", 3, 4, { italic: true }, undefined], ["e1", 4294967295, 4294967295, {}, 60]]);
    expect(calls[0]?.[3]).toStrictEqual({ italic: true });
  });
});
```

  Commande : `pnpm --filter @roomboard/web exec vitest run src/core/wasm-core.contract.test.ts 2>&1 | grep -E "FAIL|Tests " | tail -8`
  — attendu : ces deux tests en échec (`spans` non recopié, `format_text` jamais appelé).

- [ ] **Étape 3 : adaptateur** — dans `wasm-core.ts` :
  - à l'import de types depuis `./api`, ajouter `TextAttrs` et `TextSpan` ; ajouter `import { cleanPatch } from "./rich-text";`
  - juste avant `export function toElementView` :

```ts
/** Attributs d'un segment (C7, T8) : clés connues seules, valeurs déjà normalisées par le cœur ; `undefined` = absent. */
function toAttrs(a: unknown): TextAttrs {
  if (!isRecord(a)) throw new Error(ELEMENT);
  const out: { bold?: true; italic?: true; underline?: true; color?: string; size?: number; font?: string } = {};
  for (const [k, v] of Object.entries(a)) {
    if (v === undefined) continue;
    switch (k) {
      case "bold":
      case "italic":
      case "underline":
        if (v !== true) throw new Error(ELEMENT);
        out[k] = true;
        break;
      case "color":
      case "font":
        if (typeof v !== "string") throw new Error(ELEMENT);
        out[k] = v;
        break;
      case "size":
        if (!finitePositive(v)) throw new Error(ELEMENT);
        out.size = v;
        break;
      default:
        throw new Error(ELEMENT);
    }
  }
  return out;
}

/** Segments d'un texte : au moins un (le cœur rend un segment vide pour un texte vide). */
function toSpans(v: unknown): TextSpan[] {
  if (!Array.isArray(v) || v.length === 0) throw new Error(ELEMENT);
  return v.map((s: unknown) => {
    const text = isRecord(s) ? s["text"] : undefined;
    if (!isRecord(s) || typeof text !== "string") throw new Error(ELEMENT);
    return { text, attrs: toAttrs(s["attrs"]) };
  });
}

/** Bornes de FormatText : hors des u32, u32::MAX, que le cœur refuse au contrôle des bornes comme la fausse liaison. */
const toU32 = (v: number): number => (Number.isInteger(v) && v >= 0 && v <= 0xffffffff ? v : 0xffffffff);
```

  - `case "text"` : la ligne `return { ...base, kind, style, text: { content, size, boxWidth, boxHeight } };` devient
    `return { ...base, kind, style, text: { content, size, boxWidth, boxHeight, spans: toSpans(t["spans"]) } };`
  - en fin du `switch` de `apply`, après `case "SetBackdrop": { … }` :

```ts
      case "FormatText":
        // Clés à `undefined` retirées (T7) : serde-wasm-bindgen les lirait comme null, donc comme un retrait.
        return toChange(this.d.format_text(cmd.id, toU32(cmd.start), toU32(cmd.len), cleanPatch(cmd.attrs), cmd.boxHeight));
```

  Commande : la même qu'à l'étape 2 ; attendu : les deux tests verts.

- [ ] **Étape 4 : contrat C7 sur les deux cœurs** — en fin de fichier, après le bloc de l'étape 2 :

```ts
describe.each(factories)("contrat C7 : $name", ({ f }) => {
  const text = (d: CoreDocument, p: string, content: string, id: string | null = null) =>
    d.apply({ type: "SetText", page: p, id, x: 100, y: 200, content, color: "#000000", size: 36, boxWidth: 600, boxHeight: 45 });
  const fmt = (d: CoreDocument, id: string, start: number, len: number, attrs: TextAttrsPatch, boxHeight?: number) =>
    d.apply({ type: "FormatText", id, start, len, attrs, ...(boxHeight === undefined ? {} : { boxHeight }) });
  const spans = (d: CoreDocument, id: string): readonly TextSpan[] | null => {
    const e = d.element(id);
    return e?.kind === "text" ? e.text.spans : null;
  };
  const RED = { color: "#ff0000" } as const;
  const chat = (attrs: TextAttrs): TextSpan[] => [plainSpan("Le "), { text: "chat", attrs }, plainSpan(" noir")];

  it("S4 : positions UTF-16, différence en points de code, héritage du caractère précédent", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Le 🐱 noir").ids[0] ?? "";
    expect(fmt(d, id, 3, 2, RED)).toMatchObject({ pages: [p], ids: [id], removed: [], full: false });
    expect(spans(d, id)).toEqual([plainSpan("Le "), { text: "🐱", attrs: RED }, plainSpan(" noir")]);
    text(d, p, "Le gros 🐱 noir", id);
    expect(spans(d, id)).toEqual([plainSpan("Le gros "), { text: "🐱", attrs: RED }, plainSpan(" noir")]);
    text(d, p, "Le gros 🐱🐱 noir", id);
    expect(spans(d, id)).toEqual([plainSpan("Le gros "), { text: "🐱🐱", attrs: RED }, plainSpan(" noir")]);
    d.free();
  });

  it("S4 : retrait par false, par null ; une clé undefined vaut une clé absente", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Le chat noir").ids[0] ?? "";
    fmt(d, id, 3, 4, { bold: true, color: "#ff0000" });
    fmt(d, id, 3, 4, { bold: false });
    expect(spans(d, id)).toEqual(chat(RED));
    fmt(d, id, 3, 4, { bold: true });
    fmt(d, id, 3, 4, { bold: null });
    expect(spans(d, id)).toEqual(chat(RED));
    fmt(d, id, 3, 4, { color: null });
    expect(spans(d, id)).toEqual([plainSpan("Le chat noir")]);
    fmt(d, id, 3, 4, { bold: undefined, italic: true });
    expect(spans(d, id)).toEqual(chat({ italic: true }));
    unchanged(d, () => fmt(d, id, 3, 4, { bold: undefined }));
    d.free();
  });

  it("S4 : plage vide sans boxHeight, aucune étape ; avec un boxHeight neuf, une étape et la hauteur écrite", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Le chat noir").ids[0] ?? "";
    unchanged(d, () => fmt(d, id, 2, 0, { bold: true }));
    unchanged(d, () => fmt(d, id, 0, 0, {}, 45));
    expect(fmt(d, id, 2, 0, { bold: true }, 90).ids).toEqual([id]);
    expect(d.element(id)).toMatchObject({ text: { boxHeight: 90 } });
    expect(spans(d, id)).toEqual([plainSpan("Le chat noir")]);
    d.free();
  });

  it("S4 : ordre des contrôles et valeurs refusées : messages du contrat, aucune étape", () => {
    const d = f.blank();
    const p = first(d);
    const stroke = commit(d, p, 100);
    const id = text(d, p, "Le 🐱 noir").ids[0] ?? "";
    const hex64 = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    unchanged(d, () => {
      expect(messageOf(() => fmt(d, "absent", 0, 1, { href: "x" } as unknown as TextAttrsPatch))).toBe(BAD_FORMAT);
      expect(messageOf(() => fmt(d, "absent", 0, 1, {}, -1))).toBe(BAD_FORMAT);
      expect(messageOf(() => fmt(d, "absent", 0, 1, { bold: true }))).toBe("élément inconnu : absent");
      expect(messageOf(() => fmt(d, stroke, 0, 1, { bold: true }))).toBe(`élément inconnu : ${stroke}`);
      for (const [start, len] of [[4, 1], [3, 1], [8, 3], [-1, 1]] as const) {
        expect(messageOf(() => fmt(d, id, start, len, { bold: true }))).toBe(BAD_FORMAT);
      }
      expect(messageOf(() => fmt(d, id, 0, 1, { color: "rgb(0,0,0)" }))).toBe(BAD_FORMAT);
      expect(messageOf(() => fmt(d, id, 0, 1, { font: hex64 }))).toBe(BAD_FORMAT);
      expect(messageOf(() => fmt(d, id, 0, 1, { bold: "oui" } as unknown as TextAttrsPatch))).toBe(BAD_FORMAT);
    });
    d.free();
  });

  it("S2 : six plages, enregistrer puis recharger : mêmes segments ; réenregistrer : mêmes octets", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "aa bb cc dd ee ff").ids[0] ?? "";
    const patches: TextAttrsPatch[] = [{ bold: true }, { italic: true }, { underline: true }, RED, { size: 72 }, { font: "Georgia" }];
    patches.forEach((attrs, i) => fmt(d, id, i * 3, 2, attrs));
    const expected: TextSpan[] = [
      { text: "aa", attrs: { bold: true } }, plainSpan(" "), { text: "bb", attrs: { italic: true } }, plainSpan(" "),
      { text: "cc", attrs: { underline: true } }, plainSpan(" "), { text: "dd", attrs: RED }, plainSpan(" "),
      { text: "ee", attrs: { size: 72 } }, plainSpan(" "), { text: "ff", attrs: { font: "Georgia" } },
    ];
    expect(spans(d, id)).toEqual(expected);
    const bytes = d.save(now, "0.1.0");
    const e = f.load(bytes);
    expect(spans(e, id)).toEqual(expected);
    expect(e.element(id)).toMatchObject({ text: { content: "aa bb cc dd ee ff" } });
    expect(new Uint8Array(e.save(now, "0.1.0"))).toEqual(new Uint8Array(bytes));
    e.free();
    d.free();
  });

  it("S1 : annuler trois fois rend le texte sans attribut ; rétablir trois fois remet tout", () => {
    const d = f.blank();
    const p = first(d);
    const id = text(d, p, "Le chat noir").ids[0] ?? "";
    fmt(d, id, 3, 4, { color: "#ff0000", bold: true });
    text(d, p, "Le gros chat noir", id);
    text(d, p, "Le gros chats noir", id);
    const full = spans(d, id);
    d.undo();
    d.undo();
    d.undo();
    expect(spans(d, id)).toEqual([plainSpan("Le chat noir")]);
    d.redo();
    d.redo();
    d.redo();
    expect(spans(d, id)).toEqual(full);
    d.free();
  });
});
```

- [ ] **Étape 5 : S3 sur le vrai module** — dans le bloc `describe.skipIf(loaded === null)("contrat du vrai module wasm")`,
  juste après le test « fichier du socle : ouvert par le vrai module, réenregistré à l'identique (S5) » :

```ts
  it("S3 (C7) : le texte du socle a un seul segment et se dessine comme au socle", () => {
    const d = core.load(fixtureOf("../../../../crates/roomboard-core/tests/fixtures/socle-v1.roomboard"));
    const page = d.pageIds()[0] ?? "";
    const id = d.elementIds(page)[2] ?? "";
    const view = d.element(id);
    expect(view?.kind === "text" && view.text.spans).toEqual([plainSpan("Bonjour RoomBoard")]);
    const scene = new FakeCtx();
    const r = new Canvas2DRenderer(asCtx(scene), null, { element: (x) => (x === id ? view : null), outline: () => null });
    r.drawScene({ id: page, elementIds: [id] }, CAMERA_IDENTITY, new Set());
    const tail = scene.log.slice(scene.log.findIndex((l) => l.startsWith("transform ")));
    expect(tail.filter((l) => l.startsWith("fillText"))).toEqual(["fillText Bonjour RoomBoard 0,0"]);
    expect(scene.texts).toEqual([
      { text: "Bonjour RoomBoard", x: 0, y: 0, font: '36px "Atkinson Hyperlegible", system-ui, sans-serif', fill: "#000000", baseline: "top" },
    ]);
    expect(tail.some((l) => l.startsWith("fillRect"))).toBe(false);
    d.free();
  });
```

  (`plainSpan` et `BAD_FORMAT`, déclarées plus bas par l'étape 2, sont lues dans le corps des `it`, qui tourne après
  l'évaluation complète du fichier : aucun déplacement nécessaire.)

- [ ] **Étape 6 : voir vert** — la commande « Contrat » de « Test et commande bornée ». Un écart entre les deux cœurs se
  rapporte avec la tâche fautive (T3, T4 ou T6), sans changer l'attendu.

- [ ] **Étape 7 : types et suite complète** — `cd "$WT" && export PATH=$HOME/.cargo/bin:$HOME/.local/bin:$PATH && pnpm --filter @roomboard/web build 2>&1 | tail -5 && scripts/verifier.sh 2>&1 | tail -15`
  — attendu : aucun `error TS` ; `module Wasm : N octets` ; `verifier.sh : OK`.

- [ ] **Étape 8 : commits**

```bash
cd "$WT" && git add apps/web/src/core/wasm-core.ts && git add apps/web/src/core/wasm-core.contract.test.ts && \
git -c user.name=jejeasterix -c user.email=jejeasterix@users.noreply.github.com commit \
  -m "feat(web): wasm adapter for FormatText and spans; C7 contract on both cores" \
  -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
