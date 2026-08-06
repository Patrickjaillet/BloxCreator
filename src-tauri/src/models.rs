use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize)]
pub struct GenreDto {
    pub id: i64,
    pub name: String,
    pub display_order: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct CategoryDto {
    pub id: i64,
    pub genre_id: i64,
    pub name: String,
    pub display_order: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct BlockDto {
    pub id: i64,
    pub hash: String,
    pub name: String,
    pub genre_id: i64,
    pub category_id: Option<i64>,
    pub role: String,
    pub adaptation: String,
    pub summary: String,
    pub code_raw: String,
    pub code_normalized: String,
    pub block_kind: String,
    pub tags: Option<String>,
    pub source_origin: String,
    pub source_file: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct NewBlockInput {
    pub hash: String,
    pub name: String,
    pub genre_id: i64,
    pub category_id: Option<i64>,
    pub role: String,
    pub adaptation: String,
    pub summary: String,
    pub code_raw: String,
    pub code_normalized: String,
    pub block_kind: String,
    pub tags: Option<String>,
    pub source_origin: String,
    pub source_file: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct ShaderSummaryDto {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ShaderDto {
    pub id: i64,
    pub name: String,
    pub description: Option<String>,
    pub code_assembled: String,
    pub hash: String,
    pub block_ids_ordered: Vec<i64>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone)]
pub struct NewShaderInput {
    pub name: String,
    pub description: Option<String>,
    pub code_assembled: String,
    pub hash: String,
    pub block_ids_ordered: Vec<i64>,
}

#[derive(Debug, Clone, Serialize)]
pub struct GenreTreeDto {
    pub id: i64,
    pub name: String,
    pub display_order: i64,
    pub categories: Vec<CategoryDto>,
}

#[derive(Debug, Clone, Default, Deserialize)]
pub struct BlockFilter {
    pub genre_id: Option<i64>,
    pub category_id: Option<i64>,
    pub block_kind: Option<String>,
    pub tag: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct NewBlockRequest {
    pub name: String,
    pub genre_id: i64,
    pub category_id: Option<i64>,
    pub role: String,
    pub adaptation: String,
    pub summary: String,
    pub code_raw: String,
    pub block_kind: Option<String>,
    pub tags: Option<String>,
    pub source_origin: String,
    pub source_file: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
pub struct UpdateBlockInput {
    pub name: Option<String>,
    pub genre_id: Option<i64>,
    pub category_id: Option<i64>,
    pub role: Option<String>,
    pub adaptation: Option<String>,
    pub summary: Option<String>,
    pub tags: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DuplicateInfo {
    pub attempted_name: String,
    pub existing_block_id: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct ImportParseError {
    pub line: usize,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Default)]
pub struct ImportReport {
    pub total_found: usize,
    pub inserted: Vec<BlockDto>,
    pub duplicates: Vec<DuplicateInfo>,
    pub errors: Vec<ImportParseError>,
}

#[derive(Debug, Clone, Serialize)]
pub struct DecomposedFragmentDto {
    pub kind: String,
    pub name: Option<String>,
    pub code_raw: String,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
pub struct FunctionConflict {
    pub name: String,
    pub block_a: i64,
    pub block_b: i64,
}

#[derive(Debug, Clone, Serialize)]
pub struct AssembleResult {
    pub code: String,
    pub conflicts: Vec<FunctionConflict>,
}
