//! Liaison wasm-bindgen du second module Wasm (R8, DAR1) : conteneur `.roomboard` (`container::read`, `container::write`,
//! chargé par la page au premier besoin, R10) et première feuille d'un `.xlsx` (`sheet::read_first_sheet`, C10b, lue
//! dans un Worker jetable, DAB4) ; pages vectorielles en PDF (`pdf::write_pages`, C12, PF22, Worker jetable). Chaque
//! fonction exposée délègue à une fonction `_inner` sans JsValue, seule testée en natif (hors wasm32, tout appel à JS
//! panique).
//! C13 (DA2) : tableaux `.iwb` et `.ubz` (`BoardReader`, `write_board_xml`), lus et écrits dans un Worker jetable ;
//! `.notebook` lu seulement (lot 2, N2), pages dans l'ordre du manifeste (`notebook_order`, N6).
//! C5 (U30, I17) ; C6b (B17) : calculs de pixels sans état (`image_transparent`, `image_adjust`, `image_flood_fill`) pour le Worker de pixels.
use roomboard_core::format::Parts;
use roomboard_formats::board::{self, BoardList, Dialect};
use roomboard_formats::container::{self, AssetBytes};
use roomboard_formats::pdf::{write_pages, DisplayList, ImageInput};
use roomboard_formats::pixels::{self, Transparent};
use wasm_bindgen::prelude::*;

/// Fichier lu : manifeste, `document.ybin`, assets triés par empreinte, avertissements en français (K11).
#[wasm_bindgen]
pub struct ContainerReader {
    manifest: Vec<u8>,
    ybin: Vec<u8>,
    assets: Vec<(String, Vec<u8>)>,
    warnings: Vec<String>,
}

impl ContainerReader {
    /// `container::read` ; le message d'erreur est le `Display` du cœur.
    pub fn open_inner(file: &[u8]) -> Result<ContainerReader, String> {
        let u = container::read(file).map_err(|e| e.to_string())?;
        Ok(ContainerReader {
            manifest: u.parts.manifest,
            ybin: u.parts.ybin,
            assets: u.assets,
            warnings: u.warnings,
        })
    }
}

#[wasm_bindgen]
impl ContainerReader {
    /// Lève une Error au message du cœur (« ce fichier n'est pas un document RoomBoard », « … endommagé : … »).
    pub fn open(file: &[u8]) -> Result<ContainerReader, JsError> {
        Self::open_inner(file).map_err(|m| JsError::new(&m))
    }
    pub fn manifest(&self) -> Vec<u8> {
        self.manifest.clone()
    }
    pub fn ybin(&self) -> Vec<u8> {
        self.ybin.clone()
    }
    pub fn asset_count(&self) -> u32 {
        self.assets.len() as u32
    }
    pub fn asset_id(&self, i: u32) -> Option<String> {
        self.assets.get(i as usize).map(|(id, _)| id.clone())
    }
    pub fn asset_bytes(&self, i: u32) -> Option<Vec<u8>> {
        self.assets.get(i as usize).map(|(_, b)| b.clone())
    }
    pub fn warnings(&self) -> Vec<String> {
        self.warnings.clone()
    }
}

/// Assets bout à bout dans `bytes`, découpés par `sizes` ; `ids`, `mimes`, `sizes` de même longueur.
pub fn write_container_inner(
    manifest: &[u8],
    ybin: &[u8],
    ids: &[String],
    mimes: &[String],
    sizes: &[u32],
    bytes: &[u8],
) -> Result<Vec<u8>, String> {
    if ids.len() != mimes.len() || ids.len() != sizes.len() {
        return Err(format!(
            "assets incohérents : {} empreintes, {} types, {} tailles",
            ids.len(),
            mimes.len(),
            sizes.len()
        ));
    }
    let total: u64 = sizes.iter().map(|&s| u64::from(s)).sum();
    if total != bytes.len() as u64 {
        return Err(format!(
            "assets incohérents : {total} octets annoncés, {} reçus",
            bytes.len()
        ));
    }
    let mut at = 0usize;
    let mut assets = Vec::with_capacity(ids.len());
    for ((id, mime), &size) in ids.iter().zip(mimes).zip(sizes) {
        let end = at + size as usize;
        assets.push(AssetBytes {
            id: id.as_str(),
            mime: mime.as_str(),
            bytes: &bytes[at..end],
        });
        at = end;
    }
    let parts = Parts {
        manifest: manifest.to_vec(),
        ybin: ybin.to_vec(),
    };
    container::write(&parts, &assets).map_err(|e| e.to_string())
}

