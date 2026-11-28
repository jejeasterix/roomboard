//! Aller-retour natif des copies C13 (DA2, S4) : `read_svg(write(l))` rend les mêmes pages, à la pression des traits
//! près (l'écriture la rend constante, HU2-2), à la translation près (repliée dans les coordonnées à l'écriture) et à
//! la flèche près pour le `.ubz` (écrite en ligne).
use roomboard_formats::board::{
    encode, parse, read_svg, write_iwb, write_ubz_pages, Dialect, Item, Page, ShapeKind, Span,
    IDENTITY,
};

fn w1_pages() -> Vec<Page> {
    let black = [0, 0, 0];
    vec![
        Page {
            background: Some(black),
            grid: None,
            items: vec![
                Item::Shape {
                    kind: ShapeKind::Rect,
                    m: IDENTITY,
                    x0: 10.0,
                    y0: 20.0,
                    x1: 110.0,
                    y1: 70.0,
                    color: [255, 0, 0],
                    width: 4.0,
                    fill: Some([0, 0, 255]),
                },
                Item::Stroke {
                    m: IDENTITY,
                    color: [0, 128, 0],
                    width: 3.0,
                    points: vec![[0.0, 0.0, 1.0], [10.0, 10.0, 0.5]],
                },
                Item::Text {
                    m: [1.0, 0.0, 0.0, 1.0, 100.0, 200.0],
                    x: 0.0,
                    y: 0.0,
                    w: 300.0,
                    h: 50.0,
                    size: 24.0,
                    color: black,
                    spans: vec![
                        Span {
                            text: "Bonjour ".to_string(),
                            bold: true,
                            ..Span::default()
                        },
                        Span {
                            text: "monde".to_string(),
                            size: Some(32.0),
                            color: Some([255, 0, 0]),
                            font: Some("Liberation Sans".to_string()),
                            ..Span::default()
                        },
                    ],
                },
                Item::Image {
                    m: IDENTITY,
                    x: 5.0,
                    y: 5.0,
                    w: 64.0,
                    h: 32.0,
                    href: "images/a.png".to_string(),
                },
                Item::Group(vec![
                    Item::Shape {
                        kind: ShapeKind::Line,
                        m: IDENTITY,
                        x0: 0.0,
                        y0: 0.0,
                        x1: 50.0,
                        y1: 0.0,
                        color: black,
                        width: 2.0,
                        fill: None,
                    },
                    Item::Shape {
                        kind: ShapeKind::Arrow,
                        m: IDENTITY,
                        x0: 0.0,
                        y0: 10.0,
                        x1: 50.0,
                        y1: 10.0,
                        color: black,
                        width: 2.0,
                        fill: None,
                    },
                ]),
            ],
        },
        Page::default(),
    ]
}

/// Forme comparable : translation repliée, pression 1, flèche en ligne pour le `.ubz`.
fn canon(it: &Item, ubz: bool) -> Item {
    let tr = |m: &[f32; 6]| m[0] == 1.0 && m[1] == 0.0 && m[2] == 0.0 && m[3] == 1.0;
    match it.clone() {
        Item::Shape {
            kind,
            m,
            x0,
            y0,
            x1,
            y1,
            color,
            width,
            fill,
        } if tr(&m) => {
            let kind = if ubz && kind == ShapeKind::Arrow {
                ShapeKind::Line
            } else {
                kind
            };
            Item::Shape {
                kind,
                m: IDENTITY,
                x0: x0 + m[4],
                y0: y0 + m[5],
                x1: x1 + m[4],
                y1: y1 + m[5],
                color,
                width,
                fill,
            }
        }
        Item::Stroke {
            m,
            color,
            width,
            points,
        } if tr(&m) => Item::Stroke {
            m: IDENTITY,
            color,
            width,
            points: points
                .iter()
                .map(|p| [p[0] + m[4], p[1] + m[5], 1.0])
                .collect(),
        },
        Item::Text {
            m,
            x,
            y,
            w,
            h,
            size,
            color,
            spans,
        } if tr(&m) => Item::Text {
            m: IDENTITY,
            x: x + m[4],
            y: y + m[5],
            w,
            h,
            size,
            color,
            spans,
        },
        Item::Image {
            m,
            x,
            y,
            w,
            h,
            href,
        } if tr(&m) => Item::Image {
            m: IDENTITY,
            x: x + m[4],
            y: y + m[5],
            w,
            h,
            href,
        },
        Item::Group(items) => Item::Group(items.iter().map(|i| canon(i, ubz)).collect()),
        other => other,
    }
}

fn canon_pages(pages: &[Page], ubz: bool) -> Vec<Page> {
    pages
        .iter()
        .map(|p| Page {
            background: p.background,
            grid: p.grid.clone(),
            items: p.items.iter().map(|i| canon(i, ubz)).collect(),
        })
        .collect()
}

#[test]
fn iwb_copy_reads_back_as_w1() {
    let xml = write_iwb(&encode(&w1_pages())).expect("écriture");
    let back = parse(&read_svg(xml.as_bytes(), Dialect::Iwb, 1).expect("lecture")).expect("liste");
    assert_eq!(canon_pages(&back, false), canon_pages(&w1_pages(), false));
}

#[test]
fn ubz_copy_reads_back_as_w1_with_arrow_as_line() {
    let pages = write_ubz_pages(&encode(&w1_pages())).expect("écriture");
    let mut back = Vec::new();
    for (i, xml) in pages.iter().enumerate() {
        back.extend(
            parse(&read_svg(xml.as_bytes(), Dialect::Ubz, i as u32 + 1).expect("lecture"))
                .expect("liste"),
        );
    }
    assert_eq!(canon_pages(&back, true), canon_pages(&w1_pages(), true));
}

#[test]
fn escaped_text_survives_both_formats() {
    let text = "a<b&c\"d'e\nf";
    let pages = vec![Page {
        background: None,
        grid: None,
        items: vec![Item::Text {
            m: IDENTITY,
            x: 1.0,
            y: 2.0,
            w: 50.0,
            h: 20.0,
            size: 12.0,
            color: [0, 0, 0],
            spans: vec![Span {
                text: text.into(),
                ..Span::default()
            }],
        }],
    }];
    let iwb = parse(
        &read_svg(
            write_iwb(&encode(&pages)).expect("iwb").as_bytes(),
            Dialect::Iwb,
            1,
        )
        .expect("lecture"),
    )
    .expect("liste");
    let ubz = parse(
        &read_svg(
            write_ubz_pages(&encode(&pages)).expect("ubz")[0].as_bytes(),
            Dialect::Ubz,
            1,
        )
        .expect("lecture"),
    )
    .expect("liste");
    for got in [&iwb, &ubz] {
        match &got[0].items[0] {
            Item::Text { spans, .. } => assert_eq!(
                spans.iter().map(|s| s.text.as_str()).collect::<String>(),
                text
            ),
            other => panic!("{other:?}"),
        }
    }
}
