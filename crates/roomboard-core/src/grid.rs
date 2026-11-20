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
/// Lignes d'une portée (`music`, G3).
const STAFF_LINES: u8 = 5;

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

fn out_bool(o: Option<Out>) -> Option<bool> {
    match o {
        Some(Out::Any(Any::Bool(b))) => Some(b),
        _ => None,
    }
}

/// Grille lue avec tolérance (G4) : `grid` qui n'est pas un `Y.Map` → `None` ; `levels` absent ou qui n'est pas un
/// `Y.Array` → `[]` ; niveau qui n'est pas un `Y.Map`, sans pas finis > 0 ou sans `kind` non vide → absent de la vue,
/// gardé dans le document ; `color` et `line` absents ou vides → défaut. Toute vue lue passe donc `validate` telle quelle.
pub(crate) fn read<T: ReadTxn>(txn: &T, page: &MapRef) -> Option<GridView> {
    let Some(Out::YMap(g)) = page.get(txn, "grid") else {
        return None;
    };
    let levels = match g.get(txn, "levels") {
        Some(Out::YArray(a)) => a
            .iter(txn)
            .filter_map(|o| match o {
                Out::YMap(l) => read_level(txn, &l),
                _ => None,
            })
            .collect(),
        _ => Vec::new(),
    };
    Some(GridView {
        visible: out_bool(g.get(txn, "visible")).unwrap_or(true),
        snap: out_bool(g.get(txn, "snap")).unwrap_or(false),
        above: out_bool(g.get(txn, "above")).unwrap_or(false),
        levels,
    })
}

fn read_level<T: ReadTxn>(txn: &T, l: &MapRef) -> Option<GridLevelView> {
    let positive = |k: &str| out_f64(l.get(txn, k)).filter(|v| finite_positive(*v));
    let finite = |k: &str| {
        out_f64(l.get(txn, k))
            .filter(|v| v.is_finite())
            .unwrap_or(0.0)
    };
    let text = |k: &str| out_string(l.get(txn, k)).filter(|s| !s.is_empty());
    Some(GridLevelView {
        kind: text("kind")?,
        spacing_x: positive("spacingX")?,
        spacing_y: positive("spacingY")?,
        origin_x: finite("originX"),
        origin_y: finite("originY"),
        color: text("color").unwrap_or_else(|| DEFAULT_GRID_COLOR.to_string()),
        line: text("line").unwrap_or_else(|| DEFAULT_GRID_LINE.to_string()),
        snap: out_bool(l.get(txn, "snap")).unwrap_or(true),
        visible: out_bool(l.get(txn, "visible")).unwrap_or(true),
    })
}

/// Écrit la grille en bloc (G5) : `Y.Map` de tête, `Y.Array` de `Y.Map` pour les niveaux, jamais `Any::Map` (G2, GC9) ;
/// les clés inconnues de l'ancienne grille disparaissent (HG8). `None` retire le champ.
pub(crate) fn write(txn: &mut TransactionMut, page: &MapRef, grid: Option<&GridInput>) {
    let Some(g) = grid else {
        page.remove(txn, "grid");
        return;
    };
    let levels: Vec<In> = g.levels.iter().map(level_fields).collect();
    page.insert(
        txn,
        "grid",
        MapPrelim::from([
            ("visible", In::Any(Any::Bool(g.visible))),
            ("snap", In::Any(Any::Bool(g.snap))),
            ("above", In::Any(Any::Bool(g.above))),
            ("levels", In::Array(ArrayPrelim::from(levels))),
        ]),
    );
}

fn level_fields(l: &GridLevelView) -> In {
    In::Map(MapPrelim::from([
        ("kind", In::from(l.kind.as_str())),
        ("spacingX", In::Any(Any::from(l.spacing_x))),
        ("spacingY", In::Any(Any::from(l.spacing_y))),
        ("originX", In::Any(Any::from(l.origin_x))),
        ("originY", In::Any(Any::from(l.origin_y))),
        ("color", In::from(l.color.as_str())),
        ("line", In::from(l.line.as_str())),
        ("snap", In::Any(Any::Bool(l.snap))),
        ("visible", In::Any(Any::Bool(l.visible))),
    ]))
}