/// Écrit le `.roomboard` : manifeste et `document.ybin` du cœur, puis les assets (K12). Lève une Error lisible.
#[wasm_bindgen]
pub fn write_container(
    manifest: &[u8],
    ybin: &[u8],
    ids: Vec<String>,
    mimes: Vec<String>,
    sizes: Vec<u32>,
    bytes: &[u8],
) -> Result<Vec<u8>, JsError> {
    write_container_inner(manifest, ybin, &ids, &mimes, &sizes, bytes).map_err(|m| JsError::new(&m))
}

/// Octets bout à bout découpés par `sizes` ; la somme doit faire le compte (même contrôle que `write_container_inner`).
fn split<'a>(bytes: &'a [u8], sizes: &[u32], what: &str) -> Result<Vec<&'a [u8]>, String> {
    let total: u64 = sizes.iter().map(|&s| u64::from(s)).sum();
    if total != bytes.len() as u64 {
        return Err(format!(
            "{what} incohérentes : {total} octets annoncés, {} reçus",
            bytes.len()
        ));
    }
    let mut at = 0usize;
    Ok(sizes
        .iter()
        .map(|&s| {
            let part = &bytes[at..at + s as usize];
            at += s as usize;
            part
        })
        .collect())
}

/// Pages vectorielles (C12, PF22) : flux d'opérations, textes, polices et images bout à bout ; le PDF écrit.
pub fn write_pdf_pages_inner(
    ops: &[f32],
    texts: Vec<String>,
    fonts: &[u8],
    font_sizes: &[u32],
    images: &[u8],
    image_sizes: &[u32],
) -> Result<Vec<u8>, String> {
    let fonts = split(fonts, font_sizes, "polices")?;
    let images: Vec<ImageInput<'_>> = split(images, image_sizes, "images")?
        .into_iter()
        .map(|bytes| ImageInput { bytes })
        .collect();
    write_pages(
        &DisplayList {
            ops: ops.to_vec(),
            texts,
        },
        &fonts,
        &images,
    )
    .map_err(|e| e.to_string())
}

/// Lève une Error au message de `PdfWriteError` (« liste d'opérations invalide : … », « police 0 illisible… »).
#[wasm_bindgen]
pub fn write_pdf_pages(
    ops: &[f32],
    texts: Vec<String>,
    fonts: &[u8],
    font_sizes: Vec<u32>,
    images: &[u8],
    image_sizes: Vec<u32>,
) -> Result<Vec<u8>, JsError> {
    write_pdf_pages_inner(ops, texts, fonts, &font_sizes, images, &image_sizes)
        .map_err(|m| JsError::new(&m))
}

/// Tableau lu (C13, D1, D6) : flux BoardList d'un `content.xml`, d'un `.iwb` en SVG brut ou d'une page `.ubz`.
#[wasm_bindgen]
pub struct BoardReader {
    list: BoardList,
}

fn unknown_format(s: &str) -> String {
    format!("format de tableau inconnu : {s}")
}

fn dialect_of(s: &str) -> Result<Dialect, String> {
    Dialect::parse(s).ok_or_else(|| unknown_format(s))
}

impl BoardReader {
    /// `board::read_svg` ; le message d'erreur est le `Display` de `BoardError`.
    pub fn open_inner(xml: &[u8], dialect: &str, first_page: u32) -> Result<BoardReader, String> {
        let d = dialect_of(dialect)?;
        board::read_svg(xml, d, first_page)
            .map(|list| BoardReader { list })
            .map_err(|e| e.to_string())
    }
}

#[wasm_bindgen]
impl BoardReader {
    /// Lève une Error : « fichier endommagé : … », « fichier de tableau trop gros (plus de 100 000 objets) »,
    /// « format de tableau inconnu : … ».
    pub fn open(xml: &[u8], dialect: &str, first_page: u32) -> Result<BoardReader, JsError> {
        Self::open_inner(xml, dialect, first_page).map_err(|m| JsError::new(&m))
    }
    pub fn ops(&self) -> Vec<f32> {
        self.list.ops.clone()
    }
    pub fn texts(&self) -> Vec<String> {
        self.list.texts.clone()
    }
    pub fn warnings(&self) -> Vec<String> {
        self.list.warnings.clone()
    }
}

