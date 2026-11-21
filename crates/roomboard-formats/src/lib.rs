//! Formats de RoomBoard hors du module de l'encre (U4, DAU1, K1) : conteneur `.roomboard` avec ses assets ; première
//! feuille d'un classeur `.xlsx` en valeurs (C10b, U35) ; pages vectorielles en PDF par `krilla` (C12, PF22) ;
//! calculs de pixels des images (C5, U30) ; tableaux interactifs `.iwb` et `.ubz` en flux BoardList (C13, DA2). Rust
//! pur, testé en natif ; servis par le second module Wasm.
pub mod board;
pub mod container;
pub mod pdf;
pub mod pixels;
pub mod sheet;
