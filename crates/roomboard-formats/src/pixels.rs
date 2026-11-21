//! Calculs de pixels des images (C5, U30, DAI2) : couleur rendue transparente (tolérance par canal, plume, contigu ou
//! global), luminosité et contraste, pot sur pixels (prêt pour C6b). RGBA 8 bits, `4 × w × h` octets, modifiés sur place ;
//! Rust pur, aucune crate d'image ; servis par `roomboard-formats-wasm` au Worker de pixels de la page (I17, I18).

/// Couleur à rendre transparente (I12-I14) : écart par canal RVB (échelle 0 à 100), rampe d'alpha de largeur `soft` ;
/// `contiguous` : diffusion depuis les bords de l'image, sinon tout pixel de l'image.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Transparent {
    pub rgb: [u8; 3],
    pub tolerance: u8,
    pub soft: u8,
    pub contiguous: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PixelError {
    /// `px.len()` différent de `4 × w × h`.
    BadSize,
}

impl std::fmt::Display for PixelError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            PixelError::BadSize => {
                write!(
                    f,
                    "pixels incohérents (4 × largeur × hauteur octets attendus)"
                )
            }
        }
    }
}

impl std::error::Error for PixelError {}

fn check(px: &[u8], w: u32, h: u32) -> Result<(), PixelError> {
    if px.len() as u64 == 4 * u64::from(w) * u64::from(h) {
        Ok(())
    } else {
        Err(PixelError::BadSize)
    }
}

/// Plus grand écart par canal RVB entre le pixel `p` (4 octets) et `rgb`, × 100 : comparé à un seuil × 255 (I12).
fn gap100(p: &[u8], rgb: [u8; 3]) -> u32 {
    p[..3]
        .iter()
        .zip(rgb)
        .map(|(a, b)| u32::from(a.abs_diff(b)))
        .max()
        .unwrap_or(0)
        * 100
}

/// Pixels joints (4-connexes, comme ActCraft `imagefill.cpp:40-42`) aux départs `starts` dont l'écart à `target` reste
/// ≤ `limit` (échelle 0 à 200) ; un départ hors de l'image ou trop loin de `target` est ignoré. Partagé par
/// `flood_fill` (un départ, couleur de la graine) et le mode contigu (départs du bord, couleur choisie).
fn flood_region(
    px: &[u8],
    w: u32,
    h: u32,
    starts: &[(u32, u32)],
    target: [u8; 3],
    limit: u8,
) -> Vec<bool> {
    let (w, h) = (w as usize, h as usize);
    let max = u32::from(limit) * 255;
    let near = |i: usize| gap100(&px[4 * i..4 * i + 4], target) <= max;
    let mut seen = vec![false; w * h];
    let mut stack: Vec<usize> = Vec::new();
    for &(x, y) in starts {
        let (x, y) = (x as usize, y as usize);
        if x >= w || y >= h {
            continue;
        }
        let i = y * w + x;
        if !seen[i] && near(i) {
            seen[i] = true;
            stack.push(i);
        }
    }
    while let Some(i) = stack.pop() {
        let (x, y) = (i % w, i / w);
        // Voisins 4-connexes ; `usize::MAX` = hors de l'image.
        let mut next = [usize::MAX; 4];
        if x > 0 {
            next[0] = i - 1;
        }
        if x + 1 < w {
            next[1] = i + 1;
        }
        if y > 0 {
            next[2] = i - w;
        }
        if y + 1 < h {
            next[3] = i + w;
        }
        for j in next {
            if j != usize::MAX && !seen[j] && near(j) {
                seen[j] = true;
                stack.push(j);
            }
        }
    }
    seen
}

/// Pixels du bord de l'image, chacun une fois (I14).
fn border(w: u32, h: u32) -> Vec<(u32, u32)> {
    let mut out = Vec::new();
    if w == 0 || h == 0 {
        return out;
    }
    for x in 0..w {
        out.push((x, 0));
        if h > 1 {
            out.push((x, h - 1));
        }
    }
    for y in 1..h.saturating_sub(1) {
        out.push((0, y));
        if w > 1 {
            out.push((w - 1, y));
        }
    }
    out
}

/// Alpha d'un pixel d'écart `g` (× 100) : 0 jusqu'à `tolerance`, inchangé dès `tolerance + soft`, rampe linéaire entre
/// les deux, arrondie (I13).
fn ramp(alpha: u8, g: u32, tolerance: u8, soft: u8) -> u8 {
    let lo = u32::from(tolerance) * 255;
    let hi = (u32::from(tolerance) + u32::from(soft)) * 255;
    if g <= lo {
        0
    } else if g >= hi {
        alpha
    } else {
        let span = hi - lo;
        ((u32::from(alpha) * (g - lo) + span / 2) / span) as u8
    }
}