/// `BadGrid` (G2) : pas finis > 0, origine finie, `kind`, `color`, `line` non vides, au plus 16 niveaux.
pub(crate) fn validate(g: &GridInput) -> Result<(), CommandError> {
    let level_ok = |l: &GridLevelView| {
        finite_positive(l.spacing_x)
            && finite_positive(l.spacing_y)
            && l.origin_x.is_finite()
            && l.origin_y.is_finite()
            && !l.kind.is_empty()
            && !l.color.is_empty()
            && !l.line.is_empty()
    };
    if g.levels.len() <= MAX_GRID_LEVELS && g.levels.iter().all(level_ok) {
        Ok(())
    } else {
        Err(CommandError::BadGrid)
    }
}

fn dist2(a: (f64, f64), b: (f64, f64)) -> f64 {
    let (dx, dy) = (a.0 - b.0, a.1 - b.1);
    dx * dx + dy * dy
}

/// Ligne la plus proche sur un axe (`snapAxis` d'ActCraft) : indice borné à la première ligne `≥ 0` et, si `hi` est
/// donné, à la dernière `≤ hi` (borne nouvelle, HG10). `None` si la page n'a aucune ligne sur cet axe.
fn snap_axis(v: f64, origin: f64, step: f64, hi: Option<f64>) -> Option<f64> {
    let first = (-origin / step - EPS).ceil();
    let last = hi.map_or(f64::INFINITY, |h| ((h - origin) / step + EPS).floor());
    if first.is_nan() || last.is_nan() || first > last {
        return None;
    }
    Some(origin + ((v - origin) / step).round().clamp(first, last) * step)
}

/// Ligne de portée la plus proche (`music`, G3) : 5 lignes à `sy`, une portée tous les `10·sy`, lignes `y ≥ 0` seules.
fn snap_staff(y: f64, oy: f64, sy: f64) -> Option<f64> {
    let period = 10.0 * sy;
    let first = ((-oy - 4.0 * sy) / period - EPS).ceil();
    let k0 = ((y - oy - 2.0 * sy) / period).round().max(first);
    let mut best: Option<f64> = None;
    for k in [k0 - 1.0, k0, k0 + 1.0] {
        for l in 0..STAFF_LINES {
            let c = oy + k * period + f64::from(l) * sy;
            if c < -EPS * sy {
                continue;
            }
            if best.is_none_or(|b| (c - y).abs() < (b - y).abs()) {
                best = Some(c);
            }
        }
    }
    best
}

/// Sommet du réseau isométrique le plus proche (G3, G6), côté `s = spacingX` : base `b1 = (s·√3/2, s/2)`, `b2 = (0, s)`,
/// déjà réduite (`nearestLatticePoint` d'ActCraft). Colonnes `x = ox + u·s·√3/2` : la plus proche et ses deux voisines,
/// bornées à `0 ≤ x ≤ width` ; dans chaque colonne (pas vertical `s`), le sommet le plus proche borné à `y ≥ 0`. Les
/// colonnes `u ± 2` ont le même décalage vertical que `u` et sont plus loin : ces trois colonnes suffisent, et aucun
/// voisin hors page n'est jamais rendu.
fn snap_lattice(l: &GridLevelView, width: f64, (x, y): (f64, f64)) -> Option<(f64, f64)> {
    let s = l.spacing_x;
    let h = s * 3f64.sqrt() / 2.0;
    let (ox, oy) = (l.origin_x, l.origin_y);
    let umin = (-ox / h - EPS).ceil();
    let umax = ((width - ox) / h + EPS).floor();
    if umin.is_nan() || umax.is_nan() || umin > umax {
        return None;
    }
    let u0 = ((x - ox) / h).round().clamp(umin, umax);
    let mut best: Option<((f64, f64), f64)> = None;
    for u in [u0 - 1.0, u0, u0 + 1.0] {
        if !(umin..=umax).contains(&u) {
            continue;
        }
        let base = oy + u * s / 2.0;
        let vmin = (-base / s - EPS).ceil();
        let v = ((y - base) / s).round().max(vmin);
        let q = (ox + u * h, base + v * s);
        let d = dist2(q, (x, y));
        if best.is_none_or(|(_, bd)| d < bd) {
            best = Some((q, d));
        }
    }
    best.map(|(q, _)| q)
}

