use once_cell::sync::Lazy;
use regex::Regex;
use std::collections::HashMap;
use tauri::State;

use crate::db::{repository, Db};
use crate::error::AppError;
use crate::hashing::compute_hash;
use crate::models::{AssembleResult, FunctionConflict, NewShaderInput, ShaderDto, ShaderSummaryDto};
use crate::parser::normalize::normalize_glsl;

static FUNCTION_NAME_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?:vec[234]|float|int|bool|mat[234]|void)\s+(\w+)\s*\(").unwrap()
});

pub fn assemble_code(entries: &[(i64, String)]) -> String {
    entries
        .iter()
        .map(|(_, code)| code.trim())
        .collect::<Vec<_>>()
        .join("\n\n")
}

pub fn detect_function_conflicts(entries: &[(i64, String)]) -> Vec<FunctionConflict> {
    let mut first_seen: HashMap<String, i64> = HashMap::new();
    let mut conflicts = Vec::new();

    for (block_id, code) in entries {
        for caps in FUNCTION_NAME_RE.captures_iter(code) {
            let name = caps[1].to_string();
            match first_seen.get(&name) {
                Some(&first_block_id) if first_block_id != *block_id => {
                    conflicts.push(FunctionConflict {
                        name,
                        block_a: first_block_id,
                        block_b: *block_id,
                    });
                }
                Some(_) => {}
                None => {
                    first_seen.insert(name, *block_id);
                }
            }
        }
    }

    conflicts
}

#[tauri::command]
pub fn assemble_shader_preview(
    db: State<Db>,
    block_ids_ordered: Vec<i64>,
) -> Result<AssembleResult, AppError> {
    let conn = db.0.lock().unwrap();
    let mut entries = Vec::with_capacity(block_ids_ordered.len());
    for id in block_ids_ordered {
        let block = repository::get_block(&conn, id)?
            .ok_or_else(|| AppError::Database(format!("block {id} not found")))?;
        entries.push((block.id, block.code_raw));
    }

    Ok(AssembleResult {
        code: assemble_code(&entries),
        conflicts: detect_function_conflicts(&entries),
    })
}

#[tauri::command]
pub fn save_shader(
    db: State<Db>,
    name: String,
    code: String,
    block_ids_ordered: Vec<i64>,
) -> Result<i64, AppError> {
    let conn = db.0.lock().unwrap();
    let hash = compute_hash(&normalize_glsl(&code));
    let input = NewShaderInput {
        name,
        description: None,
        code_assembled: code,
        hash,
        block_ids_ordered,
    };
    repository::insert_shader(&conn, &input)
}

#[tauri::command]
pub fn list_shaders(db: State<Db>) -> Result<Vec<ShaderSummaryDto>, AppError> {
    let conn = db.0.lock().unwrap();
    repository::list_shaders(&conn)
}

#[tauri::command]
pub fn load_shader(db: State<Db>, id: i64) -> Result<ShaderDto, AppError> {
    let conn = db.0.lock().unwrap();
    repository::get_shader(&conn, id)?.ok_or_else(|| AppError::Database(format!("shader {id} not found")))
}

#[tauri::command]
pub fn delete_shader(db: State<Db>, id: i64) -> Result<(), AppError> {
    let conn = db.0.lock().unwrap();
    repository::delete_shader(&conn, id)
}

#[tauri::command]
pub fn export_shader_as_glsl(db: State<Db>, id: i64, target_path: String) -> Result<(), AppError> {
    let conn = db.0.lock().unwrap();
    let shader = repository::get_shader(&conn, id)?
        .ok_or_else(|| AppError::Database(format!("shader {id} not found")))?;
    std::fs::write(&target_path, shader.code_assembled)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn assembles_code_in_given_order_with_blank_line_separator() {
        let entries = vec![
            (1, "float a = 1.0;".to_string()),
            (2, "float b = 2.0;".to_string()),
        ];
        assert_eq!(assemble_code(&entries), "float a = 1.0;\n\nfloat b = 2.0;");
    }

    #[test]
    fn detects_function_name_conflict_across_blocks() {
        let entries = vec![
            (1, "float smoothMin(float a, float b) { return a; }".to_string()),
            (2, "vec3 other() { return vec3(0.0); }".to_string()),
            (3, "float smoothMin(float a, float b) { return b; }".to_string()),
        ];
        let conflicts = detect_function_conflicts(&entries);
        assert_eq!(
            conflicts,
            vec![FunctionConflict {
                name: "smoothMin".to_string(),
                block_a: 1,
                block_b: 3,
            }]
        );
    }

    #[test]
    fn does_not_flag_a_function_declared_only_once() {
        let entries = vec![
            (1, "float smoothMin(float a, float b) { return a; }".to_string()),
            (2, "vec3 other() { return vec3(0.0); }".to_string()),
        ];
        assert_eq!(detect_function_conflicts(&entries), Vec::new());
    }

    #[test]
    fn ignores_constructor_calls_that_are_not_declarations() {
        let entries = vec![(1, "vec3 c = vec3(1.0, 2.0, 3.0);".to_string())];
        assert_eq!(detect_function_conflicts(&entries), Vec::new());
    }
}
