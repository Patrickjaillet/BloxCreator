use once_cell::sync::Lazy;
use regex::Regex;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FragmentKind {
    Function,
    Struct,
    MainBody,
    GlobalDeclaration,
    Snippet,
}

impl FragmentKind {
    pub fn as_block_kind(&self) -> &'static str {
        match self {
            FragmentKind::Function => "function",
            FragmentKind::Struct => "struct",
            FragmentKind::MainBody => "main_body",
            FragmentKind::GlobalDeclaration => "global_declaration",
            FragmentKind::Snippet => "snippet",
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DecomposedFragment {
    pub kind: FragmentKind,
    pub name: Option<String>,
    pub code_raw: String,
}

static STRUCT_OPENER_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"struct\s+(\w+)\s*\{").unwrap());

static FUNCTION_OPENER_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(r"(?:void|float|int|bool|vec[234]|mat[234])\s+(\w+)\s*\([^)]*\)\s*\{").unwrap()
});

static GLOBAL_DECL_RE: Lazy<Regex> = Lazy::new(|| {
    Regex::new(
        r"^(?:#define\s+\w+.*|(?:const\s+)?(?:float|int|vec[234]|mat[234])\s+\w+\s*=.*;)$",
    )
    .unwrap()
});

fn find_matching_brace_end(source: &str, open_brace_pos: usize) -> Option<usize> {
    let bytes = source.as_bytes();
    let mut depth = 0i32;
    let mut i = open_brace_pos;
    while i < bytes.len() {
        match bytes[i] {
            b'{' => depth += 1,
            b'}' => {
                depth -= 1;
                if depth == 0 {
                    return Some(i);
                }
            }
            _ => {}
        }
        i += 1;
    }
    None
}

fn flush_snippet(buffer: &mut Vec<&str>, fragments: &mut Vec<DecomposedFragment>) {
    let joined = buffer.join("\n").trim().to_string();
    if !joined.is_empty() {
        fragments.push(DecomposedFragment {
            kind: FragmentKind::Snippet,
            name: None,
            code_raw: joined,
        });
    }
    buffer.clear();
}

fn append_residue_fragments(text: &str, fragments: &mut Vec<DecomposedFragment>) {
    let mut snippet_buffer: Vec<&str> = Vec::new();

    for line in text.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        if GLOBAL_DECL_RE.is_match(trimmed) {
            flush_snippet(&mut snippet_buffer, fragments);
            fragments.push(DecomposedFragment {
                kind: FragmentKind::GlobalDeclaration,
                name: None,
                code_raw: trimmed.to_string(),
            });
        } else {
            snippet_buffer.push(line);
        }
    }
    flush_snippet(&mut snippet_buffer, fragments);
}

