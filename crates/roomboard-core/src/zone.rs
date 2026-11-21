//! Zone fermée du pot (C8, U28 P3, DA-Z1, DA-Z2) : les murs de la page sont rastérisés sur la vue (1 cellule = 1 px de la
//! vue = `tol / 2` en monde), dilatés d'une cellule (voisinage 8 : les écarts ≤ 2 px se ferment), puis le clic diffuse
//! en 4-connexité. Bord de l'emprise atteint : zone ouverte. Sinon, la région agrandie de 2 cellules, moins les polygones
//! exacts des murs (`i_overlay`), donne la forme qui contient le clic. `closed_zone` est pure : le Worker du repli DA-Z5
//! n'aura qu'à l'appeler. Mémoire : un seul masque `u8` (2²² cellules au plus), rendu à la fin (Q20).

use i_overlay::core::fill_rule::FillRule;
use i_overlay::core::overlay_rule::OverlayRule;
use i_overlay::float::overlay::FloatOverlay;
use yrs::{Array, Map, MapRef, Out, ReadTxn};

use crate::commands::{read_shape, read_stroke};
use crate::document::Document;
use crate::element::{out_string, out_transform};
use crate::fill_element::read_fill;
use crate::query::{world_outline, Bounds};
use crate::shape::{shape_polygon, shape_ring};

/// Plafond du masque (Q20) : 2²² cellules, 4 Mio.
pub const MAX_CELLS: usize = 1 << 22;
/// Px de la vue par cellule, essayés dans l'ordre (Q20) ; la dilatation reste d'une cellule.
const FACTORS: [f64; 3] = [1.0, 2.0, 4.0];
const FREE: u8 = 0;
const WALL: u8 = 1;
const REGION: u8 = 2;

type Contour = Vec<[f64; 2]>;

/// Mur d'une zone (Q8) : anneaux monde (paires x, y), règle de remplissage, boîte des sommets finis.
#[derive(Debug, Clone, PartialEq)]
pub struct Wall {
    pub rings: Vec<Vec<f32>>,
    pub even_odd: bool,
    pub bounds: Bounds,
}

/// Décision du clic (Q10) ; `Closed` : anneaux monde `[x0, y0, x1, y1, …]`, extérieur d'abord, trous ensuite.
#[derive(Debug, Clone, PartialEq)]
pub enum Zone {
    Outside,
    OnWall,
    Open,
    Closed(Vec<Vec<f64>>),
}

/// Double de l'aire signée (positive dans le sens de `i_overlay` pour un extérieur).
fn area2(r: &[[f64; 2]]) -> f64 {
    let n = r.len();
    (0..n)
        .map(|i| {
            let (a, b) = (r[i], r[(i + 1) % n]);
            a[0] * b[1] - b[0] * a[1]
        })
        .sum()
}

impl Wall {
    /// `None` sans aucun sommet fini.
    pub fn new(rings: Vec<Vec<f32>>, even_odd: bool) -> Option<Wall> {
        let mut b: Option<Bounds> = None;
        for c in rings.iter().flat_map(|r| r.as_chunks::<2>().0) {
            if !(c[0].is_finite() && c[1].is_finite()) {
                continue;
            }
            let (x, y) = (f64::from(c[0]), f64::from(c[1]));
            b = Some(match b {
                None => Bounds {
                    x0: x,
                    y0: y,
                    x1: x,
                    y1: y,
                },
                Some(o) => Bounds {
                    x0: o.x0.min(x),
                    y0: o.y0.min(y),
                    x1: o.x1.max(x),
                    y1: o.y1.max(y),
                },
            });
        }
        Some(Wall {
            rings,
            even_odd,
            bounds: b?,
        })
    }

    /// Anneaux de 3 sommets finis au moins, en f64.
    fn contours(&self) -> Vec<Contour> {
        self.rings
            .iter()
            .map(|r| {
                r.as_chunks::<2>()
                    .0
                    .iter()
                    .filter(|c| c[0].is_finite() && c[1].is_finite())
                    .map(|c| [f64::from(c[0]), f64::from(c[1])])
                    .collect::<Contour>()
            })
            .filter(|c| c.len() >= 3)
            .collect()
    }
}

/// Emprise du masque : boîte des murs agrandie de 2 cellules (Q20).
#[derive(Debug, Clone, Copy, PartialEq)]
pub(crate) struct Grid {
    pub w: usize,
    pub h: usize,
    pub cell: f64,
    pub origin: [f64; 2],
}

impl Grid {
    /// Cellule du point (x, y) monde, `None` hors de l'emprise : calculée avant d'allouer le masque (Q10, « sans
    /// rastériser »).
    fn cell_of(&self, x: f64, y: f64) -> Option<(usize, usize)> {
        let i = ((x - self.origin[0]) / self.cell).floor();
        let j = ((y - self.origin[1]) / self.cell).floor();
        (i >= 0.0 && j >= 0.0 && i < self.w as f64 && j < self.h as f64)
            .then_some((i as usize, j as usize))
    }
}