/// Ordre des pages d'un `.notebook` (C13 lot 2, N6) : `href` de la ressource `pages` de `imsmanifest.xml`, lus par le
/// Rust (D16) ; aucune ressource `pages` : liste vide (repli sur l'ordre des noms, `notebookOrder` de `board-reader.ts`).
pub fn notebook_order_inner(manifest: &[u8]) -> Result<Vec<String>, String> {
    board::notebook_order(manifest).map_err(|e| e.to_string())
}

/// Lève une Error au message de `BoardError` (« fichier endommagé : … »).
#[wasm_bindgen]
pub fn notebook_order(manifest: &[u8]) -> Result<Vec<String>, JsError> {
    notebook_order_inner(manifest).map_err(|m| JsError::new(&m))
}

/// Copie au format (C13, D18) : `[chemin, xml, …]` ; `iwb` : `content.xml` ; `ubz` : `page001.svg`… puis `metadata.rdf`.
pub fn write_board_xml_inner(
    ops: &[f32],
    texts: Vec<String>,
    format: &str,
) -> Result<Vec<String>, String> {
    let d = dialect_of(format)?;
    // Import seul (N2) : aucune copie `.notebook`, refus avant la copie des opérations.
    if d == Dialect::Notebook {
        return Err(unknown_format(format));
    }
    let list = BoardList {
        ops: ops.to_vec(),
        texts,
        warnings: Vec::new(),
    };
    match d {
        Dialect::Iwb => Ok(vec![
            "content.xml".to_string(),
            board::write_iwb(&list).map_err(|e| e.to_string())?,
        ]),
        Dialect::Ubz => {
            let pages = board::write_ubz_pages(&list).map_err(|e| e.to_string())?;
            let mut out = Vec::with_capacity(2 * pages.len() + 2);
            let count = pages.len();
            for (i, xml) in pages.into_iter().enumerate() {
                out.push(format!("page{:03}.svg", i + 1));
                out.push(xml);
            }
            out.push("metadata.rdf".to_string());
            out.push(board::ubz_metadata(count));
            Ok(out)
        }
        // Garde-fou : déjà refusé plus haut, avant la copie.
        Dialect::Notebook => Err(unknown_format(format)),
    }
}

/// Lève une Error au message de `BoardError` (« liste de tableau invalide : … ») ou « format de tableau inconnu : … ».
#[wasm_bindgen]
pub fn write_board_xml(
    ops: &[f32],
    texts: Vec<String>,
    format: &str,
) -> Result<Vec<String>, JsError> {
    write_board_xml_inner(ops, texts, format).map_err(|m| JsError::new(&m))
}

/// Couleur rendue transparente (C5, I17) : `px` RGBA modifié sur place ; le message d'erreur est le `Display` de
/// `PixelError`.
pub fn image_transparent_inner(
    px: &mut [u8],
    w: u32,
    h: u32,
    t: &Transparent,
) -> Result<(), String> {
    pixels::transparent_color(px, w, h, t).map_err(|e| e.to_string())
}

pub fn image_adjust_inner(px: &mut [u8], brightness: i8, contrast: i8) {
    pixels::adjust(px, brightness, contrast);
}

pub fn image_flood_fill_inner(
    px: &mut [u8],
    w: u32,
    h: u32,
    seed: (u32, u32),
    tolerance: u8,
    paint: Option<[u8; 3]>,
) -> Result<u32, String> {
    pixels::flood_fill(px, w, h, seed, tolerance, paint).map_err(|e| e.to_string())
}

/// C5 (I17) : sans état ; `px` revient modifié côté JS (copie rendue par wasm-bindgen).
#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn image_transparent(
    px: &mut [u8],
    w: u32,
    h: u32,
    r: u8,
    g: u8,
    b: u8,
    tolerance: u8,
    soft: u8,
    contiguous: bool,
) -> Result<(), JsError> {
    let t = Transparent {
        rgb: [r, g, b],
        tolerance,
        soft,
        contiguous,
    };
    image_transparent_inner(px, w, h, &t).map_err(|m| JsError::new(&m))
}

#[wasm_bindgen]
pub fn image_adjust(px: &mut [u8], brightness: i8, contrast: i8) {
    image_adjust_inner(px, brightness, contrast);
}

