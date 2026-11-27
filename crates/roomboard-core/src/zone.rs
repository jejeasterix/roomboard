//! Zone fermée du pot (C8, U28 P3, DA-Z1, DA-Z2) : les murs de la page sont rastérisés sur la vue (1 cellule = 1 px de la
//! vue = `tol / 2` en monde ; une cellule est mur si son centre ou le bord du mur y passe), dilatés d'une cellule (voisinage 8 : les écarts ≤ 2 px se ferment), puis le clic diffuse
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
/// Pile de suites en cours (`Grid::stacks`) : première ligne, une suite (début, fin incluse) par ligne.
type Stack = (usize, Vec<(usize, usize)>);

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
    /// Repères de phase de `closed_zone` (témoin S6) : nom, taille notée, instant.
    static LAPS: std::cell::RefCell<Vec<(&'static str, usize, std::time::Instant)>> =
        const { std::cell::RefCell::new(Vec::new()) };
}

/// Fin d'une phase de `closed_zone` et sa taille (cellules, rectangles, sommets) : notée par les tests seulement ; hors
/// des tests, la taille n'est pas calculée.
#[inline]
fn lap(_phase: &'static str, _size: impl FnOnce() -> usize) {
    #[cfg(test)]
    {
        let size = _size();
        LAPS.with(|l| {
            l.borrow_mut()
                .push((_phase, size, std::time::Instant::now()));
        });
    }
}

/// Huit cellules lues d'un coup (balayages de la diffusion, sans comparer octet par octet).
fn word(c: &[u8]) -> u64 {
    u64::from_le_bytes(c.try_into().expect("8 octets"))
}

/// Première cellule de `row` à partir de `from` qui n'est pas `FREE` (0), sinon `row.len()`.
fn next_set(row: &[u8], from: usize) -> usize {
    let mut i = from;
    while let Some(c) = row.get(i..i + 8) {
        let v = word(c);
        if v != 0 {
            return i + (v.trailing_zeros() / 8) as usize;
        }
        i += 8;
    }
    row[i..]
        .iter()
        .position(|&c| c != FREE)
        .map_or(row.len(), |p| i + p)
}

/// Dernière cellule de `row[..to]` qui n'est pas `FREE`.
fn prev_set(row: &[u8], to: usize) -> Option<usize> {
    let mut i = to;
    while i >= 8 {
        let v = word(&row[i - 8..i]);
        if v != 0 {
            return Some(i - 1 - (v.leading_zeros() / 8) as usize);
        }
        i -= 8;
    }
    row[..i].iter().rposition(|&c| c != FREE)
}

