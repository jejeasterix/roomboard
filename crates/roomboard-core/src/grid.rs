//! Grille de page (U31, C9) : modèle rangé en `Y.Map` (jamais `Any::Map`, G2), lecture tolérante (G4), accroche (G6, G7)
//! et lignes visibles (G9), en unités de page. Seul endroit qui sait quelles lignes existent (DAG1) : le rendu ne fait
//! que les caler sur les pixels ; l'export PDF les réutilisera.
//!
//! Accroche écrite d'après `nearestGridPoint`, `snapAxis` et `nearestLatticePoint` d'ActCraft (`core/src/gridsnap.cpp`,
//! GPL-3.0-only, même auteur, repris sous PolyForm Shield : voir `THIRD_PARTY_NOTICES.md`).
use yrs::{Any, Array, ArrayPrelim, In, Map, MapPrelim, MapRef, Out, ReadTxn, TransactionMut};

use crate::commands::CommandError;
use crate::element::{finite_positive, out_f64, out_string};
use crate::query::Bounds;

/// Types dessinés et aimantés ; tout autre `kind` est gardé tel quel, ignoré par le rendu et l'accroche (U31, C4).
pub const GRID_KINDS: [&str; 6] = ["squares", "lines", "dots", "isometric", "music", "seyes"];
/// Nombre maximal de niveaux écrits (HG9).
pub const MAX_GRID_LEVELS: usize = 16;
/// Plafond des points d'un niveau et des lignes d'une famille : au-delà, sauté entier, jamais tronqué (G9).
pub const MAX_GRID_DOTS: usize = 65_536;
pub const DEFAULT_GRID_COLOR: &str = "#000000";
pub const DEFAULT_GRID_LINE: &str = "solid";
/// Opacité des lignes fines du Seyès (G10).
pub const SEYES_FINE_ALPHA: f64 = 0.5;
/// Tolérance d'indice, en pas : une ligne posée sur un bord compte comme dedans.
const EPS: f64 = 1e-9;

/// Niveau de grille (U31) ; `kind` et `line` inconnus gardés tels quels.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct GridLevelView {
    pub kind: String,
    pub spacing_x: f64,
    pub spacing_y: f64,
    pub origin_x: f64,
    pub origin_y: f64,
    pub color: String,
    pub line: String,
    pub snap: bool,
    pub visible: bool,
}

/// Grille d'une page (U31, G4) ; `levels` dans l'ordre du document.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct GridView {
    pub visible: bool,
    pub snap: bool,
    pub above: bool,
    pub levels: Vec<GridLevelView>,
}

/// Grille demandée par `SetGrid` : même forme que la vue, réécrite en bloc (G5).
pub type GridInput = GridView;

/// Groupe de lignes d'un niveau (G9) : segments `x0, y0, x1, y1` et points `x, y` à la suite, en unités de page.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct LevelLines {
    pub color: String,
    pub line: String,
    pub alpha: f64,
    pub segments: Vec<f64>,
    pub dots: Vec<f64>,
}

/// Lignes visibles d'une grille ; un niveau rend 0 à 2 groupes (Seyès : principal, puis fines à `SEYES_FINE_ALPHA`).
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct GridLines {
    pub above: bool,
    pub levels: Vec<LevelLines>,
}

pub fn is_known_kind(kind: &str) -> bool {
    GRID_KINDS.contains(&kind)
}

#[cfg(test)]
mod tests {
    use super::*;
    use yrs::{Doc, Transact};

    const W: f64 = 1920.0;

    fn level(kind: &str, sx: f64, sy: f64) -> GridLevelView {
        GridLevelView {
            kind: kind.into(),
            spacing_x: sx,
            spacing_y: sy,
            origin_x: 0.0,
            origin_y: 0.0,
            color: "#000000".into(),
            line: "solid".into(),
            snap: true,
            visible: true,
        }
    }

    fn grid(levels: Vec<GridLevelView>) -> GridView {
        GridView {
            visible: true,
            snap: true,
            above: false,
            levels,
        }
    }

    fn num(v: f64) -> In {
        In::Any(Any::from(v))
    }

