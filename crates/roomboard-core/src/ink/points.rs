//! Points d'encre (D6) : ligne médiane brute (x, y, pression), rangée en `f32` petit-boutiste, 3 nombres par point.
//! Le lissage n'est jamais destructif : il est calculé par `ink::outline`.

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct InkPoint {
    pub x: f32,
    pub y: f32,
    pub pressure: f32,
}

/// Distance sous laquelle un point est un doublon du précédent gardé (D6).
pub const MIN_STEP: f32 = 0.5;

pub fn from_flat(flat: &[f32]) -> Vec<InkPoint> {
    flat.as_chunks::<3>()
        .0
        .iter()
        .map(|c| InkPoint {
            x: c[0],
            y: c[1],
            pressure: c[2],
        })
        .collect()
}

pub fn to_flat(points: &[InkPoint]) -> Vec<f32> {
    points.iter().flat_map(|p| [p.x, p.y, p.pressure]).collect()
}

pub fn dist(a: &InkPoint, b: &InkPoint) -> f32 {
    (a.x - b.x).hypot(a.y - b.y)
}

pub fn dedup(points: &[InkPoint]) -> Vec<InkPoint> {
    let mut out: Vec<InkPoint> = Vec::with_capacity(points.len());
    for p in points {
        match out.last() {
            Some(last) if dist(last, p) < MIN_STEP => {}
            _ => out.push(*p),
        }
    }
    out
}

pub fn encode(points: &[InkPoint]) -> Vec<u8> {
    let mut bytes = Vec::with_capacity(points.len() * 12);
    for p in points {
        for v in [p.x, p.y, p.pressure] {
            bytes.extend_from_slice(&v.to_le_bytes());
        }
    }
    bytes
}

pub fn decode(bytes: &[u8]) -> Option<Vec<InkPoint>> {
    if !bytes.len().is_multiple_of(12) {
        return None;
    }
    let f = |c: &[u8; 12], i: usize| f32::from_le_bytes([c[i], c[i + 1], c[i + 2], c[i + 3]]);
    Some(
        bytes
            .as_chunks::<12>()
            .0
            .iter()
            .map(|c| InkPoint {
                x: f(c, 0),
                y: f(c, 4),
                pressure: f(c, 8),
            })
            .collect(),
    )
}

/// Origine locale = premier point (D4) : points relatifs, et la translation qui les replace sur la page.
pub fn to_local(points: &[InkPoint]) -> (Vec<InkPoint>, (f64, f64)) {
    let Some(first) = points.first() else {
        return (Vec::new(), (0.0, 0.0));
    };
    let (ox, oy) = (first.x, first.y);
    let local = points
        .iter()
        .map(|p| InkPoint {
            x: p.x - ox,
            y: p.y - oy,
            pressure: p.pressure,
        })
        .collect();
    (local, (f64::from(ox), f64::from(oy)))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn p(x: f32, y: f32) -> InkPoint {
        InkPoint {
            x,
            y,
            pressure: 0.5,
        }
    }

    #[test]
    fn from_flat_ignores_trailing_values() {
        assert_eq!(
            from_flat(&[1.0, 2.0, 0.5, 9.0]),
            vec![InkPoint {
                x: 1.0,
                y: 2.0,
                pressure: 0.5
            }]
        );
    }

    #[test]
    fn to_flat_round_trip() {
        let pts = vec![p(1.0, 2.0), p(3.0, 4.0)];
        assert_eq!(from_flat(&to_flat(&pts)), pts);
    }

    #[test]
    fn dedup_drops_points_closer_than_half_unit() {
        let pts = vec![p(0.0, 0.0), p(0.2, 0.0), p(0.6, 0.0), p(0.7, 0.0)];
        assert_eq!(dedup(&pts), vec![p(0.0, 0.0), p(0.6, 0.0)]);
    }

    #[test]
    fn encode_decode_round_trip() {
        let pts = vec![
            p(1.5, -2.25),
            InkPoint {
                x: 1e6,
                y: 0.0,
                pressure: 1.0,
            },
        ];
        assert_eq!(decode(&encode(&pts)), Some(pts));
    }

    #[test]
    fn encode_is_little_endian() {
        let b = encode(&[InkPoint {
            x: 1.0,
            y: 0.0,
            pressure: 0.0,
        }]);
        assert_eq!(b.len(), 12);
        assert_eq!(&b[0..4], &[0x00, 0x00, 0x80, 0x3f]);
    }

    #[test]
    fn decode_rejects_bad_length() {
        assert_eq!(decode(&[0u8; 13]), None);
    }

    #[test]
    fn to_local_origin_is_first_point() {
        let (local, origin) = to_local(&[p(10.0, 20.0), p(15.0, 25.0)]);
        assert_eq!(origin, (10.0, 20.0));
        assert_eq!(local, vec![p(0.0, 0.0), p(5.0, 5.0)]);
    }
}
