use rusqlite::{params, Connection, OptionalExtension};

use crate::error::AppError;
use crate::models::{
    BlockDto, CategoryDto, GenreDto, NewBlockInput, NewShaderInput, ShaderDto, ShaderSummaryDto,
    UpdateBlockInput,
};

fn map_block(row: &rusqlite::Row) -> rusqlite::Result<BlockDto> {
    Ok(BlockDto {
        id: row.get("id")?,
        hash: row.get("hash")?,
        name: row.get("name")?,
        genre_id: row.get("genre_id")?,
        category_id: row.get("category_id")?,
        role: row.get("role")?,
        adaptation: row.get("adaptation")?,
        summary: row.get("summary")?,
        code_raw: row.get("code_raw")?,
        code_normalized: row.get("code_normalized")?,
        block_kind: row.get("block_kind")?,
        tags: row.get("tags")?,
        source_origin: row.get("source_origin")?,
        source_file: row.get("source_file")?,
        created_at: row.get("created_at")?,
        updated_at: row.get("updated_at")?,
    })
}

const BLOCK_COLUMNS: &str = "id, hash, name, genre_id, category_id, role, adaptation, summary, \
    code_raw, code_normalized, block_kind, tags, source_origin, source_file, created_at, updated_at";

// --- Genres ---

pub fn insert_genre(conn: &Connection, name: &str, display_order: i64) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO genres (name, display_order) VALUES (?1, ?2)",
        params![name, display_order],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn list_genres(conn: &Connection) -> Result<Vec<GenreDto>, AppError> {
    let mut stmt =
        conn.prepare("SELECT id, name, display_order FROM genres ORDER BY display_order")?;
    let rows = stmt.query_map([], |row| {
        Ok(GenreDto {
            id: row.get(0)?,
            name: row.get(1)?,
            display_order: row.get(2)?,
        })
    })?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(AppError::from)
}

pub fn find_genre_by_name(conn: &Connection, name: &str) -> Result<Option<GenreDto>, AppError> {
    conn.query_row(
        "SELECT id, name, display_order FROM genres WHERE name = ?1",
        params![name],
        |row| {
            Ok(GenreDto {
                id: row.get(0)?,
                name: row.get(1)?,
                display_order: row.get(2)?,
            })
        },
    )
    .optional()
    .map_err(AppError::from)
}

// --- Categories ---

pub fn insert_category(
    conn: &Connection,
    genre_id: i64,
    name: &str,
    display_order: i64,
) -> Result<i64, AppError> {
    conn.execute(
        "INSERT INTO categories (genre_id, name, display_order) VALUES (?1, ?2, ?3)",
        params![genre_id, name, display_order],
    )?;
    Ok(conn.last_insert_rowid())
}

pub fn list_categories(conn: &Connection, genre_id: i64) -> Result<Vec<CategoryDto>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, genre_id, name, display_order FROM categories \
         WHERE genre_id = ?1 ORDER BY display_order",
    )?;
    let rows = stmt.query_map(params![genre_id], |row| {
        Ok(CategoryDto {
            id: row.get(0)?,
            genre_id: row.get(1)?,
            name: row.get(2)?,
            display_order: row.get(3)?,
        })
    })?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(AppError::from)
}

pub fn find_category_by_name(
    conn: &Connection,
    genre_id: i64,
    name: &str,
) -> Result<Option<CategoryDto>, AppError> {
    conn.query_row(
        "SELECT id, genre_id, name, display_order FROM categories \
         WHERE genre_id = ?1 AND name = ?2",
        params![genre_id, name],
        |row| {
            Ok(CategoryDto {
                id: row.get(0)?,
                genre_id: row.get(1)?,
                name: row.get(2)?,
                display_order: row.get(3)?,
            })
        },
    )
    .optional()
    .map_err(AppError::from)
}

// --- Blocks ---

pub fn find_block_by_hash(conn: &Connection, hash: &str) -> Result<Option<BlockDto>, AppError> {
    let sql = format!("SELECT {BLOCK_COLUMNS} FROM blocks WHERE hash = ?1");
    conn.query_row(&sql, params![hash], map_block)
        .optional()
        .map_err(AppError::from)
}

pub fn get_block(conn: &Connection, id: i64) -> Result<Option<BlockDto>, AppError> {
    let sql = format!("SELECT {BLOCK_COLUMNS} FROM blocks WHERE id = ?1");
    conn.query_row(&sql, params![id], map_block)
        .optional()
        .map_err(AppError::from)
}

pub fn list_blocks(conn: &Connection) -> Result<Vec<BlockDto>, AppError> {
    let sql = format!("SELECT {BLOCK_COLUMNS} FROM blocks ORDER BY id");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], map_block)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(AppError::from)
}

pub fn insert_block(conn: &Connection, input: &NewBlockInput) -> Result<BlockDto, AppError> {
    if let Some(existing) = find_block_by_hash(conn, &input.hash)? {
        return Err(AppError::Duplicate {
            existing_id: existing.id,
        });
    }

    conn.execute(
        "INSERT INTO blocks (hash, name, genre_id, category_id, role, adaptation, summary, \
         code_raw, code_normalized, block_kind, tags, source_origin, source_file) \
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        params![
            input.hash,
            input.name,
            input.genre_id,
            input.category_id,
            input.role,
            input.adaptation,
            input.summary,
            input.code_raw,
            input.code_normalized,
            input.block_kind,
            input.tags,
            input.source_origin,
            input.source_file,
        ],
    )?;

    let id = conn.last_insert_rowid();
    get_block(conn, id)?.ok_or_else(|| AppError::Database("block insert did not persist".into()))
}

