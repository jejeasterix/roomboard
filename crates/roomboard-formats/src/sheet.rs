//! Première feuille d'un classeur `.xlsx` en valeurs (U35, F22 à F24, C10b, DAB4) : `calamine` (MIT), lecteur `Xlsx`
//! seul, lecture en flux. Garde contre une bombe ZIP : parties lues en entier refusées au-delà de 64 Mio décompressés
//! déclarés (PC3). Première feuille visible ; 64 lignes gardées à partir de la première non vide, 64 colonnes à partir
//! de la première non vide parmi elles, la suite comptée pour le message (F22) ; rectangle utilisé ; fusions gardées si
//! entièrement dedans ; valeurs calculées en texte français (F24) ; textes coupés à 2 000 caractères. Servie dans un
//! Worker jetable par `roomboard-formats-wasm` (un `panic` n'atteint pas l'instance qui enregistre, DAB4).
use std::io::Cursor;

use calamine::{DataRef, Dimensions, ExcelDateTime, Reader, SheetVisible, Xlsx};
use roomboard_core::format::zip;
use roomboard_core::table::MAX_TABLE_LINES;

/// Taille décompressée déclarée au-delà de laquelle une partie lue en entier est refusée (F22).
pub const MAX_PART_BYTES: u64 = 64 * 1024 * 1024;
/// Caractères gardés d'une cellule (F22, HB-13), suivis de « … ».
pub const MAX_CELL_CHARS: usize = 2000;
pub const EMPTY_SHEET: &str = "la première feuille est vide";
pub const TOO_BIG: &str = "classeur trop gros pour un import en valeurs";

/// Feuille lue : `rows × cols` textes en rangées bout à bout ; `merges` = `[rang de ligne, rang de colonne, lignes,
/// colonnes]` ; `source_rows × source_cols` = lignes et colonnes non vides comptées sur toute la feuille (F22).
#[derive(Debug, Clone, PartialEq)]
pub struct Sheet {
    pub rows: u32,
    pub cols: u32,
    pub cells: Vec<String>,
    pub merges: Vec<[u32; 4]>,
    pub source_rows: u32,
    pub source_cols: u32,
    pub cut_cells: bool,
}

#[derive(Debug, Clone, PartialEq)]
pub enum SheetError {
    TooBig,
    Empty,
    Unreadable(String),
}

impl std::fmt::Display for SheetError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SheetError::TooBig => f.write_str(TOO_BIG),
            SheetError::Empty => f.write_str(EMPTY_SHEET),
            SheetError::Unreadable(m) => write!(f, "classeur illisible : {m}"),
        }
    }
}

impl std::error::Error for SheetError {}

fn unreadable(e: impl std::fmt::Display) -> SheetError {
    SheetError::Unreadable(e.to_string())
}

/// Garde F22 (PC3) : `xl/sharedStrings.xml`, `xl/styles.xml`, `xl/workbook.xml` et chaque `xl/worksheets/*.xml`
/// déclarent au plus 64 Mio décompressés ; lu sur le répertoire central, sans rien décompresser.
fn guard(bytes: &[u8]) -> Result<(), SheetError> {
    let mut zip = zip::ZipArchive::new(Cursor::new(bytes)).map_err(unreadable)?;
    for i in 0..zip.len() {
        let f = zip.by_index_raw(i).map_err(unreadable)?;
        let name = f.name().map_err(unreadable)?.to_ascii_lowercase();
        let whole = matches!(
            name.as_str(),
            "xl/sharedstrings.xml" | "xl/styles.xml" | "xl/workbook.xml"
        ) || (name.starts_with("xl/worksheets/") && name.ends_with(".xml"));
        if whole && f.size() > MAX_PART_BYTES {
            return Err(SheetError::TooBig);
        }
    }
    Ok(())
}

