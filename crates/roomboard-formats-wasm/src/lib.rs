//! Liaison wasm-bindgen du second module Wasm (R8, DAR1) : conteneur `.roomboard` (`container::read`, `container::write`,
//! chargé par la page au premier besoin, R10) et première feuille d'un `.xlsx` (`sheet::read_first_sheet`, C10b, lue
//! dans un Worker jetable, DAB4). Chaque fonction exposée délègue à une fonction `_inner` sans JsValue, seule testée en
//! natif (hors wasm32, tout appel à JS panique).
use roomboard_core::format::Parts;
use roomboard_formats::container::{self, AssetBytes};
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
        image_flood_fill_inner(&mut px, 2, 1, (0, 0), 0, [1, 2, 3]).expect("calcul");
        assert_eq!(px, vec![1, 2, 3, 255, 1, 2, 3, 255]);
    }
}