pub fn delete_block(conn: &Connection, id: i64) -> Result<(), AppError> {
    conn.execute("DELETE FROM blocks WHERE id = ?1", params![id])?;
    Ok(())
}

pub fn update_block(
    conn: &Connection,
    id: i64,
    patch: &UpdateBlockInput,
) -> Result<BlockDto, AppError> {
    let existing =
        get_block(conn, id)?.ok_or_else(|| AppError::Database(format!("block {id} not found")))?;

    let name = patch.name.clone().unwrap_or(existing.name);
    let genre_id = patch.genre_id.unwrap_or(existing.genre_id);
    let category_id = patch.category_id.or(existing.category_id);
    let role = patch.role.clone().unwrap_or(existing.role);
    let adaptation = patch.adaptation.clone().unwrap_or(existing.adaptation);
    let summary = patch.summary.clone().unwrap_or(existing.summary);
    let tags = patch.tags.clone().or(existing.tags);

    conn.execute(
        "UPDATE blocks SET name = ?1, genre_id = ?2, category_id = ?3, role = ?4, \
         adaptation = ?5, summary = ?6, tags = ?7 WHERE id = ?8",
        params![name, genre_id, category_id, role, adaptation, summary, tags, id],
    )?;

    get_block(conn, id)?.ok_or_else(|| AppError::Database("block update did not persist".into()))
}

pub fn search_blocks(conn: &Connection, query: &str) -> Result<Vec<BlockDto>, AppError> {
    if query.trim().is_empty() {
        return Ok(Vec::new());
    }

    let sql = format!(
        "SELECT b.id, b.hash, b.name, b.genre_id, b.category_id, b.role, b.adaptation, \
         b.summary, b.code_raw, b.code_normalized, b.block_kind, b.tags, b.source_origin, \
         b.source_file, b.created_at, b.updated_at \
         FROM blocks b JOIN blocks_fts f ON f.rowid = b.id \
         WHERE blocks_fts MATCH ?1 ORDER BY rank"
    );
    let mut stmt = conn.prepare(&sql)?;
    let query_with_wildcard = format!("{query}*");
    let rows = stmt.query_map(params![query_with_wildcard], map_block)?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(AppError::from)
}

// --- Shaders ---

pub fn insert_shader(conn: &Connection, input: &NewShaderInput) -> Result<i64, AppError> {
    if let Some(existing) = find_shader_by_hash(conn, &input.hash)? {
        return Err(AppError::Duplicate {
            existing_id: existing.id,
        });
    }

    conn.execute(
        "INSERT INTO shaders (name, description, code_assembled, hash) VALUES (?1, ?2, ?3, ?4)",
        params![
            input.name,
            input.description,
            input.code_assembled,
            input.hash
        ],
    )?;
    let shader_id = conn.last_insert_rowid();

    for (position, block_id) in input.block_ids_ordered.iter().enumerate() {
        conn.execute(
            "INSERT INTO shader_blocks (shader_id, block_id, position) VALUES (?1, ?2, ?3)",
            params![shader_id, block_id, position as i64],
        )?;
    }

    Ok(shader_id)
}

pub fn find_shader_by_hash(
    conn: &Connection,
    hash: &str,
) -> Result<Option<ShaderSummaryDto>, AppError> {
    conn.query_row(
        "SELECT id, name, description, created_at, updated_at FROM shaders WHERE hash = ?1",
        params![hash],
        |row| {
            Ok(ShaderSummaryDto {
                id: row.get(0)?,
                name: row.get(1)?,
                description: row.get(2)?,
                created_at: row.get(3)?,
                updated_at: row.get(4)?,
            })
        },
    )
    .optional()
    .map_err(AppError::from)
}

pub fn list_shaders(conn: &Connection) -> Result<Vec<ShaderSummaryDto>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, description, created_at, updated_at FROM shaders ORDER BY updated_at DESC",
    )?;
    let rows = stmt.query_map([], |row| {
        Ok(ShaderSummaryDto {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            created_at: row.get(3)?,
            updated_at: row.get(4)?,
        })
    })?;
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(AppError::from)
}

pub fn get_shader(conn: &Connection, id: i64) -> Result<Option<ShaderDto>, AppError> {
    let shader = conn
        .query_row(
            "SELECT id, name, description, code_assembled, hash, created_at, updated_at \
             FROM shaders WHERE id = ?1",
            params![id],
            |row| {
                Ok((
                    row.get::<_, i64>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, Option<String>>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, String>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, String>(6)?,
                ))
            },
        )
        .optional()?;

    let Some((id, name, description, code_assembled, hash, created_at, updated_at)) = shader
    else {
        return Ok(None);
    };

    let mut stmt = conn.prepare(
        "SELECT block_id FROM shader_blocks WHERE shader_id = ?1 ORDER BY position",
    )?;
    let block_ids_ordered = stmt
        .query_map(params![id], |row| row.get::<_, i64>(0))?
        .collect::<rusqlite::Result<Vec<_>>>()?;

    Ok(Some(ShaderDto {
        id,
        name,
        description,
        code_assembled,
        hash,
        block_ids_ordered,
        created_at,
        updated_at,
    }))
}

pub fn delete_shader(conn: &Connection, id: i64) -> Result<(), AppError> {
    conn.execute("DELETE FROM shaders WHERE id = ?1", params![id])?;
    Ok(())
}
