//! Élément `model3d` (C15, X2-X10) : objet 3D posé sur la page. Champs d'un `Y.Map` d'élément : `asset` (fichier
//! principal), `format`, `w`, `h` (boîte locale), `files` (`Y.Array` de `Y.Map{path, asset}`, facultatif), `yaw`,
//! `pitch` (facultatifs, défauts 30° et 20°), `snapshot` (facultatif). Mal formé : cadre inconnu, jamais `None` (X8).
use std::f64::consts::PI;

use yrs::{Any, Array, ArrayPrelim, ArrayRef, In, Map, MapPrelim, MapRef, Out, ReadTxn};

use crate::asset::{is_asset_id, AssetRef};
use crate::commands::{valid_asset, valid_matrix, Change, CommandError};
use crate::document::Document;
use crate::element::{out_f64, out_string, out_transform, transform_to_any, Transform};
use crate::media::{put_or_remove, valid_box};

pub const MODEL3D_KIND: &str = "model3d";
pub const MAX_FILES: usize = 256;
pub const MAX_PATH_CHARS: usize = 1024;
pub const DEFAULT_YAW: f64 = PI / 6.0;
pub const DEFAULT_PITCH: f64 = PI / 9.0;
pub const PITCH_LIMIT: f64 = 85.0 * PI / 180.0;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Model3dFormat {
    Glb,
    Gltf,
    Obj,
    Stl,
    Ply,
}

impl Model3dFormat {
    pub fn as_str(self) -> &'static str {
        match self {
            Model3dFormat::Glb => "glb",
            Model3dFormat::Gltf => "gltf",
            Model3dFormat::Obj => "obj",
            Model3dFormat::Stl => "stl",
            Model3dFormat::Ply => "ply",
        }
    }

    pub fn parse(s: &str) -> Option<Model3dFormat> {
        match s {
            "glb" => Some(Model3dFormat::Glb),
            "gltf" => Some(Model3dFormat::Gltf),
            "obj" => Some(Model3dFormat::Obj),
            "stl" => Some(Model3dFormat::Stl),
            "ply" => Some(Model3dFormat::Ply),
            _ => None,
        }
    }
}

/// Fichier lié (X3) : référence normalisée telle qu'écrite dans le modèle, et empreinte de son asset.
#[derive(Debug, Clone, PartialEq, Eq, serde::Serialize)]
pub struct Model3dFile {
    pub path: String,
    pub asset: String,
}

/// Vue d'un objet 3D (X2) : boîte locale (0, 0)-(w, h) ; caméra et instantané aux défauts s'ils manquent.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
pub struct Model3dView {
    pub asset: String,
    pub format: String,
    pub w: f64,
    pub h: f64,
    pub files: Vec<Model3dFile>,
    pub yaw: f64,
    pub pitch: f64,
    pub snapshot: Option<String>,
}

/// Entrée d'`AddModel3d` (X7).
pub struct NewModel3d<'a> {
    pub page: &'a str,
    pub asset: &'a AssetRef,
    pub format: Model3dFormat,
    pub files: &'a [(String, AssetRef)],
    pub w: f64,
    pub h: f64,
    pub yaw: f64,
    pub pitch: f64,
    pub snapshot: Option<&'a AssetRef>,
    pub matrix: &'a Transform,
}

fn valid_yaw(y: f64) -> bool {
    y.is_finite() && y > -PI && y <= PI
}

fn valid_pitch(p: f64) -> bool {
    p.is_finite() && p.abs() <= PITCH_LIMIT
}

/// Chemin d'un fichier lié (X3) : 1 à 1 024 caractères, `/` seul séparateur, ni absolu, ni segment vide, `.` ou `..`,
/// ni `\` ni `:` (aucun schéma, aucun lecteur).
pub fn valid_path(p: &str) -> bool {
    (1..=MAX_PATH_CHARS).contains(&p.chars().count())
        && !p.contains('\\')
        && !p.contains(':')
        && p.split('/').all(|s| !s.is_empty() && s != "." && s != "..")
}