    fn page_with(value: In) -> (Doc, MapRef) {
        let doc = Doc::new();
        let page = doc.get_or_insert_map("page");
        {
            let mut txn = doc.transact_mut();
            page.insert(&mut txn, "grid", value);
        }
        (doc, page)
    }

    /// G4, Review Focus 2 : une grille mal formée ne rend jamais la page illisible.
    #[test]
    fn read_tolerates_malformed_grid() {
        let (doc, page) = page_with(In::from("pas une grille"));
        assert_eq!(read(&doc.transact(), &page), None);
        let (doc, page) = page_with(In::Map(MapPrelim::from([(
            "levels",
            In::from("pas un tableau"),
        )])));
        assert_eq!(
            read(&doc.transact(), &page),
            Some(GridView {
                visible: true,
                snap: false,
                above: false,
                levels: vec![]
            })
        );
        let (doc, page) = page_with(In::Map(MapPrelim::from([(
            "visible",
            In::Any(Any::Bool(false)),
        )])));
        assert_eq!(
            read(&doc.transact(), &page).map(|g| (g.visible, g.levels.len())),
            Some((false, 0))
        );
        let levels = In::Array(ArrayPrelim::from(vec![
            In::from("pas un niveau"),
            In::Map(MapPrelim::from([
                ("kind", In::from("squares")),
                ("spacingX", num(0.0)),
                ("spacingY", num(40.0)),
            ])),
            In::Map(MapPrelim::from([
                ("kind", In::from("squares")),
                ("spacingX", In::from("40")),
                ("spacingY", num(40.0)),
            ])),
            In::Map(MapPrelim::from([
                ("kind", In::from("squares")),
                ("spacingX", num(40.0)),
                ("spacingY", num(20.0)),
                ("originX", num(f64::NAN)),
            ])),
        ]));
        let (doc, page) = page_with(In::Map(MapPrelim::from([("levels", levels)])));
        let g = read(&doc.transact(), &page).expect("grille lisible");
        assert_eq!(
            g.levels,
            vec![GridLevelView {
                spacing_y: 20.0,
                ..level("squares", 40.0, 40.0)
            }]
        );
    }

    /// G2, GC9 : écrite en `Y.Map` (sinon `read` ne la relirait pas), relue à l'identique ; `None` la retire.
    #[test]
    fn grid_write_then_read_gives_the_same_view_and_none_removes() {
        let doc = Doc::new();
        let page = doc.get_or_insert_map("page");
        let g = GridView {
            visible: false,
            snap: true,
            above: true,
            levels: vec![
                GridLevelView {
                    origin_x: 5.0,
                    origin_y: -3.0,
                    color: "#7b68ee".into(),
                    line: "dashed".into(),
                    snap: false,
                    visible: false,
                    ..level("seyes", 30.24, 30.24)
                },
                level("hexagon", 1.0, 2.0),
            ],
        };
        {
            let mut txn = doc.transact_mut();
            write(&mut txn, &page, Some(&g));
        }
        assert!(matches!(
            page.get(&doc.transact(), "grid"),
            Some(Out::YMap(_))
        ));
        assert_eq!(read(&doc.transact(), &page), Some(g));
        {
            let mut txn = doc.transact_mut();
            write(&mut txn, &page, None);
        }
        assert_eq!(read(&doc.transact(), &page), None);
    }

    /// G2 : seuls les nombres et le format sont contrôlés ; `kind` et `line` inconnus s'écrivent.
    #[test]
    fn validate_grid_limits_numbers_and_format_only() {
        let ok = level("hexagon", 40.0, 40.0);
        assert_eq!(validate(&grid(vec![ok.clone(); MAX_GRID_LEVELS])), Ok(()));
        assert_eq!(validate(&grid(vec![])), Ok(()));
        assert_eq!(
            validate(&grid(vec![GridLevelView {
                line: "wavy".into(),
                ..ok.clone()
            }])),
            Ok(())
        );
        assert_eq!(
            validate(&grid(vec![ok.clone(); MAX_GRID_LEVELS + 1])),
            Err(CommandError::BadGrid)
        );
        for bad in [
            GridLevelView {
                spacing_x: -1.0,
                ..ok.clone()
            },
            GridLevelView {
                spacing_y: f64::INFINITY,
                ..ok.clone()
            },
            GridLevelView {
                origin_y: f64::NAN,
                ..ok.clone()
            },
            GridLevelView {
                kind: String::new(),
                ..ok.clone()
            },
            GridLevelView {
                color: String::new(),
                ..ok.clone()
            },
            GridLevelView {
                line: String::new(),
                ..ok.clone()
            },
        ] {
            assert_eq!(validate(&grid(vec![bad])), Err(CommandError::BadGrid));
        }
    }

