use rusqlite::Connection;

use crate::error::AppError;

const INIT_SQL: &str = include_str!("migrations/0001_init.sql");

pub fn ensure_schema(conn: &Connection) -> Result<(), AppError> {
    let table_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM sqlite_master WHERE type = 'table' AND name = 'blocks'",
        [],
        |row| row.get(0),
    )?;

    if table_count == 0 {
        conn.execute_batch(INIT_SQL)?;
    }

    Ok(())
}