/// Entrées lisibles de `files` (X8) : `Y.Map` à `path` valide et `asset` empreinte ; illisible ou doublon : ignorée ;
/// 256 au plus.
fn read_files<T: ReadTxn>(txn: &T, a: &ArrayRef) -> Vec<Model3dFile> {
    let mut out: Vec<Model3dFile> = Vec::new();
    for v in a.iter(txn) {
        let Out::YMap(m) = v else { continue };
        let (Some(path), Some(asset)) = (
            out_string(m.get(txn, "path")),
            out_string(m.get(txn, "asset")),
        ) else {
            continue;
        };
        if out.len() == MAX_FILES
            || !valid_path(&path)
            || !is_asset_id(&asset)
            || out.iter().any(|f| f.path == path)
        {
            continue;
        }
        out.push(Model3dFile { path, asset });
    }
    out
}

/// Objet 3D (X8) : `None` si l'élément n'en est pas un, ou si `transform`, `asset`, `format`, `w` ou `h` manque ou
/// sort du domaine (l'appelant rend le cadre inconnu). Facultatif illisible = défaut.
pub(crate) fn read_model3d<T: ReadTxn>(txn: &T, e: &MapRef) -> Option<(Transform, Model3dView)> {
    if out_string(e.get(txn, "kind"))? != MODEL3D_KIND {
        return None;
    }
    let transform = out_transform(e.get(txn, "transform"))?;
    let asset = out_string(e.get(txn, "asset")).filter(|a| is_asset_id(a))?;
    let format = out_string(e.get(txn, "format")).filter(|f| Model3dFormat::parse(f).is_some())?;
    let w = out_f64(e.get(txn, "w")).filter(|v| valid_box(*v, 1.0))?;
    let h = out_f64(e.get(txn, "h")).filter(|v| valid_box(1.0, *v))?;
    let files = match e.get(txn, "files") {
        Some(Out::YArray(a)) => read_files(txn, &a),
        _ => Vec::new(),
    };
    Some((
        transform,
        Model3dView {
            asset,
            format,
            w,
            h,
            files,
            yaw: out_f64(e.get(txn, "yaw"))
                .filter(|v| valid_yaw(*v))
                .unwrap_or(DEFAULT_YAW),
            pitch: out_f64(e.get(txn, "pitch"))
                .filter(|v| valid_pitch(*v))
                .unwrap_or(DEFAULT_PITCH),
            snapshot: out_string(e.get(txn, "snapshot")).filter(|a| is_asset_id(a)),
        },
    ))
}

impl Document {
    /// X7 : refus sans transaction, dans l'ordre BadAsset → BadModel3d → BadMatrix → UnknownPage ; sinon une
    /// transaction `"local"` (une étape) : l'élément puis les métadonnées du principal, des liés et de l'instantané.
    pub(crate) fn cmd_add_model3d(&mut self, m: &NewModel3d<'_>) -> Result<Change, CommandError> {
        if !valid_asset(m.asset)
            || m.files.iter().any(|(_, a)| !valid_asset(a))
            || m.snapshot.is_some_and(|s| !valid_asset(s))
        {
            return Err(CommandError::BadAsset);
        }
        let unique = m
            .files
            .iter()
            .enumerate()
            .all(|(i, (p, _))| m.files[..i].iter().all(|(q, _)| q != p));
        if !valid_box(m.w, m.h)
            || !valid_yaw(m.yaw)
            || !valid_pitch(m.pitch)
            || m.files.len() > MAX_FILES
            || !unique
            || m.files.iter().any(|(p, _)| !valid_path(p))
        {
            return Err(CommandError::BadModel3d);
        }
        if !valid_matrix(m.matrix) {
            return Err(CommandError::BadMatrix);
        }
        let elements = self.page_elements_or_err(m.page)?;
        let id = yrs::uuid_v4().to_string();
        let mut fields = vec![
            ("id", In::from(id.as_str())),
            ("kind", In::from(MODEL3D_KIND)),
            ("transform", In::Any(transform_to_any(m.matrix))),
            ("asset", In::from(m.asset.id.as_str())),
            ("format", In::from(m.format.as_str())),
            ("w", In::Any(Any::from(m.w))),
            ("h", In::Any(Any::from(m.h))),
        ];
        if !m.files.is_empty() {
            let list: Vec<In> = m
                .files
                .iter()
                .map(|(p, a)| {
                    In::Map(MapPrelim::from_iter([
                        ("path", In::from(p.as_str())),
                        ("asset", In::from(a.id.as_str())),
                    ]))
                })
                .collect();
            fields.push(("files", In::Array(ArrayPrelim::from(list))));
        }
        if m.yaw != DEFAULT_YAW {
            fields.push(("yaw", In::Any(Any::from(m.yaw))));
        }
        if m.pitch != DEFAULT_PITCH {
            fields.push(("pitch", In::Any(Any::from(m.pitch))));
        }
        if let Some(s) = m.snapshot {
            fields.push(("snapshot", In::from(s.id.as_str())));
        }
        {
            let mut txn = self.transact_local();
            elements.push_back(&mut txn, MapPrelim::from_iter(fields));
            self.insert_asset_meta(&mut txn, m.asset);
            for (_, a) in m.files {
                self.insert_asset_meta(&mut txn, a);
            }
            if let Some(s) = m.snapshot {
                self.insert_asset_meta(&mut txn, s);
            }
        }
        Ok(self.done(Change {
            pages: vec![m.page.to_string()],
            ids: vec![id],
            ..Default::default()
        }))
    }

