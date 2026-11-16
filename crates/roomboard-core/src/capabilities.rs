//! Tableau des capacités par plateforme.

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Platform {
    Web,
    Windows,
    MacOs,
    Linux,
    Android,
    IPadOs,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct Capabilities {
    /// Annotation par-dessus le bureau (coque desktop).
    pub desktop_annotation: bool,
    /// Plusieurs fenêtres simultanées.
    pub multi_window: bool,
}

pub fn capabilities(platform: Platform) -> Capabilities {
    use Platform::*;
    let desktop = matches!(platform, Windows | MacOs | Linux);
    Capabilities {
        desktop_annotation: desktop,
        multi_window: desktop,
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn desktop_annotation_only_on_desktops() {
        assert!(capabilities(Platform::Windows).desktop_annotation);
        assert!(capabilities(Platform::MacOs).desktop_annotation);
        assert!(capabilities(Platform::Linux).desktop_annotation);
        assert!(!capabilities(Platform::Web).desktop_annotation);
        assert!(!capabilities(Platform::Android).desktop_annotation);
        assert!(!capabilities(Platform::IPadOs).desktop_annotation);
    }

    #[test]
    fn multi_window_not_on_tablets() {
        assert!(capabilities(Platform::Windows).multi_window);
        assert!(!capabilities(Platform::IPadOs).multi_window);
        assert!(!capabilities(Platform::Android).multi_window);
    }
}