/// Première cellule `FREE` de `row` à partir de `from`, sinon `row.len()` : octet nul repéré par
/// `(v − 0x01…) & !v & 0x80…`, dont le bit le plus bas marque toujours un vrai octet nul.
fn next_free(row: &[u8], from: usize) -> usize {
    const LO: u64 = 0x0101_0101_0101_0101;
    const HI: u64 = 0x8080_8080_8080_8080;
    let mut i = from;
    while let Some(c) = row.get(i..i + 8) {
        let v = word(c);
        let z = v.wrapping_sub(LO) & !v & HI;
        if z != 0 {
            return i + (z.trailing_zeros() / 8) as usize;
        }
        i += 8;
    }
    row[i..]
        .iter()
        .position(|&c| c == FREE)
        .map_or(row.len(), |p| i + p)
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

    /// Cellules [i0, i1) de la ligne `j` marquées `WALL`, agrandies de `grow` cellules (0 ou 1) dans les deux sens et
    /// bornées à l'emprise : à 1, c'est la dilatation 3 × 3 des murs (Q6) faite au marquage, sans repasser sur le
    /// masque (le marquage ne lit pas le masque, et la dilatation d'une réunion est la réunion des dilatations).
    fn mark(&mut self, j: usize, i0: usize, i1: usize, grow: usize) {
        if i0 >= i1 {
            return;
        }
        let (a, b) = (i0.saturating_sub(grow), (i1 + grow).min(self.w));
        for r in j.saturating_sub(grow)..=(j + grow).min(self.h - 1) {
            self.cells[r * self.w + a..r * self.w + b].fill(WALL);
        }
    }

    /// Cellules dont l'intérieur ouvert est traversé par l'arête (x0, y0)-(x1, y1), marquées `WALL` : un mur plus fin
    /// qu'une cellule peut ne couvrir aucun centre, mais toute cellule qu'il touche sans en contenir le centre est
    /// traversée par son bord. Une arête portée par une frontière de cellule n'en traverse aucune.
    fn mark_edge(&mut self, [x0, y0]: [f64; 2], [x1, y1]: [f64; 2], grow: usize) {
        let (ox, oy, c) = (self.origin[0], self.origin[1], self.cell);
        let (ya, yb) = (y0.min(y1), y0.max(y1));
        let j0 = (((ya - oy) / c).floor().max(0.0)) as usize;
        let j1 = (((yb - oy) / c).ceil() - 1.0).min(self.h as f64 - 1.0);
        if j1 < j0 as f64 {
            return;
        }
        for j in j0..=j1 as usize {
            let (lo, hi) = (
                (oy + j as f64 * c).max(ya),
                (oy + (j + 1) as f64 * c).min(yb),
            );
            let at = |y: f64| {
                if y1 == y0 {
                    x0
                } else {
                    x0 + (y - y0) * (x1 - x0) / (y1 - y0)
                }
            };
            let (xa, xb) = (at(lo).min(at(hi)), at(lo).max(at(hi)));
            let (xa, xb) = if y1 == y0 {
                (x0.min(x1), x0.max(x1))
            } else {
                (xa, xb)
            };
            let i0 = ((xa - ox) / c).floor().max(0.0) as usize;
            let i1 = ((xb - ox) / c).ceil() - 1.0;
            if i1 >= i0 as f64 {
                let i1 = (i1 as usize).min(self.w - 1);
                self.mark(j, i0, i1 + 1, grow);
            }
        }
    }

    /// Mur marqué sans dilatation (tests).
    #[cfg(test)]
    fn paint(&mut self, wall: &Wall) {
        self.paint_contours(&wall.contours(), wall.even_odd, &mut Vec::new(), 0);
    }

    /// Balayage par lignes : chaque arête coupe les lignes dont le centre est dans [ya, yb) ; cellules dont le centre
    /// est dedans (non-nul ou pair-impair selon le mur) marquées `WALL`, puis les cellules que le bord traverse
    /// (`mark_edge`), chaque suite agrandie de `grow` cellules (`mark`). `xs` est un tampon réutilisé d'un mur à
    /// l'autre.
    fn paint_contours(
        &mut self,
        rings: &[Contour],
        even_odd: bool,
        xs: &mut Vec<(usize, f64, i32)>,
        grow: usize,
    ) {
        let (ox, oy, c) = (self.origin[0], self.origin[1], self.cell);
        xs.clear();
        for ring in rings {
            let n = ring.len();
            for k in 0..n {
                let ([x0, y0], [x1, y1]) = (ring[k], ring[(k + 1) % n]);
                self.mark_edge([x0, y0], [x1, y1], grow);
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
                let was = if even_odd { odd } else { wind != 0 };
                wind += d;
                odd = !odd;
                let now = if even_odd { odd } else { wind != 0 };
                if !was && now {
                    start = x;
                }
                if was && !now {
                    let i0 = Self::first_centre(start, ox, c, self.w);
                    let i1 = Self::first_centre(x, ox, c, self.w).max(i0);
                    self.mark(j, i0, i1, grow);
                }
                k += 1;
            }
        }
    }

    /// Ligne `row` dilatée d'une cellule à gauche et à droite (cellules `v`), en 0 ou 1 ; `row` a 2 cellules au moins
    /// (l'emprise en a 4 de marge).
    #[cfg(test)]
    fn horiz(row: &[u8], v: u8, out: &mut [u8]) {
        let n = row.len();
        let is = |c: u8| u8::from(c == v);
        out[0] = is(row[0]) | is(row[1]);
        out[n - 1] = is(row[n - 2]) | is(row[n - 1]);
        for (o, ((a, b), c)) in out[1..n - 1]
            .iter_mut()
            .zip(row.iter().zip(&row[1..]).zip(&row[2..]))
        {
            *o = is(*a) | is(*b) | is(*c);
        }
    }

    /// Dilatation 3 × 3 (voisinage 8) des cellules `v`, sur place, trois lignes de tampon : l'oracle des tests pour
    /// `mark` (murs, à 1 cellule) et `grown_runs` (région, deux fois).
    #[cfg(test)]
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
            for (c, ((a, b), d)) in self.cells[j * w..(j + 1) * w]
                .iter_mut()
                .zip(prev.iter().zip(&cur).zip(&next))
            {
                *c = if a | b | d != 0 { v } else { *c };
            }
            std::mem::swap(&mut prev, &mut cur);
            std::mem::swap(&mut cur, &mut next);
        }
    }

    /// Diffusion 4-connexe par segments de ligne depuis (cx, cy), marquée `REGION` ; `false` dès que le bord de
    /// l'emprise est atteint (zone ouverte). Chaque segment rempli, (ligne, début, fin incluse), va dans `spans` : il
    /// s'étend tant que la cellule voisine est libre, c'est donc une suite maximale de la région sur sa ligne.
    fn flood_spans(
        &mut self,
        cx: usize,
        cy: usize,
        spans: &mut Vec<(usize, usize, usize)>,
    ) -> bool {
        let (w, h) = (self.w, self.h);
        let mut stack = vec![(cx, cy)];
        while let Some((x, y)) = stack.pop() {
            let row = &mut self.cells[y * w..(y + 1) * w];
            if row[x] != FREE {
                continue;
            }
            let l = prev_set(row, x).map_or(0, |p| p + 1);
            let r = next_set(row, x) - 1;
            if l == 0 || r == w - 1 || y == 0 || y == h - 1 {
                return false;
            }
            row[l..=r].fill(REGION);
            spans.push((y, l, r));
            for ny in [y - 1, y + 1] {
                let nrow = &self.cells[ny * w + l..=ny * w + r];
                let mut i = 0;
                loop {
                    let s = next_free(nrow, i);
                    if s == nrow.len() {
                        break;
                    }
                    stack.push((l + s, ny));
                    i = next_set(nrow, s);
                    if i == nrow.len() {
                        break;
                    }
                }
            }
        }
        true
    }
}