    fn close(a: (f64, f64), b: (f64, f64)) -> bool {
        (a.0 - b.0).abs() < 1e-9 && (a.1 - b.1).abs() < 1e-9
    }

    /// S4 côté cœur : (13, 17) → (0, 0), (118, 97) → (120, 80).
    #[test]
    fn grid_squares_and_dots_snap_to_the_nearest_crossing() {
        for kind in ["squares", "dots"] {
            let g = grid(vec![level(kind, 40.0, 40.0)]);
            assert_eq!(snap_point(&g, W, (13.0, 17.0)), Some((0.0, 0.0)), "{kind}");
            assert_eq!(snap_point(&g, W, (118.0, 97.0)), Some((120.0, 80.0)), "{kind}");
        }
    }

    /// G6, HG10, Review Focus 3 : première ligne ≥ 0 et dernière ≤ largeur (borne absente d'ActCraft).
    #[test]
    fn snap_point_stays_on_page_lines() {
        let g = grid(vec![level("squares", 40.0, 40.0)]);
        assert_eq!(snap_point(&g, W, (-70.0, -90.0)), Some((0.0, 0.0)));
        assert_eq!(snap_point(&g, W, (1950.0, 10.0)), Some((1920.0, 0.0)));
        let shifted = grid(vec![GridLevelView {
            origin_x: 13.0,
            origin_y: -27.0,
            ..level("squares", 40.0, 40.0)
        }]);
        assert_eq!(snap_point(&shifted, W, (1950.0, -5.0)), Some((1893.0, 13.0)));
        assert_eq!(
            snap_point(&shifted, 5.0, (3.0, 3.0)),
            None,
            "aucune verticale dans une page de 5 de large"
        );
    }

    /// G3 : `lines` accroche y seul, `music` aux lignes des portées, `seyes` aux croisements fins.
    #[test]
    fn grid_lines_music_and_seyes_snap_on_their_lines() {
        let lines_kind = grid(vec![level("lines", 40.0, 40.0)]);
        assert_eq!(snap_point(&lines_kind, W, (1950.0, 10.0)), Some((1950.0, 0.0)), "x libre");
        let music = grid(vec![level("music", 7.0, 12.0)]);
        assert_eq!(snap_point(&music, W, (500.0, 70.0)), Some((500.0, 48.0)));
        assert_eq!(snap_point(&music, W, (500.0, 100.0)), Some((500.0, 120.0)));
        assert_eq!(snap_point(&music, W, (500.0, -300.0)), Some((500.0, 0.0)));
        let seyes = grid(vec![level("seyes", 30.24, 30.24)]);
        let q = snap_point(&seyes, W, (40.0, 9.0)).expect("seyes");
        assert!(close(q, (30.24, 7.56)), "{q:?}");
    }

    /// G3, G6 : réseau de côté `sx` (`spacingY` inutilisé), sommet le plus proche dans la page (force brute).
    #[test]
    fn grid_isometric_snaps_to_the_nearest_lattice_vertex_inside_the_page() {
        let iso = grid(vec![level("isometric", 40.0, 99.0)]);
        let h = 40.0 * 3f64.sqrt() / 2.0;
        assert!(close(snap_point(&iso, W, (36.0, 25.0)).expect("iso"), (h, 20.0)));
        assert!(close(snap_point(&iso, W, (-50.0, -50.0)).expect("iso"), (0.0, 0.0)));
        let far = snap_point(&iso, W, (5000.0, 10.0)).expect("iso");
        assert!(far.0 <= W && far.0 > W - h, "{far:?}");
        let d = |a: (f64, f64), p: (f64, f64)| (a.0 - p.0).powi(2) + (a.1 - p.1).powi(2);
        for p in [(17.0, 3.0), (51.3, 77.7), (100.0, 1000.0), (1900.0, 33.0)] {
            let q = snap_point(&iso, W, p).expect("iso");
            for m in 0..=55 {
                for n in -30..=60 {
                    let v = (f64::from(m) * h, f64::from(m) * 20.0 + f64::from(n) * 40.0);
                    if v.0 <= W && v.1 >= 0.0 {
                        assert!(d(q, p) <= d(v, p) + 1e-9, "{p:?} → {q:?}, plus proche : {v:?}");
                    }
                }
            }
        }
    }

