//! Assets du document (U4, K3, K4) : empreinte SHA-256 en hexadécimal minuscule ; métadonnée par défaut d'un asset
//! cité sans entrée lisible dans la racine `assets`.

pub const DEFAULT_ASSET_MIME: &str = "application/octet-stream";

/// 64 caractères hexadécimaux minuscules : seule forme d'empreinte citée, écrite ou lue (K4).
pub fn is_asset_id(s: &str) -> bool {
    s.len() == 64
        && s.bytes()
            .all(|b| b.is_ascii_digit() || (b'a'..=b'f').contains(&b))
}

/// Métadonnée d'un asset (K3) : rangée en champs scalaires d'un `Y.Map` de la racine `assets`, jamais en `Any::Map`.
#[derive(Debug, Clone, PartialEq, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AssetInfo {
    pub id: String,
    pub name: String,
    pub mime: String,
    pub size: f64,
}

/// Référence reçue par `AddImage` et `SetBackdrop` : même forme que la métadonnée.
pub type AssetRef = AssetInfo;

impl AssetInfo {
    /// Défauts d'un asset cité sans métadonnée lisible : `name` = l'id, type inconnu, taille 0 (K4).
    pub fn fallback(id: &str) -> AssetInfo {
        AssetInfo {
            id: id.to_string(),
            name: id.to_string(),
            mime: DEFAULT_ASSET_MIME.to_string(),
            size: 0.0,
        }
    }
}

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