/// Point aimanté d'un niveau (G3) ; `None` pour un `kind` inconnu ou une page sans ligne.
fn snap_level(l: &GridLevelView, width: f64, (x, y): (f64, f64)) -> Option<(f64, f64)> {
    let (sx, sy, ox, oy) = (l.spacing_x, l.spacing_y, l.origin_x, l.origin_y);
    match l.kind.as_str() {
        "squares" | "dots" => Some((
            snap_axis(x, ox, sx, Some(width))?,
            snap_axis(y, oy, sy, None)?,
        )),
        "lines" => Some((x, snap_axis(y, oy, sy, None)?)),
        "seyes" => Some((
            snap_axis(x, ox, sx, Some(width))?,
            snap_axis(y, oy, sy / 4.0, None)?,
        )),
        "music" => Some((x, snap_staff(y, oy, sy)?)),
        "isometric" => snap_lattice(l, width, (x, y)),
        _ => None,
    }
}

/// Point aimanté (G6, `nearestGridPoint` d'ActCraft) : `None` si le magnétisme est coupé ou si aucun niveau aimanté
/// d'un type connu n'accroche ; sinon le candidat le plus proche (distance euclidienne, sans seuil), le premier niveau
/// gagnant à égalité. Une grille ou un niveau invisible accroche quand même (HG3).
pub fn snap_point(g: &GridView, width: f64, p: (f64, f64)) -> Option<(f64, f64)> {
    if !g.snap {
        return None;
    }
    let mut best: Option<((f64, f64), f64)> = None;
    for l in g.levels.iter().filter(|l| l.snap && is_known_kind(&l.kind)) {
        let Some(q) = snap_level(l, width, p) else {
            continue;
        };
        let d = dist2(q, p);
        if best.is_none_or(|(_, bd)| d < bd) {
            best = Some((q, d));
        }
    }
    best.map(|(q, _)| q)
}

/// Déplacement aimanté (G7) : candidats = 4 coins puis centre de `b`, déplacés de `(dx, dy)` ; on garde celui dont le
/// point aimanté `q` est le plus proche (le premier à égalité) et le déplacement rendu est `q − candidat d'origine`,
/// exactement nul quand l'élément revient à sa place ; brut sans accroche.
pub fn snap_delta(g: &GridView, width: f64, b: Bounds, (dx, dy): (f64, f64)) -> (f64, f64) {
    let (cx, cy) = ((b.x0 + b.x1) / 2.0, (b.y0 + b.y1) / 2.0);
    let mut best: Option<((f64, f64), f64)> = None;
    for (x, y) in [
        (b.x0, b.y0),
        (b.x1, b.y0),
        (b.x0, b.y1),
        (b.x1, b.y1),
        (cx, cy),
    ] {
        let c = (x + dx, y + dy);
        let Some(q) = snap_point(g, width, c) else {
            continue;
        };
        let d = dist2(q, c);
        if best.is_none_or(|(_, bd)| d < bd) {
            best = Some(((q.0 - x, q.1 - y), d));
        }
    }
    best.map_or((dx, dy), |(delta, _)| delta)
}

/// Indices `k` (premier, dernier) tels que `o + k·step` ∈ [lo, hi] ; `(0, -1)` si aucun ; `None` si leur nombre dépasse
/// `MAX_GRID_DOTS` (famille sautée entière) ou n'est pas fini.
fn indices(o: f64, step: f64, lo: f64, hi: f64) -> Option<(i64, i64)> {
    capped_indices(o, step, lo, hi, MAX_GRID_DOTS)
}

/// `indices` sous un plafond donné (portées : `MAX_GRID_DOTS / 5`, pour plafonner leurs lignes).
fn capped_indices(o: f64, step: f64, lo: f64, hi: f64, cap: usize) -> Option<(i64, i64)> {
    let first = ((lo - o) / step - EPS).ceil();
    let last = ((hi - o) / step + EPS).floor();
    if !first.is_finite() || !last.is_finite() {
        return None;
    }
    if last < first {
        return Some((0, -1));
    }
    if last - first + 1.0 > cap as f64 {
        return None;
    }
    Some((first as i64, last as i64))
}

fn verticals(out: &mut Vec<f64>, o: f64, step: f64, c: &Bounds) {
    if let Some((a, b)) = indices(o, step, c.x0, c.x1) {
        for k in a..=b {
            let x = o + k as f64 * step;
            out.extend([x, c.y0, x, c.y1]);
        }
    }
}