/// Nombre en texte (F24) : 15 chiffres significatifs au plus, zéros de fin retirés, virgule décimale, sans séparateur.
pub fn number_text(v: f64) -> String {
    if v == 0.0 {
        return "0".to_string();
    }
    if !v.is_finite() {
        return v.to_string();
    }
    let exp = v.abs().log10().floor() as i32;
    let decimals = (14 - exp).max(0) as usize;
    let mut s = format!("{v:.decimals$}");
    if s.contains('.') {
        let kept = s.trim_end_matches('0').trim_end_matches('.').len();
        s.truncate(kept);
    }
    if s == "-0" {
        s = "0".to_string();
    }
    s.replace('.', ",")
}

/// Date, date et heure, heure seule (`:SS` si non nulles) ; durée `H:MM:SS` (F24).
fn datetime_text(d: &ExcelDateTime) -> String {
    if d.is_duration() {
        let total = (d.as_f64() * 86_400.0).round() as i64;
        let (sign, t) = if total < 0 {
            ("-", -total)
        } else {
            ("", total)
        };
        return format!("{sign}{}:{:02}:{:02}", t / 3600, (t / 60) % 60, t % 60);
    }
    let (y, mo, day, h, mi, s, _) = d.to_ymd_hms_milli();
    let time = if s != 0 {
        format!("{h:02}:{mi:02}:{s:02}")
    } else {
        format!("{h:02}:{mi:02}")
    };
    if (0.0..1.0).contains(&d.as_f64()) {
        return time;
    }
    let date = format!("{day:02}/{mo:02}/{y:04}");
    if h == 0 && mi == 0 && s == 0 {
        date
    } else {
        format!("{date} {time}")
    }
}

/// Date ISO (`t="d"`) : même forme que les dates sérielles (PC4) ; forme inconnue : telle quelle.
fn iso_text(s: &str) -> String {
    let digits = |p: &str, n: usize| p.len() == n && p.bytes().all(|b| b.is_ascii_digit());
    let date = |d: &str| -> Option<String> {
        let mut it = d.split('-');
        let (y, m, dd) = (it.next()?, it.next()?, it.next()?);
        (it.next().is_none() && digits(y, 4) && digits(m, 2) && digits(dd, 2))
            .then(|| format!("{dd}/{m}/{y}"))
    };
    let time = |t: &str| -> Option<String> {
        let t = t.split(['.', 'Z', '+']).next()?;
        let mut it = t.split(':');
        let (h, mi) = (it.next()?, it.next()?);
        let sec = it.next().unwrap_or("00");
        (it.next().is_none() && digits(h, 2) && digits(mi, 2) && digits(sec, 2)).then(|| {
            if sec == "00" {
                format!("{h}:{mi}")
            } else {
                format!("{h}:{mi}:{sec}")
            }
        })
    };
    let out = match s.split_once('T') {
        Some((d, t)) => date(d)
            .zip(time(t))
            .map(|(d, t)| if t == "00:00" { d } else { format!("{d} {t}") }),
        None if s.contains(':') => time(s),
        None => date(s),
    };
    out.unwrap_or_else(|| s.to_string())
}

/// Valeur calculée d'une cellule en texte (F24) ; formats d'affichage jamais appliqués.
pub fn value_text(v: &DataRef<'_>) -> String {
    match v {
        DataRef::Empty => String::new(),
        DataRef::String(s) => s.replace("\r\n", "\n"),
        DataRef::SharedString(s) => s.replace("\r\n", "\n"),
        DataRef::Int(i) => i.to_string(),
        DataRef::Float(f) => number_text(*f),
        DataRef::Bool(b) => (if *b { "VRAI" } else { "FAUX" }).to_string(),
        DataRef::DateTime(d) => datetime_text(d),
        DataRef::DateTimeIso(s) => iso_text(s),
        DataRef::DurationIso(s) => s.clone(),
        DataRef::Error(e) => e.to_string(),
    }
}

fn cut_text(s: String) -> (String, bool) {
    match s.char_indices().nth(MAX_CELL_CHARS) {
        Some((i, _)) => (format!("{}…", &s[..i]), true),
        None => (s, false),
    }
}

