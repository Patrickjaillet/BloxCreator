use serde::Serialize;

#[derive(thiserror::Error, Debug, Serialize)]
pub enum AppError {
    #[error("database error: {0}")]
    Database(String),
    #[error("parse error at line {line}: {message}")]
    Parse { line: usize, message: String },
    #[error("duplicate hash: block already exists (id {existing_id})")]
    Duplicate { existing_id: i64 },
    #[error("io error: {0}")]
    Io(String),
    #[error("function name conflict: {name} defined in blocks {block_a} and {block_b}")]
    FunctionConflict {
        name: String,
        block_a: i64,
        block_b: i64,
    },
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::Database(err.to_string())
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Io(err.to_string())
    }
}

impl From<tauri::Error> for AppError {
    fn from(err: tauri::Error) -> Self {
        AppError::Io(err.to_string())
    }
}
