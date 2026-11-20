//! C7b (R7, R23) : `SetText` (T1) et `SetTableCell` (T5) avec segments voulus, par l'API publique du cœur ; mesures
//! de l'écriture concurrente (reste OD71, jamais tranché) par deux documents tirés des mêmes octets, fusionnés dans les
//! deux ordres.
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::rich_text::{SpanAttrs, SpanInput, TextSpanView};
use std::sync::Arc;
use yrs::updates::decoder::Decode;

use yrs::{Any, Array, Doc, Map, Out, ReadTxn, StateVector, Text, Transact, Update};

fn none() -> SpanAttrs {
    SpanAttrs::default()
}

fn bold() -> SpanAttrs {
    SpanAttrs {
        bold: true,
        ..SpanAttrs::default()
    }
}

fn italic() -> SpanAttrs {
    SpanAttrs {
        italic: true,
        ..SpanAttrs::default()
    }
}

fn red_bold() -> SpanAttrs {
    SpanAttrs {
        bold: true,
        color: Some("#dc2626".into()),
        ..SpanAttrs::default()
    }
}

fn sp(t: &str, attrs: SpanAttrs) -> SpanInput {
    SpanInput {
        text: t.into(),
        attrs,
    }
}

fn view(t: &str, attrs: SpanAttrs) -> TextSpanView {
    TextSpanView {
        text: t.into(),
        attrs,
    }
}

/// `SetText` sur le texte `id` (neuf si `None`), segments voulus `spans`.
fn set_text(page: &str, id: Option<&str>, content: &str, spans: Option<Vec<SpanInput>>) -> Command {
    Command::SetText {
        page: page.into(),
        id: id.map(str::to_string),
        x: 100.0,
        y: 200.0,
        content: content.into(),
        color: "#000000".into(),
        size: 36.0,
        box_width: 600.0,
        box_height: 45.0,
        spans,
    }
}

/// Document d'une page et d'un texte sans attribut : (document, page, id).
fn text_doc(content: &str) -> (Document, String, String) {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let id = d
        .apply(set_text(&page, None, content, None))
        .expect("texte")
        .ids[0]
        .clone();
    (d, page, id)
}

fn text_spans(d: &Document, id: &str) -> Vec<TextSpanView> {
    d.element(id).and_then(|e| e.text).expect("texte").spans
}

fn content(d: &Document, id: &str) -> String {
    d.element(id).and_then(|e| e.text).expect("texte").content
}

/// Deux documents tirés des mêmes octets que `d` (R23).
fn twins(d: &Document) -> (Document, Document) {
    let bytes = d.encode_v1();
    (
        Document::from_update_v1(&bytes).expect("a"),
        Document::from_update_v1(&bytes).expect("b"),
    )
}

/// États de `first` puis de `second` appliqués à un `Doc` brut, relu en document (patron de `commands.rs:2388`).
fn merged(first: &Document, second: &Document) -> Document {
    let raw = yrs::Doc::new();
    {
        let mut txn = raw.transact_mut();
        for d in [first, second] {
            txn.apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
                .expect("mise à jour");
        }
    }
    let bytes = raw
        .transact()
        .encode_state_as_update_v1(&StateVector::default());
    Document::from_update_v1(&bytes).expect("fusion")
}

/// S1, R6, R7 : texte changé et mis en forme par une seule `SetText` : une seule étape d'annulation.
#[test]
fn set_text_with_spans_is_one_undo_step() {
    let (mut d, page, id) = text_doc("Le chat noir");
    let before = text_spans(&d, &id);
    let spans = vec![
        sp("Le gros ", none()),
        sp("chat", red_bold()),
        sp(" noir", none()),
    ];
    d.apply(set_text(&page, Some(&id), "Le gros chat noir", Some(spans)))
        .expect("riche");
    assert_eq!(
        text_spans(&d, &id),
        vec![
            view("Le gros ", none()),
            view("chat", red_bold()),
            view(" noir", none())
        ]
    );
    assert!(d.undo());
    assert_eq!(
        (content(&d, &id), text_spans(&d, &id)),
        ("Le chat noir".to_string(), before)
    );
}