/// Cellules non vides reçues dans l'ordre du fichier : fenêtre de 64 × 64 tenue en mémoire constante (une colonne plus à
/// gauche resserre la fenêtre), le reste seulement compté.
struct Acc {
    first_row: Option<u32>,
    last_row: u32,
    min_col: u32,
    max_col: u32,
    win_min: Option<u32>,
    kept: Vec<(u32, u32, String)>,
    cut_cells: bool,
}

impl Acc {
    fn new() -> Acc {
        Acc {
            first_row: None,
            last_row: 0,
            min_col: u32::MAX,
            max_col: 0,
            win_min: None,
            kept: Vec::new(),
            cut_cells: false,
        }
    }

    fn push(&mut self, r: u32, c: u32, text: String) {
        let r0 = *self.first_row.get_or_insert(r);
        let Some(off) = r.checked_sub(r0) else {
            return;
        };
        self.last_row = self.last_row.max(r);
        self.min_col = self.min_col.min(c);
        self.max_col = self.max_col.max(c);
        if off >= MAX_TABLE_LINES {
            return;
        }
        let lo = self.win_min.map_or(c, |m| m.min(c));
        if self.win_min != Some(lo) {
            self.win_min = Some(lo);
            self.kept.retain(|(_, cc, _)| *cc < lo + MAX_TABLE_LINES);
        }
        if c >= lo + MAX_TABLE_LINES {
            return;
        }
        let (text, cut) = cut_text(text);
        self.cut_cells |= cut;
        self.kept.push((off, c, text));
    }

    fn finish(self, merges: &[Dimensions]) -> Result<Sheet, SheetError> {
        let (Some(r0), Some(c0)) = (self.first_row, self.win_min) else {
            return Err(SheetError::Empty);
        };
        let rows = self.kept.iter().map(|k| k.0).max().unwrap_or(0) + 1;
        let cols = self.kept.iter().map(|k| k.1 - c0).max().unwrap_or(0) + 1;
        let mut cells = vec![String::new(); (rows * cols) as usize];
        for (r, c, t) in self.kept {
            cells[(r * cols + (c - c0)) as usize] = t;
        }
        let mut kept: Vec<[u32; 4]> = Vec::new();
        for d in merges {
            let ((sr, sc), (er, ec)) = (d.start, d.end);
            if sr < r0 || sc < c0 || er < sr || ec < sc || er >= r0 + rows || ec >= c0 + cols {
                continue;
            }
            let m = [sr - r0, sc - c0, er - sr + 1, ec - sc + 1];
            let overlaps = |o: &[u32; 4]| {
                m[0] < o[0] + o[2] && o[0] < m[0] + m[2] && m[1] < o[1] + o[3] && o[1] < m[1] + m[3]
            };
            if m[2] * m[3] < 2 || kept.iter().any(overlaps) {
                continue;
            }
            kept.push(m);
        }
        Ok(Sheet {
            rows,
            cols,
            cells,
            merges: kept,
            source_rows: self.last_row - r0 + 1,
            source_cols: self.max_col - self.min_col + 1,
            cut_cells: self.cut_cells,
        })
    }
}

/// Première feuille visible (à défaut la première) en valeurs (F23).
pub fn read_first_sheet(bytes: &[u8]) -> Result<Sheet, SheetError> {
    guard(bytes)?;
    let mut wb: Xlsx<_> = Xlsx::new(Cursor::new(bytes)).map_err(unreadable)?;
    let name = {
        let sheets = wb.sheets_metadata();
        sheets
            .iter()
            .find(|s| matches!(s.visible, SheetVisible::Visible))
            .or_else(|| sheets.first())
            .map(|s| s.name.clone())
    }
    .ok_or(SheetError::Empty)?;
    let merges = wb.merge_cells_by_sheet_name(&name).map_err(unreadable)?;
    let mut acc = Acc::new();
    {
        let mut reader = wb.worksheet_cells_reader(&name).map_err(unreadable)?;
        while let Some(cell) = reader.next_cell().map_err(unreadable)? {
            let (r, c) = cell.get_position();
            let text = value_text(cell.get_value());
            if !text.is_empty() {
                acc.push(r, c, text);
            }
        }
    }
    acc.finish(&merges)
}