/// Rend transparente la couleur `t.rgb` (I12-I14), décidée sur les couleurs d'origine ; seul l'alpha change.
pub fn transparent_color(px: &mut [u8], w: u32, h: u32, t: &Transparent) -> Result<(), PixelError> {
    check(px, w, h)?;
    let limit = t.tolerance.saturating_add(t.soft);
    let mask = t
        .contiguous
        .then(|| flood_region(px, w, h, &border(w, h), t.rgb, limit));
    for (i, p) in px.as_chunks_mut::<4>().0.iter_mut().enumerate() {
        if mask.as_ref().is_some_and(|m| !m[i]) {
            continue;
        }
        p[3] = ramp(p[3], gap100(p, t.rgb), t.tolerance, t.soft);
    }
    Ok(())
}

/// Luminosité et contraste par canal, alpha gardé (I15) ; 0 et 0 : octets inchangés. Calcul entier exact.
pub fn adjust(px: &mut [u8], brightness: i8, contrast: i8) {
    if brightness == 0 && contrast == 0 {
        return;
    }
    // Exact en entiers : v' = ((v - 128)(100 + c) + 12800 + 255 b) / 100, arrondi demi loin de zéro, borné à 0..=255
    // (le flottant décalait des demis : 7 906 combinaisons à ±1). Un numérateur ≤ 0 donne 0 après bornage.
    let (k, b) = (i32::from(contrast) + 100, i32::from(brightness));
    let lut: Vec<u8> = (0..=255i32)
        .map(|v| {
            let n = (v - 128) * k + 12_800 + 255 * b;
            ((n + 50) / 100).clamp(0, 255) as u8
        })
        .collect();
    for p in px.as_chunks_mut::<4>().0 {
        for c in &mut p[..3] {
            *c = lut[usize::from(*c)];
        }
    }
}

