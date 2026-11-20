//! C7b (R7, R23) : `SetText` (T1) et `SetTableCell` (T5) avec segments voulus, par l'API publique du cœur ; mesures
//! de l'écriture concurrente (reste OD71, jamais tranché) par deux documents tirés des mêmes octets, fusionnés dans les
//! deux ordres.
use roomboard_core::commands::{Command, CommandError};
use roomboard_core::document::Document;
use roomboard_core::rich_text::{SpanAttrs, SpanInput, TextSpanView};
use yrs::updates::decoder::Decode;
use yrs::{ReadTxn, StateVector, Transact, Update};

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