#[cfg(test)]
mod tests {
    use std::io::{Cursor, Write};
    use std::path::PathBuf;

    use super::zip::write::SimpleFileOptions;
    use super::zip::{CompressionMethod, ZipWriter};
    use calamine::{CellErrorType, DataRef, ExcelDateTime, ExcelDateTimeType};

    use super::*;

    const NS: &str = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
    const REL: &str = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
    const PKG: &str = "http://schemas.openxmlformats.org/package/2006/relationships";

    /// Feuille d'un classeur fabriqué : nom, état, contenu de `<sheetData>`, fusions (`"A4:B4"`).
    struct Ws<'a> {
        name: &'a str,
        hidden: bool,
        data: String,
        merges: &'a [&'a str],
    }

    /// Classeur `.xlsx` minimal (F32) : relations, styles (0 général, 1 date 14, 2 durée 46, 3 date et heure 22,
    /// 4 heure 20), chaînes partagées, une partie par feuille.
    fn xlsx(sheets: &[Ws<'_>], shared: &[&str]) -> Vec<u8> {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        let o = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
        let mut put = |name: &str, body: String| {
            w.start_file(name, o).expect("entrée");
            w.write_all(body.as_bytes()).expect("écriture");
        };
        put(
            "[Content_Types].xml",
            r#"<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>"#.to_string(),
        );
        put(
            "_rels/.rels",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{PKG}"><Relationship Id="rId1" Type="{REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>"#
            ),
        );
        let list: String = sheets
            .iter()
            .enumerate()
            .map(|(i, s)| {
                let state = if s.hidden { r#" state="hidden""# } else { "" };
                format!(
                    r#"<sheet name="{}" sheetId="{}"{state} r:id="rId{}"/>"#,
                    s.name,
                    i + 1,
                    i + 1
                )
            })
            .collect();
        put(
            "xl/workbook.xml",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="{NS}" xmlns:r="{REL}"><sheets>{list}</sheets></workbook>"#
            ),
        );
        let rels: String = (1..=sheets.len())
            .map(|i| format!(r#"<Relationship Id="rId{i}" Type="{REL}/worksheet" Target="worksheets/sheet{i}.xml"/>"#))
            .collect();
        put(
            "xl/_rels/workbook.xml.rels",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{PKG}">{rels}<Relationship Id="rIdS" Type="{REL}/styles" Target="styles.xml"/><Relationship Id="rIdT" Type="{REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>"#
            ),
        );
        put(
            "xl/styles.xml",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="{NS}"><cellXfs count="5"><xf numFmtId="0"/><xf numFmtId="14" applyNumberFormat="1"/><xf numFmtId="46" applyNumberFormat="1"/><xf numFmtId="22" applyNumberFormat="1"/><xf numFmtId="20" applyNumberFormat="1"/></cellXfs></styleSheet>"#
            ),
        );
        let si: String = shared
            .iter()
            .map(|s| format!("<si><t>{s}</t></si>"))
            .collect();
        put(
            "xl/sharedStrings.xml",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><sst xmlns="{NS}" count="{n}" uniqueCount="{n}">{si}</sst>"#,
                n = shared.len()
            ),
        );
        for (i, s) in sheets.iter().enumerate() {
            let merges = if s.merges.is_empty() {
                String::new()
            } else {
                let refs: String = s
                    .merges
                    .iter()
                    .map(|m| format!(r#"<mergeCell ref="{m}"/>"#))
                    .collect();
                format!(
                    r#"<mergeCells count="{}">{refs}</mergeCells>"#,
                    s.merges.len()
                )
            };
            put(
                &format!("xl/worksheets/sheet{}.xml", i + 1),
                format!(
                    r#"<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="{NS}"><sheetData>{}</sheetData>{merges}</worksheet>"#,
                    s.data
                ),
            );
        }
        w.finish().expect("fin").into_inner()
    }

    fn shared(r: &str, i: usize) -> String {
        format!(r#"<c r="{r}" t="s"><v>{i}</v></c>"#)
    }
    fn num(r: &str, v: &str, style: u32) -> String {
        format!(r#"<c r="{r}" s="{style}"><v>{v}</v></c>"#)
    }
    fn inline(r: &str, t: &str) -> String {
        format!(r#"<c r="{r}" t="inlineStr"><is><t>{t}</t></is></c>"#)
    }
    fn row(n: u32, cells: &[String]) -> String {
        format!(r#"<row r="{n}">{}</row>"#, cells.concat())
    }
    /// Lettre de colonne (0 → A) ; au-delà de Z : AA, AB…
    fn letters(i: usize) -> String {
        if i < 26 {
            ((b'A' + i as u8) as char).to_string()
        } else {
            format!("{}{}", letters(i / 26 - 1), letters(i % 26))
        }
    }
    fn one(data: String, merges: &[&str]) -> Vec<u8> {
        xlsx(
            &[Ws {
                name: "F",
                hidden: false,
                data,
                merges,
            }],
            &[],
        )
    }

    /// `valeurs.xlsx` (F32, S4).
    fn valeurs() -> Vec<u8> {
        let mut data = row(
            3,
            &[
                shared("A3", 0),
                num("B3", "42", 0),
                num("C3", "3.5", 0),
                num("D3", "46346", 1),
                r#"<c r="E3" t="b"><v>1</v></c>"#.to_string(),
                r#"<c r="F3" t="e"><v>#DIV/0!</v></c>"#.to_string(),
            ],
        );
        data.push_str(&row(
            4,
            &[
                shared("A4", 1),
                inline("B4", "caché"),
                inline("C4", "L4C3"),
                inline("D4", "L4C4"),
                inline("E4", "L4C5"),
                inline("F4", "L4C6"),
            ],
        ));
        for r in 5..=72u32 {
            let cells: Vec<String> = (0..6)
                .map(|c| inline(&format!("{}{r}", letters(c)), &format!("L{r}C{}", c + 1)))
                .collect();
            data.push_str(&row(r, &cells));
        }
        xlsx(
            &[
                Ws {
                    name: "Cachée",
                    hidden: true,
                    data: row(1, &[inline("A1", "secret")]),
                    merges: &[],
                },
                Ws {
                    name: "Valeurs",
                    hidden: false,
                    data,
                    merges: &["A4:B4"],
                },
            ],
            &["texte", "Fusion"],
        )
    }

    fn fixture() -> PathBuf {
        PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/valeurs.xlsx")
    }

    /// S4, F23, F32 : la fixture fabriquée ; régénérée par `ROOMBOARD_REGENERER_FIXTURES=1`.
    #[test]
    fn valeurs_fixture_reads_64_rows_and_its_values() {
        if std::env::var("ROOMBOARD_REGENERER_FIXTURES").as_deref() == Ok("1") {
            std::fs::create_dir_all(fixture().parent().expect("dossier")).expect("dossier");
            std::fs::write(fixture(), valeurs()).expect("écriture");
        }
        let bytes = std::fs::read(fixture()).expect(
            "fixture valeurs.xlsx absente : ROOMBOARD_REGENERER_FIXTURES=1 cargo test -p roomboard-formats valeurs",
        );
        let s = read_first_sheet(&bytes).expect("lecture");
        assert_eq!(
            (s.rows, s.cols, s.source_rows, s.source_cols, s.cut_cells),
            (64, 6, 70, 6, false)
        );
        assert_eq!(
            &s.cells[0..6],
            ["texte", "42", "3,5", "20/11/2026", "VRAI", "#DIV/0!"]
        );
        assert_eq!(&s.cells[6..8], ["Fusion", "caché"]);
        assert_eq!(s.merges, vec![[1, 0, 1, 2]]);
        assert!(
            !s.cells.iter().any(|c| c == "secret"),
            "feuille cachée jamais lue"
        );
        assert_eq!(s.cells[63 * 6], "L66C1");
    }

    /// F24, HB-8, HB-17 : nombres à virgule et 15 chiffres, dates françaises (1900 et 1904), heures, durées, booléens,
    /// erreurs par leur code, texte tel quel (`\r\n` → `\n`).
    #[test]
    fn values_are_french_text() {
        use ExcelDateTimeType::{DateTime, TimeDelta};
        for (v, want) in [
            (42.0, "42"),
            (3.5, "3,5"),
            (0.1 + 0.2, "0,3"),
            (1.0 / 3.0, "0,333333333333333"),
            (-2.5, "-2,5"),
            (1e20, "100000000000000000000"),
            (123_456_789_012_345_680.0, "123456789012346000"),
            (-123_456_789_012_345_680.0, "-123456789012346000"),
            (1_234_567_890_123_456.75, "1234567890123460"),
            (0.0, "0"),
            (123_456_789.123_456, "123456789,123456"),
        ] {
            assert_eq!(number_text(v), want, "{v}");
        }
        let dt = |v: f64, t: ExcelDateTimeType, b: bool| {
            value_text(&DataRef::DateTime(ExcelDateTime::new(v, t, b)))
        };
        assert_eq!(dt(46346.0, DateTime, false), "20/11/2026");
        assert_eq!(dt(46346.5, DateTime, false), "20/11/2026 12:00");
        assert_eq!(
            dt(46346.0 + 45296.0 / 86400.0, DateTime, false),
            "20/11/2026 12:34:56"
        );
        assert_eq!(dt(0.5, DateTime, false), "12:00");
        assert_eq!(dt(1.5 + 1.0 / 86400.0, TimeDelta, false), "36:00:01");
        assert_eq!(dt(44884.0, DateTime, true), "20/11/2026");
        assert_eq!(value_text(&DataRef::Bool(true)), "VRAI");
        assert_eq!(value_text(&DataRef::Bool(false)), "FAUX");
        assert_eq!(value_text(&DataRef::Error(CellErrorType::Name)), "#NAME?");
        assert_eq!(value_text(&DataRef::Int(-7)), "-7");
        assert_eq!(value_text(&DataRef::String("a\r\nb".into())), "a\nb");
        assert_eq!(value_text(&DataRef::SharedString("x")), "x");
        assert_eq!(
            value_text(&DataRef::DateTimeIso("2026-11-20T08:05:00".into())),
            "20/11/2026 08:05"
        );
        assert_eq!(
            value_text(&DataRef::DateTimeIso("2026-11-20".into())),
            "20/11/2026"
        );
        assert_eq!(
            value_text(&DataRef::DateTimeIso("10:30:15".into())),
            "10:30:15"
        );
        assert_eq!(value_text(&DataRef::DurationIso("PT1H".into())), "PT1H");
        assert_eq!(value_text(&DataRef::Empty), "");
    }

    /// F23, HB-14 : première feuille visible ; toutes cachées : la première.
    #[test]
    fn first_visible_sheet_is_read() {
        let ws = |name, hidden, t: &str| Ws {
            name,
            hidden,
            data: row(1, &[inline("A1", t)]),
            merges: &[],
        };
        let b = xlsx(
            &[
                ws("a", true, "caché"),
                ws("b", false, "vu"),
                ws("c", false, "autre"),
            ],
            &[],
        );
        assert_eq!(read_first_sheet(&b).expect("lecture").cells, vec!["vu"]);
        let b = xlsx(&[ws("a", true, "premier"), ws("b", true, "second")], &[]);
        assert_eq!(
            read_first_sheet(&b).expect("lecture").cells,
            vec!["premier"]
        );
    }

    /// F23, HB-15 : lignes et colonnes vides de tête et de queue retirées ; une cellule vide (chaîne vide) ne compte pas.
    #[test]
    fn used_rectangle_drops_empty_edges() {
        let data = [
            row(5, &[inline("C5", "a"), inline("D5", "b"), inline("H5", "")]),
            row(6, &[inline("D6", "c")]),
            row(9, &[inline("C9", "")]),
        ]
        .concat();
        let s = read_first_sheet(&one(data, &[])).expect("lecture");
        assert_eq!((s.rows, s.cols, s.source_rows, s.source_cols), (2, 2, 2, 2));
        assert_eq!(s.cells, vec!["a", "b", "", "c"]);
    }

    /// F22 : 70 colonnes non vides : 64 gardées, 70 comptées.
    #[test]
    fn wide_sheet_is_cut_at_64_columns_and_counted() {
        let cells: Vec<String> = (0..70)
            .map(|c| inline(&format!("{}1", letters(c)), "x"))
            .collect();
        let s = read_first_sheet(&one(row(1, &cells), &[])).expect("lecture");
        assert_eq!(
            (s.rows, s.cols, s.source_rows, s.source_cols),
            (1, 64, 1, 70)
        );
    }

    /// F22, HB-13 : texte coupé à 2 000 caractères, suivi de « … », signalé une fois.
    #[test]
    fn long_text_is_cut_at_2000_chars() {
        let long = "é".repeat(2001);
        let s = read_first_sheet(&one(
            row(1, &[inline("A1", &long), inline("B1", "court")]),
            &[],
        ))
        .expect("lecture");
        assert!(s.cut_cells);
        assert_eq!(s.cells[0].chars().count(), 2001);
        assert!(s.cells[0].ends_with('…'));
        assert_eq!(s.cells[1], "court");
    }

    /// HB-16 : une fusion qui dépasse le rectangle gardé (au-delà de la 64e ligne) est retirée ; une dedans reste.
    #[test]
    fn merges_outside_the_kept_rectangle_are_dropped() {
        let data: String = (1..=70u32)
            .map(|r| {
                row(
                    r,
                    &[inline(&format!("A{r}"), "x"), inline(&format!("B{r}"), "y")],
                )
            })
            .collect();
        let s = read_first_sheet(&one(data, &["A1:B1", "A64:A65"])).expect("lecture");
        assert_eq!(s.merges, vec![[0, 0, 1, 2]]);
    }

    /// F28 : feuille sans valeur : `Empty`, message « la première feuille est vide ».
    #[test]
    fn empty_sheet_is_empty() {
        let e = read_first_sheet(&one(String::new(), &[])).expect_err("vide");
        assert_eq!(e, SheetError::Empty);
        assert_eq!(e.to_string(), EMPTY_SHEET);
    }

    /// F22, Review Focus 4 : une partie lue en entier qui déclare plus de 64 Mio décompressés : refus avant `calamine`.
    #[test]
    fn declared_zip_bomb_is_refused() {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        let o = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
        w.start_file("xl/sharedStrings.xml", o).expect("entrée");
        let chunk = vec![b' '; 1 << 20];
        for _ in 0..64 {
            w.write_all(&chunk).expect("écriture");
        }
        w.write_all(b" ").expect("écriture");
        let bytes = w.finish().expect("fin").into_inner();
        let e = read_first_sheet(&bytes).expect_err("bombe");
        assert_eq!(e, SheetError::TooBig);
        assert_eq!(e.to_string(), TOO_BIG);
    }

    /// Classeur dont `_rels/.rels` désigne `data/workbook.xml` (chemin non standard, suivi par `calamine`), avec ses
    /// chaînes partagées dans `data/sharedStrings.xml`, écrites telles quelles (`Stored`).
    fn relocated(shared_body: &[u8]) -> Vec<u8> {
        let mut w = ZipWriter::new(Cursor::new(Vec::new()));
        let o = SimpleFileOptions::default().compression_method(CompressionMethod::Stored);
        let mut put = |name: &str, body: &[u8]| {
            w.start_file(name, o).expect("entrée");
            w.write_all(body).expect("écriture");
        };
        put(
            "[Content_Types].xml",
            br#"<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/></Types>"#,
        );
        put(
            "_rels/.rels",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{PKG}"><Relationship Id="rId1" Type="{REL}/officeDocument" Target="data/workbook.xml"/></Relationships>"#
            )
            .as_bytes(),
        );
        put(
            "data/workbook.xml",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="{NS}" xmlns:r="{REL}"><sheets><sheet name="F" sheetId="1" r:id="rId1"/></sheets></workbook>"#
            )
            .as_bytes(),
        );
        put(
            "data/_rels/workbook.xml.rels",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="{PKG}"><Relationship Id="rId1" Type="{REL}/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rIdT" Type="{REL}/sharedStrings" Target="sharedStrings.xml"/></Relationships>"#
            )
            .as_bytes(),
        );
        put(
            "data/worksheets/sheet1.xml",
            format!(
                r#"<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="{NS}"><sheetData>{}</sheetData></worksheet>"#,
                row(1, &[shared("A1", 0)])
            )
            .as_bytes(),
        );
        put("data/sharedStrings.xml", shared_body);
        w.finish().expect("fin").into_inner()
    }

    /// F22, PC3 (constat T13) : la garde ne lit pas les noms des parties ; `calamine` suit `_rels/.rels` jusqu'à
    /// `data/`, où une partie de 64 Mio + 1 déclarés est refusée comme sous `xl/`.
    #[test]
    fn zip_bomb_under_a_non_standard_path_is_refused() {
        let small = format!(
            r#"<?xml version="1.0" encoding="UTF-8"?><sst xmlns="{NS}" count="1" uniqueCount="1"><si><t>déplacé</t></si></sst>"#
        );
        let s = read_first_sheet(&relocated(small.as_bytes())).expect("chemin non standard suivi");
        assert_eq!(s.cells, vec!["déplacé"]);
        let mut big = small.into_bytes();
        big.resize(MAX_PART_BYTES as usize + 1, b' ');
        let e = read_first_sheet(&relocated(&big)).expect_err("bombe sous data/");
        assert_eq!(e, SheetError::TooBig);
    }

    /// DAB4, S4 : en-tête ZIP puis octets corrompus : `Unreadable`, jamais de panique en natif.
    #[test]
    fn corrupted_zip_is_unreadable() {
        let mut bytes = vec![0x50, 0x4b, 0x03, 0x04];
        bytes.extend((0..200u32).map(|i| (i * 37 % 251) as u8));
        let e = read_first_sheet(&bytes).expect_err("corrompu");
        assert!(matches!(e, SheetError::Unreadable(_)));
        assert!(e.to_string().starts_with("classeur illisible"), "{e}");
    }

    /// F32 : les trois `.xlsx` d'exemple, s'ils existent (`~/telechargements-roomboard/`) ; lancé à la main :
    /// `cargo test -p roomboard-formats real_examples -- --ignored`.
    #[test]
    #[ignore]
    fn real_examples_read_within_bounds() {
        let dir = PathBuf::from(std::env::var("HOME").unwrap_or_default())
            .join("telechargements-roomboard");
        let Ok(entries) = std::fs::read_dir(&dir) else {
            return;
        };
        for e in entries.flatten() {
            let p = e.path();
            if p.extension().and_then(|x| x.to_str()) != Some("xlsx") {
                continue;
            }
            let s = read_first_sheet(&std::fs::read(&p).expect("lecture"))
                .expect("première feuille sans erreur");
            assert!(s.rows <= 64 && s.cols <= 64, "{}", p.display());
            assert_eq!(s.cells.len(), (s.rows * s.cols) as usize);
        }
    }
}
