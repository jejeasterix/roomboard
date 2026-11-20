//! Élément `media` (C14, M2, M5-M8) : vidéo ou son posé sur la page, avec rognage, boucle et volume.

#[cfg(test)]
mod tests {
    use yrs::Map;

    use super::*;
    use crate::asset::{AssetInfo, AssetRef};
    use crate::commands::tests::writes;
    use crate::commands::{Change, Command, CommandError};
    use crate::document::Document;
    use crate::element::{Transform, UnknownView};
    use crate::query::Bounds;

    const WEBM: &str = concat!(
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
    );
    const JPG: &str = concat!(
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"
    );
    const M: Transform = [1.0, 0.0, 0.0, 1.0, 100.0, 50.0];

    fn webm() -> AssetRef {
        AssetRef {
            id: WEBM.into(),
            name: "clip.webm".into(),
            mime: "video/webm".into(),
            size: 1000.0,
        }
    }

    fn jpg() -> AssetRef {
        AssetRef {
            id: JPG.into(),
            name: "clip.jpg".into(),
            mime: "image/jpeg".into(),
            size: 200.0,
        }
    }

    fn add_cmd(page: &str, linked: Option<&str>, poster: bool, duration: f64) -> Command {
        Command::AddMedia {
            page: page.into(),
            asset: webm(),
            linked: linked.map(String::from),
            media_type: MediaType::Video,
            w: 320.0,
            h: 180.0,
            duration,
            poster: poster.then(jpg),
            matrix: M,
        }
    }

    fn add(d: &mut Document, linked: Option<&str>, poster: bool, duration: f64) -> String {
        let p = d.page_ids()[0].clone();
        d.apply(add_cmd(&p, linked, poster, duration))
            .expect("média")
            .ids[0]
            .clone()
    }

    fn set(id: &str, s: (f64, Option<f64>, bool, f64)) -> Command {
        Command::SetMedia {
            id: id.into(),
            trim_start: s.0,
            trim_end: s.1,
            looped: s.2,
            volume: s.3,
        }
    }

    fn media(d: &Document, id: &str) -> MediaView {
        d.element(id).and_then(|v| v.media).expect("vue média")
    }

    fn settings(v: &MediaView) -> (f64, Option<f64>, bool, f64) {
        (v.trim_start, v.trim_end, v.looped, v.volume)
    }

    fn raw_keys(d: &Document, id: &str) -> Vec<String> {
        let txn = d.read();
        let found = d.find_element(&txn, id).expect("élément");
        let mut keys: Vec<String> = found.element.keys(&txn).map(String::from).collect();
        keys.sort();
        keys
    }

    const NEUTRAL: (f64, Option<f64>, bool, f64) = (0.0, None, false, 1.0);