fn walls_bounds(walls: &[Wall]) -> Option<Bounds> {
    walls.iter().map(|w| w.bounds).reduce(|a, b| Bounds {
        x0: a.x0.min(b.x0),
        y0: a.y0.min(b.y0),
        x1: a.x1.max(b.x1),
        y1: a.y1.max(b.y1),
    })
}

/// Grille du clic à `tol` : 1, puis 2, puis 4 px de la vue par cellule, la première qui tient sous `MAX_CELLS`.
pub(crate) fn fit(walls: &[Wall], tol: f64) -> Option<Grid> {
    let b = walls_bounds(walls)?;
    FACTORS.iter().find_map(|f| {
        let cell = tol / 2.0 * f;
        let w = ((b.x1 - b.x0) / cell).ceil() + 4.0;
        let h = ((b.y1 - b.y0) / cell).ceil() + 4.0;
        (w * h <= MAX_CELLS as f64).then_some(Grid {
            w: w as usize,
            h: h as usize,
            cell,
            origin: [b.x0 - 2.0 * cell, b.y0 - 2.0 * cell],
        })
    })
}

#[cfg(test)]
thread_local! {
    /// Masques alloués par le thread du test (Q10 : un clic hors de l'emprise n'en alloue aucun).
    static MASKS: std::cell::Cell<usize> = const { std::cell::Cell::new(0) };
}

/// Masque unique (Q20) : `FREE`, `WALL`, `REGION`, une cellule par octet.
struct Mask {
    w: usize,
    h: usize,
    cell: f64,
    origin: [f64; 2],
    cells: Vec<u8>,
}

impl Mask {
    fn new(g: Grid) -> Mask {
        #[cfg(test)]
        MASKS.with(|n| n.set(n.get() + 1));
        Mask {
            w: g.w,
            h: g.h,
            cell: g.cell,
            origin: g.origin,
            cells: vec![FREE; g.w * g.h],
        }
    }

    /// Première cellule dont le centre est ≥ `v` sur un axe d'origine `o`, bornée à [0, n].
    fn first_centre(v: f64, o: f64, c: f64, n: usize) -> usize {
        let k = ((v - o) / c - 0.5).ceil();
        if k <= 0.0 {
            0
        } else if k >= n as f64 {
            n
        } else {
            k as usize
        }
    }

    /// Balayage par lignes : chaque arête coupe les lignes dont le centre est dans [ya, yb) ; cellules dont le centre
    /// est dedans (non-nul ou pair-impair selon le mur) marquées `WALL`.
    fn paint(&mut self, wall: &Wall) {
        let (ox, oy, c) = (self.origin[0], self.origin[1], self.cell);
        let mut xs: Vec<(usize, f64, i32)> = Vec::new();
        for ring in wall.contours() {
            let n = ring.len();
            for k in 0..n {
                let ([x0, y0], [x1, y1]) = (ring[k], ring[(k + 1) % n]);
                if y0 == y1 {
                    continue;
                }
                let (d, ya, yb, xa, xb) = if y0 < y1 {
                    (1, y0, y1, x0, x1)
                } else {
                    (-1, y1, y0, x1, x0)
                };
                for j in
                    Self::first_centre(ya, oy, c, self.h)..Self::first_centre(yb, oy, c, self.h)
                {
                    let yc = oy + (j as f64 + 0.5) * c;
                    xs.push((j, xa + (yc - ya) * (xb - xa) / (yb - ya), d));
                }
            }
        }
        xs.sort_unstable_by(|a, b| a.0.cmp(&b.0).then(a.1.total_cmp(&b.1)));
        let mut k = 0;
        while k < xs.len() {
            let j = xs[k].0;
            let (mut wind, mut odd, mut start) = (0i32, false, 0.0);
            while k < xs.len() && xs[k].0 == j {
                let (_, x, d) = xs[k];
                let was = if wall.even_odd { odd } else { wind != 0 };
                wind += d;
                odd = !odd;
                let now = if wall.even_odd { odd } else { wind != 0 };
                if !was && now {
                    start = x;
                }
                if was && !now {
                    let i0 = Self::first_centre(start, ox, c, self.w);
                    let i1 = Self::first_centre(x, ox, c, self.w).max(i0);
                    self.cells[j * self.w + i0..j * self.w + i1].fill(WALL);
                }
                k += 1;
            }
        }
    }

    fn horiz(row: &[u8], v: u8, out: &mut [u8]) {
        let n = row.len();
        for (i, o) in out.iter_mut().enumerate() {
            let l = i > 0 && row[i - 1] == v;
            let r = i + 1 < n && row[i + 1] == v;
            *o = u8::from(l || row[i] == v || r);
        }
    }

