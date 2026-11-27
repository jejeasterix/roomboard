//! Aspect complet d'une page (personnalisation-1b, Q1 à Q4, Q35, DA1) : couleur, grille et fond image de N pages en une
//! transaction `"local"`, donc une seule étape d'annulation ; seules les pages qui changent sont écrites et rendues
//! (D38). Une page à fond `pdf-page` garde son fond : elle ne reçoit que la couleur et la grille (Q35).

#[cfg(test)]
mod tests {
    use crate::asset::AssetRef;
    use crate::commands::tests::writes;
    use crate::commands::{BackdropInput, Command, CommandError};
    use crate::document::Document;
    use crate::grid::{GridInput, GridLevelView};

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";
    const PDF: &str = "cdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcdcd";

    fn png() -> AssetRef {
        AssetRef {
            id: ABC.into(),
            name: "fond.png".into(),
            mime: "image/png".into(),
            size: 3.0,
        }
    }

    fn pdf() -> AssetRef {
        AssetRef {
            id: PDF.into(),
            name: "cours.pdf".into(),
            mime: "application/pdf".into(),
            size: 1234.0,
        }
    }

    fn image() -> Option<BackdropInput> {
        Some(BackdropInput {
            asset: png(),
            w: 3840.0,
            h: 2160.0,
            fit: "width".into(),
        })
    }

    fn seyes() -> GridInput {
        GridInput {
            visible: true,
            snap: false,
            above: false,
            levels: vec![GridLevelView {
                kind: "seyes".into(),
                spacing_x: 30.24,
                spacing_y: 30.24,
                origin_x: 0.0,
                origin_y: 0.0,
                color: "#8f9ad6".into(),
                line: "solid".into(),
                line_width: 1.0,
                snap: true,
                visible: true,
            }],
        }
    }

    fn look(pages: &[String], color: &str, b: Option<BackdropInput>, g: Option<GridInput>) -> Command {
        Command::ApplyBackground {
            pages: pages.to_vec(),
            color: color.into(),
            backdrop: b,
            grid: g,
        }
    }

    fn three() -> (Document, Vec<String>) {
        let mut d = Document::blank();
        d.add_page();
        d.add_page();
        let p = d.page_ids();
        (d, p)
    }