    /// X7 : état voulu complet (vue et instantané) ; `snapshot: None` retire l'instantané. Ordre : UnknownElement →
    /// BadModel3d (pas un objet 3D lisible) → BadAsset → BadModel3d (vue hors domaine). Même état : aucune
    /// transaction (D38). Sinon une étape : défauts retirés, instantané posé avec sa métadonnée.
    pub(crate) fn cmd_set_model3d_view(
        &mut self,
        id: &str,
        yaw: f64,
        pitch: f64,
        snapshot: Option<&AssetRef>,
    ) -> Result<Change, CommandError> {
        let (page, element, current) = {
            let txn = self.read();
            let found = self
                .find_element(&txn, id)
                .ok_or_else(|| CommandError::UnknownElement(id.to_string()))?;
            let (_, view) = read_model3d(&txn, &found.element).ok_or(CommandError::BadModel3d)?;
            (found.page_id, found.element, view)
        };
        if snapshot.is_some_and(|s| !valid_asset(s)) {
            return Err(CommandError::BadAsset);
        }
        if !valid_yaw(yaw) || !valid_pitch(pitch) {
            return Err(CommandError::BadModel3d);
        }
        if yaw == current.yaw
            && pitch == current.pitch
            && snapshot.map(|s| s.id.as_str()) == current.snapshot.as_deref()
        {
            return Ok(self.unchanged());
        }
        {
            let mut txn = self.transact_local();
            put_or_remove(
                &element,
                &mut txn,
                "yaw",
                (yaw != DEFAULT_YAW).then(|| Any::from(yaw)),
            );
            put_or_remove(
                &element,
                &mut txn,
                "pitch",
                (pitch != DEFAULT_PITCH).then(|| Any::from(pitch)),
            );
            put_or_remove(
                &element,
                &mut txn,
                "snapshot",
                snapshot.map(|s| Any::String(s.id.as_str().into())),
            );
            if let Some(s) = snapshot {
                self.insert_asset_meta(&mut txn, s);
            }
        }
        Ok(self.done(Change {
            pages: vec![page],
            ids: vec![id.to_string()],
            ..Default::default()
        }))
    }
}

#[cfg(test)]
mod tests {
    use std::f64::consts::PI;

    use yrs::{Any, ArrayPrelim, In, Map, MapPrelim};

    use super::*;
    use crate::asset::{AssetInfo, AssetRef};
    use crate::commands::tests::writes;
    use crate::commands::{Change, Command, CommandError};
    use crate::document::Document;
    use crate::element::{Transform, UnknownView};
    use crate::query::Bounds;