    /// Dilatation 3 × 3 (voisinage 8) des cellules `v`, sur place : trois lignes de tampon (Q20).
    fn dilate_in_place(&mut self, v: u8) {
        let w = self.w;
        let (mut prev, mut cur, mut next) = (vec![0u8; w], vec![0u8; w], vec![0u8; w]);
        Self::horiz(&self.cells[..w], v, &mut cur);
        for j in 0..self.h {
            if j + 1 < self.h {
                Self::horiz(&self.cells[(j + 1) * w..(j + 2) * w], v, &mut next);
            } else {
                next.fill(0);
            }
            for (i, c) in self.cells[j * w..(j + 1) * w].iter_mut().enumerate() {
                if prev[i] | cur[i] | next[i] != 0 {
                    *c = v;
                }
            }
            std::mem::swap(&mut prev, &mut cur);
            std::mem::swap(&mut cur, &mut next);
        }
    }

    /// Diffusion 4-connexe par segments de ligne depuis (cx, cy), marquée `REGION` ; `false` dès que le bord de
    /// l'emprise est atteint (zone ouverte).
    fn flood_spans(&mut self, cx: usize, cy: usize) -> bool {
        let (w, h) = (self.w, self.h);
        let mut stack = vec![(cx, cy)];
        while let Some((x, y)) = stack.pop() {
            let row = y * w;
            if self.cells[row + x] != FREE {
                continue;
            }
            let (mut l, mut r) = (x, x);
            while l > 0 && self.cells[row + l - 1] == FREE {
                l -= 1;
            }
            while r + 1 < w && self.cells[row + r + 1] == FREE {
                r += 1;
            }
            if l == 0 || r == w - 1 || y == 0 || y == h - 1 {
                return false;
            }
            self.cells[row + l..=row + r].fill(REGION);
            for ny in [y - 1, y + 1] {
                let nrow = ny * w;
                let mut i = l;
                while i <= r {
                    if self.cells[nrow + i] == FREE {
                        stack.push((i, ny));
                        while i <= r && self.cells[nrow + i] == FREE {
                            i += 1;
                        }
                    } else {
                        i += 1;
                    }
                }
            }
        }
        true
    }