/// S6 (R6, R7) : même texte, segments changés : la commande s'écrit (jamais « inchangé ») ; une étape.
#[test]
fn set_text_format_only_is_written() {
    let (mut d, page, id) = text_doc("Le chat noir");
    let v = d.version();
    let spans = vec![sp("Le chat ", none()), sp("noir", italic())];
    d.apply(set_text(&page, Some(&id), "Le chat noir", Some(spans)))
        .expect("italique");
    assert!(d.version() > v);
    assert_eq!(text_spans(&d, &id)[1], view("noir", italic()));
    assert!(d.undo());
    assert_eq!(text_spans(&d, &id), vec![view("Le chat noir", none())]);
}

/// D38, R7 : même texte, mêmes segments une fois normalisés (voisins égaux fusionnés) : aucune transaction.
#[test]
fn set_text_same_spans_is_unchanged() {
    let (mut d, page, id) = text_doc("Le chat");
    d.apply(set_text(
        &page,
        Some(&id),
        "Le chat",
        Some(vec![sp("Le ", none()), sp("chat", bold())]),
    ))
    .expect("gras");
    let v = d.version();
    let same = vec![sp("Le", none()), sp(" ", none()), sp("chat", bold())];
    d.apply(set_text(&page, Some(&id), "Le chat", Some(same)))
        .expect("même");
    assert_eq!(d.version(), v);
}

/// R7 (PC2) : segments contrôlés d'abord, `BadFormat` sans transaction, avant l'élément inconnu et le texte invalide.
#[test]
fn set_text_bad_spans_is_bad_format_first() {
    let (mut d, page, id) = text_doc("Le chat");
    let v = d.version();
    let bad = [
        vec![sp("Le cha", none())],
        vec![sp(
            "Le chat",
            SpanAttrs {
                color: Some("rouge!".into()),
                ..none()
            },
        )],
        vec![sp(
            "Le chat",
            SpanAttrs {
                size: Some(0.0),
                ..none()
            },
        )],
    ];
    for spans in bad {
        assert_eq!(
            d.apply(set_text(&page, Some(&id), "Le chat", Some(spans.clone()))),
            Err(CommandError::BadFormat)
        );
        assert_eq!(
            d.apply(set_text(
                &page,
                Some("absent"),
                "Le chat",
                Some(spans.clone())
            )),
            Err(CommandError::BadFormat)
        );
        let mut tiny = set_text(&page, Some(&id), "Le chat", Some(spans));
        if let Command::SetText { size, .. } = &mut tiny {
            *size = 0.0;
        }
        assert_eq!(d.apply(tiny), Err(CommandError::BadFormat));
    }
    assert_eq!(d.version(), v);
}

/// R7 : boîte neuve avec segments : créée mise en forme dans la même transaction ; annuler la retire.
#[test]
fn new_text_with_spans_is_created_formatted() {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let spans = vec![sp("Le ", none()), sp("chat", red_bold())];
    let id = d
        .apply(set_text(&page, None, "Le chat", Some(spans)))
        .expect("neuf")
        .ids[0]
        .clone();
    assert_eq!(
        text_spans(&d, &id),
        vec![view("Le ", none()), view("chat", red_bold())]
    );
    assert!(d.undo());
    assert!(d.element(&id).is_none());
}

/// R23 b (reste OD71, mesure) : mises en forme concurrentes de deux mots d'un même texte : les deux restent, dans les
/// deux ordres de fusion (l'alignement n'écrit que les plages changées).
#[test]
fn concurrent_formats_of_two_words_in_a_text_both_stay() {
    let (d, page, id) = text_doc("Le chat noir");
    let (mut a, mut b) = twins(&d);
    a.apply(set_text(
        &page,
        Some(&id),
        "Le chat noir",
        Some(vec![
            sp("Le ", none()),
            sp("chat", bold()),
            sp(" noir", none()),
        ]),
    ))
    .expect("a");
    b.apply(set_text(
        &page,
        Some(&id),
        "Le chat noir",
        Some(vec![sp("Le chat ", none()), sp("noir", italic())]),
    ))
    .expect("b");
    let ab = text_spans(&merged(&a, &b), &id);
    assert_eq!(ab, text_spans(&merged(&b, &a), &id));
    assert_eq!(
        ab,
        vec![
            view("Le ", none()),
            view("chat", bold()),
            view(" ", none()),
            view("noir", italic())
        ]
    );
}

