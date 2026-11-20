//! Assets du document (U4, K3, K4) : empreinte SHA-256 en hexadécimal minuscule ; métadonnée par défaut d'un asset
//! cité sans entrée lisible dans la racine `assets`.

#[cfg(test)]
mod tests {
    use super::*;

    const ABC: &str = "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad";

    #[test]
    fn is_asset_id_accepts_only_lowercase_hex_64() {
        assert!(is_asset_id(ABC));
        assert!(!is_asset_id(&ABC.to_uppercase()));
        assert!(!is_asset_id(&ABC[..63]));
        assert!(!is_asset_id(&format!("{ABC}0")));
        assert!(!is_asset_id(&ABC.replace('b', "g")));
        assert!(!is_asset_id(""));
        assert!(!is_asset_id("2b6f0cc9-6d5c-4c1a-9a8e-2f6c1d1e9f00"));
    }

    #[test]
    fn fallback_uses_id_octet_stream_and_zero() {
        assert_eq!(
            AssetInfo::fallback(ABC),
            AssetInfo {
                id: ABC.into(),
                name: ABC.into(),
                mime: "application/octet-stream".into(),
                size: 0.0,
            }
        );
    }
}
