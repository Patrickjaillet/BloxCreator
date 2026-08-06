use once_cell::sync::Lazy;
use regex::Regex;

#[derive(Debug, Clone, PartialEq)]
pub struct ParsedBlock {
    pub genre_name: String,
    pub genre_order: i64,
    pub order_label: String,
    pub name: String,
    pub code_raw: String,
    pub role: String,
    pub adaptation: String,
    pub summary: String,
}

#[derive(Debug, Clone, PartialEq)]
pub struct MarkdownParseError {
    pub line: usize,
    pub message: String,
}

#[derive(Debug, Default)]
pub struct MarkdownParseResult {
    pub blocks: Vec<ParsedBlock>,
    pub errors: Vec<MarkdownParseError>,
}

static GENRE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"^#\s+(\d+)\.\s+(.+?)\s*$").unwrap());
static BLOCK_TITLE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^###\s+([\d.]+)\s+—\s+(.+?)\s*$").unwrap());
static ROLE_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\*\*(?:Role|Rôle)\s*:\*\*\s*(.*)$").unwrap());
static ADAPTATION_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\*\*Adaptation\s*:\*\*\s*(.*)$").unwrap());
static SUMMARY_RE: Lazy<Regex> =
    Lazy::new(|| Regex::new(r"^\*\*(?:Summary|Résumé)\s*:\*\*\s*(.*)$").unwrap());

#[derive(Debug, Clone, Copy, PartialEq)]
enum State {
    AwaitingGenre,
    AwaitingBlock,
    AwaitingCode,
    AwaitingMeta,
}

struct PendingBlock {
    genre_name: String,
    genre_order: i64,
    order_label: String,
    name: String,
    code_raw: String,
    role: Option<String>,
    adaptation: Option<String>,
}

pub fn parse_markdown(content: &str) -> MarkdownParseResult {
    let lines: Vec<&str> = content.lines().collect();
    let mut result = MarkdownParseResult::default();

    let mut state = State::AwaitingGenre;
    let mut current_genre_name: Option<String> = None;
    let mut current_genre_order: i64 = 0;
    let mut pending: Option<PendingBlock> = None;

    let mut i = 0;
    while i < lines.len() {
        let line = lines[i];
        let line_number = i + 1;

        if let Some(caps) = GENRE_RE.captures(line) {
            current_genre_order = caps[1].parse().unwrap_or(0);
            current_genre_name = Some(caps[2].trim().to_string());
            state = State::AwaitingBlock;
            i += 1;
            continue;
        }

        if let Some(caps) = BLOCK_TITLE_RE.captures(line) {
            let Some(genre_name) = current_genre_name.clone() else {
                result.errors.push(MarkdownParseError {
                    line: line_number,
                    message: "block title found before any genre heading".to_string(),
                });
                i += 1;
                continue;
            };
            pending = Some(PendingBlock {
                genre_name,
                genre_order: current_genre_order,
                order_label: caps[1].to_string(),
                name: caps[2].trim().to_string(),
                code_raw: String::new(),
                role: None,
                adaptation: None,
            });
            state = State::AwaitingCode;
            i += 1;
            continue;
        }

        match state {
            State::AwaitingCode => {
                if line.trim() == "```glsl" {
                    let mut code_lines: Vec<&str> = Vec::new();
                    i += 1;
                    let mut closed = false;
                    while i < lines.len() {
                        if lines[i].trim() == "```" {
                            closed = true;
                            i += 1;
                            break;
                        }
                        code_lines.push(lines[i]);
                        i += 1;
                    }
                    if !closed {
                        result.errors.push(MarkdownParseError {
                            line: line_number,
                            message: "unterminated glsl code fence".to_string(),
                        });
                    }
                    if let Some(block) = pending.as_mut() {
                        block.code_raw = code_lines.join("\n");
                    }
                    state = State::AwaitingMeta;
                    continue;
                }
                i += 1;
            }
            State::AwaitingMeta => {
                if let Some(caps) = ROLE_RE.captures(line) {
                    if let Some(block) = pending.as_mut() {
                        block.role = Some(caps[1].trim().to_string());
                    }
                } else if let Some(caps) = ADAPTATION_RE.captures(line) {
                    if let Some(block) = pending.as_mut() {
                        block.adaptation = Some(caps[1].trim().to_string());
                    }
                } else if let Some(caps) = SUMMARY_RE.captures(line) {
                    let summary = caps[1].trim().to_string();
                    if let Some(block) = pending.take() {
                        match (block.role, block.adaptation) {
                            (Some(role), Some(adaptation)) => {
                                result.blocks.push(ParsedBlock {
                                    genre_name: block.genre_name,
                                    genre_order: block.genre_order,
                                    order_label: block.order_label,
                                    name: block.name,
                                    code_raw: block.code_raw,
                                    role,
                                    adaptation,
                                    summary,
                                });
                            }
                            _ => {
                                result.errors.push(MarkdownParseError {
                                    line: line_number,
                                    message: format!(
                                        "block '{}' is missing Role or Adaptation before Summary",
                                        block.name
                                    ),
                                });
                            }
                        }
                    }
                    state = State::AwaitingBlock;
                }
                i += 1;
            }
            State::AwaitingGenre | State::AwaitingBlock => {
                i += 1;
            }
        }
    }

    result
}