pub fn decompose_monaco_content(source: &str) -> Vec<DecomposedFragment> {
    let mut fragments = Vec::new();
    let mut cursor = 0usize;

    loop {
        let remaining = &source[cursor..];
        let struct_match = STRUCT_OPENER_RE.find(remaining);
        let function_match = FUNCTION_OPENER_RE.find(remaining);

        let next = match (struct_match, function_match) {
            (Some(s), Some(f)) => {
                if s.start() <= f.start() {
                    Some((s, true))
                } else {
                    Some((f, false))
                }
            }
            (Some(s), None) => Some((s, true)),
            (None, Some(f)) => Some((f, false)),
            (None, None) => None,
        };

        let Some((m, is_struct)) = next else {
            append_residue_fragments(remaining, &mut fragments);
            break;
        };

        let match_start = cursor + m.start();
        append_residue_fragments(&source[cursor..match_start], &mut fragments);

        let open_brace_pos = cursor + m.end() - 1;
        let Some(close_brace_pos) = find_matching_brace_end(source, open_brace_pos) else {
            append_residue_fragments(&source[match_start..], &mut fragments);
            break;
        };

        let mut end = close_brace_pos + 1;
        if is_struct {
            let bytes = source.as_bytes();
            while end < bytes.len() && bytes[end].is_ascii_whitespace() {
                end += 1;
            }
            if end < bytes.len() && bytes[end] == b';' {
                end += 1;
            }
        }

        let code_raw = source[match_start..end].trim().to_string();
        let opener_regex = if is_struct {
            &STRUCT_OPENER_RE
        } else {
            &FUNCTION_OPENER_RE
        };
        let name = opener_regex
            .captures(&source[match_start..])
            .map(|c| c[1].to_string());

        let kind = if is_struct {
            FragmentKind::Struct
        } else if name.as_deref() == Some("mainImage") {
            FragmentKind::MainBody
        } else {
            FragmentKind::Function
        };

        fragments.push(DecomposedFragment {
            kind,
            name,
            code_raw,
        });

        cursor = end;
    }

    fragments
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn detects_define_and_const_global_declarations() {
        let source = "#define ITERATIONS 64\nconst float PI = 3.14159;\nvec3 globalTint = vec3(1.0);\n";
        let fragments = decompose_monaco_content(source);
        assert_eq!(fragments.len(), 3);
        for f in &fragments {
            assert_eq!(f.kind, FragmentKind::GlobalDeclaration);
        }
        assert_eq!(fragments[0].code_raw, "#define ITERATIONS 64");
        assert_eq!(fragments[1].code_raw, "const float PI = 3.14159;");
        assert_eq!(fragments[2].code_raw, "vec3 globalTint = vec3(1.0);");
    }

    #[test]
    fn extracts_struct_with_nested_braces_and_trailing_semicolon() {
        let source = "struct Light {\n    vec3 position;\n    struct Inner { float radius; } inner;\n};\n";
        let fragments = decompose_monaco_content(source);
        assert_eq!(fragments.len(), 1);
        assert_eq!(fragments[0].kind, FragmentKind::Struct);
        assert_eq!(fragments[0].name.as_deref(), Some("Light"));
        assert!(fragments[0].code_raw.ends_with("};"));
        assert!(fragments[0].code_raw.contains("struct Inner"));
    }

    #[test]
    fn extracts_named_function_with_nested_braces() {
        let source = "vec3 hsv(float h, float s, float v)\n{\n    if (s > 0.0) {\n        h = h;\n    }\n    return vec3(h, s, v);\n}\n";
        let fragments = decompose_monaco_content(source);
        assert_eq!(fragments.len(), 1);
        assert_eq!(fragments[0].kind, FragmentKind::Function);
        assert_eq!(fragments[0].name.as_deref(), Some("hsv"));
        assert!(fragments[0].code_raw.starts_with("vec3 hsv("));
        assert!(fragments[0].code_raw.ends_with('}'));
    }

    #[test]
    fn tags_main_image_as_main_body() {
        let source = "void mainImage(out vec4 fragColor, in vec2 fragCoord)\n{\n    fragColor = vec4(1.0);\n}\n";
        let fragments = decompose_monaco_content(source);
        assert_eq!(fragments.len(), 1);
        assert_eq!(fragments[0].kind, FragmentKind::MainBody);
        assert_eq!(fragments[0].name.as_deref(), Some("mainImage"));
    }

    #[test]
    fn leftover_text_outside_declarations_becomes_a_snippet() {
        let source = "vec3 q = vec3(0.0), p = vec3(0.0);\nq.yz += 0.6;\n// ... inside the raymarching loop:\np = q += (FC.rgb / r.y - 0.5) * e;\n";
        let fragments = decompose_monaco_content(source);
        assert_eq!(fragments.len(), 2);
        assert_eq!(fragments[0].kind, FragmentKind::GlobalDeclaration);
        assert_eq!(fragments[0].code_raw, "vec3 q = vec3(0.0), p = vec3(0.0);");
        assert_eq!(fragments[1].kind, FragmentKind::Snippet);
        assert!(fragments[1].code_raw.contains("p = q += (FC.rgb"));
        assert!(fragments[1].code_raw.contains("q.yz += 0.6;"));
    }

    #[test]
    fn decomposes_a_realistic_multi_fragment_shader_in_source_order() {
        let source = "#define ITERATIONS 64\n\
             struct Light {\n    vec3 position;\n};\n\n\
             vec3 hsv(float h, float s, float v)\n{\n    return vec3(h, s, v);\n}\n\n\
             // stray comment between declarations\n\
             float strayValue = 1.0;\n\n\
             void mainImage(out vec4 fragColor, in vec2 fragCoord)\n{\n    fragColor = vec4(hsv(0.5, 1.0, 1.0), 1.0);\n}\n";

        let fragments = decompose_monaco_content(source);
        let kinds: Vec<FragmentKind> = fragments.iter().map(|f| f.kind).collect();
        assert_eq!(
            kinds,
            vec![
                FragmentKind::GlobalDeclaration,
                FragmentKind::Struct,
                FragmentKind::Function,
                FragmentKind::Snippet,
                FragmentKind::GlobalDeclaration,
                FragmentKind::MainBody,
            ]
        );
        assert_eq!(fragments[2].name.as_deref(), Some("hsv"));
        assert_eq!(fragments[5].name.as_deref(), Some("mainImage"));
    }

    #[test]
    fn is_never_auto_inserted_snippet_kind_is_distinguishable() {
        let source = "// just a comment, no declaration or function here\n";
        let fragments = decompose_monaco_content(source);
        assert_eq!(fragments.len(), 1);
        assert_eq!(fragments[0].kind, FragmentKind::Snippet);
        assert_eq!(fragments[0].kind.as_block_kind(), "snippet");
    }
}