impl Grid {
    fn at(&self, i: usize, j: usize) -> [f64; 2] {
        [
            self.origin[0] + i as f64 * self.cell,
            self.origin[1] + j as f64 * self.cell,
        ]
    }

    /// Contour d'une pile de suites `rs` (une par ligne depuis `j0`, chacune recouvrant la suivante) : bords droits
    /// en descendant, bords gauches en remontant, même sens que les rectangles ; un sommet seulement où un bord change.
    fn stack_contour(&self, j0: usize, rs: &[(usize, usize)]) -> Contour {
        let n = rs.len();
        let mut c = vec![self.at(rs[0].0, j0), self.at(rs[0].1 + 1, j0)];
        for k in 0..n {
            if k + 1 < n && rs[k + 1].1 == rs[k].1 {
                continue;
            }
            c.push(self.at(rs[k].1 + 1, j0 + k + 1));
            if k + 1 < n {
                c.push(self.at(rs[k + 1].1 + 1, j0 + k + 1));
            }
        }
        c.push(self.at(rs[n - 1].0, j0 + n));
        for k in (1..n).rev() {
            if rs[k - 1].0 != rs[k].0 {
                c.push(self.at(rs[k].0, j0 + k));
                c.push(self.at(rs[k - 1].0, j0 + k));
            }
        }
        c
    }

    /// Contours de la région agrandie de 2 cellules (Q9, aire positive) : une suite qui recouvre une seule suite de la
    /// ligne suivante, recouverte par elle seule, prolonge sa pile ; sinon la pile se ferme. Mêmes cellules que les
    /// rectangles des suites (`rects`, oracle des tests), au plus autant de sommets (moitié moins le long d'un bord
    /// oblique), sans bord commun entre deux lignes d'une pile.
    fn stacks(&self, spans: &mut [(usize, usize, usize)]) -> Vec<Contour> {
        let first = self.row_index(spans);
        let mut out = Vec::new();
        let (mut prev, mut runs) = (Vec::new(), Vec::new());
        let mut open: Vec<Option<Stack>> = Vec::new();
        let mut next = Vec::new();
        let (mut up, mut down, mut link) = (Vec::new(), Vec::new(), Vec::new());
        for j in 0..=self.h {
            self.grown_runs(spans, &first, j, &mut runs);
            up.clear();
            up.resize(runs.len(), 0u32);
            link.clear();
            link.resize(runs.len(), 0usize);
            down.clear();
            down.resize(prev.len(), 0u32);
            let (mut a, mut b) = (0, 0);
            while a < prev.len() && b < runs.len() {
                let ((pl, pr), (l, r)) = (prev[a], runs[b]);
                if pl <= r && l <= pr {
                    down[a] += 1;
                    up[b] += 1;
                    link[b] = a;
                }
                if pr < r {
                    a += 1;
                } else {
                    b += 1;
                }
            }
            next.clear();
            for (b, &run) in runs.iter().enumerate() {
                let a = link[b];
                match open.get_mut(a) {
                    Some(s @ Some(_)) if up[b] == 1 && down[a] == 1 => {
                        let mut s = s.take().expect("pile ouverte");
                        s.1.push(run);
                        next.push(Some(s));
                    }
                    _ => next.push(Some((j, vec![run]))),
                }
            }
            for (j0, rs) in open.drain(..).flatten() {
                out.push(self.stack_contour(j0, &rs));
            }
            std::mem::swap(&mut open, &mut next);
            std::mem::swap(&mut prev, &mut runs);
        }
        out
    }

