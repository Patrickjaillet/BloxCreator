pub mod repository;
pub mod schema;

use std::path::Path;
use std::sync::Mutex;

use rusqlite::Connection;

use crate::error::AppError;

pub struct Db(pub Mutex<Connection>);

pub fn init_connection(db_path: &Path) -> Result<Connection, AppError> {
    let conn = Connection::open(db_path)?;
    conn.pragma_update(None, "foreign_keys", true)?;
    schema::ensure_schema(&conn)?;
    Ok(conn)
}