/// Pot sur une image (C6b, B17) : `clear` efface la zone (`r`, `g`, `b` ignorés), sinon peinture opaque ; rend le
/// nombre de pixels changés ; `px` revient modifié côté JS.
#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn image_flood_fill(
    px: &mut [u8],
    w: u32,
    h: u32,
    x: u32,
    y: u32,
    tolerance: u8,
    r: u8,
    g: u8,
    b: u8,
    clear: bool,
) -> Result<u32, JsError> {
    let paint = (!clear).then_some([r, g, b]);
    image_flood_fill_inner(px, w, h, (x, y), tolerance, paint).map_err(|m| JsError::new(&m))
}

/// Première feuille d'un classeur (C10b, F23) : grille de textes, fusions en quadruplets, dimensions de la source.
#[wasm_bindgen]
pub struct SheetReader {
    sheet: roomboard_formats::sheet::Sheet,
}

impl SheetReader {
    /// `sheet::read_first_sheet` ; le message d'erreur est le `Display` de `SheetError`.
    pub fn open_inner(bytes: &[u8]) -> Result<SheetReader, String> {
        roomboard_formats::sheet::read_first_sheet(bytes)
            .map(|sheet| SheetReader { sheet })
            .map_err(|e| e.to_string())
    }
}

#[wasm_bindgen]
impl SheetReader {
    /// Lève une Error : « la première feuille est vide », « classeur trop gros pour un import en valeurs »,
    /// « classeur illisible : … ».
    pub fn open(bytes: &[u8]) -> Result<SheetReader, JsError> {
        Self::open_inner(bytes).map_err(|m| JsError::new(&m))
    }
    pub fn rows(&self) -> u32 {
        self.sheet.rows
    }
    pub fn cols(&self) -> u32 {
        self.sheet.cols
    }
    pub fn cells(&self) -> Vec<String> {
        self.sheet.cells.clone()
    }
    /// `[ligne, colonne, lignes, colonnes]` bout à bout.
    pub fn merges(&self) -> Vec<u32> {
        self.sheet.merges.iter().flatten().copied().collect()
    }
    pub fn source_rows(&self) -> u32 {
        self.sheet.source_rows
    }
    pub fn source_cols(&self) -> u32 {
        self.sheet.source_cols
    }
    pub fn cut_cells(&self) -> bool {
        self.sheet.cut_cells
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use roomboard_core::document::Document;
    use roomboard_core::format::{self, SaveMeta};
    use roomboard_formats::container::sha256_hex;

    fn meta() -> SaveMeta {
        SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-20T00:00:00Z".into(),
            created: None,
        }
    }

    fn doc() -> Document {
        let mut d = Document::blank();
        d.add_page();
        d
    }

    #[test]
    fn write_pdf_pages_inner_splits_fonts_and_images() {
        let font: &[u8] =
            include_bytes!("../../roomboard-formats/tests/fixtures/LiberationSans-Regular.ttf");
        let ops = [
            1.0, 100.0, 100.0, 7.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 0.0, 0.0, 1.0, 12.0, 5.0,
            5.0, 0.0, 0.0, 0.0,
        ];
        let pdf =
            write_pdf_pages_inner(&ops, vec!["a".into()], font, &[font.len() as u32], &[], &[])
                .expect("PDF");
        assert!(pdf.starts_with(b"%PDF-"));
        let err = write_pdf_pages_inner(&ops, vec!["a".into()], font, &[3], &[], &[])
            .expect_err("tailles fausses");
        assert!(err.starts_with("polices incohérentes"), "{err}");
        let err = write_pdf_pages_inner(
            &ops,
            vec!["a".into()],
            font,
            &[font.len() as u32],
            b"abc",
            &[2],
        )
        .expect_err("images");
        assert!(err.starts_with("images incohérentes"), "{err}");
        let err = write_pdf_pages_inner(&ops, vec!["a".into()], &[], &[], &[], &[])
            .expect_err("police absente");
        assert_eq!(err, "police 0 illisible ou absente");
    }