/// Pot sur pixels (prêt pour C6b) : la zone 4-connexe de la graine (écart à la couleur de la graine ≤ `tolerance`)
/// prend `rgb`, alpha gardé ; graine hors de l'image : rien ne change (comme ActCraft).
pub fn flood_fill(
    px: &mut [u8],
    w: u32,
    h: u32,
    seed: (u32, u32),
    tolerance: u8,
    rgb: [u8; 3],
) -> Result<(), PixelError> {
    check(px, w, h)?;
    if seed.0 >= w || seed.1 >= h {
        return Ok(());
    }
    let i = 4 * (seed.1 as usize * w as usize + seed.0 as usize);
    let target = [px[i], px[i + 1], px[i + 2]];
    let mask = flood_region(px, w, h, &[seed], target, tolerance);
    for (p, on) in px.as_chunks_mut::<4>().0.iter_mut().zip(mask) {
        if on {
            p[..3].copy_from_slice(&rgb);
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    const WHITE: [u8; 4] = [255, 255, 255, 255];
    const RED: [u8; 4] = [220, 38, 38, 255];

    /// Image `w × h` fabriquée par `at(x, y)`.
    fn img(w: u32, h: u32, at: impl Fn(u32, u32) -> [u8; 4]) -> Vec<u8> {
        let at = &at;
        (0..h)
            .flat_map(|y| (0..w).flat_map(move |x| at(x, y)))
            .collect()
    }

    fn px(v: &[u8], w: u32, x: u32, y: u32) -> [u8; 4] {
        let i = 4 * (y * w + x) as usize;
        [v[i], v[i + 1], v[i + 2], v[i + 3]]
    }

    /// 20 × 20 : fond blanc, anneau carré rouge (bords 5 et 14, deux pixels d'épaisseur), intérieur blanc enfermé.
    fn ring() -> Vec<u8> {
        img(20, 20, |x, y| {
            let inside = (5..15).contains(&x) && (5..15).contains(&y);
            let hole = (7..13).contains(&x) && (7..13).contains(&y);
            if inside && !hole {
                RED
            } else {
                WHITE
            }
        })
    }

    fn white(tolerance: u8, soft: u8, contiguous: bool) -> Transparent {
        Transparent {
            rgb: [255, 255, 255],
            tolerance,
            soft,
            contiguous,
        }
    }

    #[test]
    fn global_tolerance_10_clears_background_and_enclosed_white() {
        let mut v = ring();
        transparent_color(&mut v, 20, 20, &white(10, 0, false)).expect("calcul");
        assert_eq!(px(&v, 20, 0, 0)[3], 0, "fond");
        assert_eq!(px(&v, 20, 10, 10)[3], 0, "intérieur enfermé");
        assert_eq!(px(&v, 20, 5, 10), RED, "anneau intact");
    }

    #[test]
    fn contiguous_clears_only_background_from_border() {
        let mut v = ring();
        transparent_color(&mut v, 20, 20, &white(10, 0, true)).expect("calcul");
        assert_eq!(px(&v, 20, 0, 0)[3], 0, "fond");
        assert_eq!(px(&v, 20, 19, 19)[3], 0, "fond, coin opposé");
        assert_eq!(px(&v, 20, 10, 10), WHITE, "intérieur enfermé gardé");
        assert_eq!(px(&v, 20, 5, 10), RED);
    }

    #[test]
    fn contiguous_reaches_both_halves_cut_by_a_bar_touching_two_borders() {
        let mut v = img(
            20,
            20,
            |x, _| if (9..11).contains(&x) { RED } else { WHITE },
        );
        transparent_color(&mut v, 20, 20, &white(10, 0, true)).expect("calcul");
        assert_eq!(px(&v, 20, 2, 10)[3], 0, "moitié gauche");
        assert_eq!(px(&v, 20, 17, 10)[3], 0, "moitié droite");
        assert_eq!(px(&v, 20, 9, 10), RED, "barre intacte");
    }

    #[test]
    fn soft_20_gives_light_gray_an_intermediate_alpha() {
        let mut v = img(3, 1, |x, _| match x {
            0 => WHITE,
            1 => [215, 215, 215, 255],
            _ => [0, 0, 0, 255],
        });
        transparent_color(&mut v, 3, 1, &white(10, 20, false)).expect("calcul");
        assert_eq!(px(&v, 3, 0, 0)[3], 0);
        assert_eq!(
            px(&v, 3, 1, 0)[3],
            73,
            "écart 40 : 255 × (4000 − 2550) / 5100, arrondi"
        );
        assert_eq!(px(&v, 3, 2, 0)[3], 255);
    }

    #[test]
    fn tolerance_is_per_channel() {
        let mut v = img(2, 1, |x, _| {
            if x == 0 {
                [255, 255, 230, 255]
            } else {
                [255, 255, 229, 255]
            }
        });
        transparent_color(&mut v, 2, 1, &white(10, 0, false)).expect("calcul");
        assert_eq!(px(&v, 2, 0, 0)[3], 0, "écart 25 : 2500 ≤ 2550");
        assert_eq!(px(&v, 2, 1, 0)[3], 255, "écart 26 : 2600 > 2550");
    }

    #[test]
    fn adjust_contrast_is_exact_in_integers() {
        // (173 - 128) * 1 + 12800 - 12495 = 350 -> 3,5 -> 4 (le flottant donnait 3)
        let mut v = [173u8, 173, 173, 255];
        adjust(&mut v, -49, -99);
        assert_eq!(v, [4, 4, 4, 255]);
    }

    #[test]
    fn adjust_zero_keeps_bytes() {
        let before: Vec<u8> = (0..=255u8).cycle().take(4 * 64).collect();
        let mut v = before.clone();
        adjust(&mut v, 0, 0);
        assert_eq!(v, before);
    }

    #[test]
    fn adjust_brightness_and_contrast_formula_keeps_alpha() {
        let mut v = vec![100, 128, 0, 77];
        adjust(&mut v, 50, 0);
        assert_eq!(
            v,
            vec![228, 255, 128, 77],
            "100 + 127,5 arrondi ; 128 + 127,5 borné ; alpha gardé"
        );
        let mut v = vec![100, 128, 255, 9];
        adjust(&mut v, 0, 50);
        assert_eq!(
            v,
            vec![86, 128, 255, 9],
            "(100 − 128) × 1,5 + 128 ; 128 fixe ; 255 borné"
        );
    }

    /// B8 : la zone de la graine prend la couleur opaque ; l'intérieur enfermé et l'anneau ne changent pas.
    #[test]
    fn flood_fill_paints_opaque_and_keeps_enclosed_interior() {
        let mut v = img(20, 20, |x, y| {
            let inside = (5..15).contains(&x) && (5..15).contains(&y);
            let hole = (7..13).contains(&x) && (7..13).contains(&y);
            if inside && !hole {
                RED
            } else {
                [255, 255, 255, 200]
            }
        });
        let n = flood_fill(&mut v, 20, 20, (0, 0), 5, Some([255, 0, 0])).expect("calcul");
        assert_eq!(n, 300, "fond extérieur : 20 × 20 − 10 × 10");
        assert_eq!(px(&v, 20, 0, 0), [255, 0, 0, 255], "fond rougi, opaque");
        assert_eq!(px(&v, 20, 10, 10), [255, 255, 255, 200], "intérieur enfermé inchangé");
        assert_eq!(px(&v, 20, 5, 10), RED);
    }

    /// S3 : fond transparent et trait noir : remplir le fond (tolérance 5) le rend opaque de la couleur choisie sans
    /// toucher au noir (en RVB seul, le transparent lu 0,0,0,0 déborderait dans le noir).
    #[test]
    fn transparent_zone_does_not_leak_into_black() {
        const CLEAR: [u8; 4] = [0, 0, 0, 0];
        const BLACK: [u8; 4] = [0, 0, 0, 255];
        let mut v = img(20, 20, |x, _| if x == 10 { BLACK } else { CLEAR });
        let n = flood_fill(&mut v, 20, 20, (0, 0), 5, Some([250, 204, 21])).expect("calcul");
        assert_eq!(n, 10 * 20, "colonnes 0 à 9");
        assert_eq!(px(&v, 20, 0, 0), [250, 204, 21, 255]);
        assert_eq!(px(&v, 20, 10, 5), BLACK);
        assert_eq!(px(&v, 20, 15, 5), CLEAR, "de l'autre côté du trait : inchangé");
    }

    /// S3 : effacer une zone blanche donne [0, 0, 0, 0] et rend le nombre de pixels changés ; déjà transparente : 0.
    #[test]
    fn clear_makes_zone_transparent_and_counts() {
        let mut v = ring();
        assert_eq!(flood_fill(&mut v, 20, 20, (0, 0), 5, None).expect("calcul"), 300);
        assert_eq!(px(&v, 20, 0, 0), [0, 0, 0, 0]);
        assert_eq!(px(&v, 20, 10, 10), WHITE, "intérieur enfermé inchangé");
        assert_eq!(px(&v, 20, 5, 10), RED);
        assert_eq!(
            flood_fill(&mut v, 20, 20, (0, 0), 5, None).expect("calcul"),
            0,
            "zone déjà transparente : rien changé"
        );
    }

    /// HB13 : peindre la couleur déjà présente (même alpha) : 0 changé.
    #[test]
    fn flood_fill_same_paint_changes_nothing() {
        let mut v = img(4, 4, |_, _| [250, 204, 21, 255]);
        assert_eq!(
            flood_fill(&mut v, 4, 4, (1, 1), 5, Some([250, 204, 21])).expect("calcul"),
            0
        );
    }

    /// B8 : échelle de C5 (écart × 100 ≤ tolérance × 255) sur les quatre canaux : gris 240 joint au blanc à 10, pas à 5.
    #[test]
    fn flood_fill_tolerance_scale_on_rgba() {
        let band = |x: u32, _y: u32| if x < 2 { [240, 240, 240, 255] } else { WHITE };
        let mut v = img(6, 1, band);
        assert_eq!(flood_fill(&mut v, 6, 1, (5, 0), 5, None).expect("calcul"), 4);
        let mut v = img(6, 1, band);
        assert_eq!(flood_fill(&mut v, 6, 1, (5, 0), 10, None).expect("calcul"), 6);
        let mut v = img(2, 1, |x, _| if x == 0 { [255, 255, 255, 240] } else { WHITE });
        assert_eq!(
            flood_fill(&mut v, 2, 1, (1, 0), 5, None).expect("calcul"),
            1,
            "un écart d'alpha seul sépare aussi les zones"
        );
    }

    #[test]
    fn flood_fill_seed_outside_changes_nothing() {
        let before = ring();
        let mut v = before.clone();
        assert_eq!(flood_fill(&mut v, 20, 20, (20, 0), 5, Some([0, 0, 0])).expect("calcul"), 0);
        assert_eq!(v, before);
    }

    #[test]
    fn bad_size_is_refused() {
        let mut v = vec![0u8; 3];
        assert_eq!(
            transparent_color(&mut v, 1, 1, &white(10, 0, false)),
            Err(PixelError::BadSize)
        );
        assert_eq!(
            flood_fill(&mut v, 1, 1, (0, 0), 5, Some([0, 0, 0])),
            Err(PixelError::BadSize)
        );
        assert_eq!(
            PixelError::BadSize.to_string(),
            "pixels incohérents (4 × largeur × hauteur octets attendus)"
        );
    }

    #[test]
    fn border_lists_each_edge_pixel_once() {
        let b = border(3, 3);
        assert_eq!(b.len(), 8);
        assert!(!b.contains(&(1, 1)));
        assert_eq!(border(1, 1), vec![(0, 0)]);
        assert_eq!(border(0, 5), Vec::<(u32, u32)>::new());
    }
}
