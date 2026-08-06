use serde::Serialize;

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
