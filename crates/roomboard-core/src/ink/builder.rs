//! Encre vive (D7, DA7, D10) : la page pousse les points accumulés une fois par image. Contour complet recalculé
//! tant que le trait a ≤ FULL_LIMIT points ; au-delà, blocs de BLOCK points figés (chaque bloc reprend le dernier
//! point du précédent) et seul le dernier bloc est recalculé. Polygones séparés par une paire NaN, NaN.
use super::outline::{outline_with, InkStyle};
use super::points::{dist, from_flat, InkPoint, MIN_STEP};

pub const FULL_LIMIT: usize = 2000;

/// Ajoute les triplets en sautant un point à moins de MIN_STEP du précédent.
fn append_spaced(points: &mut Vec<InkPoint>, flat: &[f32]) {
    for p in from_flat(flat) {
        match points.last() {
            Some(last) if dist(last, &p) < MIN_STEP => {}
            _ => points.push(p),
        }
    }
}
pub const BLOCK: usize = 256;

pub struct StrokeBuilder {
    style: InkStyle,
    points: Vec<InkPoint>,
    frozen: Vec<Vec<f32>>,
    frozen_upto: usize,
}

impl StrokeBuilder {
    pub fn new(style: InkStyle) -> Self {
        Self {
            style,
            points: Vec::new(),
            frozen: Vec::new(),
            frozen_upto: 0,
        }
    }

    pub fn points(&self) -> &[InkPoint] {
        &self.points
    }

    pub fn frozen_blocks(&self) -> usize {
        self.frozen.len()
    }

    pub fn frozen_upto(&self) -> usize {
        self.frozen_upto
    }

    /// Ajoute des triplets x, y, pression ; rend le contour courant.
    pub fn push(&mut self, flat: &[f32]) -> Vec<f32> {
        self.push_ahead(flat, &[])
    }

    /// Comme `push`, puis prolonge le contour rendu par des points provisoires (`ahead`, triplets x, y, pression :
    /// les points prédits du navigateur) sans les garder. Même géométrie que le trait (lissage, largeur de la
    /// pression), un seul polygone pour le dernier bloc : aucune queue dessinée à part (OF44).
    /// Un seul calcul de contour par appel, prédits compris.
    pub fn push_ahead(&mut self, flat: &[f32], ahead: &[f32]) -> Vec<f32> {
        append_spaced(&mut self.points, flat);
        self.freeze();
        let kept = self.points.len();
        append_spaced(&mut self.points, ahead);
        let tail = outline_with(&self.points[self.frozen_upto..], &self.style, false);
        self.points.truncate(kept);
        self.assemble(tail)
    }

    /// Contour final du geste (fin du trait connue).
    pub fn finish(&self) -> Vec<f32> {
        self.current(true)
    }

    /// Fige les blocs terminés : chaque bloc va de `frozen_upto` à `frozen_upto + BLOCK` inclus, et le suivant
    /// repart de ce même point (sans ce point commun, le segment de jonction ne serait couvert par aucun polygone).
    fn freeze(&mut self) {
        if self.points.len() <= FULL_LIMIT {
            return;
        }
        while self.points.len() - self.frozen_upto > BLOCK + 1 {
            let end = self.frozen_upto + BLOCK;
            let block = outline_with(&self.points[self.frozen_upto..=end], &self.style, false);
            self.frozen.push(block);
            self.frozen_upto = end;
        }
    }

    fn current(&self, last: bool) -> Vec<f32> {
        self.assemble(outline_with(
            &self.points[self.frozen_upto..],
            &self.style,
            last,
        ))
    }