    #[cfg(test)]
    fn rect(&self, l: usize, r: usize, j0: usize, j1: usize) -> Contour {
        let (ox, oy, c) = (self.origin[0], self.origin[1], self.cell);
        let (x0, x1) = (ox + l as f64 * c, ox + (r + 1) as f64 * c);
        let (y0, y1) = (oy + j0 as f64 * c, oy + j1 as f64 * c);
        vec![[x0, y0], [x1, y0], [x1, y1], [x0, y1]]
    }

    /// Trie `spans` par ligne puis par début et rend le début des suites de chaque ligne : celles de la ligne `k` sont
    /// `spans[first[k]..first[k + 1]]`. Rangement sur place par ligne avec les comptes (sans tri global), puis tri de
    /// chaque ligne, qui n'a que ses quelques suites.
    fn row_index(&self, spans: &mut [(usize, usize, usize)]) -> Vec<usize> {
        let mut first = vec![0usize; self.h + 1];
        for &(y, _, _) in spans.iter() {
            first[y + 1] += 1;
        }
        let mut acc = 0;
        for f in &mut first {
            acc += *f;
            *f = acc;
        }
        let mut next = first.clone();
        for b in 0..self.h {
            while next[b] < first[b + 1] {
                let y = spans[next[b]].0;
                if y == b {
                    next[b] += 1;
                } else {
                    spans.swap(next[b], next[y]);
                    next[y] += 1;
                }
            }
        }
        for k in 0..self.h {
            spans[first[k]..first[k + 1]].sort_unstable();
        }
        first
    }

    /// Suites de la région agrandie de 2 cellules (Q9) sur la ligne `j`, triées, dans `out` (vidé d'abord) : les
    /// suites diffusées des lignes `j − 2` à `j + 2`, élargies de 2 cellules et bornées à l'emprise, celles qui se
    /// touchent fusionnées. C'est la dilatation 5 × 5 de la région dans le masque, lue sans parcourir ses cellules.
    /// `spans` est trié par ligne puis par début ; les suites de la ligne `k` sont `spans[first[k]..first[k + 1]]`.
    fn grown_runs(
        &self,
        spans: &[(usize, usize, usize)],
        first: &[usize],
        j: usize,
        out: &mut Vec<(usize, usize)>,
    ) {
        out.clear();
        if j >= self.h {
            return;
        }
        // Fusion des 5 listes déjà triées (une par ligne), sans retrier : la suite de plus petit début passe d'abord.
        let k0 = j.saturating_sub(2);
        let n = (j + 2).min(self.h - 1) + 1 - k0;
        let (mut cur, mut end) = ([0usize; 5], [0usize; 5]);
        for t in 0..n {
            (cur[t], end[t]) = (first[k0 + t], first[k0 + t + 1]);
        }
        loop {
            let mut best: Option<usize> = None;
            for t in 0..n {
                if cur[t] < end[t] && best.is_none_or(|b| spans[cur[t]].1 < spans[cur[b]].1) {
                    best = Some(t);
                }
            }
            let Some(t) = best else {
                break;
            };
            let (_, l, r) = spans[cur[t]];
            cur[t] += 1;
            let (l, r) = (l.saturating_sub(2), (r + 2).min(self.w - 1));
            match out.last_mut() {
                Some(kept) if l <= kept.1 + 1 => kept.1 = kept.1.max(r),
                _ => out.push((l, r)),
            }
        }
    }