/// R23 c (mesure) : frappes concurrentes dans le même texte : les deux insertions restent.
#[test]
fn concurrent_typing_in_one_text_keeps_both_insertions() {
    let (d, page, id) = text_doc("Le chat noir");
    let (mut a, mut b) = twins(&d);
    a.apply(set_text(
        &page,
        Some(&id),
        "Le gros chat noir",
        Some(vec![sp("Le gros chat noir", none())]),
    ))
    .expect("a");
    b.apply(set_text(
        &page,
        Some(&id),
        "Le chat noir et blanc",
        Some(vec![sp("Le chat noir et blanc", none())]),
    ))
    .expect("b");
    let ab = content(&merged(&a, &b), &id);
    assert_eq!(ab, content(&merged(&b, &a), &id));
    assert_eq!(ab, "Le gros chat noir et blanc");
}

// C7b (T5) : cellules riches.

/// Tableau 2 × 2 sur une page : (document, id, ids des lignes, ids des colonnes).
fn table_doc() -> (Document, String, Vec<String>, Vec<String>) {
    let mut d = Document::blank();
    let page = d.page_ids()[0].clone();
    let id = d
        .apply(Command::AddTable {
            page,
            x: 100.0,
            y: 200.0,
            cols: 2,
            rows: 2,
            col_width: 240.0,
            row_height: 64.0,
            color: "#000000".into(),
            size: 36.0,
        })
        .expect("tableau")
        .ids[0]
        .clone();
    let t = d.element(&id).and_then(|e| e.table).expect("vue");
    let rows = t.rows.iter().map(|r| r.id.clone()).collect();
    let cols = t.cols.iter().map(|c| c.id.clone()).collect();
    (d, id, rows, cols)
}

fn set_cell(
    id: &str,
    row: &str,
    col: &str,
    content: &str,
    spans: Option<Vec<SpanInput>>,
) -> Command {
    Command::SetTableCell {
        id: id.into(),
        row: row.into(),
        col: col.into(),
        content: content.into(),
        row_height: None,
        spans,
    }
}

/// Segments de la cellule (row, col) ; cellule absente de la vue : aucun.
fn cell_spans(d: &Document, id: &str, row: &str, col: &str) -> Vec<TextSpanView> {
    let t = d.element(id).and_then(|e| e.table).expect("vue");
    t.cells
        .into_iter()
        .find(|c| c.row == row && c.col == col)
        .map(|c| c.spans)
        .unwrap_or_default()
}

/// R16 : la vue d'une cellule porte ses segments ; remplissage seul : un segment vide.
#[test]
fn cell_view_has_spans() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Lundi", None))
        .expect("texte");
    d.apply(Command::SetTableFill {
        id: id.clone(),
        row: rows[1].clone(),
        col: cols[1].clone(),
        fill: Some("#fef08a".into()),
    })
    .expect("remplissage");
    assert_eq!(
        cell_spans(&d, &id, &rows[0], &cols[0]),
        vec![view("Lundi", none())]
    );
    assert_eq!(
        cell_spans(&d, &id, &rows[1], &cols[1]),
        vec![view("", none())]
    );
}

/// S1, R7 : cellule existante, texte changé et mis en forme en une seule `SetTableCell` : une étape.
#[test]
fn set_cell_with_spans_formats_in_one_step() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "aa", None))
        .expect("aa");
    d.apply(set_cell(
        &id,
        &rows[0],
        &cols[0],
        "aaaTotal",
        Some(vec![
            sp("a", none()),
            sp("a", bold()),
            sp("a", none()),
            sp("Total", bold()),
        ]),
    ))
    .expect("riche");
    assert_eq!(
        cell_spans(&d, &id, &rows[0], &cols[0]),
        vec![
            view("a", none()),
            view("a", bold()),
            view("a", none()),
            view("Total", bold())
        ]
    );
    assert!(d.undo());
    assert_eq!(
        cell_spans(&d, &id, &rows[0], &cols[0]),
        vec![view("aa", none())]
    );
}