    const GLB: &str = concat!(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );
    const PNG: &str = concat!(
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );
    const TEX: &str = concat!(
        "cccccccccccccccccccccccccccccccc",
        "cccccccccccccccccccccccccccccccc"
    );
    const BIN: &str = concat!(
        "dddddddddddddddddddddddddddddddd",
        "dddddddddddddddddddddddddddddddd"
    );
    const PNG2: &str = concat!(
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee",
        "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee"
    );
    const M: Transform = [1.0, 0.0, 0.0, 1.0, 100.0, 50.0];
    const BOX: Bounds = Bounds {
        x0: 100.0,
        y0: 50.0,
        x1: 740.0,
        y1: 530.0,
    };

    fn asset(id: &str, name: &str, mime: &str, size: f64) -> AssetRef {
        AssetRef {
            id: id.into(),
            name: name.into(),
            mime: mime.into(),
            size,
        }
    }

    fn glb() -> AssetRef {
        asset(GLB, "chaise.glb", "model/gltf-binary", 3000.0)
    }

    fn png() -> AssetRef {
        asset(PNG, "chaise.png", "image/png", 200.0)
    }

    fn png2() -> AssetRef {
        asset(PNG2, "chaise-2.png", "image/png", 210.0)
    }

    fn tex() -> AssetRef {
        asset(TEX, "a.png", "image/png", 50.0)
    }

    fn bin() -> AssetRef {
        asset(BIN, "b.bin", "application/octet-stream", 80.0)
    }

    fn linked() -> Vec<(String, AssetRef)> {
        vec![("tex/a.png".into(), tex()), ("b.bin".into(), bin())]
    }

    fn add_cmd(page: &str, files: Vec<(String, AssetRef)>, snapshot: bool) -> Command {
        Command::AddModel3d {
            page: page.into(),
            asset: glb(),
            format: Model3dFormat::Glb,
            files,
            w: 640.0,
            h: 480.0,
            yaw: DEFAULT_YAW,
            pitch: DEFAULT_PITCH,
            snapshot: snapshot.then(png),
            matrix: M,
        }
    }

    fn add(d: &mut Document, files: Vec<(String, AssetRef)>, snapshot: bool) -> String {
        let p = d.page_ids()[0].clone();
        d.apply(add_cmd(&p, files, snapshot)).expect("objet 3D").ids[0].clone()
    }

    fn view(id: &str, yaw: f64, pitch: f64, snapshot: Option<AssetRef>) -> Command {
        Command::SetModel3dView {
            id: id.into(),
            yaw,
            pitch,
            snapshot,
        }
    }

    fn model3d(d: &Document, id: &str) -> Model3dView {
        d.element(id).and_then(|v| v.model3d).expect("vue objet 3D")
    }

    fn camera(v: &Model3dView) -> (f64, f64, Option<String>) {
        (v.yaw, v.pitch, v.snapshot.clone())
    }

    fn raw_keys(d: &Document, id: &str) -> Vec<String> {
        let txn = d.read();
        let found = d.find_element(&txn, id).expect("élément");
        let mut keys: Vec<String> = found.element.keys(&txn).map(String::from).collect();
        keys.sort();
        keys
    }