fn horizontals(out: &mut Vec<f64>, o: f64, step: f64, c: &Bounds, keep: impl Fn(i64) -> bool) {
    if let Some((a, b)) = indices(o, step, c.y0, c.y1) {
        for k in (a..=b).filter(|k| keep(*k)) {
            let y = o + k as f64 * step;
            out.extend([c.x0, y, c.x1, y]);
        }
    }
}

/// Portées (`music`) : 5 lignes à `sy`, une portée tous les `10·sy` ; le plafond porte sur les lignes, donc au plus
/// `MAX_GRID_DOTS / 5` portées, sinon la famille est sautée entière.
fn staves(out: &mut Vec<f64>, oy: f64, sy: f64, c: &Bounds) {
    let period = 10.0 * sy;
    let cap = MAX_GRID_DOTS / usize::from(STAFF_LINES);
    if let Some((a, b)) = capped_indices(oy, period, c.y0 - 4.0 * sy, c.y1, cap) {
        for k in a..=b {
            for l in 0..STAFF_LINES {
                let y = oy + k as f64 * period + f64::from(l) * sy;
                if (c.y0..=c.y1).contains(&y) {
                    out.extend([c.x0, y, c.x1, y]);
                }
            }
        }
    }
}

/// Segment de la droite `(px, py) + t·(dx, dy)` dans `c` (Liang-Barsky) ; `None` si elle ne le traverse pas.
fn clip_line((px, py): (f64, f64), (dx, dy): (f64, f64), c: &Bounds) -> Option<[f64; 4]> {
    let (mut t0, mut t1) = (f64::NEG_INFINITY, f64::INFINITY);
    for (p, q) in [
        (-dx, px - c.x0),
        (dx, c.x1 - px),
        (-dy, py - c.y0),
        (dy, c.y1 - py),
    ] {
        if p == 0.0 {
            if q < 0.0 {
                return None;
            }
            continue;
        }
        let r = q / p;
        if p < 0.0 {
            t0 = t0.max(r);
        } else {
            t1 = t1.min(r);
        }
    }
    if t0 < t1 {
        Some([px + t0 * dx, py + t0 * dy, px + t1 * dx, py + t1 * dy])
    } else {
        None
    }
}

/// Réseau isométrique (G3) : verticales au pas `s·√3/2`, puis deux familles `y = oy + n·s ± (x − ox)/√3`, qui passent
/// toutes par les sommets `ox + m·s·√3/2, oy + m·s/2 + n·s`.
fn triangles(out: &mut Vec<f64>, ox: f64, oy: f64, s: f64, c: &Bounds) {
    verticals(out, ox, s * 3f64.sqrt() / 2.0, c);
    let t = 1.0 / 3f64.sqrt();
    for sign in [1.0, -1.0] {
        let (ya, yb) = (sign * (c.x0 - ox) * t, sign * (c.x1 - ox) * t);
        let Some((a, b)) = indices(oy, s, c.y0 - ya.max(yb), c.y1 - ya.min(yb)) else {
            continue;
        };
        for n in a..=b {
            if let Some(seg) = clip_line((ox, oy + n as f64 * s), (1.0, sign * t), c) {
                out.extend(seg);
            }
        }
    }
}

/// Points d'un niveau `dots` ; rien si leur nombre (colonnes × rangées) dépasse `MAX_GRID_DOTS`.
fn dot_grid(out: &mut Vec<f64>, l: &GridLevelView, c: &Bounds) {
    let (Some((ia, ib)), Some((ja, jb))) = (
        indices(l.origin_x, l.spacing_x, c.x0, c.x1),
        indices(l.origin_y, l.spacing_y, c.y0, c.y1),
    ) else {
        return;
    };
    let count = (ib - ia + 1).max(0) as u64 * (jb - ja + 1).max(0) as u64;
    if count > MAX_GRID_DOTS as u64 {
        return;
    }
    for j in ja..=jb {
        let y = l.origin_y + j as f64 * l.spacing_y;
        for i in ia..=ib {
            out.extend([l.origin_x + i as f64 * l.spacing_x, y]);
        }
    }
}