#[cfg(test)]
mod tests {
    use super::*;

    const SEED: &str =
        include_str!("../../../seed/Reusable_Blocks_Library_Volumetric_Shaders.md");

    #[test]
    fn parses_all_27_seed_blocks_with_no_errors() {
        let result = parse_markdown(SEED);
        assert_eq!(result.errors, Vec::new());
        assert_eq!(result.blocks.len(), 27);
    }

    #[test]
    fn parses_6_distinct_genres_in_order() {
        let result = parse_markdown(SEED);
        let mut genres: Vec<(i64, String)> = result
            .blocks
            .iter()
            .map(|b| (b.genre_order, b.genre_name.clone()))
            .collect();
        genres.dedup();
        assert_eq!(genres.len(), 6);
        assert_eq!(genres[0], (1, "Camera & Ray Projection".to_string()));
        assert_eq!(
            genres[5],
            (6, "Volumetric Accumulation & Colorimetry".to_string())
        );
    }

    #[test]
    fn extracts_first_block_metadata_correctly() {
        let result = parse_markdown(SEED);
        let first = &result.blocks[0];
        assert_eq!(first.order_label, "1.1");
        assert_eq!(first.name, "Centered Projection with Oscillating Zoom");
        assert!(first.code_raw.contains("normalizedScreenCoordinates"));
        assert!(first.role.starts_with("Transforms 2D screen pixel coordinates"));
        assert!(first.adaptation.starts_with("Changing the multiplier 9.0"));
        assert_eq!(
            first.summary,
            "Basic camera setup with a zoom that \"breathes\" over time via the cosine."
        );
    }

    #[test]
    fn extracts_last_block_with_named_function() {
        let result = parse_markdown(SEED);
        let last = &result.blocks[26];
        assert_eq!(last.order_label, "6.5");
        assert_eq!(last.name, "Dedicated HSV Function + Colored Accumulation");
        assert!(last.code_raw.contains("vec3 hsv(float h, float s, float v)"));
    }

    #[test]
    fn every_block_has_non_empty_fields() {
        let result = parse_markdown(SEED);
        for block in &result.blocks {
            assert!(!block.name.is_empty());
            assert!(!block.code_raw.trim().is_empty());
            assert!(!block.role.is_empty());
            assert!(!block.adaptation.is_empty());
            assert!(!block.summary.is_empty());
        }
    }

    #[test]
    fn reports_error_for_block_title_before_any_genre() {
        let content = "### 1.1 — Orphan Block\n\n```glsl\nfloat a = 1.0;\n```\n\n**Role:** r\n\n**Adaptation:** a\n\n**Summary:** s\n";
        let result = parse_markdown(content);
        assert_eq!(result.blocks.len(), 0);
        assert_eq!(result.errors.len(), 1);
        assert_eq!(result.errors[0].line, 1);
    }

    #[test]
    fn reports_error_for_unterminated_code_fence() {
        let content = "# 1. Genre\n\n### 1.1 — Title\n\n```glsl\nfloat a = 1.0;\n";
        let result = parse_markdown(content);
        assert_eq!(result.blocks.len(), 0);
        assert_eq!(result.errors.len(), 1);
        assert!(result.errors[0].message.contains("unterminated"));
    }

    #[test]
    fn supports_french_role_adaptation_summary_labels() {
        let content = "# 1. Genre\n\n### 1.1 — Titre\n\n```glsl\nfloat a = 1.0;\n```\n\n**Rôle :** fait le calcul\n\n**Adaptation:** modifier a\n\n**Résumé :** un bloc simple\n";
        let result = parse_markdown(content);
        assert_eq!(result.errors, Vec::new());
        assert_eq!(result.blocks.len(), 1);
        assert_eq!(result.blocks[0].role, "fait le calcul");
        assert_eq!(result.blocks[0].summary, "un bloc simple");
    }
}