    /// Rectangles de la région agrandie de 2 cellules (aire positive), les suites identiques de lignes voisines
    /// fusionnées : les suites d'une ligne sont triées et disjointes, la fusion avec celles de la ligne précédente est
    /// un seul parcours. Oracle des tests pour `stacks`.
    #[cfg(test)]
    fn rects(&self, spans: &mut [(usize, usize, usize)]) -> Vec<Contour> {
        let first = self.row_index(spans);
        let mut out = Vec::new();
        let mut open: Vec<(usize, usize, usize)> = Vec::new();
        let (mut next, mut runs) = (Vec::new(), Vec::new());
        for j in 0..=self.h {
            self.grown_runs(spans, &first, j, &mut runs);
            next.clear();
            let mut p = 0;
            for &(l, r) in &runs {
                while p < open.len() && open[p].0 < l {
                    out.push(self.rect(open[p].0, open[p].1, open[p].2, j));
                    p += 1;
                }
                match open.get(p) {
                    Some(&(ol, or, j0)) if ol == l && or == r => {
                        next.push((l, r, j0));
                        p += 1;
                    }
                    Some(&(ol, or, j0)) if ol == l => {
                        out.push(self.rect(ol, or, j0, j));
                        p += 1;
                        next.push((l, r, j));
                    }
                    _ => next.push((l, r, j)),
                }
            }
            for &(l, r, j0) in &open[p..] {
                out.push(self.rect(l, r, j0, j));
            }
            std::mem::swap(&mut open, &mut next);
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
fn clip_of(walls: &[Wall], contours: &[Vec<Contour>], zb: &Bounds) -> Vec<Contour> {
    let mut clip = Vec::new();
    for (w, cs) in walls
        .iter()
        .zip(contours)
        .filter(|(w, _)| overlaps(&w.bounds, zb))
    {
        if w.even_odd {
            let shapes = FloatOverlay::with_subj(cs.as_slice())
                .overlay(OverlayRule::Subject, FillRule::EvenOdd);
            clip.extend(shapes.into_iter().flatten());
        } else {
            clip.extend(cs.iter().cloned().map(|mut c| {
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
    lap("début", || walls.len());
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
    let contours: Vec<Vec<Contour>> = walls.iter().map(Wall::contours).collect();
    lap("contours f64", || {
        contours.iter().flatten().map(Vec::len).sum()
    });
    let mut m = Mask::new(g);
    let mut xs = Vec::new();
    for (w, cs) in walls.iter().zip(&contours) {
        m.paint_contours(cs, w.even_odd, &mut xs, 1);
    }
    drop(xs);
    lap("rastérisation et dilatation", || g.w * g.h);
    if m.cells[cy * m.w + cx] != FREE {
        return Zone::OnWall;
    }
    let mut spans = Vec::new();
    if !m.flood_spans(cx, cy, &mut spans) {
        return Zone::Open;
    }
    drop(m);
    lap("diffusion", || spans.len());
    let subj = g.stacks(&mut spans);
    lap("agrandie de 2 → piles", || {
        subj.iter().map(Vec::len).sum()
    });
    let Some(zb) = bounds_of(&subj) else {
        return Zone::OnWall;
    };
    let clip = clip_of(walls, &contours, &zb);
    lap("murs à soustraire", || clip.iter().map(Vec::len).sum());
    let shapes = FloatOverlay::with_subj_and_clip(subj.as_slice(), clip.as_slice())
        .overlay(OverlayRule::Difference, FillRule::NonZero);
    lap("union et différence i_overlay", || shapes.len());
    let zone = shapes
        .into_iter()
        .find(|s| s.iter().filter(|c| inside_ring(c, x, y)).count() % 2 == 1);
    lap("choix de la forme", || 0);
    zone.map_or(Zone::OnWall, |s| {
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
                    None => {
                        // Sans `id` lisible, l'élément ne ferme rien (comme `bounds`, qui le cherche par `id`).
                        if out_string(e.get(&txn, "id")).is_none() {
                            continue;
                        }
                        if let Some(b) = self.element_bounds(&txn, &e) {
                            let (x0, y0, x1, y1) =
                                (b.x0 as f32, b.y0 as f32, b.x1 as f32, b.y1 as f32);
                            walls.extend(Wall::new(
                                vec![vec![x0, y0, x1, y0, x1, y1, x0, y1]],
                                false,
                            ));
                        }
                    }
                }
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
            .rings_f32()
            .iter()
            .map(|r| world_outline(&f.transform, r))
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
    use crate::element::{Look, StrokeStyle};
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

    /// Q6 : une cellule est un mur si son centre est dans le mur (le bord s'y ajoute, `mark_edge`, sans effet sur des
    /// bords alignés sur la grille) ; non-nul (anneau intérieur de même sens : plein) et pair-impair (trou).
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

    /// Mur plus fin qu'une cellule (revue de T1) : à `tol` = 16 (cellule 8, origine 84), les murs du haut et de gauche
    /// ([100, 104)) ne couvrent aucun centre de cellule ; toute cellule que le mur touche est un mur, la zone reste
    /// fermée.
    #[test]
    fn wall_thinner_than_a_cell_still_closes() {
        assert!(matches!(
            closed_zone(&square(0.0), 300.0, 300.0, 16.0),
            Zone::Closed(_)
        ));
    }

    /// Carré de côté 400 dont le coin haut gauche est (`ox`, 100), murs de 4 ; le mur de gauche commence `gap` sous le
    /// mur du haut. Un petit mur lointain (`far`, 0 = aucun) agrandit l'emprise pour imposer le facteur de cellule.
    fn square_far(ox: f32, gap: f32, far: f32) -> Vec<Wall> {
        let mut w = vec![
            rect_wall(ox, 100.0, ox + 400.0, 104.0),
            rect_wall(ox + 396.0, 100.0, ox + 400.0, 500.0),
            rect_wall(ox, 496.0, ox + 400.0, 500.0),
            rect_wall(ox, 104.0 + gap, ox + 4.0, 500.0),
        ];
        if far > 0.0 {
            w.push(rect_wall(far - 1.0, far - 1.0, far, far));
        }
        w
    }

    /// Q20 : à chaque facteur de cellule (1, 2, 4), à origine entière ou non, un écart d'au plus 2 cellules se ferme
    /// et un écart d'au moins 4 cellules fuit ; entre les deux, cela dépend de l'alignement de l'écart sur la grille.
    #[test]
    fn gap_tolerance_holds_at_every_cell_factor_and_alignment() {
        for (far, f) in [(0.0f32, 1.0f64), (3000.0, 2.0), (6000.0, 4.0)] {
            for ox in [100.0f32, 100.37] {
                let c = f as f32;
                let g = fit(&square_far(ox, 0.0, far), 2.0).expect("grille");
                assert_eq!(g.cell, f, "facteur de cellule");
                if ox > 100.0 {
                    assert!(g.origin[0].fract() != 0.0, "origine entière");
                }
                let (cx, cy) = (f64::from(ox) + 200.0, 300.0);
                for gap in [1.0 * c, 1.5 * c, 2.0 * c] {
                    assert!(
                        matches!(
                            closed_zone(&square_far(ox, gap, far), cx, cy, 2.0),
                            Zone::Closed(_)
                        ),
                        "écart {gap} (cellule {f}, x {ox}) devait fermer"
                    );
                }
                for gap in [4.0 * c, 4.5 * c, 6.0 * c] {
                    assert_eq!(
                        closed_zone(&square_far(ox, gap, far), cx, cy, 2.0),
                        Zone::Open,
                        "écart {gap} (cellule {f}, x {ox}) devait fuir"
                    );
                }
            }
        }
    }

    /// Q9 : les suites de la région agrandie de 2 cellules, lues sur les segments de la diffusion, sont celles de la
    /// région dilatée deux fois (3 × 3) dans le masque, ligne par ligne (îlots, mur oblique, mur fin, cellule non
    /// entière).
    #[test]
    fn grown_runs_match_the_twice_dilated_mask() {
        let walls = mixed_walls();
        for tol in [2.0, 3.0, 16.0] {
            let g = fit(&walls, tol).expect("grille");
            let mut m = Mask::new(g);
            for w in &walls {
                m.paint(w);
            }
            m.dilate_in_place(WALL);
            let (cx, cy) = g.cell_of(300.0, 300.0).expect("clic dans l'emprise");
            let mut spans = Vec::new();
            assert!(m.flood_spans(cx, cy, &mut spans), "zone fermée à {tol}");
            m.dilate_in_place(REGION);
            m.dilate_in_place(REGION);
            let first = g.row_index(&mut spans);
            let mut grown = Vec::new();
            for j in 0..g.h {
                let row = &m.cells[j * g.w..(j + 1) * g.w];
                let mut want = Vec::new();
                let mut i = 0;
                while i < g.w {
                    if row[i] == REGION {
                        let s = i;
                        while i < g.w && row[i] == REGION {
                            i += 1;
                        }
                        want.push((s, i - 1));
                    } else {
                        i += 1;
                    }
                }
                g.grown_runs(&spans, &first, j, &mut grown);
                assert_eq!(grown, want, "ligne {j} à {tol}");
            }
        }
    }

    /// Murs de garde des tests d'équivalence : carré, îlots, mur fin, mur oblique, anneau pair-impair.
    fn mixed_walls() -> Vec<Wall> {
        let mut walls = square(0.0);
        walls.push(rect_wall(350.0, 350.0, 370.0, 362.0));
        walls.push(rect_wall(400.0, 300.0, 440.0, 304.0));
        walls.push(rect_wall(420.0, 420.0, 421.0, 460.0));
        walls.extend(Wall::new(
            vec![vec![150.0, 400.0, 400.0, 150.0, 404.0, 154.0, 154.0, 404.0]],
            false,
        ));
        walls.extend(Wall::new(
            vec![
                vec![300.0, 420.0, 340.0, 420.0, 340.0, 460.0, 300.0, 460.0],
                vec![310.0, 430.0, 330.0, 430.0, 330.0, 450.0, 310.0, 450.0],
            ],
            true,
        ));
        walls
    }

    /// Q6 : les murs marqués avec `grow` = 1 sont ceux marqués sans agrandissement puis dilatés 3 × 3 sur le masque,
    /// cellule par cellule.
    #[test]
    fn marking_with_growth_is_the_dilated_mask() {
        let walls = mixed_walls();
        for tol in [2.0, 3.0, 16.0] {
            let g = fit(&walls, tol).expect("grille");
            let (mut want, mut got) = (Mask::new(g), Mask::new(g));
            for w in &walls {
                want.paint(w);
                got.paint_contours(&w.contours(), w.even_odd, &mut Vec::new(), 1);
            }
            want.dilate_in_place(WALL);
            assert!(got.cells == want.cells, "masques différents à {tol}");
        }
    }

    /// Q9 : les piles de suites couvrent exactement les rectangles des suites (différence symétrique vide), avec au
    /// plus autant de sommets (une pile ne se ferme que là où un rectangle se ferme), moins dès qu'un bord est oblique
    /// à la tolérance de S6.
    #[test]
    fn run_stacks_cover_the_run_rectangles() {
        let walls = mixed_walls();
        for tol in [2.0, 3.0, 16.0] {
            let g = fit(&walls, tol).expect("grille");
            let mut m = Mask::new(g);
            for w in &walls {
                m.paint_contours(&w.contours(), w.even_odd, &mut Vec::new(), 1);
            }
            let (cx, cy) = g.cell_of(300.0, 300.0).expect("clic dans l'emprise");
            let mut spans = Vec::new();
            assert!(m.flood_spans(cx, cy, &mut spans), "zone fermée à {tol}");
            let rects = g.rects(&mut spans.clone());
            let stacks = g.stacks(&mut spans);
            let xor = FloatOverlay::with_subj_and_clip(rects.as_slice(), stacks.as_slice())
                .overlay(OverlayRule::Xor, FillRule::NonZero);
            assert!(xor.is_empty(), "piles et rectangles diffèrent à {tol}");
            let (s, r) = (
                stacks.iter().map(Vec::len).sum::<usize>(),
                rects.iter().map(Vec::len).sum::<usize>(),
            );
            assert!(
                s < r || (s == r && tol > 2.0),
                "{s} sommets en piles, {r} en rectangles, à {tol}"
            );
        }
    }

    /// Balayages de la diffusion à huit cellules : mêmes réponses que la lecture octet par octet, à toute position de
    /// départ et toute longueur (longues suites libres, de murs, de région, cellules isolées).
    #[test]
    fn word_scans_match_byte_scans() {
        let mut rows: Vec<Vec<u8>> = vec![vec![FREE; 37], vec![REGION; 29]];
        let mut mixed = vec![FREE; 20];
        mixed.extend(
            (0..23u32).map(|i| [FREE, FREE, WALL, FREE, REGION, FREE, FREE][(i * 5 % 7) as usize]),
        );
        mixed.extend([REGION; 17]);
        mixed.extend([FREE; 11]);
        mixed.push(WALL);
        rows.push(mixed);
        for row in &rows {
            for len in 0..=row.len() {
                let r = &row[..len];
                for from in 0..=len {
                    let set = r[from..].iter().position(|&c| c != FREE);
                    let free = r[from..].iter().position(|&c| c == FREE);
                    assert_eq!(next_set(r, from), set.map_or(len, |p| from + p));
                    assert_eq!(next_free(r, from), free.map_or(len, |p| from + p));
                    assert_eq!(
                        prev_set(r, from),
                        r[..from].iter().rposition(|&c| c != FREE)
                    );
                }
            }
        }
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
            look: Look::default(),
            cell: None,
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

    /// T12 : la boîte d'une image se lit sur l'élément en main ; sur une page tardive, elle ferme toujours la zone.
    #[test]
    fn image_box_closes_zone_on_late_page() {
        let mut d = Document::blank();
        d.add_page();
        let p = d.page_ids()[1].clone();
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
            look: Look::default(),
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
        // Côtés à main levée, comme la fixture de l'essai (`c8-pot-zones-navigateur.mjs`, `side`) : un point tous les
        // 10, écart normal 3 sin(7πt) sin(πt), nul aux sommets.
        let side = |d: &mut Document, a: [f64; 2], b: [f64; 2]| {
            let len = (b[0] - a[0]).hypot(b[1] - a[1]);
            let n = (len / 10.0).ceil() as usize;
            let (nx, ny) = (-(b[1] - a[1]) / len, (b[0] - a[0]) / len);
            let pi = std::f64::consts::PI;
            let points: Vec<f32> = (0..=n)
                .flat_map(|i| {
                    let t = i as f64 / n as f64;
                    let wob = 3.0 * (t * pi * 7.0).sin() * (t * pi).sin();
                    [
                        (a[0] + (b[0] - a[0]) * t + nx * wob) as f32,
                        (a[1] + (b[1] - a[1]) * t + ny * wob) as f32,
                        0.5,
                    ]
                })
                .collect();
            d.apply(Command::CommitStroke {
                page: p.clone(),
                points,
                style: pen(),
                look: Look::default(),
                cell: None,
            })
            .expect("côté");
        };
        side(&mut d, [-700.0, -700.0], [1300.0, -700.0]);
        side(&mut d, [1300.0, -700.0], [-700.0, 1300.0]);
        side(&mut d, [-700.0, 1300.0], [-700.0, -700.0]);
        for i in 0..20 {
            for j in 0..15 {
                let (x, y) = (-600.0 + 40.0 * f64::from(i), -600.0 + 40.0 * f64::from(j));
                stroke(&mut d, &p, [x, y], [x + 15.0, y]);
            }
        }
        assert!(d.zone_cells(&p, 2.0) >= 4_000_000);
        // Trois clics, annulés entre deux comme dans l'essai ; table des phases du clic médian.
        let ms = |a: std::time::Instant, b: std::time::Instant| (b - a).as_secs_f64() * 1e3;
        let mut runs = Vec::new();
        for _ in 0..3 {
            LAPS.with(|l| l.borrow_mut().clear());
            let t = std::time::Instant::now();
            let c = d
                .apply(zone(&p, 100.0, 100.0, Some("#facc15")))
                .expect("zone");
            let end = std::time::Instant::now();
            assert_eq!(c.ids.len(), 1);
            runs.push((ms(t, end), t, end, LAPS.with(|l| l.take())));
            assert!(d.undo());
        }
        runs.sort_by(|a, b| a.0.total_cmp(&b.0));
        let (total, t, end, laps) = &runs[1];
        let mut prev = *t;
        for (phase, size, at) in laps {
            eprintln!(
                "  {:<32} {:>8.2} ms  ({size})",
                if *phase == "début" {
                    "lecture des murs"
                } else {
                    phase
                },
                ms(prev, *at)
            );
            prev = *at;
        }
        eprintln!("  {:<32} {:>8.2} ms", "écriture du fill", ms(prev, *end));
        eprintln!(
            "S6 natif : médiane {total:.1} ms ({}), {} cellules",
            runs.iter()
                .map(|r| format!("{:.1}", r.0))
                .collect::<Vec<_>>()
                .join(", "),
            d.zone_cells(&p, 2.0)
        );
    }
}
