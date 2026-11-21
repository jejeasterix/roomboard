//! Écrivain des copies `.iwb` et `.ubz` (C13, D17 à D19) : corps écrits par la tâche T9 du plan.
use super::{BoardError, BoardList};

pub fn write_iwb(_list: &BoardList) -> Result<String, BoardError> {
    Err(BoardError::BadList("écrivain non branché".to_string()))
}

pub fn write_ubz_pages(_list: &BoardList) -> Result<Vec<String>, BoardError> {
    Err(BoardError::BadList("écrivain non branché".to_string()))
}

pub fn ubz_metadata(_pages: usize) -> String {
    String::new()
}
