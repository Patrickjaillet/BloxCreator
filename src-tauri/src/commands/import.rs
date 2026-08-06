use rusqlite::Connection;
use tauri::State;

use crate::commands::blocks::infer_block_kind;
use crate::db::{repository, Db};
use crate::error::AppError;
use crate::hashing::compute_hash;
use crate::models::{
    DecomposedFragmentDto, DuplicateInfo, GenreDto, ImportParseError, ImportReport, NewBlockInput,
    NewBlockRequest,
};
use crate::parser::markdown_parser::parse_markdown;
use crate::parser::monaco_decomposer::decompose_monaco_content as decompose;
use crate::parser::normalize::normalize_glsl;

fn find_or_create_genre(
    conn: &Connection,
    name: &str,
    display_order: i64,
) -> Result<GenreDto, AppError> {
    if let Some(existing) = repository::find_genre_by_name(conn, name)? {
        return Ok(existing);
    }
    let id = repository::insert_genre(conn, name, display_order)?;
    Ok(GenreDto {
        id,
        name: name.to_string(),
        display_order,
    })
}

fn import_markdown_str(
    conn: &Connection,
    content: &str,
    source_label: &str,
) -> Result<ImportReport, AppError> {
    let parsed = parse_markdown(content);
    let mut report = ImportReport {
        total_found: parsed.blocks.len(),
        ..Default::default()
    };

    for err in parsed.errors {
        report.errors.push(ImportParseError {
            line: err.line,
            message: err.message,
        });
    }

    for block in parsed.blocks {
        let genre = find_or_create_genre(conn, &block.genre_name, block.genre_order)?;
        let code_normalized = normalize_glsl(&block.code_raw);
        let hash = compute_hash(&code_normalized);
        let block_kind = infer_block_kind(&block.code_raw);
        let name = block.name.clone();

        let new_block = NewBlockInput {
            hash,
            name,
            genre_id: genre.id,
            category_id: None,
            role: block.role,
            adaptation: block.adaptation,
            summary: block.summary,
            code_raw: block.code_raw,
            code_normalized,
            block_kind,
            tags: None,
            source_origin: "markdown_import".to_string(),
            source_file: Some(source_label.to_string()),
        };

        match repository::insert_block(conn, &new_block) {
            Ok(inserted) => report.inserted.push(inserted),
            Err(AppError::Duplicate { existing_id }) => report.duplicates.push(DuplicateInfo {
                attempted_name: block.name,
                existing_block_id: existing_id,
            }),
            Err(other) => report.errors.push(ImportParseError {
                line: 0,
                message: other.to_string(),
            }),
        }
    }

    Ok(report)
}

#[tauri::command]
pub fn import_markdown_file(db: State<Db>, path: String) -> Result<ImportReport, AppError> {
    let content = std::fs::read_to_string(&path)?;
    let conn = db.0.lock().unwrap();
    import_markdown_str(&conn, &content, &path)
}

#[tauri::command]
pub fn import_markdown_content(
    db: State<Db>,
    content: String,
    source_label: String,
) -> Result<ImportReport, AppError> {
    let conn = db.0.lock().unwrap();
    import_markdown_str(&conn, &content, &source_label)
}

#[tauri::command]
pub fn decompose_monaco_content(code: String) -> Vec<DecomposedFragmentDto> {
    decompose(&code)
        .into_iter()
        .map(|f| DecomposedFragmentDto {
            kind: f.kind.as_block_kind().to_string(),
            name: f.name,
            code_raw: f.code_raw,
        })
        .collect()
}

#[tauri::command]
pub fn confirm_fragment_import(
    db: State<Db>,
    fragments: Vec<NewBlockRequest>,
) -> Result<ImportReport, AppError> {
    let conn = db.0.lock().unwrap();
    let mut report = ImportReport {
        total_found: fragments.len(),
        ..Default::default()
    };

    for input in fragments {
        let code_normalized = normalize_glsl(&input.code_raw);
        let hash = compute_hash(&code_normalized);
        let block_kind = input
            .block_kind
            .clone()
            .unwrap_or_else(|| infer_block_kind(&input.code_raw));
        let name = input.name.clone();

        let new_block = NewBlockInput {
            hash,
            name: input.name,
            genre_id: input.genre_id,
            category_id: input.category_id,
            role: input.role,
            adaptation: input.adaptation,
            summary: input.summary,
            code_raw: input.code_raw,
            code_normalized,
            block_kind,
            tags: input.tags,
            source_origin: input.source_origin,
            source_file: input.source_file,
        };

        match repository::insert_block(&conn, &new_block) {
            Ok(inserted) => report.inserted.push(inserted),
            Err(AppError::Duplicate { existing_id }) => report.duplicates.push(DuplicateInfo {
                attempted_name: name,
                existing_block_id: existing_id,
            }),
            Err(other) => report.errors.push(ImportParseError {
                line: 0,
                message: other.to_string(),
            }),
        }
    }

    Ok(report)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;

    fn setup_conn() -> Connection {
        let conn = Connection::open_in_memory().unwrap();
        db::schema::ensure_schema(&conn).unwrap();
        conn
    }

    const SEED: &str =
        include_str!("../../../seed/Reusable_Blocks_Library_Volumetric_Shaders.md");

    #[test]
    fn imports_all_27_seed_blocks_with_zero_duplicates_on_first_pass() {
        let conn = setup_conn();
        let report = import_markdown_str(&conn, SEED, "seed").unwrap();
        assert_eq!(report.total_found, 27);
        assert_eq!(report.inserted.len(), 27);
        assert_eq!(report.duplicates.len(), 0);
        assert_eq!(report.errors.len(), 0);

        let genres = repository::list_genres(&conn).unwrap();
        assert_eq!(genres.len(), 6);
    }

    #[test]
    fn reimporting_the_same_content_reports_27_duplicates() {
        let conn = setup_conn();
        import_markdown_str(&conn, SEED, "seed").unwrap();
        let second = import_markdown_str(&conn, SEED, "seed").unwrap();
        assert_eq!(second.inserted.len(), 0);
        assert_eq!(second.duplicates.len(), 27);
    }

    #[test]
    fn reuses_existing_genre_instead_of_duplicating_it() {
        let conn = setup_conn();
        import_markdown_str(&conn, SEED, "seed").unwrap();
        let genres_after_first = repository::list_genres(&conn).unwrap().len();
        // A second distinct block under an existing genre should not create a new genre row.
        let extra = "# 1. Camera & Ray Projection\n\n### 1.6 — Extra Block\n\n```glsl\nfloat extra = 42.0;\n```\n\n**Role:** r\n\n**Adaptation:** a\n\n**Summary:** s\n";
        import_markdown_str(&conn, extra, "extra").unwrap();
        let genres_after_second = repository::list_genres(&conn).unwrap().len();
        assert_eq!(genres_after_first, genres_after_second);
    }

    #[test]
    fn decomposes_and_reports_kinds_as_schema_strings() {
        let fragments = decompose_monaco_content(
            "void mainImage(out vec4 fragColor, in vec2 fragCoord)\n{\n    fragColor = vec4(1.0);\n}"
                .to_string(),
        );
        assert_eq!(fragments.len(), 1);
        assert_eq!(fragments[0].kind, "main_body");
        assert_eq!(fragments[0].name.as_deref(), Some("mainImage"));
    }
}