    /// M5 : l'ajout est une étape ; vue aux réglages neutres ; média et poster cités ; annuler retire tout.
    #[test]
    fn add_media_is_one_step_with_media_and_poster_meta() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let c = d.apply(add_cmd(&p, None, true, 2.5)).expect("média");
        assert_eq!(c.pages, vec![p.clone()]);
        assert_eq!(c.ids.len(), 1);
        let id = c.ids[0].clone();
        let v = d.element(&id).expect("vue");
        assert_eq!(v.kind, "media");
        assert_eq!(v.transform, M);
        assert_eq!(v.unknown, None);
        assert_eq!(
            v.media,
            Some(MediaView {
                asset: WEBM.into(),
                media_type: "video".into(),
                w: 320.0,
                h: 180.0,
                duration: 2.5,
                poster: Some(JPG.into()),
                trim_start: 0.0,
                trim_end: None,
                looped: false,
                volume: 1.0,
            })
        );
        assert_eq!(d.cited_assets(), vec![webm(), jpg()]);
        assert_eq!(d.asset(WEBM), Some(webm()));
        assert_eq!(d.asset(JPG), Some(jpg()));
        assert!(d.linked_assets().is_empty());
        assert_eq!(
            d.bounds(std::slice::from_ref(&id)),
            Some(Bounds {
                x0: 100.0,
                y0: 50.0,
                x1: 420.0,
                y1: 230.0
            })
        );
        assert!(d.undo());
        assert!(!d.can_undo(), "une seule étape");
        assert!(d.element(&id).is_none());
        assert!(d.cited_assets().is_empty());
        assert_eq!(d.asset(WEBM), Some(AssetInfo::fallback(WEBM)));
        assert_eq!(d.asset(JPG), Some(AssetInfo::fallback(JPG)));
    }

    /// M5 : chaque refus, dans l'ordre BadAsset → BadMedia → BadMatrix → UnknownPage, n'écrit rien.
    #[test]
    fn add_media_refusals_write_nothing() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let n = writes(&d);
        let base = || add_cmd(&p, None, true, 2.5);
        let with = |f: &dyn Fn(&mut Command)| {
            let mut c = base();
            f(&mut c);
            c
        };
        let long = "a".repeat(MAX_LINK_CHARS + 1);
        let cases: Vec<(Command, CommandError)> = vec![
            (
                with(&|c| {
                    if let Command::AddMedia { asset, .. } = c {
                        asset.id = "ABC".into();
                    }
                }),
                CommandError::BadAsset,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { poster, .. } = c {
                        if let Some(a) = poster {
                            a.mime = String::new();
                        }
                    }
                }),
                CommandError::BadAsset,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { linked, .. } = c {
                        *linked = Some(String::new());
                    }
                }),
                CommandError::BadMedia,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { linked, .. } = c {
                        *linked = Some(long.clone());
                    }
                }),
                CommandError::BadMedia,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { w, .. } = c {
                        *w = 0.0;
                    }
                }),
                CommandError::BadMedia,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { h, .. } = c {
                        *h = 1e39;
                    }
                }),
                CommandError::BadMedia,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { duration, .. } = c {
                        *duration = f64::NAN;
                    }
                }),
                CommandError::BadMedia,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { duration, .. } = c {
                        *duration = -1.0;
                    }
                }),
                CommandError::BadMedia,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { matrix, .. } = c {
                        *matrix = [0.0; 6];
                    }
                }),
                CommandError::BadMatrix,
            ),
            (
                with(&|c| {
                    if let Command::AddMedia { page, .. } = c {
                        *page = "nope".into();
                    }
                }),
                CommandError::UnknownPage("nope".into()),
            ),
        ];
        assert_eq!(cases.len(), 10);
        for (cmd, err) in cases {
            assert_eq!(d.apply(cmd.clone()), Err(err), "{cmd:?}");
        }
        // Ordre des refus : l'asset avant le média, le média avant la matrice, la matrice avant la page.
        let all_bad = Command::AddMedia {
            page: "nope".into(),
            asset: AssetRef {
                id: "ABC".into(),
                ..webm()
            },
            linked: Some(String::new()),
            media_type: MediaType::Audio,
            w: 0.0,
            h: 180.0,
            duration: -1.0,
            poster: None,
            matrix: [0.0; 6],
        };
        assert_eq!(d.apply(all_bad.clone()), Err(CommandError::BadAsset));
        let Command::AddMedia {
            page,
            linked,
            media_type,
            w,
            h,
            duration,
            poster,
            matrix,
            ..
        } = all_bad
        else {
            unreachable!()
        };
        let no_asset_fault = Command::AddMedia {
            page: page.clone(),
            asset: webm(),
            linked,
            media_type,
            w,
            h,
            duration,
            poster: poster.clone(),
            matrix,
        };
        assert_eq!(d.apply(no_asset_fault), Err(CommandError::BadMedia));
        let only_matrix_and_page = Command::AddMedia {
            page,
            asset: webm(),
            linked: None,
            media_type,
            w: 320.0,
            h,
            duration: 0.0,
            poster,
            matrix,
        };
        assert_eq!(d.apply(only_matrix_and_page), Err(CommandError::BadMatrix));
        assert_eq!(n.since(), 0);
        assert_eq!(d.version(), 0);
        assert!(!d.can_undo());
        assert!(d.cited_assets().is_empty());
    }

    /// M6 : même état sans étape ; une étape par réglage ; annuler un par un ; les neutres sont retirés, jamais écrits.
    #[test]
    fn set_media_is_one_step_per_setting_and_neutral_values_are_removed() {
        let mut d = Document::blank();
        let id = add(&mut d, None, true, 2.5);
        let n = writes(&d);
        let v0 = d.version();
        assert_eq!(
            d.apply(set(&id, NEUTRAL)),
            Ok(Change {
                version: v0,
                ..Default::default()
            })
        );
        assert_eq!(n.since(), 0, "même état : aucune écriture");
        let steps = [
            (0.5, None, false, 1.0),
            (0.5, Some(2.0), false, 1.0),
            (0.5, Some(2.0), true, 1.0),
            (0.5, Some(2.0), true, 0.4),
        ];
        for (k, s) in steps.iter().enumerate() {
            let c = d.apply(set(&id, *s)).expect("réglage");
            assert_eq!(c.ids, vec![id.clone()]);
            assert_eq!(c.version, v0 + k as u64 + 1);
            assert_eq!(n.since(), k + 1, "une transaction par réglage");
            assert_eq!(settings(&media(&d, &id)), *s);
        }
        assert_eq!(
            raw_keys(&d, &id),
            [
                "asset",
                "duration",
                "h",
                "id",
                "kind",
                "loop",
                "mediaType",
                "poster",
                "transform",
                "trimEnd",
                "trimStart",
                "volume",
                "w"
            ]
        );
        let back = [steps[2], steps[1], steps[0], NEUTRAL];
        for s in back {
            assert!(d.undo());
            assert_eq!(settings(&media(&d, &id)), s);
        }
        assert_eq!(
            raw_keys(&d, &id),
            [
                "asset",
                "duration",
                "h",
                "id",
                "kind",
                "mediaType",
                "poster",
                "transform",
                "w"
            ]
        );
        assert!(d.undo(), "l'ajout reste une étape à part");
        assert!(!d.can_undo());
        // « Tout garder » : revenir aux neutres en une étape retire les quatre clés.
        let id = add(&mut d, None, true, 2.5);
        d.apply(set(&id, steps[3])).expect("réglages");
        let before = n.since();
        d.apply(set(&id, (0.0, Some(2.5), false, 1.0)))
            .expect("tout garder");
        assert_eq!(n.since(), before + 1);
        assert_eq!(settings(&media(&d, &id)), NEUTRAL);
        assert_eq!(
            raw_keys(&d, &id),
            [
                "asset",
                "duration",
                "h",
                "id",
                "kind",
                "mediaType",
                "poster",
                "transform",
                "w"
            ]
        );
    }

    /// M6 : domaines contre la durée connue ; fin égale à la durée = sans fin ; durée 0 = durée inconnue.
    #[test]
    fn set_media_domains_follow_the_duration() {
        let mut d = Document::blank();
        let p = d.page_ids()[0].clone();
        let id = add(&mut d, None, false, 2.5);
        let image = d
            .apply(Command::AddImage {
                page: p.clone(),
                asset: jpg(),
                w: 64.0,
                h: 48.0,
                matrix: M,
            })
            .expect("image")
            .ids[0]
            .clone();
        let n = writes(&d);
        let v0 = d.version();
        let out_of_domain = [
            (-0.1, None, false, 1.0),
            (f64::NAN, None, false, 1.0),
            (2.5, None, false, 1.0),
            (0.0, Some(0.0), false, 1.0),
            (1.0, Some(1.0), false, 1.0),
            (0.0, Some(3.0), false, 1.0),
            (0.0, Some(f64::INFINITY), false, 1.0),
            (0.0, None, false, -0.1),
            (0.0, None, false, 1.5),
        ];
        for s in out_of_domain {
            assert_eq!(d.apply(set(&id, s)), Err(CommandError::BadMedia), "{s:?}");
        }
        assert_eq!(
            d.apply(set("nope", (0.5, None, false, 1.0))),
            Err(CommandError::UnknownElement("nope".into()))
        );
        assert_eq!(
            d.apply(set(&image, (0.5, None, false, 1.0))),
            Err(CommandError::BadMedia)
        );
        assert_eq!(
            d.apply(set(&id, (0.0, Some(2.5), false, 1.0))),
            Ok(Change {
                version: v0,
                ..Default::default()
            }),
            "fin égale à la durée : état neutre, aucune étape"
        );
        assert_eq!(n.since(), 0);
        assert_eq!(d.version(), v0);
        d.apply(set(&id, (0.5, Some(2.5), false, 1.0)))
            .expect("fin à la durée");
        assert_eq!(settings(&media(&d, &id)), (0.5, None, false, 1.0));
        assert!(!raw_keys(&d, &id).contains(&"trimEnd".to_string()));
        let unknown_duration = add(&mut d, None, false, 0.0);
        d.apply(set(&unknown_duration, (3.0, Some(9.0), false, 1.0)))
            .expect("durée inconnue : seul l'ordre compte");
        assert_eq!(
            settings(&media(&d, &unknown_duration)),
            (3.0, Some(9.0), false, 1.0)
        );
    }

    /// M7 : facultatif illisible = neutre ; obligatoire illisible = cadre inconnu (jamais `None`), boîte gardée.
    #[test]
    fn unreadable_optional_fields_read_as_neutral_and_required_ones_fall_back_to_unknown() {
        let mut d = Document::blank();
        let id = add(&mut d, None, true, 2.5);
        {
            let mut txn = d.transact_local();
            let e = d.find_element(&txn, &id).expect("élément").element;
            e.insert(&mut txn, "trimStart", "x");
            e.insert(&mut txn, "trimEnd", 9.0);
            e.insert(&mut txn, "loop", 1.0);
            e.insert(&mut txn, "volume", 7.0);
            e.insert(&mut txn, "poster", "x");
        }
        assert_eq!(
            media(&d, &id),
            MediaView {
                asset: WEBM.into(),
                media_type: "video".into(),
                w: 320.0,
                h: 180.0,
                duration: 2.5,
                poster: None,
                trim_start: 0.0,
                trim_end: None,
                looped: false,
                volume: 1.0,
            }
        );
        {
            let mut txn = d.transact_local();
            let e = d.find_element(&txn, &id).expect("élément").element;
            e.insert(&mut txn, "mediaType", "hologram");
        }
        let v = d.element(&id).expect("jamais invisible");
        assert_eq!(v.kind, "unknown");
        assert_eq!(v.media, None);
        assert_eq!(
            v.unknown,
            Some(UnknownView {
                source_kind: "media".into(),
                w: 320.0,
                h: 180.0,
            })
        );
        assert_eq!(v.transform, M);
        assert_eq!(
            d.bounds(std::slice::from_ref(&id)),
            Some(Bounds {
                x0: 100.0,
                y0: 50.0,
                x1: 420.0,
                y1: 230.0
            })
        );
    }

    /// M30 : liens lus parmi les assets cités ; réécrits hors historique, version inchangée.
    #[test]
    fn linked_assets_and_relink_stay_outside_history() {
        let mut d = Document::blank();
        let id = add(&mut d, Some("clips/a.webm"), true, 2.5);
        assert_eq!(
            d.linked_assets(),
            vec![LinkedAsset {
                id: WEBM.into(),
                path: "clips/a.webm".into()
            }]
        );
        let v0 = d.version();
        assert!(d.can_undo());
        let n = writes(&d);
        let moved = [
            LinkedAsset {
                id: WEBM.into(),
                path: "../clips/a.webm".into(),
            },
            LinkedAsset {
                id: JPG.into(),
                path: "posters/a.jpg".into(),
            },
        ];
        assert_eq!(d.relink_assets(&moved), 1, "le poster non lié est ignoré");
        assert_eq!(n.since(), 1, "une écriture");
        assert_eq!(d.version(), v0);
        assert!(d.can_undo());
        assert_eq!(
            d.linked_assets(),
            vec![LinkedAsset {
                id: WEBM.into(),
                path: "../clips/a.webm".into()
            }]
        );
        assert_eq!(d.relink_assets(&moved[..1]), 0, "même chemin");
        let invalid = [
            LinkedAsset {
                id: WEBM.into(),
                path: String::new(),
            },
            LinkedAsset {
                id: WEBM.into(),
                path: "a".repeat(MAX_LINK_CHARS + 1),
            },
        ];
        assert_eq!(d.relink_assets(&invalid), 0, "chemins invalides");
        assert_eq!(n.since(), 1, "aucune transaction sans réécriture");
        assert_eq!(d.version(), v0);
        assert!(d.undo(), "annuler l'ajout");
        assert!(!d.can_undo(), "le relink n'a pas fait d'étape");
        assert!(d.element(&id).is_none());
        assert!(d.linked_assets().is_empty());
    }
}