fn level_lines(
    l: &GridLevelView,
    c: &Bounds,
    min_step: f64,
    min_dot_step: f64,
    out: &mut Vec<LevelLines>,
) {
    let (sx, sy, ox, oy) = (l.spacing_x, l.spacing_y, l.origin_x, l.origin_y);
    let (mut main, mut fine, mut dots) = (Vec::new(), Vec::new(), Vec::new());
    match l.kind.as_str() {
        "squares" => {
            if sx >= min_step {
                verticals(&mut main, ox, sx, c);
            }
            if sy >= min_step {
                horizontals(&mut main, oy, sy, c, |_| true);
            }
        }
        "lines" => {
            if sy >= min_step {
                horizontals(&mut main, oy, sy, c, |_| true);
            }
        }
        "dots" => {
            if sx >= min_dot_step && sy >= min_dot_step {
                dot_grid(&mut dots, l, c);
            }
        }
        "isometric" => {
            if sx * 3f64.sqrt() / 2.0 >= min_step {
                triangles(&mut main, ox, oy, sx, c);
            }
        }
        "music" => {
            if sy >= min_step {
                staves(&mut main, oy, sy, c);
            }
        }
        "seyes" => {
            if sx >= min_step {
                verticals(&mut main, ox, sx, c);
            }
            if sy >= min_step {
                horizontals(&mut main, oy, sy, c, |_| true);
            }
            if sy / 4.0 >= min_step {
                horizontals(&mut fine, oy, sy / 4.0, c, |k| k.rem_euclid(4) != 0);
            }
        }
        _ => {}
    }
    if !main.is_empty() || !dots.is_empty() {
        out.push(LevelLines {
            color: l.color.clone(),
            line: l.line.clone(),
            alpha: 1.0,
            segments: main,
            dots,
        });
    }
    if !fine.is_empty() {
        out.push(LevelLines {
            color: l.color.clone(),
            line: l.line.clone(),
            alpha: SEYES_FINE_ALPHA,
            segments: fine,
            dots: Vec::new(),
        });
    }
}