/// R7, R16 : cellule absente : créée et mise en forme dans la même transaction (`TextRef` relu) ; annuler la retire.
#[test]
fn absent_cell_with_spans_is_created_formatted() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(
        &id,
        &rows[1],
        &cols[0],
        "Total",
        Some(vec![sp("Total", bold())]),
    ))
    .expect("neuve");
    assert_eq!(
        cell_spans(&d, &id, &rows[1], &cols[0]),
        vec![view("Total", bold())]
    );
    assert!(d.undo());
    assert!(cell_spans(&d, &id, &rows[1], &cols[0]).is_empty());
}

/// S6 (R6, R7) : cellule « Total » existante, italique seule : écrite (jamais « inchangé »), une étape.
#[test]
fn set_cell_format_only_is_written() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Total", None))
        .expect("Total");
    let v = d.version();
    d.apply(set_cell(
        &id,
        &rows[0],
        &cols[0],
        "Total",
        Some(vec![sp("Total", italic())]),
    ))
    .expect("italique");
    assert!(d.version() > v);
    assert_eq!(
        cell_spans(&d, &id, &rows[0], &cols[0]),
        vec![view("Total", italic())]
    );
    assert!(d.undo());
    assert_eq!(
        cell_spans(&d, &id, &rows[0], &cols[0]),
        vec![view("Total", none())]
    );
}

/// D38 : mêmes texte et segments : aucune transaction ; cellule absente et contenu vide avec segments : aucune.
#[test]
fn set_cell_same_spans_is_unchanged() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(
        &id,
        &rows[0],
        &cols[0],
        "Total",
        Some(vec![sp("Total", bold())]),
    ))
    .expect("gras");
    let v = d.version();
    d.apply(set_cell(
        &id,
        &rows[0],
        &cols[0],
        "Total",
        Some(vec![sp("To", bold()), sp("tal", bold())]),
    ))
    .expect("même");
    d.apply(set_cell(
        &id,
        &rows[1],
        &cols[1],
        "",
        Some(vec![sp("", bold())]),
    ))
    .expect("vide");
    assert_eq!(d.version(), v);
}

/// R7 (PC2) : segments contrôlés d'abord : `BadFormat` avant la hauteur invalide et le tableau inconnu.
#[test]
fn set_cell_bad_spans_is_bad_format_first() {
    let (mut d, id, rows, cols) = table_doc();
    let v = d.version();
    let bad = vec![sp("Tota", none())];
    assert_eq!(
        d.apply(set_cell(
            &id,
            &rows[0],
            &cols[0],
            "Total",
            Some(bad.clone())
        )),
        Err(CommandError::BadFormat)
    );
    assert_eq!(
        d.apply(set_cell(
            "absent",
            &rows[0],
            &cols[0],
            "Total",
            Some(bad.clone())
        )),
        Err(CommandError::BadFormat)
    );
    let mut high = set_cell(&id, &rows[0], &cols[0], "Total", Some(bad));
    if let Command::SetTableCell { row_height, .. } = &mut high {
        *row_height = Some(f64::NAN);
    }
    assert_eq!(d.apply(high), Err(CommandError::BadFormat));
    assert_eq!(d.version(), v);
}

/// C10a, C7 T5 : `SetTableCell` sans segments garde la différence avec héritage du caractère précédent.
#[test]
fn set_cell_without_spans_inherits() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(
        &id,
        &rows[0],
        &cols[0],
        "Total",
        Some(vec![sp("Total", bold())]),
    ))
    .expect("gras");
    d.apply(set_cell(&id, &rows[0], &cols[0], "Totals", None))
        .expect("s");
    assert_eq!(
        cell_spans(&d, &id, &rows[0], &cols[0]),
        vec![view("Totals", bold())]
    );
}