    /// S2, DA1 : trois pages, une transaction, une étape ; un seul asset cité ; annuler rend les trois pages blanches.
    /// Discrimine le patron écarté : `SetBackdrop`, `SetGrid` et `Fill` enchaînés page par page feraient 9 étapes
    /// (`history.rs`, `capture_timeout_millis: 0`), et une seule annulation laisserait 8 écritures en place.
    #[test]
    fn apply_background_three_pages_is_one_step() {
        let (mut d, pages) = three();
        let c = d
            .apply(look(&pages, "#fbf7ec", image(), Some(seyes())))
            .expect("fond");
        assert_eq!(c.pages, pages);
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!(v.background, "#fbf7ec");
            assert_eq!(v.grid, Some(seyes()));
            let b = v.backdrop.expect("fond");
            assert_eq!((b.asset.as_str(), b.kind.as_str()), (ABC, "image"));
        }
        assert_eq!(d.cited_assets(), vec![png()]);
        assert!(d.undo());
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!(
                (v.background.as_str(), v.grid.is_none(), v.backdrop.is_none()),
                ("#ffffff", true, true)
            );
        }
        assert_eq!(d.page_ids(), pages, "les pages ajoutées restent : leurs étapes sont à part");
    }

    /// D38 : même aspect, aucune transaction ; seules les pages qui changent sont écrites et rendues.
    #[test]
    fn apply_background_same_value_is_no_step() {
        let (mut d, pages) = three();
        let first = vec![pages[0].clone()];
        d.apply(look(&first, "#2f3e46", None, None)).expect("ardoise");
        let w = writes(&d);
        let v = d.version();
        let c = d.apply(look(&first, "#2f3e46", None, None)).expect("même");
        assert_eq!((c.version, c.pages.len(), w.since()), (v, 0, 0));
        let c = d.apply(look(&pages, "#2f3e46", None, None)).expect("toutes");
        assert_eq!(c.pages, pages[1..].to_vec());
    }

    /// Q35 : page PDF : fond gardé, couleur et grille écrites, une étape ; annuler rend la page telle quelle.
    #[test]
    fn apply_background_keeps_pdf_page_backdrop() {
        let mut d = Document::from_pdf_pages(&pdf(), &[(612.0, 792.0), (792.0, 612.0)], None).expect("pdf");
        let pages = d.page_ids();
        let c = d
            .apply(look(&pages, "#fbf7ec", image(), Some(seyes())))
            .expect("fond");
        assert_eq!(c.pages, pages);
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!(v.background, "#fbf7ec");
            assert_eq!(v.grid, Some(seyes()));
            let b = v.backdrop.expect("fond pdf");
            assert_eq!((b.asset.as_str(), b.kind.as_str()), (PDF, "pdf-page"));
        }
        assert!(d.undo());
        assert!(!d.can_undo(), "une seule étape");
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!((v.background.as_str(), v.grid.is_none()), ("#ffffff", true));
            assert_eq!(v.backdrop.expect("fond pdf").kind, "pdf-page");
        }
    }

    /// Q35, page par page : dans un même document, la page PDF garde son fond et la page simple reçoit l'image, en une
    /// étape. Discrimine une lecture du genre de fond faite une fois pour toutes plutôt que pour chaque page.
    #[test]
    fn apply_background_mixed_pdf_and_plain_pages() {
        let mut d = Document::from_pdf_pages(&pdf(), &[(612.0, 792.0)], None).expect("pdf");
        let plain = d.add_page();
        let pages = d.page_ids();
        assert_eq!(pages.len(), 2);
        let steps_before = {
            let mut n = 0;
            while d.can_undo() && d.undo() {
                n += 1;
            }
            for _ in 0..n {
                assert!(d.redo());
            }
            n
        };
        let c = d
            .apply(look(&pages, "#fbf7ec", image(), Some(seyes())))
            .expect("fond");
        assert_eq!(c.pages, pages);
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!((v.background.as_str(), v.grid.clone()), ("#fbf7ec", Some(seyes())));
            let b = v.backdrop.expect("fond");
            let want = if *p == plain { (ABC, "image") } else { (PDF, "pdf-page") };
            assert_eq!((b.asset.as_str(), b.kind.as_str()), want);
        }
        assert!(d.undo());
        let mut left = 0;
        while d.can_undo() && d.undo() {
            left += 1;
        }
        assert_eq!(left, steps_before, "ApplyBackground ne fait qu'une étape");
    }

    /// Q4 : refus avant toute transaction, dans l'ordre couleur, fond, grille, pages.
    #[test]
    fn apply_background_refusals_write_nothing() {
        let (mut d, pages) = three();
        let p = pages[0].clone();
        let w = writes(&d);
        let one = vec![p.clone()];
        let bad_asset = Some(BackdropInput {
            asset: AssetRef {
                mime: String::new(),
                ..png()
            },
            w: 1.0,
            h: 1.0,
            fit: "width".into(),
        });
        let bad_fit = Some(BackdropInput {
            fit: "contain".into(),
            ..image().expect("fond")
        });
        let mut bad_grid = seyes();
        bad_grid.levels[0].spacing_x = 0.0;
        assert!(matches!(d.apply(look(&one, "", None, None)), Err(CommandError::BadFill)));
        assert!(matches!(
            d.apply(look(&one, "", bad_asset.clone(), None)),
            Err(CommandError::BadFill)
        ));
        assert!(matches!(
            d.apply(look(&one, "#ffffff", bad_asset, Some(bad_grid.clone()))),
            Err(CommandError::BadAsset)
        ));
        assert!(matches!(
            d.apply(look(&one, "#ffffff", bad_fit, None)),
            Err(CommandError::BadImage)
        ));
        assert!(matches!(
            d.apply(look(&[], "#ffffff", None, Some(bad_grid.clone()))),
            Err(CommandError::BadGrid)
        ));
        assert!(matches!(
            d.apply(look(&one, "#ffffff", None, Some(bad_grid))),
            Err(CommandError::BadGrid)
        ));
        assert!(matches!(
            d.apply(look(&[], "#ffffff", None, None)),
            Err(CommandError::UnknownPage(id)) if id.is_empty()
        ));
        assert!(matches!(
            d.apply(look(&[p.clone(), p.clone()], "#ffffff", None, None)),
            Err(CommandError::UnknownPage(id)) if id == p
        ));
        assert!(matches!(
            d.apply(look(&["nulle-part".into()], "#ffffff", None, None)),
            Err(CommandError::UnknownPage(id)) if id == "nulle-part"
        ));
        assert_eq!(w.since(), 0);
    }

    /// Q1 : « Blanc (aucun fond) » remet blanc, sans grille ni image, en une étape.
    #[test]
    fn apply_background_white_clears_grid_and_image() {
        let (mut d, pages) = three();
        let one = vec![pages[0].clone()];
        d.apply(look(&one, "#fbf7ec", image(), Some(seyes())))
            .expect("fond");
        let c = d.apply(look(&one, "#ffffff", None, None)).expect("blanc");
        assert_eq!(c.pages, one);
        let v = d.page(&one[0]).expect("page");
        assert_eq!(
            (v.background.as_str(), v.grid.is_none(), v.backdrop.is_none()),
            ("#ffffff", true, true)
        );
        assert!(d.undo());
        let v = d.page(&one[0]).expect("page");
        assert_eq!((v.background.as_str(), v.grid, v.backdrop.is_some()), ("#fbf7ec", Some(seyes()), true));
    }

    #[test]
    fn apply_background_undo_then_redo() {
        let (mut d, pages) = three();
        d.apply(look(&pages, "#2f3e46", None, Some(seyes())))
            .expect("fond");
        assert!(d.undo());
        assert!(d.redo());
        for p in &pages {
            let v = d.page(p).expect("page");
            assert_eq!((v.background.as_str(), v.grid.clone()), ("#2f3e46", Some(seyes())));
        }
    }

    /// S4, G4 : trente rechargements gardent les octets (fond, grille, couleur, métadonnée d'asset).
    #[test]
    fn apply_background_reload_keeps_bytes() {
        use crate::format::{load, save, SaveMeta};
        let meta = SaveMeta {
            app_version: "0.1.0".into(),
            now: "2026-11-27T00:00:00Z".into(),
            created: None,
        };
        let (mut d, pages) = three();
        d.apply(look(&pages, "#fbf7ec", image(), Some(seyes())))
            .expect("fond");
        let ybin = d.encode_v1();
        let file = save(&d, &meta).expect("save");
        for i in 0..30 {
            let r = load(&file).expect("load");
            assert!(r.encode_v1() == ybin, "ybin différent au rechargement {i}");
            assert!(save(&r, &meta).expect("resave") == file, "fichier différent au rechargement {i}");
        }
    }
}