    /// Blocs figés, puis le contour du dernier bloc.
    fn assemble(&self, tail: Vec<f32>) -> Vec<f32> {
        if self.frozen.is_empty() {
            return tail;
        }
        let mut out =
            Vec::with_capacity(self.frozen.iter().map(|b| b.len() + 2).sum::<usize>() + tail.len());
        for block in &self.frozen {
            out.extend_from_slice(block);
            out.extend_from_slice(&[f32::NAN, f32::NAN]);
        }
        out.extend(tail);
        out
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::ink::outline::outline;
    use crate::ink::points::from_flat;

    fn flat(n: usize) -> Vec<f32> {
        (0..n)
            .flat_map(|i| [i as f32, (i as f32 * 0.1).sin() * 20.0, 0.5])
            .collect()
    }

    fn nan_pairs(o: &[f32]) -> usize {
        o.as_chunks::<2>()
            .0
            .iter()
            .filter(|c| c[0].is_nan() && c[1].is_nan())
            .count()
    }

    /// Étendue en x de chaque polygone (séparés par une paire NaN, NaN).
    fn x_ranges(o: &[f32]) -> Vec<(f32, f32)> {
        let mut out = vec![(f32::MAX, f32::MIN)];
        for c in o.as_chunks::<2>().0.iter() {
            if c[0].is_nan() && c[1].is_nan() {
                out.push((f32::MAX, f32::MIN));
            } else {
                let r = out.last_mut().unwrap();
                *r = (r.0.min(c[0]), r.1.max(c[0]));
            }
        }
        out
    }

    #[test]
    fn empty_builder_gives_empty_outline() {
        assert!(StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false
        })
        .finish()
        .is_empty());
    }

    #[test]
    fn push_returns_single_polygon_under_limit() {
        let mut b = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        let o = b.push(&flat(500));
        assert!(!o.is_empty());
        assert_eq!(nan_pairs(&o), 0);
        assert_eq!(b.frozen_blocks(), 0);
    }

    #[test]
    fn finish_matches_outline_under_limit() {
        let mut b = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        b.push(&flat(300));
        assert_eq!(
            b.finish(),
            outline(
                &from_flat(&flat(300)),
                &InkStyle {
                    width: 6.0,
                    constant: false
                }
            )
        );
    }

    #[test]
    fn push_drops_close_points_across_calls() {
        let mut b = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        b.push(&[0.0, 0.0, 0.5]);
        b.push(&[0.1, 0.0, 0.5, 1.0, 0.0, 0.5]);
        assert_eq!(b.points().len(), 2);
    }

    #[test]
    fn long_stroke_freezes_blocks_of_256() {
        let mut b = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        let o = b.push(&flat(2500));
        assert_eq!(b.frozen_blocks(), 9);
        assert_eq!(nan_pairs(&o), 9);
    }

    #[test]
    fn frozen_blocks_overlap_by_one_point() {
        let mut b = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        b.push(&flat(2500));
        assert_eq!(b.frozen_upto(), b.frozen_blocks() * BLOCK);
        assert!(b.points().len() - b.frozen_upto() <= BLOCK + 1);
    }

    #[test]
    fn chunking_does_not_change_frozen_blocks() {
        let all = flat(2500);
        let mut one = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        one.push(&all);
        let mut many = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        for chunk in all.chunks(300) {
            many.push(chunk);
        }
        assert_eq!(one.frozen_blocks(), many.frozen_blocks());
        // Comparaison bit à bit : les séparateurs NaN ne sont jamais égaux par `==`.
        let bits = |o: Vec<f32>| o.into_iter().map(f32::to_bits).collect::<Vec<u32>>();
        assert_eq!(bits(one.finish()), bits(many.finish()));
    }

    /// Trait droit au pas de 8, largeur 6 (rayon 3) : si un bloc ne reprend pas le dernier point du précédent, le
    /// segment de jonction (8 unités, plus le retard de lissage) n'est couvert par aucun polygone. Chaque polygone
    /// doit donc commencer, en x, avant la fin du précédent.
    #[test]
    fn frozen_blocks_leave_no_gap() {
        let straight: Vec<f32> = (0..2500).flat_map(|i| [i as f32 * 8.0, 0.0, 0.5]).collect();
        let mut b = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        let live = b.push(&straight);
        for o in [live, b.finish()] {
            let ranges = x_ranges(&o);
            assert_eq!(ranges.len(), 10);
            for w in ranges.windows(2) {
                assert!(
                    w[1].0 < w[0].1,
                    "trou entre deux blocs : {:?} puis {:?}",
                    w[0],
                    w[1]
                );
            }
        }
    }

    /// OF44 : les points prédits prolongent le contour vif avec la même géométrie (lissage, largeur de la pression),
    /// sans être gardés : le push suivant ne les connaît plus.
    #[test]
    fn push_ahead_extends_outline_without_storing() {
        let line = |x0: usize, x1: usize, p: f32| -> Vec<f32> {
            (x0..x1).flat_map(|i| [i as f32 * 4.0, 0.0, p]).collect()
        };
        let mut plain = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        let without = plain.push(&line(0, 60, 0.15));
        let mut ahead = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        let with = ahead.push_ahead(&line(0, 60, 0.15), &line(60, 64, 0.15));
        assert_eq!(ahead.points().len(), plain.points().len());
        let max_x = |o: &[f32]| x_ranges(o)[0].1;
        assert!(
            max_x(&with) > max_x(&without) + 8.0,
            "le contour doit avancer vers les prédits : {} puis {}",
            max_x(&without),
            max_x(&with)
        );
        // Même largeur qu'au corps du trait (pression 0,15), pas la largeur du style.
        let half = |o: &[f32]| {
            o.as_chunks::<2>()
                .0
                .iter()
                .map(|c| c[1].abs())
                .fold(0.0f32, f32::max)
        };
        assert!((half(&with) - half(&without)).abs() < 0.01);
        // Le push suivant sans prédits rend le contour des seuls points reçus.
        let mut again = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        again.push(&line(0, 60, 0.15));
        let bits = |o: Vec<f32>| o.into_iter().map(f32::to_bits).collect::<Vec<u32>>();
        assert_eq!(bits(ahead.push(&[])), bits(again.push(&[])));
    }

    /// OF44, au-delà de FULL_LIMIT : les blocs figés ne changent pas, seul le dernier bloc avance vers les prédits.
    #[test]
    fn push_ahead_keeps_frozen_blocks_past_limit() {
        let straight = |x0: usize, x1: usize| -> Vec<f32> {
            (x0..x1).flat_map(|i| [i as f32 * 4.0, 0.0, 0.5]).collect()
        };
        let mut b = StrokeBuilder::new(InkStyle {
            width: 6.0,
            constant: false,
        });
        let plain = b.push(&straight(0, 2500));
        let blocks = b.frozen_blocks();
        let with = b.push_ahead(&[], &straight(2500, 2504));
        assert_eq!(b.frozen_blocks(), blocks);
        assert_eq!(b.points().len(), 2500);
        assert_eq!(nan_pairs(&with), nan_pairs(&plain));
        let (p, w) = (x_ranges(&plain), x_ranges(&with));
        assert_eq!(p[..p.len() - 1], w[..w.len() - 1]);
        assert!(w[w.len() - 1].1 > p[p.len() - 1].1 + 8.0);
    }

    /// Mesure (constat des lots 2 et 3, lot 3b T37) : coût d'un `push` d'une image (4 points) sur un trait déjà long,
    /// copie du contour entier comprise (le `Vec<f32>` rendu est celui que la liaison copie vers la page). Seuil écrit :
    /// p95 ≤ 4 ms en release native à 10 000 points, soit environ 8 ms en Wasm, la moitié d'une image de 16 ms.
    /// `cargo test -p roomboard-core --release --lib -- --ignored --nocapture long_stroke_push_cost`
    #[test]
    #[ignore = "mesure de coût, lancée à la main en release"]
    fn long_stroke_push_cost() {
        const FRAME: usize = 4;
        const SAMPLES: usize = 200;
        let mut p95_at_10k = f64::MAX;
        for n in [2_000_usize, 5_000, 10_000] {
            let mut b = StrokeBuilder::new(InkStyle {
                width: 6.0,
                constant: false,
            });
            let all: Vec<f32> = (0..n + FRAME * SAMPLES)
                .flat_map(|i| [i as f32 * 2.0, (i as f32 * 0.05).sin() * 40.0, 0.5])
                .collect();
            for chunk in all[..n * 3].chunks(FRAME * 3) {
                b.push(chunk);
            }
            let mut times: Vec<f64> = Vec::with_capacity(SAMPLES);
            let mut len = 0;
            for chunk in all[n * 3..].chunks(FRAME * 3) {
                let start = std::time::Instant::now();
                let out = b.push(chunk);
                times.push(start.elapsed().as_secs_f64() * 1000.0);
                len = out.len();
            }
            times.sort_by(f64::total_cmp);
            let p50 = times[times.len() / 2];
            let p95 = times[times.len() * 95 / 100];
            eprintln!("Mesure : {n} points, contour {len} flottants, push p50 {p50:.3} ms, p95 {p95:.3} ms");
            if n == 10_000 {
                p95_at_10k = p95;
            }
        }
        assert!(
            p95_at_10k <= 4.0,
            "push à 10 000 points : p95 {p95_at_10k:.3} ms > 4 ms (seuil du lot 3b, HL3b-9)"
        );
    }
}