    #[test]
    fn write_then_open_keeps_parts_and_asset() {
        let p = format::save_parts(&doc(), &meta()).expect("parts");
        let png = b"\x89PNG\r\n\x1a\nfaux".to_vec();
        let id = sha256_hex(&png);
        let file = write_container_inner(
            &p.manifest,
            &p.ybin,
            std::slice::from_ref(&id),
            &["image/png".to_string()],
            &[png.len() as u32],
            &png,
        )
        .expect("écrit");
        let r = ContainerReader::open_inner(&file).expect("lu");
        assert_eq!(
            (r.manifest(), r.ybin()),
            (p.manifest.clone(), p.ybin.clone())
        );
        assert_eq!(
            (r.asset_count(), r.asset_id(0), r.asset_bytes(0)),
            (1, Some(id), Some(png))
        );
        assert_eq!((r.asset_id(1), r.asset_bytes(1)), (None, None));
        assert!(r.warnings().is_empty());
    }

    #[test]
    fn assets_are_cut_by_sizes_and_sorted() {
        let p = format::save_parts(&doc(), &meta()).expect("parts");
        let (a, b) = (b"premier".to_vec(), b"second!!".to_vec());
        let (ia, ib) = (sha256_hex(&a), sha256_hex(&b));
        let all = [a.clone(), b.clone()].concat();
        let file = write_container_inner(
            &p.manifest,
            &p.ybin,
            &[ia.clone(), ib.clone()],
            &["image/png".to_string(), "image/gif".to_string()],
            &[a.len() as u32, b.len() as u32],
            &all,
        )
        .expect("écrit");
        let r = ContainerReader::open_inner(&file).expect("lu");
        let mut want = vec![(ia, a), (ib, b)];
        want.sort();
        let got: Vec<(String, Vec<u8>)> = (0..r.asset_count())
            .map(|i| {
                (
                    r.asset_id(i).expect("id"),
                    r.asset_bytes(i).expect("octets"),
                )
            })
            .collect();
        assert_eq!(got, want);
    }

    #[test]
    fn inconsistent_lists_are_refused() {
        let p = format::save_parts(&doc(), &meta()).expect("parts");
        assert_eq!(
            write_container_inner(&p.manifest, &p.ybin, &["a".into()], &[], &[1], b"x"),
            Err("assets incohérents : 1 empreintes, 0 types, 1 tailles".to_string())
        );
        assert_eq!(
            write_container_inner(&p.manifest, &p.ybin, &[], &[], &[], b"x"),
            Err("assets incohérents : 0 octets annoncés, 1 reçus".to_string())
        );
    }

    #[test]
    fn wrong_id_is_refused_by_the_container() {
        let p = format::save_parts(&doc(), &meta()).expect("parts");
        let id = "0".repeat(64);
        let e = write_container_inner(
            &p.manifest,
            &p.ybin,
            &[id],
            &["image/png".into()],
            &[1],
            b"x",
        )
        .expect_err("refusé");
        assert!(e.contains("ne correspond pas à son empreinte"), "{e}");
    }

    #[test]
    fn garbage_is_not_roomboard() {
        assert_eq!(
            ContainerReader::open_inner(b"pas un zip").err(),
            Some("ce fichier n'est pas un document RoomBoard".to_string())
        );
    }

    #[test]
    fn without_assets_bytes_equal_core_save() {
        let d = doc();
        let p = format::save_parts(&d, &meta()).expect("parts");
        let file = write_container_inner(&p.manifest, &p.ybin, &[], &[], &[], &[]).expect("écrit");
        assert_eq!(file, format::save(&d, &meta()).expect("save"));
    }

    #[test]
    fn sheet_reader_open_inner_reads_the_fixture_and_refuses_garbage() {
        let r = SheetReader::open_inner(include_bytes!(
            "../../roomboard-formats/tests/fixtures/valeurs.xlsx"
        ))
        .expect("lecture");
        assert_eq!(
            (
                r.rows(),
                r.cols(),
                r.source_rows(),
                r.source_cols(),
                r.cut_cells()
            ),
            (64, 6, 70, 6, false)
        );
        assert_eq!(r.merges(), vec![1, 0, 1, 2]);
        assert_eq!(r.cells()[2], "3,5");
        let Err(e) = SheetReader::open_inner(&[0x50, 0x4b, 3, 4, 1, 2, 3]) else {
            panic!("refus attendu");
        };
        assert!(e.starts_with("classeur illisible"), "{e}");
    }