/// R23 a (reste OD71, MESURE du défaut connu, non corrigé) : première écriture concurrente dans une même cellule
/// absente : les deux documents convergent, et une seule des deux écritures reste (deux `Y.Map` neufs sous la même
/// clé de `cells` : le dernier écrit gagne). Ce test rougira le jour où le modèle de document corrigera la perte.
#[test]
fn concurrent_first_writes_in_an_absent_cell_keep_one() {
    let (d, id, rows, cols) = table_doc();
    let (mut a, mut b) = twins(&d);
    a.apply(set_cell(&id, &rows[0], &cols[0], "Lundi", None))
        .expect("a");
    b.apply(set_cell(&id, &rows[0], &cols[0], "Mardi", None))
        .expect("b");
    let text = |m: &Document| {
        let t = m.element(&id).and_then(|e| e.table).expect("vue");
        t.cells.into_iter().map(|c| c.text).collect::<Vec<_>>()
    };
    let ab = text(&merged(&a, &b));
    assert_eq!(ab, text(&merged(&b, &a)), "les deux documents convergent");
    assert!(
        ab == vec!["Lundi".to_string()] || ab == vec!["Mardi".to_string()],
        "une seule écriture reste : {ab:?}"
    );
}

/// R23 b (mesure) : mises en forme concurrentes de deux mots d'une cellule existante : les deux restent.
#[test]
fn concurrent_formats_of_two_words_in_a_cell_both_stay() {
    let (mut d, id, rows, cols) = table_doc();
    d.apply(set_cell(&id, &rows[0], &cols[0], "Le chat noir", None))
        .expect("texte");
    let (mut a, mut b) = twins(&d);
    a.apply(set_cell(
        &id,
        &rows[0],
        &cols[0],
        "Le chat noir",
        Some(vec![
            sp("Le ", none()),
            sp("chat", bold()),
            sp(" noir", none()),
        ]),
    ))
    .expect("a");
    b.apply(set_cell(
        &id,
        &rows[0],
        &cols[0],
        "Le chat noir",
        Some(vec![sp("Le chat ", none()), sp("noir", italic())]),
    ))
    .expect("b");
    let ab = cell_spans(&merged(&a, &b), &id, &rows[0], &cols[0]);
    assert_eq!(ab, cell_spans(&merged(&b, &a), &id, &rows[0], &cols[0]));
    assert_eq!(
        ab,
        vec![
            view("Le ", none()),
            view("chat", bold()),
            view(" ", none()),
            view("noir", italic())
        ]
    );
}

/// Un client étranger pose `size` hors du domaine `f32` : la vue l'ignore, donc renvoyer la vue en segments reste
/// accepté (même domaine en lecture et en entrée) et la valeur brute reste dans le document.
#[test]
fn foreign_size_outside_f32_domain_is_absent_from_view_and_view_round_trips() {
    for foreign in [1e39_f64, 1e-46_f64] {
        let (d, page, id) = text_doc("abc");
        let raw = Doc::new();
        let pages = raw.get_or_insert_array("pages");
        raw.transact_mut()
            .apply_update(Update::decode_v1(&d.encode_v1()).expect("décodage"))
            .expect("application");
        {
            let mut txn = raw.transact_mut();
            let Some(Out::YMap(p)) = pages.get(&txn, 0) else {
                panic!("page")
            };
            let Some(Out::YArray(els)) = p.get(&txn, "elements") else {
                panic!("éléments")
            };
            let Some(Out::YMap(t)) = els.get(&txn, 0) else {
                panic!("texte")
            };
            let Some(Out::YText(c)) = t.get(&txn, "content") else {
                panic!("contenu")
            };
            c.format(
                &mut txn,
                0,
                1,
                [(Arc::from("size"), Any::from(foreign))].into(),
            );
        }
        let bytes = raw
            .transact()
            .encode_state_as_update_v1(&StateVector::default());
        let mut d = Document::from_update_v1(&bytes).expect("rechargement");
        let spans = text_spans(&d, &id);
        assert_eq!(spans, vec![view("abc", none())], "{foreign}");
        let mut back: Vec<SpanInput> = spans.iter().map(|v| sp(&v.text, v.attrs.clone())).collect();
        back.push(sp("d", none()));
        d.apply(set_text(&page, Some(&id), "abcd", Some(back)))
            .unwrap_or_else(|e| panic!("{foreign} : {e:?}"));
        assert_eq!(content(&d, &id), "abcd");
    }
}