/// Lignes visibles (G9), en unités de page, limitées à `rect ∩ page` (`0 ≤ x ≤ width`, `y ≥ 0`). `None` si la grille est
/// invisible. Niveau invisible ou d'un `kind` inconnu sauté ; famille sautée si son pas est `< min_step` ; points sautés
/// si un pas est `< min_dot_step` ou si leur nombre dépasse `MAX_GRID_DOTS`. Le nombre de lignes dépend de `rect`,
/// jamais de la distance au haut de page.
pub fn lines(
    g: &GridView,
    width: f64,
    rect: Bounds,
    min_step: f64,
    min_dot_step: f64,
) -> Option<GridLines> {
    if !g.visible {
        return None;
    }
    let mut levels = Vec::new();
    let finite = [rect.x0, rect.y0, rect.x1, rect.y1, width]
        .iter()
        .all(|v| v.is_finite());
    let c = Bounds {
        x0: rect.x0.max(0.0),
        y0: rect.y0.max(0.0),
        x1: rect.x1.min(width),
        y1: rect.y1,
    };
    if finite && c.x0 <= c.x1 && c.y0 <= c.y1 {
        for l in g
            .levels
            .iter()
            .filter(|l| l.visible && is_known_kind(&l.kind))
        {
            level_lines(l, &c, min_step, min_dot_step, &mut levels);
        }
    }
    Some(GridLines {
        above: g.above,
        levels,
    })
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
            assert_eq!(
                snap_point(&g, W, (118.0, 97.0)),
                Some((120.0, 80.0)),
                "{kind}"
            );
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
        assert_eq!(
            snap_point(&shifted, W, (1950.0, -5.0)),
            Some((1893.0, 13.0))
        );
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
        assert_eq!(
            snap_point(&lines_kind, W, (1950.0, 10.0)),
            Some((1950.0, 0.0)),
            "x libre"
        );
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
        assert!(close(
            snap_point(&iso, W, (36.0, 25.0)).expect("iso"),
            (h, 20.0)
        ));
        assert!(close(
            snap_point(&iso, W, (-50.0, -50.0)).expect("iso"),
            (0.0, 0.0)
        ));
        let far = snap_point(&iso, W, (5000.0, 10.0)).expect("iso");
        assert!(far.0 <= W && far.0 > W - h, "{far:?}");
        let d = |a: (f64, f64), p: (f64, f64)| (a.0 - p.0).powi(2) + (a.1 - p.1).powi(2);
        for p in [(17.0, 3.0), (51.3, 77.7), (100.0, 1000.0), (1900.0, 33.0)] {
            let q = snap_point(&iso, W, p).expect("iso");
            for m in 0..=55 {
                for n in -30..=60 {
                    let v = (f64::from(m) * h, f64::from(m) * 20.0 + f64::from(n) * 40.0);
                    if v.0 <= W && v.1 >= 0.0 {
                        assert!(
                            d(q, p) <= d(v, p) + 1e-9,
                            "{p:?} → {q:?}, plus proche : {v:?}"
                        );
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
        assert_eq!(
            snap_delta(&g, W, b, (52.0, 31.0)),
            (57.0, 33.0),
            "centre (115, 78) → (120, 80)"
        );
        let corner = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 100.0,
            y1: 60.0,
        };
        assert_eq!(
            snap_delta(&g, W, corner, (2.0, 3.0)),
            (0.0, 0.0),
            "coin (2, 3) → (0, 0)"
        );
        let off = GridView { snap: false, ..g };
        assert_eq!(snap_delta(&off, W, b, (52.0, 31.0)), (52.0, 31.0));
    }

    /// Abscisses des verticales et ordonnées des horizontales d'un groupe.
    fn segs(l: &LevelLines) -> (Vec<f64>, Vec<f64>) {
        let (mut v, mut h) = (Vec::new(), Vec::new());
        for s in l.segments.as_chunks::<4>().0 {
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
        l.levels
            .iter()
            .map(|x| (x.color.clone(), x.alpha))
            .collect()
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
            (0..15)
                .map(|k| 1_000_040.0 + 40.0 * f64::from(k))
                .collect::<Vec<_>>()
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
        assert_eq!(
            groups(&at(&a, 0.37)),
            vec![main("#400000"), main("#200000")]
        );
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
                    assert!(
                        v.len() <= 202,
                        "{} z = {z} : {} verticales",
                        g.levels[0].kind,
                        v.len()
                    );
                    assert!(
                        h.len() <= 152,
                        "{} z = {z} : {} horizontales",
                        g.levels[0].kind,
                        h.len()
                    );
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
        assert!(lines(&g, W, page, 0.0, 0.0)
            .expect("visible")
            .levels
            .is_empty());
        let small = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: 99.0,
            y1: 99.0,
        };
        assert_eq!(
            lines(&g, W, small, 0.0, 0.0).expect("visible").levels[0]
                .dots
                .len(),
            2 * 100 * 100
        );
        let thin = grid(vec![level("squares", 0.001, 0.001)]);
        assert!(lines(&thin, W, page, 0.0, 0.0)
            .expect("visible")
            .levels
            .is_empty());
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
        assert!(lines(&skipped, W, page, 4.0, 8.0)
            .expect("visible")
            .levels
            .is_empty());
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
            assert!(
                lines(&g, W, r, 4.0, 8.0)
                    .expect("visible")
                    .levels
                    .is_empty(),
                "{r:?}"
            );
        }
        let wide = Bounds {
            x0: -100.0,
            y0: -100.0,
            x1: 3000.0,
            y1: 50.0,
        };
        let l = lines(&g, W, wide, 4.0, 8.0).expect("visible");
        for s in l.levels[0].segments.as_chunks::<4>().0 {
            assert!(
                (0.0..=W).contains(&s[0]) && (0.0..=W).contains(&s[2]),
                "{s:?}"
            );
            assert!(
                (0.0..=50.0).contains(&s[1]) && (0.0..=50.0).contains(&s[3]),
                "{s:?}"
            );
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
        let iso =
            lines(&grid(vec![level("isometric", 40.0, 40.0)]), W, r, 1.0, 1.0).expect("visible");
        let s = &iso.levels[0].segments;
        assert_eq!(segs(&iso.levels[0]).0.len(), 6);
        assert!(s.iter().all(|c| (-1e-9..=200.0 + 1e-9).contains(c)));
        let on = |px: f64, py: f64, sign: f64| {
            s.as_chunks::<4>().0.iter().any(|q| {
                let (dx, dy) = (q[2] - q[0], q[3] - q[1]);
                dx > 0.0
                    && (dy / dx - sign / 3f64.sqrt()).abs() < 1e-9
                    && ((py - q[1]) - (px - q[0]) * dy / dx).abs() < 1e-6
                    && (q[0] - 1e-9..=q[2] + 1e-9).contains(&px)
            })
        };
        assert!(on(h, 20.0, 1.0) && on(h, 20.0, -1.0) && on(2.0 * h, 40.0, 1.0));
        let tiny =
            lines(&grid(vec![level("isometric", 4.0, 4.0)]), W, r, 4.0, 4.0).expect("visible");
        assert!(tiny.levels.is_empty(), "côté 4 : s·√3/2 ≈ 3,46 < 4");
        let staves = Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: W,
            y1: 239.0,
        };
        let music =
            lines(&grid(vec![level("music", 7.0, 12.0)]), W, staves, 4.0, 8.0).expect("visible");
        assert_eq!(
            segs(&music.levels[0]).1,
            vec![0.0, 12.0, 24.0, 36.0, 48.0, 120.0, 132.0, 144.0, 156.0, 168.0]
        );
        let only_h =
            lines(&grid(vec![level("lines", 40.0, 40.0)]), W, staves, 4.0, 8.0).expect("visible");
        assert!(segs(&only_h.levels[0]).0.is_empty());
    }

    /// G7, relecture T1 : élément aligné ramené à sa place → déplacement exactement nul. Le déplacement rendu est
    /// `q − coin d'origine` ; `dx + (q − (coin + dx))` laisserait ~3e-15 ici.
    #[test]
    fn grid_snap_delta_back_in_place_is_exactly_zero() {
        let g = grid(vec![level("squares", 40.0, 40.0)]);
        let b = Bounds {
            x0: 70.0,
            y0: 50.0,
            x1: 170.0,
            y1: 110.0,
        };
        assert_eq!(snap_delta(&g, W, b, (1.3, 0.7)), (0.0, 0.0));
    }

    /// G4, relecture T2 : toute grille relue est acceptée telle quelle par `SetGrid` ; niveau sans `kind` ou à `kind`
    /// vide écarté de la vue, `color` et `line` vides ramenés au défaut de la lecture.
    #[test]
    fn read_grid_is_always_accepted_back_by_validate() {
        let levels = In::Array(ArrayPrelim::from(vec![
            In::Map(MapPrelim::from([
                ("spacingX", num(40.0)),
                ("spacingY", num(40.0)),
            ])),
            In::Map(MapPrelim::from([
                ("kind", In::from("")),
                ("spacingX", num(40.0)),
                ("spacingY", num(40.0)),
            ])),
            In::Map(MapPrelim::from([
                ("kind", In::from("squares")),
                ("spacingX", num(40.0)),
                ("spacingY", num(40.0)),
                ("color", In::from("")),
                ("line", In::from("")),
            ])),
            In::Map(MapPrelim::from([
                ("kind", In::from("dots")),
                ("spacingX", num(20.0)),
                ("spacingY", num(20.0)),
            ])),
        ]));
        let (doc, page) = page_with(In::Map(MapPrelim::from([("levels", levels)])));
        let g = read(&doc.transact(), &page).expect("grille lisible");
        assert_eq!(
            g.levels,
            vec![level("squares", 40.0, 40.0), level("dots", 20.0, 20.0)]
        );
        assert_eq!(validate(&g), Ok(()));
    }

    /// G9, relecture T1 : le plafond des portées porte sur les lignes (5 par portée), comme `MAX_GRID_DOTS` le dit.
    #[test]
    fn grid_music_cap_counts_lines_not_staves() {
        let music = grid(vec![level("music", 7.0, 0.01)]);
        let to = |y1: f64| Bounds {
            x0: 0.0,
            y0: 0.0,
            x1: W,
            y1,
        };
        // 20 001 portées ≤ 65 536, mais ~100 000 lignes : niveau sauté entier.
        assert!(lines(&music, W, to(2000.0), 0.0, 0.0)
            .expect("visible")
            .levels
            .is_empty());
        // 10 001 portées ≤ 65 536 / 5 : dessinées, sous le plafond des lignes.
        let l = lines(&music, W, to(1000.0), 0.0, 0.0).expect("visible");
        let n = l.levels[0].segments.len() / 4;
        assert!(n > 0 && n <= MAX_GRID_DOTS, "{n} lignes");
    }
}