    #[test]
    fn image_transparent_inner_clears_white_and_refuses_bad_size() {
        let t = roomboard_formats::pixels::Transparent {
            rgb: [255, 255, 255],
            tolerance: 10,
            soft: 0,
            contiguous: false,
        };
        let mut px = vec![255, 255, 255, 255, 0, 0, 0, 255];
        image_transparent_inner(&mut px, 2, 1, &t).expect("calcul");
        assert_eq!(px, vec![255, 255, 255, 0, 0, 0, 0, 255]);
        assert_eq!(
            image_transparent_inner(&mut px, 3, 1, &t),
            Err("pixels incohérents (4 × largeur × hauteur octets attendus)".to_string())
        );
    }

    #[test]
    fn image_adjust_and_flood_fill_inner() {
        let mut px = vec![100, 100, 100, 50];
        image_adjust_inner(&mut px, 50, 0);
        assert_eq!(px, vec![228, 228, 228, 50]);
        let mut px = vec![10, 10, 10, 255, 10, 10, 10, 255];
        assert_eq!(
            image_flood_fill_inner(&mut px, 2, 1, (0, 0), 0, Some([1, 2, 3])),
            Ok(2)
        );
        assert_eq!(px, vec![1, 2, 3, 255, 1, 2, 3, 255]);
        assert_eq!(
            image_flood_fill_inner(&mut px, 2, 1, (0, 0), 0, None),
            Ok(2)
        );
        assert_eq!(px, vec![0; 8], "effacer : transparent");
    }

    #[test]
    fn board_reader_open_inner_refuses_unknown_dialect() {
        let e = BoardReader::open_inner(b"<svg/>", "pdf", 1)
            .err()
            .expect("refus");
        assert_eq!(e, "format de tableau inconnu : pdf");
    }

    #[test]
    fn board_reader_open_inner_says_broken_files_in_french() {
        let e = BoardReader::open_inner(b"<iwb><svg:svg", "iwb", 1)
            .err()
            .expect("refus");
        assert!(e.starts_with("fichier endommagé : "), "{e}");
    }

    #[test]
    fn board_write_inner_refuses_bad_lists_and_unknown_formats() {
        let e = write_board_xml_inner(&[9.0], Vec::new(), "iwb").expect_err("refus");
        assert!(e.starts_with("liste de tableau invalide : "), "{e}");
        let e = write_board_xml_inner(&[1.0], Vec::new(), "pdf").expect_err("refus");
        assert_eq!(e, "format de tableau inconnu : pdf");
    }

    /// Import seul (N2) : aucune copie `.notebook`, même pour une liste vide qu'un écrivain voisin accepterait ; le
    /// message garde le préfixe connu de `boardErrorMessage` (`board-reader.ts`).
    #[test]
    fn write_board_xml_refuses_notebook() {
        let e = write_board_xml_inner(&[], vec![], "notebook").expect_err("refus");
        assert!(e.starts_with("format de tableau inconnu : "), "{e}");
        assert_eq!(e, "format de tableau inconnu : notebook");
    }

    /// C13 lot 2 (N6) : `.notebook` lu par la liaison existante, ordre des pages lu par le Rust (D16).
    mod board_notebook {
        use super::super::*;

        /// `Dialect::parse` connaît `notebook` (T3) : `BoardReader.open` lit une page sans changement de la liaison.
        #[test]
        fn board_reader_opens_notebook_dialect() {
            let svg = br##"<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600"><rect x="10" y="10" width="100" height="50" fill="red"/></svg>"##;
            let r = BoardReader::open_inner(svg, "notebook", 2).expect("page notebook");
            assert!(!r.ops().is_empty());
        }

        /// Patron écarté : l'ordre des noms (`page0`, `page1`). La liaison rend l'ordre de la ressource `pages`, et un
        /// manifeste illisible lève au préfixe connu de `boardErrorMessage` (le Worker retombe alors sur l'ordre reçu).
        #[test]
        fn notebook_order_binding_reads_the_manifest() {
            let xml = br#"<manifest><resources><resource identifier="pages"><file href="page1.svg"/><file href="page0.svg"/></resource></resources></manifest>"#;
            assert_eq!(
                notebook_order_inner(xml),
                Ok(vec!["page1.svg".to_string(), "page0.svg".to_string()])
            );
            let e = notebook_order_inner(b"\xff").expect_err("manifeste non UTF-8");
            assert!(e.starts_with("fichier endommagé : "), "{e}");
        }
    }
}
