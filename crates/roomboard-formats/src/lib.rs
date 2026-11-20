//! Formats de RoomBoard hors du module de l'encre (U4, DAU1, K1) : conteneur `.roomboard` avec ses assets ; première
//! feuille d'un classeur `.xlsx` en valeurs (C10b, U35). Rust pur, testé en natif ; servis par le second module Wasm.
pub mod container;
pub mod sheet;