    /// Suites de cellules `REGION` : (ligne, début, fin incluse), ligne à ligne.
    fn runs(&self) -> impl Iterator<Item = (usize, usize, usize)> + '_ {
        (0..self.h).flat_map(move |j| {
            let row = &self.cells[j * self.w..(j + 1) * self.w];
            let mut out = Vec::new();
            let mut i = 0;
            while i < row.len() {
                if row[i] == REGION {
                    let s = i;
                    while i < row.len() && row[i] == REGION {
                        i += 1;
                    }
                    out.push((j, s, i - 1));
                } else {
                    i += 1;
                }
            }
            out
        })
    }

    fn rect(&self, l: usize, r: usize, j0: usize, j1: usize) -> Contour {
        let (ox, oy, c) = (self.origin[0], self.origin[1], self.cell);
        let (x0, x1) = (ox + l as f64 * c, ox + (r + 1) as f64 * c);
        let (y0, y1) = (oy + j0 as f64 * c, oy + j1 as f64 * c);
        vec![[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    }

    /// Rectangles des suites (aire positive), les suites identiques de lignes voisines fusionnées.
    fn rects(&self) -> Vec<Contour> {
        let mut by_row: Vec<Vec<(usize, usize)>> = vec![Vec::new(); self.h + 1];
        for (j, l, r) in self.runs() {
            by_row[j].push((l, r));
        }
        let mut out = Vec::new();
        let mut open: Vec<(usize, usize, usize)> = Vec::new();
        for (j, runs) in by_row.iter().enumerate() {
            let mut next = Vec::with_capacity(runs.len());
            for &(l, r) in runs {
                match open.iter().position(|o| o.0 == l && o.1 == r) {
                    Some(k) => next.push(open.swap_remove(k)),
                    None => next.push((l, r, j)),
                }
            }
            out.extend(open.drain(..).map(|(l, r, j0)| self.rect(l, r, j0, j)));
            open = next;
        }
        out
    }
}

fn bounds_of(cs: &[Contour]) -> Option<Bounds> {
    cs.iter().flatten().fold(None, |b: Option<Bounds>, p| {
        Some(match b {
            None => Bounds {
                x0: p[0],
                y0: p[1],
                x1: p[0],
                y1: p[1],
            },
            Some(o) => Bounds {
                x0: o.x0.min(p[0]),
                y0: o.y0.min(p[1]),
                x1: o.x1.max(p[0]),
                y1: o.y1.max(p[1]),
            },
        })
    })
}

fn overlaps(a: &Bounds, b: &Bounds) -> bool {
    a.x0 <= b.x1 && b.x0 <= a.x1 && a.y0 <= b.y1 && b.y0 <= a.y1
}

/// Murs qui coupent la boîte de la zone (Q20), en anneaux d'aire positive : non-nuls orientés un par un, pair-impair
/// (anneaux de formes, `fill`) normalisés par `i_overlay`, pour que l'union non-nulle du découpage soit juste.
fn clip_of(walls: &[Wall], zb: &Bounds) -> Vec<Contour> {
    let mut clip = Vec::new();
    for w in walls.iter().filter(|w| overlaps(&w.bounds, zb)) {
        let cs = w.contours();
        if w.even_odd {
            let shapes = FloatOverlay::with_subj(cs.as_slice())
                .overlay(OverlayRule::Subject, FillRule::EvenOdd);
            clip.extend(shapes.into_iter().flatten());
        } else {
            clip.extend(cs.into_iter().map(|mut c| {
                if area2(&c) < 0.0 {
                    c.reverse();
                }
                c
            }));
        }
    }
    clip
}

fn inside_ring(c: &[[f64; 2]], x: f64, y: f64) -> bool {
    let n = c.len();
    let mut inside = false;
    let mut j = n.wrapping_sub(1);
    for i in 0..n {
        let (a, b) = (c[i], c[j]);
        if (a[1] > y) != (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0] {
            inside = !inside;
        }
        j = i;
    }
    inside
}

/// Q6, Q9, Q10, Q20 : sans mur ou hors de l'emprise : `Outside` ; emprise trop grande même à 4 px par cellule ou
/// diffusion jusqu'au bord : `Open` ; cellule du clic dans un mur dilaté : `OnWall` ; sinon la forme exacte qui
/// contient le clic, extérieur d'abord (`OnWall` si le clic tombe sur un bord).
pub fn closed_zone(walls: &[Wall], x: f64, y: f64, tol: f64) -> Zone {
    let Some(g) = fit(walls, tol) else {
        return if walls.is_empty() {
            Zone::Outside
        } else {
            Zone::Open
        };
    };
    let Some((cx, cy)) = g.cell_of(x, y) else {
        return Zone::Outside;
    };
    let mut m = Mask::new(g);
    for w in walls {
        m.paint(w);
    }
    m.dilate_in_place(WALL);
    if m.cells[cy * m.w + cx] != FREE {
        return Zone::OnWall;
    }
    if !m.flood_spans(cx, cy) {
        return Zone::Open;
    }
    m.dilate_in_place(REGION);
    m.dilate_in_place(REGION);
    let subj = m.rects();
    drop(m);
    let Some(zb) = bounds_of(&subj) else {
        return Zone::OnWall;
    };
    let clip = clip_of(walls, &zb);
    FloatOverlay::with_subj_and_clip(subj.as_slice(), clip.as_slice())
        .overlay(OverlayRule::Difference, FillRule::NonZero)
        .into_iter()
        .find(|s| s.iter().filter(|c| inside_ring(c, x, y)).count() % 2 == 1)
        .map_or(Zone::OnWall, |s| {
            Zone::Closed(
                s.into_iter()
                    .map(|c| c.into_iter().flatten().collect())
                    .collect(),
            )
        })
}

/// Morceaux d'un contour à séparateurs (sommets non finis).
fn split_rings(flat: &[f32]) -> Vec<Vec<f32>> {
    let mut out: Vec<Vec<f32>> = vec![Vec::new()];
    for c in flat.as_chunks::<2>().0 {
        if c[0].is_finite() && c[1].is_finite() {
            if let Some(last) = out.last_mut() {
                last.extend(c);
            }
        } else if out.last().is_some_and(|l| !l.is_empty()) {
            out.push(Vec::new());
        }
    }
    out.retain(|r| !r.is_empty());
    out
}

impl Document {
    /// Murs de `page` (Q8) : trait (contour en cache, non-nul), ligne et flèche (`shape_polygon`), rectangle et ellipse
    /// non remplis (anneau, pair-impair), formes remplies (polygone plein), `fill` (anneaux, pair-impair) ; tout autre
    /// élément : sa boîte (`bounds`). Le fond, la grille et le fond PDF ne ferment rien (HC8-2).
    pub(crate) fn zone_walls(&self, page: &str) -> Vec<Wall> {
        let mut walls = Vec::new();
        let mut boxed = Vec::new();
        {
            let txn = self.read();
            let Some(elements) = self.page_elements(&txn, page) else {
                return walls;
            };
            for o in elements.iter(&txn) {
                let Out::YMap(e) = o else {
                    continue;
                };
                match self.wall_of(&txn, &e) {
                    Some(w) => walls.push(w),
                    None => boxed.extend(out_string(e.get(&txn, "id"))),
                }
            }
        }
        for id in boxed {
            if let Some(b) = self.bounds(std::slice::from_ref(&id)) {
                let (x0, y0, x1, y1) = (b.x0 as f32, b.y0 as f32, b.x1 as f32, b.y1 as f32);
                walls.extend(Wall::new(vec![vec![x0, y0, x1, y0, x1, y1, x0, y1]], false));
            }
        }
        walls
    }

    fn wall_of<T: ReadTxn>(&self, txn: &T, e: &MapRef) -> Option<Wall> {
        if let Some((t, style, pts)) = read_stroke(txn, e) {
            let id = out_string(e.get(txn, "id")).unwrap_or_default();
            let outline = self.cached_outline(&id, &style, &pts);
            return Wall::new(split_rings(&world_outline(&t, &outline)), false);
        }
        if let Some(s) = read_shape(txn, e) {
            let t = out_transform(e.get(txn, "transform"))?;
            if s.fill.is_none() {
                if let Some((outer, inner)) = shape_ring(s.kind, s.w, s.h, s.style.width) {
                    return Wall::new(
                        vec![world_outline(&t, &outer), world_outline(&t, &inner)],
                        true,
                    );
                }
            }
            return Wall::new(
                vec![world_outline(
                    &t,
                    &shape_polygon(s.kind, s.w, s.h, s.style.width),
                )],
                false,
            );
        }
        let f = read_fill(txn, e)?;
        let rings = f
            .rings
            .iter()
            .map(|r| {
                world_outline(
                    &f.transform,
                    &r.iter().map(|v| *v as f32).collect::<Vec<f32>>(),
                )
            })
            .collect();
        Wall::new(rings, true)
    }

    /// Cellules du masque d'un clic du pot sur `page` à `tol` (Q18, `data-zone-cells`) ; 0 sans mur, à `tol` invalide
    /// ou au-delà du plafond.
    pub fn zone_cells(&self, page: &str, tol: f64) -> u32 {
        if !(tol.is_finite() && tol > 0.0) {
            return 0;
        }
        fit(&self.zone_walls(page), tol).map_or(0, |g| u32::try_from(g.w * g.h).unwrap_or(u32::MAX))
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::asset::AssetRef;
    use crate::commands::Command;
    use crate::element::StrokeStyle;
    use crate::fill::FillTarget;
    use crate::fill_element::read_fill;
    use crate::shape::ShapeKind;

    fn rect_wall(x0: f32, y0: f32, x1: f32, y1: f32) -> Wall {
        Wall::new(vec![vec![x0, y0, x1, y0, x1, y1, x0, y1]], false).expect("mur")
    }
    /// Carré (100, 100)-(500, 500), murs de 4 ; le mur de gauche commence `gap` sous le mur du haut.
    fn square(gap: f32) -> Vec<Wall> {
        vec![
            rect_wall(100.0, 100.0, 500.0, 104.0),
            rect_wall(496.0, 100.0, 500.0, 500.0),
            rect_wall(100.0, 496.0, 500.0, 500.0),
            rect_wall(100.0, 104.0 + gap, 104.0, 500.0),
        ]
    }
    fn ring_box(r: &[f64]) -> [f64; 4] {
        r.as_chunks::<2>().0.iter().fold(
            [
                f64::INFINITY,
                f64::INFINITY,
                f64::NEG_INFINITY,
                f64::NEG_INFINITY,
            ],
            |b, p| {
                [
                    b[0].min(p[0]),
                    b[1].min(p[1]),
                    b[2].max(p[0]),
                    b[3].max(p[1]),
                ]
            },
        )
    }
    fn near(a: [f64; 4], b: [f64; 4]) -> bool {
        a.iter().zip(b).all(|(x, y)| (x - y).abs() <= 1e-3)
    }

    /// Q6 : une cellule est un mur si son centre est dans le mur ; non-nul (anneau intérieur de même sens : plein) et
    /// pair-impair (trou).
    #[test]
    fn paint_marks_cell_centres_nonzero_and_even_odd() {
        let g = Grid {
            w: 20,
            h: 20,
            cell: 1.0,
            origin: [0.0, 0.0],
        };
        let count = |m: &Mask| m.cells.iter().filter(|c| **c == WALL).count();
        let mut m = Mask::new(g);
        m.paint(&rect_wall(2.0, 2.0, 12.0, 12.0));
        assert_eq!(count(&m), 100);
        let ring = |eo| {
            Wall::new(
                vec![
                    vec![2.0, 2.0, 12.0, 2.0, 12.0, 12.0, 2.0, 12.0],
                    vec![5.0, 5.0, 9.0, 5.0, 9.0, 9.0, 5.0, 9.0],
                ],
                eo,
            )
            .expect("anneau")
        };
        let mut m = Mask::new(g);
        m.paint(&ring(true));
        assert_eq!(count(&m), 84);
        let mut m = Mask::new(g);
        m.paint(&ring(false));
        assert_eq!(count(&m), 100);
    }

    /// U28 (« tolérance de fermeture 2 px ») : à `tol` = 2 (cellule 1), un écart de 1 ou 2 se ferme, 3 fuit.
    #[test]
    fn square_gap_1px_closes_3px_leaks() {
        assert!(matches!(
            closed_zone(&square(1.0), 300.0, 300.0, 2.0),
            Zone::Closed(_)
        ));
        assert!(matches!(
            closed_zone(&square(2.0), 300.0, 300.0, 2.0),
            Zone::Closed(_)
        ));
        assert_eq!(closed_zone(&square(3.0), 300.0, 300.0, 2.0), Zone::Open);
    }

    /// Q10 : hors de la boîte des murs agrandie : `Outside` ; dans un mur ou dans sa dilatation : `OnWall` ; sans mur : `Outside`.
    #[test]
    fn outside_box_and_on_wall() {
        assert_eq!(closed_zone(&square(0.0), 900.0, 900.0, 2.0), Zone::Outside);
        assert_eq!(closed_zone(&square(0.0), 102.0, 300.0, 2.0), Zone::OnWall);
        assert_eq!(closed_zone(&square(0.0), 104.3, 300.0, 2.0), Zone::OnWall);
        assert_eq!(closed_zone(&[], 300.0, 300.0, 2.0), Zone::Outside);
    }

    /// Q9, HC8-3 : bords exacts sur les murs ; un îlot est un trou exact.
    #[test]
    fn closed_zone_edges_follow_walls_and_islands_are_holes() {
        let mut walls = square(0.0);
        walls.push(rect_wall(250.0, 250.0, 270.0, 270.0));
        let Zone::Closed(rings) = closed_zone(&walls, 300.0, 300.0, 2.0) else {
            panic!("zone fermée attendue");
        };
        assert_eq!(rings.len(), 2);
        assert!(
            near(ring_box(&rings[0]), [104.0, 104.0, 496.0, 496.0]),
            "{:?}",
            ring_box(&rings[0])
        );
        assert!(
            near(ring_box(&rings[1]), [250.0, 250.0, 270.0, 270.0]),
            "{:?}",
            ring_box(&rings[1])
        );
    }

    /// Q10 (« sans rastériser ») : un clic hors de l'emprise rend `Outside` sans allouer de masque (jusqu'à 4 Mio) ;
    /// un clic dedans en alloue un seul.
    #[test]
    fn click_outside_grid_allocates_no_mask() {
        MASKS.with(|n| n.set(0));
        assert_eq!(closed_zone(&square(0.0), 900.0, 900.0, 2.0), Zone::Outside);
        assert_eq!(
            MASKS.with(std::cell::Cell::get),
            0,
            "masque alloué pour un clic hors des murs"
        );
        assert!(matches!(
            closed_zone(&square(0.0), 300.0, 300.0, 2.0),
            Zone::Closed(_)
        ));
        assert_eq!(MASKS.with(std::cell::Cell::get), 1);
    }

    /// Q20, HC8-11 : au-delà de 2²² cellules, la cellule double (puis quadruple) ; au-delà, aucune grille (fond).
    #[test]
    fn fit_doubles_cells_then_gives_up() {
        let corners = |s: f32| {
            vec![
                rect_wall(0.0, 0.0, 1.0, 1.0),
                rect_wall(s - 1.0, s - 1.0, s, s),
            ]
        };
        let g = fit(&corners(2000.0), 2.0).expect("grille");
        assert_eq!((g.w, g.h, g.cell), (2004, 2004, 1.0));
        let g = fit(&corners(3000.0), 2.0).expect("grille");
        assert_eq!(
            (g.w, g.h, g.cell, g.origin),
            (1504, 1504, 2.0, [-4.0, -4.0])
        );
        assert_eq!(fit(&corners(20000.0), 2.0), None);
        assert_eq!(closed_zone(&corners(20000.0), 10.0, 10.0, 2.0), Zone::Open);
    }

    fn pen() -> StrokeStyle {
        StrokeStyle {
            color: "#000000".into(),
            width: 4.0,
        }
    }
    /// Trait de `a` à `b`, un point tous les 10, pression 0,5.
    fn stroke(d: &mut Document, p: &str, a: [f64; 2], b: [f64; 2]) -> String {
        let n = ((b[0] - a[0]).hypot(b[1] - a[1]) / 10.0).ceil().max(1.0) as usize;
        let points: Vec<f32> = (0..=n)
            .flat_map(|i| {
                let t = i as f64 / n as f64;
                [
                    (a[0] + (b[0] - a[0]) * t) as f32,
                    (a[1] + (b[1] - a[1]) * t) as f32,
                    0.5,
                ]
            })
            .collect();
        d.apply(Command::CommitStroke {
            page: p.to_string(),
            points,
            style: pen(),
        })
        .expect("trait")
        .ids[0]
            .clone()
    }
    fn zone(p: &str, x: f64, y: f64, color: Option<&str>) -> Command {
        Command::Fill {
            page: p.to_string(),
            target: FillTarget::Zone { x, y, tol: 2.0 },
            color: color.map(str::to_string),
        }
    }
    fn triangle(d: &mut Document, p: &str, end_y: f64) {
        stroke(d, p, [100.0, 100.0], [500.0, 100.0]);
        stroke(d, p, [500.0, 100.0], [100.0, 500.0]);
        stroke(d, p, [100.0, 500.0], [100.0, end_y]);
    }
    fn fill_of(d: &Document, id: &str) -> crate::fill_element::FillFields {
        let txn = d.read();
        let f = d.find_element(&txn, id).expect("élément");
        read_fill(&txn, &f.element).expect("fill lisible")
    }
    /// Boîte monde de l'anneau extérieur d'un `fill` (anneaux locaux, translation de `transform`).
    fn world_box(f: &crate::fill_element::FillFields) -> [f64; 4] {
        let [x0, y0, x1, y1] = ring_box(&f.rings[0]);
        let (tx, ty) = (f.transform[4], f.transform[5]);
        [x0 + tx, y0 + ty, x1 + tx, y1 + ty]
    }

    /// S1 : trois traits, écart de 1 au dernier sommet : un `fill` en haut de la page, bord au-delà de l'axe du trait
    /// et dans son épaisseur ; annuler, refaire : une étape.
    #[test]
    fn triangle_of_strokes_1px_gap_inserts_one_fill_on_top() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        let c = d
            .apply(zone(&p, 200.0, 200.0, Some("#facc15")))
            .expect("zone");
        assert_eq!(c.ids.len(), 1);
        let ids = d.element_ids(&p);
        assert_eq!((ids.len(), ids.last()), (4, c.ids.first()));
        let f = fill_of(&d, &c.ids[0]);
        assert_eq!(f.color, "#facc15");
        let min_x = f.rings[0]
            .as_chunks::<2>()
            .0
            .iter()
            .map(|q| q[0] + f.transform[4])
            .fold(f64::INFINITY, f64::min);
        assert!(min_x > 100.0 && min_x < 104.0, "{min_x}");
        assert!(d.undo());
        assert_eq!(d.element_ids(&p).len(), 3);
        assert!(d.redo());
        assert_eq!(d.element_ids(&p).len(), 4);
    }

    /// S2 : écart de 12 au sommet (≥ 8 entre les contours) : la diffusion fuit, le fond change, aucun `fill`.
    #[test]
    fn triangle_of_strokes_12px_gap_changes_background() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 112.0);
        let c = d
            .apply(zone(&p, 200.0, 200.0, Some("#facc15")))
            .expect("zone");
        assert!(c.ids.is_empty());
        assert_eq!(d.page(&p).expect("page").background, "#facc15");
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    /// Q10 : hors de la boîte des murs : le fond ; sur un trait : aucune étape.
    #[test]
    fn outside_walls_is_background_and_on_stroke_is_no_step() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        d.apply(zone(&p, 900.0, 900.0, Some("#16a34a")))
            .expect("hors");
        assert_eq!(d.page(&p).expect("page").background, "#16a34a");
        let v = d.version();
        d.apply(zone(&p, 100.0, 300.0, Some("#dc2626")))
            .expect("sur le trait");
        assert_eq!((d.version(), d.element_ids(&p).len()), (v, 3));
    }

    /// HC8-6 : « Aucune » dans une zone fermée : fond `#ffffff`, aucun `fill`.
    #[test]
    fn none_in_closed_zone_sets_white_background() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        triangle(&mut d, &p, 101.0);
        d.apply(Command::Fill {
            page: p.clone(),
            target: FillTarget::Background,
            color: Some("#1d4ed8".into()),
        })
        .expect("fond");
        let c = d.apply(zone(&p, 200.0, 200.0, None)).expect("aucune");
        assert!(c.ids.is_empty());
        assert_eq!(d.page(&p).expect("page").background, "#ffffff");
        assert_eq!(d.element_ids(&p).len(), 3);
    }

    /// S4, HC8-1 : une image ferme par sa boîte ; le bord du `fill` longe la boîte de l'image.
    #[test]
    fn image_box_closes_zone() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        d.apply(Command::AddImage {
            page: p.clone(),
            asset: AssetRef {
                id: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad".into(),
                name: "a.png".into(),
                mime: "image/png".into(),
                size: 3.0,
            },
            w: 200.0,
            h: 200.0,
            matrix: [1.0, 0.0, 0.0, 1.0, 100.0, 100.0],
        })
        .expect("image");
        stroke(&mut d, &p, [298.0, 100.0], [500.0, 100.0]);
        stroke(&mut d, &p, [500.0, 100.0], [500.0, 300.0]);
        stroke(&mut d, &p, [500.0, 300.0], [298.0, 300.0]);
        let c = d
            .apply(zone(&p, 400.0, 200.0, Some("#facc15")))
            .expect("zone");
        assert_eq!(c.ids.len(), 1);
        let f = fill_of(&d, &c.ids[0]);
        let min_x = f.rings[0]
            .as_chunks::<2>()
            .0
            .iter()
            .map(|q| q[0] + f.transform[4])
            .fold(f64::INFINITY, f64::min);
        assert!((min_x - 300.0).abs() < 1e-3, "{min_x}");
    }

    /// Garde du patron écarté (`element_geom`, `query.rs:136-210`, parcouru par `geoms`, `query.rs:211-226`) : un
    /// rectangle non rempli est un anneau pair-impair (Q8), pas le polygone plein `shape_polygon` ; un clic dedans pose
    /// un `fill` bordé par le côté intérieur du trait (−½ épaisseur). Sous ce patron, le clic tomberait dans le polygone
    /// plein : `OnWall`, aucune étape. Un rectangle rempli, lui, reste un bloc plein : clic dedans, aucune étape.
    #[test]
    fn unfilled_rect_is_a_ring_wall_not_a_solid_block() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let shape = |x0, y0, x1, y1, fill: Option<&str>| Command::AddShape {
            page: p.clone(),
            shape: ShapeKind::Rect,
            x0,
            y0,
            x1,
            y1,
            style: pen(),
            fill: fill.map(str::to_string),
        };
        d.apply(shape(100.0, 100.0, 500.0, 500.0, None))
            .expect("rectangle vide");
        d.apply(shape(600.0, 100.0, 900.0, 400.0, Some("#dc2626")))
            .expect("rectangle plein");
        let c = d
            .apply(zone(&p, 300.0, 300.0, Some("#facc15")))
            .expect("zone");
        assert_eq!(
            c.ids.len(),
            1,
            "zone fermée attendue dans le rectangle vide, pas OnWall"
        );
        let f = fill_of(&d, &c.ids[0]);
        assert_eq!(f.rings.len(), 1);
        assert!(
            near(world_box(&f), [102.0, 102.0, 498.0, 498.0]),
            "{:?}",
            world_box(&f)
        );
        let v = d.version();
        d.apply(zone(&p, 750.0, 250.0, Some("#16a34a")))
            .expect("dans le rectangle plein");
        assert_eq!((d.version(), d.element_ids(&p).len()), (v, 3));
    }

    /// Garde du même patron : un `fill` à trou est un mur par ses anneaux pair-impair (Q8), pas par sa boîte (celle
    /// qu'`element_geom` lui donnerait par `read_unknown`) ; un clic dans le trou pose un `fill` exactement sur le trou.
    #[test]
    fn hole_of_a_fill_is_a_closed_zone_not_its_box() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let outer = vec![100.0, 100.0, 500.0, 100.0, 500.0, 500.0, 100.0, 500.0];
        let hole = vec![250.0, 250.0, 250.0, 350.0, 350.0, 350.0, 350.0, 250.0];
        d.insert_fill(&p, &[outer, hole], "#facc15")
            .expect("fill à trou");
        let c = d
            .apply(zone(&p, 300.0, 300.0, Some("#dc2626")))
            .expect("zone");
        assert_eq!(
            c.ids.len(),
            1,
            "zone fermée attendue dans le trou, pas OnWall"
        );
        let f = fill_of(&d, &c.ids[0]);
        assert_eq!((f.rings.len(), f.color.as_str()), (1, "#dc2626"));
        assert!(
            near(world_box(&f), [250.0, 250.0, 350.0, 350.0]),
            "{:?}",
            world_box(&f)
        );
    }

    /// Q18 : `zone_cells` compte le masque du clic ; 0 sans mur ou à `tol` invalide.
    #[test]
    fn zone_cells_counts_the_mask() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        assert_eq!(d.zone_cells(&p, 2.0), 0);
        triangle(&mut d, &p, 101.0);
        let g = fit(&d.zone_walls(&p), 2.0).expect("grille");
        assert_eq!(d.zone_cells(&p, 2.0) as usize, g.w * g.h);
        assert_eq!(d.zone_cells(&p, 0.0), 0);
    }

    /// Témoin de durée (Q18, S6), pas une porte :
    /// `cargo test -p roomboard-core --features zone --release s6_ -- --ignored --nocapture`.
    #[test]
    #[ignore = "témoin de durée, lancé à la main"]
    fn s6_worst_case_timing_witness() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        stroke(&mut d, &p, [-700.0, -700.0], [1300.0, -700.0]);
        stroke(&mut d, &p, [1300.0, -700.0], [-700.0, 1300.0]);
        stroke(&mut d, &p, [-700.0, 1300.0], [-700.0, -700.0]);
        for i in 0..20 {
            for j in 0..15 {
                let (x, y) = (-600.0 + 40.0 * f64::from(i), -600.0 + 40.0 * f64::from(j));
                stroke(&mut d, &p, [x, y], [x + 15.0, y]);
            }
        }
        assert!(d.zone_cells(&p, 2.0) >= 4_000_000);
        let t = std::time::Instant::now();
        let c = d
            .apply(zone(&p, 100.0, 100.0, Some("#facc15")))
            .expect("zone");
        eprintln!(
            "S6 natif : {} ms, {} cellules",
            t.elapsed().as_millis(),
            d.zone_cells(&p, 2.0)
        );
        assert_eq!(c.ids.len(), 1);
    }
}
