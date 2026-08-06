use regex::Regex;
use tauri::State;

use crate::db::{repository, Db};
use crate::error::AppError;
use crate::hashing::compute_hash;
use crate::models::{
    BlockDto, BlockFilter, GenreTreeDto, NewBlockInput, NewBlockRequest, UpdateBlockInput,
};
use crate::parser::monaco_decomposer::decompose_monaco_content;
use crate::parser::normalize::normalize_glsl;

pub fn infer_block_kind(code_raw: &str) -> String {
    let fragments = decompose_monaco_content(code_raw);
    if fragments.len() == 1 && fragments[0].code_raw.trim() == code_raw.trim() {
        fragments[0].kind.as_block_kind().to_string()
    } else {
        "snippet".to_string()
    }
}

pub fn rename_function(code: &str, old_name: &str, new_name: &str) -> String {
    let pattern = format!(r"\b{}\b", regex::escape(old_name));
    let re = Regex::new(&pattern).expect("escaped literal is always a valid regex");
    re.replace_all(code, new_name).to_string()
}

fn matches_filter(block: &BlockDto, filter: &BlockFilter) -> bool {
    if let Some(genre_id) = filter.genre_id {
        if block.genre_id != genre_id {
            return false;
        }
    }
    if let Some(category_id) = filter.category_id {
        if block.category_id != Some(category_id) {
            return false;
        }
    }
    if let Some(block_kind) = &filter.block_kind {
        if &block.block_kind != block_kind {
            return false;
        }
    }
    if let Some(tag) = &filter.tag {
        let has_tag = block
            .tags
            .as_deref()
            .map(|tags| tags.split(',').any(|t| t.trim() == tag))
            .unwrap_or(false);
        if !has_tag {
            return false;
        }
    }
    true
}

#[tauri::command]
pub fn get_genres_and_categories(db: State<Db>) -> Result<Vec<GenreTreeDto>, AppError> {
    let conn = db.0.lock().unwrap();
    let genres = repository::list_genres(&conn)?;
    genres
        .into_iter()
        .map(|genre| {
            let categories = repository::list_categories(&conn, genre.id)?;
            Ok(GenreTreeDto {
                id: genre.id,
                name: genre.name,
                display_order: genre.display_order,
                categories,
            })
        })
        .collect()
}

#[tauri::command]
pub fn get_blocks(db: State<Db>, filter: BlockFilter) -> Result<Vec<BlockDto>, AppError> {
    let conn = db.0.lock().unwrap();
    let blocks = repository::list_blocks(&conn)?;
    Ok(blocks
        .into_iter()
        .filter(|block| matches_filter(block, &filter))
        .collect())
}

#[tauri::command]
pub fn search_blocks(db: State<Db>, query: String) -> Result<Vec<BlockDto>, AppError> {
    let conn = db.0.lock().unwrap();
    repository::search_blocks(&conn, &query)
}

#[tauri::command]
pub fn create_block(db: State<Db>, input: NewBlockRequest) -> Result<BlockDto, AppError> {
    let conn = db.0.lock().unwrap();
    let code_normalized = normalize_glsl(&input.code_raw);
    let hash = compute_hash(&code_normalized);
    let block_kind = input
        .block_kind
        .unwrap_or_else(|| infer_block_kind(&input.code_raw));

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

    repository::insert_block(&conn, &new_block)
}

#[tauri::command]
pub fn update_block(
    db: State<Db>,
    id: i64,
    input: UpdateBlockInput,
) -> Result<BlockDto, AppError> {
    let conn = db.0.lock().unwrap();
    repository::update_block(&conn, id, &input)
}

#[tauri::command]
pub fn delete_block(db: State<Db>, id: i64) -> Result<(), AppError> {
    let conn = db.0.lock().unwrap();
    repository::delete_block(&conn, id)
}

#[tauri::command]
pub fn compute_hash_preview(code: String) -> String {
    compute_hash(&normalize_glsl(&code))
}

#[tauri::command]
pub fn check_duplicate(db: State<Db>, code: String) -> Result<Option<BlockDto>, AppError> {
    let conn = db.0.lock().unwrap();
    let hash = compute_hash(&normalize_glsl(&code));
    repository::find_block_by_hash(&conn, &hash)
}

#[tauri::command]
pub fn rename_function_in_block(
    db: State<Db>,
    block_id: i64,
    old_name: String,
    new_name: String,
) -> Result<String, AppError> {
    let conn = db.0.lock().unwrap();
    let block = repository::get_block(&conn, block_id)?
        .ok_or_else(|| AppError::Database(format!("block {block_id} not found")))?;
    Ok(rename_function(&block.code_raw, &old_name, &new_name))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn infers_function_kind_for_whole_function_body() {
        let code = "vec3 hsv(float h, float s, float v)\n{\n    return vec3(h, s, v);\n}";
        assert_eq!(infer_block_kind(code), "function");
    }

    #[test]
    fn infers_global_declaration_kind() {
        assert_eq!(infer_block_kind("const float PI = 3.14159;"), "global_declaration");
    }

    #[test]
    fn falls_back_to_snippet_for_mixed_or_partial_content() {
        let code = "p = q += (FC.rgb / r.y - 0.5) * e;";
        assert_eq!(infer_block_kind(code), "snippet");
    }

    #[test]
    fn renames_whole_word_occurrences_only() {
        let code = "float smoothMin(float a, float b) { return min(a, b); }\nfloat x = smoothMin(1.0, 2.0) + smoothMinExtra;";
        let renamed = rename_function(code, "smoothMin", "smoothMin2");
        assert!(renamed.contains("float smoothMin2(float a, float b)"));
        assert!(renamed.contains("smoothMin2(1.0, 2.0)"));
        // must not touch the unrelated identifier that merely contains the same prefix
        assert!(renamed.contains("smoothMinExtra"));
        assert!(!renamed.contains("smoothMinExtra2"));
    }
}