    /// X7 : l'ajout est une étape ; vue aux défauts ; principal, liés et instantané cités ; annuler retire tout.
    #[test]
    fn add_model3d_is_one_step_with_all_asset_meta() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d.apply(add_cmd(&p, linked(), true)).expect("objet 3D");
        assert_eq!(c.pages, vec![p.clone()]);
        assert_eq!(c.ids.len(), 1);
        let id = c.ids[0].clone();
        let v = d.element(&id).expect("vue");
        assert_eq!(v.kind, "model3d");
        assert_eq!(v.transform, M);
        assert_eq!(v.unknown, None);
        assert_eq!(
            v.model3d,
            Some(Model3dView {
                asset: GLB.into(),
                format: "glb".into(),
                w: 640.0,
                h: 480.0,
                files: vec![
                    Model3dFile {
                        path: "tex/a.png".into(),
                        asset: TEX.into(),
                    },
                    Model3dFile {
                        path: "b.bin".into(),
                        asset: BIN.into(),
                    },
                ],
                yaw: DEFAULT_YAW,
                pitch: DEFAULT_PITCH,
                snapshot: Some(PNG.into()),
            })
        );
        assert_eq!(d.cited_assets(), vec![glb(), png(), tex(), bin()]);
        for a in [glb(), png(), tex(), bin()] {
            assert_eq!(d.asset(&a.id), Some(a.clone()), "métadonnée de {}", a.name);
        }
        assert_eq!(d.bounds(std::slice::from_ref(&id)), Some(BOX));
        assert_eq!(
            raw_keys(&d, &id),
            [
                "asset",
                "files",
                "format",
                "h",
                "id",
                "kind",
                "snapshot",
                "transform",
                "w"
            ],
            "défauts de la caméra non écrits"
        );
        assert!(d.undo());
        assert!(!d.can_undo(), "une seule étape");
        assert!(d.element(&id).is_none());
        assert!(d.cited_assets().is_empty());
        for a in [GLB, PNG, TEX, BIN] {
            assert_eq!(d.asset(a), Some(AssetInfo::fallback(a)));
        }
    }

    /// X7 : chaque refus, dans l'ordre BadAsset → BadModel3d → BadMatrix → UnknownPage, n'écrit rien.
    #[test]
    fn add_model3d_refusals_write_nothing() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let n = writes(&d);
        let base = || add_cmd(&p, linked(), true);
        let with = |f: &dyn Fn(&mut Command)| {
            let mut c = base();
            f(&mut c);
            c
        };
        let path = |s: &'static str| {
            with(&move |c| {
                if let Command::AddModel3d { files, .. } = c {
                    files[0].0 = s.into();
                }
            })
        };
        let many: Vec<(String, AssetRef)> = (0..=MAX_FILES)
            .map(|i| (format!("f{i}.bin"), bin()))
            .collect();
        assert_eq!(many.len(), 257);
        let cases: Vec<(Command, CommandError)> = vec![
            (
                with(&|c| {
                    if let Command::AddModel3d { asset, .. } = c {
                        asset.id = "ABC".into();
                    }
                }),
                CommandError::BadAsset,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d { files, .. } = c {
                        files[1].1.mime = String::new();
                    }
                }),
                CommandError::BadAsset,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d {
                        snapshot: Some(s), ..
                    } = c
                    {
                        s.mime = String::new();
                    }
                }),
                CommandError::BadAsset,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d { w, .. } = c {
                        *w = 0.0;
                    }
                }),
                CommandError::BadModel3d,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d { h, .. } = c {
                        *h = 1e39;
                    }
                }),
                CommandError::BadModel3d,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d { yaw, .. } = c {
                        *yaw = f64::NAN;
                    }
                }),
                CommandError::BadModel3d,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d { yaw, .. } = c {
                        *yaw = -PI;
                    }
                }),
                CommandError::BadModel3d,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d { pitch, .. } = c {
                        *pitch = 1.5;
                    }
                }),
                CommandError::BadModel3d,
            ),
            (path(""), CommandError::BadModel3d),
            (path("../a.png"), CommandError::BadModel3d),
            (path("a\\b.png"), CommandError::BadModel3d),
            (path("c:/a.png"), CommandError::BadModel3d),
            (path("b.bin"), CommandError::BadModel3d),
            (
                with(&|c| {
                    if let Command::AddModel3d { files, .. } = c {
                        *files = many.clone();
                    }
                }),
                CommandError::BadModel3d,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d { matrix, .. } = c {
                        *matrix = [0.0; 6];
                    }
                }),
                CommandError::BadMatrix,
            ),
            (
                with(&|c| {
                    if let Command::AddModel3d { page, .. } = c {
                        *page = "nope".into();
                    }
                }),
                CommandError::UnknownPage("nope".into()),
            ),
        ];
        assert_eq!(cases.len(), 16);
        for (cmd, err) in cases {
            assert_eq!(d.apply(cmd.clone()), Err(err), "{cmd:?}");
        }
        // Ordre des refus : l'asset avant l'objet, l'objet avant la matrice, la matrice avant la page.
        let bad = |asset_ok: bool, model_ok: bool| Command::AddModel3d {
            page: "nope".into(),
            asset: if asset_ok {
                glb()
            } else {
                asset("ABC", "a.glb", "model/gltf-binary", 1.0)
            },
            format: Model3dFormat::Obj,
            files: vec![],
            w: if model_ok { 640.0 } else { 0.0 },
            h: 480.0,
            yaw: DEFAULT_YAW,
            pitch: DEFAULT_PITCH,
            snapshot: None,
            matrix: [0.0; 6],
        };
        assert_eq!(d.apply(bad(false, false)), Err(CommandError::BadAsset));
        assert_eq!(d.apply(bad(true, false)), Err(CommandError::BadModel3d));
        assert_eq!(d.apply(bad(true, true)), Err(CommandError::BadMatrix));
        assert_eq!(n.since(), 0);
        assert_eq!(d.version(), 0);
        assert!(!d.can_undo());
        assert!(d.cited_assets().is_empty());
        assert!(valid_path("tex/a.png") && valid_path(&"a".repeat(MAX_PATH_CHARS)));
        assert!(!valid_path(&"a".repeat(MAX_PATH_CHARS + 1)) && !valid_path("/a.png"));
        assert!(!valid_path("a//b.png") && !valid_path("./a.png"));
    }

    /// X7, S2 : état voulu complet ; une étape par vue validée ; même état sans étape ; défauts et instantané `None`
    /// retirés ; chaque annulation rend la vue d'avant.
    #[test]
    fn set_model3d_view_is_one_step_and_defaults_are_removed() {
        let mut d = Document::blank();
        let id = add(&mut d, linked(), false);
        let n = writes(&d);
        let v0 = d.version();
        let initial = (DEFAULT_YAW, DEFAULT_PITCH, None);
        assert_eq!(camera(&model3d(&d, &id)), initial);
        let c = d.apply(view(&id, 1.0, 0.5, Some(png()))).expect("vue");
        assert_eq!(c.ids, vec![id.clone()]);
        assert_eq!(c.version, v0 + 1);
        assert_eq!(n.since(), 1, "une transaction");
        let s1 = (1.0, 0.5, Some(PNG.to_string()));
        assert_eq!(camera(&model3d(&d, &id)), s1);
        assert_eq!(d.asset(PNG), Some(png()), "métadonnée de l'instantané");
        let keys = raw_keys(&d, &id);
        for k in ["yaw", "pitch", "snapshot"] {
            assert!(keys.contains(&k.to_string()), "{k} écrit");
        }
        assert_eq!(
            d.apply(view(&id, 1.0, 0.5, Some(png()))),
            Ok(Change {
                version: v0 + 1,
                ..Default::default()
            })
        );
        assert_eq!(n.since(), 1, "même état : aucune écriture");
        d.apply(view(&id, -1.0, 0.2, Some(png2())))
            .expect("deuxième vue");
        let s2 = (-1.0, 0.2, Some(PNG2.to_string()));
        assert_eq!(camera(&model3d(&d, &id)), s2);
        d.apply(view(&id, DEFAULT_YAW, DEFAULT_PITCH, None))
            .expect("retour aux défauts");
        assert_eq!(n.since(), 3);
        assert_eq!(camera(&model3d(&d, &id)), initial);
        assert_eq!(
            raw_keys(&d, &id),
            [
                "asset",
                "files",
                "format",
                "h",
                "id",
                "kind",
                "transform",
                "w"
            ],
            "défauts et instantané retirés"
        );
        for s in [s2, s1, initial] {
            assert!(d.undo());
            assert_eq!(camera(&model3d(&d, &id)), s);
        }
        assert!(d.undo(), "l'ajout reste une étape à part");
        assert!(!d.can_undo());
    }

    /// X7, X8 : refus dans l'ordre UnknownElement → BadModel3d (pas un objet 3D) → BadAsset → BadModel3d (vue).
    #[test]
    fn set_model3d_view_refusals() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = add(&mut d, vec![], false);
        let image = d
            .apply(Command::AddImage {
                page: p.clone(),
                asset: png(),
                w: 64.0,
                h: 48.0,
                matrix: M,
            })
            .expect("image")
            .ids[0]
            .clone();
        let n = writes(&d);
        let v0 = d.version();
        let bad_png = asset("ABC", "x.png", "image/png", 1.0);
        assert_eq!(
            d.apply(view("nope", 1.0, 0.5, None)),
            Err(CommandError::UnknownElement("nope".into()))
        );
        assert_eq!(
            d.apply(view(&image, 1.0, 0.5, Some(bad_png.clone()))),
            Err(CommandError::BadModel3d),
            "une image n'est pas un objet 3D, avant l'asset"
        );
        assert_eq!(
            d.apply(view(&id, 1.0, 2.0, Some(bad_png))),
            Err(CommandError::BadAsset),
            "l'asset avant la vue"
        );
        for (yaw, pitch) in [
            (1.0, 2.0),
            (-PI, 0.0),
            (f64::NAN, 0.0),
            (0.0, f64::INFINITY),
        ] {
            assert_eq!(
                d.apply(view(&id, yaw, pitch, None)),
                Err(CommandError::BadModel3d),
                "{yaw} {pitch}"
            );
        }
        assert_eq!(n.since(), 0);
        assert_eq!(d.version(), v0);
        d.apply(view(&id, PI, -PITCH_LIMIT, None))
            .expect("bornes incluses : yaw = 180°, pitch = −85°");
    }

    /// X8 : facultatif illisible = défaut ; obligatoire illisible = cadre inconnu (jamais `None`), boîte gardée.
    /// Sous le repli de l'image (`read_image` → `None`), l'élément disparaîtrait et n'aurait plus de boîte.
    #[test]
    fn unreadable_optional_fields_read_as_defaults_and_required_ones_fall_back_to_unknown() {
        let mut d = Document::blank();
        let id = add(&mut d, linked(), true);
        {
            let mut txn = d.transact_local();
            let e = d.find_element(&txn, &id).expect("élément").element;
            e.insert(&mut txn, "yaw", "x");
            e.insert(&mut txn, "pitch", 9.0);
            e.insert(&mut txn, "snapshot", "x");
            e.insert(&mut txn, "files", 3.0);
        }
        assert_eq!(
            model3d(&d, &id),
            Model3dView {
                asset: GLB.into(),
                format: "glb".into(),
                w: 640.0,
                h: 480.0,
                files: vec![],
                yaw: DEFAULT_YAW,
                pitch: DEFAULT_PITCH,
                snapshot: None,
            }
        );
        {
            let mut txn = d.transact_local();
            let e = d.find_element(&txn, &id).expect("élément").element;
            e.insert(&mut txn, "format", "fbx");
        }
        let v = d.element(&id).expect("jamais invisible");
        assert_eq!(v.kind, "unknown");
        assert_eq!(v.model3d, None);
        assert_eq!(
            v.unknown,
            Some(UnknownView {
                source_kind: "model3d".into(),
                w: 640.0,
                h: 480.0,
            })
        );
        assert_eq!(v.transform, M);
        assert_eq!(d.bounds(std::slice::from_ref(&id)), Some(BOX));
    }

    /// X8 : entrée de `files` illisible ou doublon de chemin : ignorée.
    #[test]
    fn unreadable_files_entries_are_ignored() {
        let mut d = Document::blank();
        let id = add(&mut d, vec![], false);
        {
            let mut txn = d.transact_local();
            let e = d.find_element(&txn, &id).expect("élément").element;
            let entry = |path: &str, asset: Option<&str>| {
                let mut f = vec![("path", In::from(path))];
                if let Some(a) = asset {
                    f.push(("asset", In::from(a)));
                }
                In::Map(MapPrelim::from_iter(f))
            };
            let list = vec![
                entry("tex/a.png", Some(TEX)),
                entry("b.bin", None),
                entry("tex/a.png", Some(BIN)),
                In::Any(Any::from(3.0)),
            ];
            e.insert(&mut txn, "files", ArrayPrelim::from(list));
        }
        assert_eq!(
            model3d(&d, &id).files,
            vec![Model3dFile {
                path: "tex/a.png".into(),
                asset: TEX.into(),
            }]
        );
    }
}