    /// G6, HG3 : coupé → rien ; inconnu ou niveau sans accroche ignorés ; invisible accroche ; niveau le plus proche.
    #[test]
    fn grid_snap_rules_off_unknown_invisible_and_nearest_level() {
        let mut off = grid(vec![level("squares", 40.0, 40.0)]);
        off.snap = false;
        assert_eq!(snap_point(&off, W, (13.0, 17.0)), None);
        let ignored = grid(vec![
            level("hexagon", 40.0, 40.0),
            GridLevelView {
                snap: false,
                ..level("squares", 40.0, 40.0)
            },
        ]);
        assert_eq!(snap_point(&ignored, W, (13.0, 17.0)), None);
        let mut hidden = grid(vec![GridLevelView {
            visible: false,
            ..level("squares", 40.0, 40.0)
        }]);
        hidden.visible = false;
        assert_eq!(snap_point(&hidden, W, (13.0, 17.0)), Some((0.0, 0.0)));
        let two = grid(vec![
            level("squares", 40.0, 40.0),
            GridLevelView {
                origin_x: 15.0,
                origin_y: 15.0,
                ..level("squares", 40.0, 40.0)
            },
        ]);
        assert_eq!(snap_point(&two, W, (13.0, 17.0)), Some((15.0, 15.0)));
    }

