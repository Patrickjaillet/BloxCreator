use once_cell::sync::Lazy;
use regex::Regex;

static BLOCK_COMMENT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"(?s)/\*.*?\*/").unwrap());
static LINE_COMMENT_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"//[^\n]*").unwrap());
static WHITESPACE_RE: Lazy<Regex> = Lazy::new(|| Regex::new(r"\s+").unwrap());

pub fn normalize_glsl(raw: &str) -> String {
    let no_block_comments = BLOCK_COMMENT_RE.replace_all(raw, "");
    let no_line_comments = LINE_COMMENT_RE.replace_all(&no_block_comments, "");
    let collapsed = WHITESPACE_RE.replace_all(&no_line_comments, " ");
    collapsed.trim().to_string()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_block_comments() {
        assert_eq!(
            normalize_glsl("float a = 1.0; /* comment */ float b = 2.0;"),
            "float a = 1.0; float b = 2.0;"
        );
    }

    #[test]
    fn strips_multiline_block_comments() {
        assert_eq!(
            normalize_glsl("float a = 1.0;\n/* multi\nline\ncomment */\nfloat b = 2.0;"),
            "float a = 1.0; float b = 2.0;"
        );
    }

    #[test]
    fn block_comments_do_not_nest() {
        assert_eq!(
            normalize_glsl("/* outer /* inner */ float a = 1.0;"),
            "float a = 1.0;"
        );
    }

    #[test]
    fn strips_line_comments() {
        assert_eq!(
            normalize_glsl("float a = 1.0; // trailing comment\nfloat b = 2.0;"),
            "float a = 1.0; float b = 2.0;"
        );
    }

    #[test]
    fn line_comment_containing_extra_slashes() {
        assert_eq!(
            normalize_glsl("float a = 1.0; // see https://example.com/path\nfloat b = 2.0;"),
            "float a = 1.0; float b = 2.0;"
        );
    }

    #[test]
    fn division_operator_is_preserved() {
        assert_eq!(normalize_glsl("float a = b / c;"), "float a = b / c;");
    }

    #[test]
    fn collapses_whitespace_and_trims() {
        assert_eq!(
            normalize_glsl("  float   a\t=\n\n1.0;  "),
            "float a = 1.0;"
        );
    }

    #[test]
    fn preserves_case_sensitivity() {
        let a = normalize_glsl("float MyVar = 1.0;");
        let b = normalize_glsl("float myvar = 1.0;");
        assert_ne!(a, b);
    }
}
