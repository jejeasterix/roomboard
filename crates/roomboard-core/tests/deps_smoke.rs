//! Fumée des dépendances du cœur (H2-8) : zip en mémoire, freedraw, uuid.
use std::io::{Cursor, Read, Write};

#[test]
fn zip_deflate_round_trip_in_memory() {
    let mut w = zip::ZipWriter::new(Cursor::new(Vec::new()));
    let opts = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated)
        .last_modified_time(zip::DateTime::default());
    w.start_file("a.txt", opts).unwrap();
    w.write_all(b"bonjour bonjour bonjour").unwrap();
    let bytes = w.finish().unwrap().into_inner();

    let mut a = zip::ZipArchive::new(Cursor::new(bytes)).unwrap();
    let mut s = String::new();
    a.by_name("a.txt").unwrap().read_to_string(&mut s).unwrap();
    assert_eq!(s, "bonjour bonjour bonjour");
}

#[test]
fn freedraw_outline_is_a_polygon() {
    let pts: Vec<freedraw::InputPoint> = (0..20)
        .map(|i| freedraw::InputPoint::Struct {
            x: i as f64 * 3.0,
            y: 0.0,
            pressure: Some(0.5),
        })
        .collect();
    let opts = freedraw::StrokeOptions {
        size: Some(8.0),
        ..Default::default()
    };
    let outline = freedraw::get_stroke(&pts, &opts);
    assert!(outline.len() >= 3, "contour vide : {}", outline.len());
}

#[test]
fn uuid_v4_has_36_chars() {
    let id = yrs::uuid_v4();
    assert_eq!(id.len(), 36);
}