    /// G7, S3 côté cœur : coin ou centre déplacé le plus proche de son point aimanté ; brut sans magnétisme.
    #[test]
    fn grid_snap_delta_moves_the_nearest_corner_or_center() {
        let g = grid(vec![level("squares", 40.0, 40.0)]);
        let b = Bounds {
            x0: 13.0,
            y0: 17.0,
            x1: 113.0,
            y1: 77.0,
        };
        assert_eq!(snap_delta(&g, W, b, (52.0, 31.0)), (57.0, 33.0), "centre (115, 78) → (120, 80)");
        let corner = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 60.0,
        };
        assert_eq!(snap_delta(&g, W, corner, (2.0, 3.0)), (0.0, 0.0), "coin (2, 3) → (0, 0)");
        let off = GridView { snap: false, ..g };
        assert_eq!(snap_delta(&off, W, b, (52.0, 31.0)), (52.0, 31.0));
    }

    /// Abscisses des verticales et ordonnées des horizontales d'un groupe.
    fn segs(l: &LevelLines) -> (Vec<f64>, Vec<f64>) {
        let (mut v, mut h) = (Vec::new(), Vec::new());
        for s in l.segments.chunks_exact(4) {
            if s[0] == s[2] {
                v.push(s[0]);
            } else if s[1] == s[3] {
                h.push(s[1]);
            }
        }
        (v, h)
    }

    const ZOOMS: [f64; 5] = [0.15, 0.37, 1.0, 2.5, 8.0];

    /// Partie visible du montage S5 (même formule que `visibleGridRect` de la page).
    fn view_rect(z: f64) -> Bounds {
        let (tx, ty) = (13.3, -1_000_007.0 * z);
        Bounds {
            x0: -tx / z,
            y0: -ty / z,
            x1: (800.0 - tx) / z,
            y1: (600.0 - ty) / z,
        }
    }

    fn at(g: &GridView, z: f64) -> GridLines {
        lines(g, W, view_rect(z), 4.0 / z, 8.0 / z).expect("grille visible")
    }

    fn colored(kind: &str, s: f64, color: &str) -> GridLevelView {
        GridLevelView {
            color: color.into(),
            ..level(kind, s, s)
        }
    }

    fn groups(l: &GridLines) -> Vec<(String, f64)> {
        l.levels.iter().map(|x| (x.color.clone(), x.alpha)).collect()
    }

    /// S5 (a) côté cœur, z = 1 : 20 verticales x = 40·i, 15 horizontales loin sous le haut de page.
    #[test]
    fn grid_squares_far_down_the_page_depend_on_the_view_only() {
        let l = at(&grid(vec![level("squares", 40.0, 40.0)]), 1.0);
        assert_eq!(l.levels.len(), 1);
        let (v, h) = segs(&l.levels[0]);
        assert_eq!(v, (0..20).map(|i| 40.0 * f64::from(i)).collect::<Vec<_>>());
        assert_eq!(
            h,
            (0..15).map(|k| 1_000_040.0 + 40.0 * f64::from(k)).collect::<Vec<_>>()
        );
    }

    /// G9, S5 « Présence » : famille sous 4 px sautée (Seyès fin avant principal), points sous 8 px sautés.
    #[test]
    fn grid_families_finer_than_four_pixels_are_skipped() {
        let a = grid(vec![
            colored("squares", 40.0, "#400000"),
            colored("squares", 20.0, "#200000"),
        ]);
        let b = grid(vec![colored("seyes", 30.24, "#3a5f0b")]);
        let c = grid(vec![colored("dots", 40.0, "#00ff00")]);
        let main = |color: &str| (color.to_string(), 1.0);
        assert_eq!(groups(&at(&a, 0.15)), vec![main("#400000")]);
        assert_eq!(groups(&at(&a, 0.37)), vec![main("#400000"), main("#200000")]);
        assert_eq!(groups(&at(&b, 0.15)), vec![main("#3a5f0b")]);
        assert_eq!(groups(&at(&b, 0.37)), vec![main("#3a5f0b")]);
        assert!(at(&c, 0.15).levels.is_empty());
        assert_eq!(groups(&at(&c, 0.37)), vec![main("#00ff00")]);
        for &z in &ZOOMS[2..] {
            assert_eq!(at(&a, z).levels.len(), 2, "z = {z}");
            assert_eq!(
                groups(&at(&b, z)),
                vec![main("#3a5f0b"), ("#3a5f0b".to_string(), SEYES_FINE_ALPHA)],
                "z = {z}"
            );
            assert_eq!(at(&c, z).levels.len(), 1, "z = {z}");
        }
    }

    /// G9, S5 « Pour tous les cas » : au plus 202 verticales et 152 horizontales par famille, 65 536 points par niveau.
    #[test]
    fn grid_line_and_dot_counts_are_bounded_by_the_view() {
        let all = [
            grid(vec![level("squares", 40.0, 40.0)]),
            grid(vec![level("squares", 20.0, 20.0)]),
            grid(vec![level("seyes", 30.24, 30.24)]),
            grid(vec![level("dots", 40.0, 40.0)]),
            grid(vec![level("isometric", 40.0, 40.0)]),
            grid(vec![level("music", 12.0, 12.0)]),
        ];
        for z in ZOOMS {
            for g in &all {
                for l in at(g, z).levels {
                    let (v, h) = segs(&l);
                    assert!(v.len() <= 202, "{} z = {z} : {} verticales", g.levels[0].kind, v.len());
                    assert!(h.len() <= 152, "{} z = {z} : {} horizontales", g.levels[0].kind, h.len());
                    assert!(l.dots.len() / 2 <= MAX_GRID_DOTS);
                }
            }
        }
    }

    /// G9, Review Focus 1 : plafond des points et des familles ; un niveau entier sauté, jamais tronqué.
    #[test]
    fn dots_over_the_cap_skip_the_whole_level() {
        let page = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: W,
            y1: 1080.0,
        };
        let g = grid(vec![level("dots", 1.0, 1.0)]);
        assert!(lines(&g, W, page, 0.0, 0.0).expect("visible").levels.is_empty());
        let small = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 99.0,
            y1: 99.0,
        };
        assert_eq!(
            lines(&g, W, small, 0.0, 0.0).expect("visible").levels[0].dots.len(),
            2 * 100 * 100
        );
        let thin = grid(vec![level("squares", 0.001, 0.001)]);
        assert!(lines(&thin, W, page, 0.0, 0.0).expect("visible").levels.is_empty());
    }

    /// G9 : grille invisible → `None` ; niveau invisible ou inconnu sauté ; vue hors page ou non finie → rien ;
    /// segments limités à `rect ∩ page` ; `above` recopié.
    #[test]
    fn grid_invisible_unknown_hidden_and_off_page_views() {
        let page = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: W,
            y1: 1080.0,
        };
        let mut hidden = grid(vec![level("squares", 40.0, 40.0)]);
        hidden.visible = false;
        assert_eq!(lines(&hidden, W, page, 4.0, 8.0), None);
        let skipped = grid(vec![
            level("hexagon", 40.0, 40.0),
            GridLevelView {
                visible: false,
                ..level("squares", 40.0, 40.0)
            },
        ]);
        assert!(lines(&skipped, W, page, 4.0, 8.0).expect("visible").levels.is_empty());
        let g = grid(vec![level("squares", 40.0, 40.0)]);
        for r in [
            Bounds {
                x0: 0.0,
                y0: -500.0,
                x1: W,
                y1: -10.0,
            },
            Bounds {
                x0: 2000.0,
                y0: 0.0,
                x1: 2500.0,
                y1: 100.0,
            },
            Bounds {
                x0: f64::NAN,
                ..page
            },
        ] {
            assert!(lines(&g, W, r, 4.0, 8.0).expect("visible").levels.is_empty(), "{r:?}");
        }
        let wide = Bounds {
            x0: -100.0,
            y0: -100.0,
            x1: 3000.0,
            y1: 50.0,
        };
        let l = lines(&g, W, wide, 4.0, 8.0).expect("visible");
        for s in l.levels[0].segments.chunks_exact(4) {
            assert!((0.0..=W).contains(&s[0]) && (0.0..=W).contains(&s[2]), "{s:?}");
            assert!((0.0..=50.0).contains(&s[1]) && (0.0..=50.0).contains(&s[3]), "{s:?}");
        }
        let mut up = grid(vec![level("squares", 40.0, 40.0)]);
        up.above = true;
        assert!(lines(&up, W, page, 4.0, 8.0).expect("visible").above);
    }

    /// G3 : obliques à ±30° par les sommets, verticales au pas s·√3/2 ; portées de 5 lignes ; `lines` sans verticale.
    #[test]
    fn grid_isometric_lines_pass_through_vertices_and_music_draws_staves() {
        let h = 40.0 * 3f64.sqrt() / 2.0;
        let r = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 200.0,
            y1: 200.0,
        };
        let iso = lines(&grid(vec![level("isometric", 40.0, 40.0)]), W, r, 1.0, 1.0).expect("visible");
        let s = &iso.levels[0].segments;
        assert_eq!(segs(&iso.levels[0]).0.len(), 6);
        assert!(s.iter().all(|c| (-1e-9..=200.0 + 1e-9).contains(c)));
        let on = |px: f64, py: f64, sign: f64| {
            s.chunks_exact(4).any(|q| {
                let (dx, dy) = (q[2] - q[0], q[3] - q[1]);
                dx > 0.0
                    && (dy / dx - sign / 3f64.sqrt()).abs() < 1e-9
                    && ((py - q[1]) - (px - q[0]) * dy / dx).abs() < 1e-6
                    && (q[0] - 1e-9..=q[2] + 1e-9).contains(&px)
            })
        };
        assert!(on(h, 20.0, 1.0) && on(h, 20.0, -1.0) && on(2.0 * h, 40.0, 1.0));
        let tiny = lines(&grid(vec![level("isometric", 4.0, 4.0)]), W, r, 4.0, 4.0).expect("visible");
        assert!(tiny.levels.is_empty(), "côté 4 : s·√3/2 ≈ 3,46 < 4");
        let staves = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: W,
            y1: 239.0,
        };
        let music = lines(&grid(vec![level("music", 7.0, 12.0)]), W, staves, 4.0, 8.0).expect("visible");
        assert_eq!(
            segs(&music.levels[0]).1,
            vec![0.0, 12.0, 24.0, 36.0, 48.0, 120.0, 132.0, 144.0, 156.0, 168.0]
        );
        let only_h = lines(&grid(vec![level("lines", 40.0, 40.0)]), W, staves, 4.0, 8.0).expect("visible");
        assert!(segs(&only_h.levels[0]).0.is_empty());
    }
}
