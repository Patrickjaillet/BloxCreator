use sha2::{Digest, Sha256};

pub fn compute_hash(normalized: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(normalized.as_bytes());
    hex::encode(hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::normalize::normalize_glsl;

    #[test]
    fn is_deterministic() {
        let normalized = normalize_glsl("float a = 1.0;");
        assert_eq!(compute_hash(&normalized), compute_hash(&normalized));
    }

    #[test]
    fn is_case_sensitive() {
        let a = normalize_glsl("float MyVar = 1.0;");
        let b = normalize_glsl("float myvar = 1.0;");
        assert_ne!(compute_hash(&a), compute_hash(&b));
    }

    #[test]
    fn differs_on_semantic_change() {
        let a = normalize_glsl("float a = 1.0;");
        let b = normalize_glsl("float a = 2.0;");
        assert_ne!(compute_hash(&a), compute_hash(&b));
    }

    #[test]
    fn ignores_comment_only_differences() {
        let a = normalize_glsl("float a = 1.0; // comment\n");
        let b = normalize_glsl("float a = 1.0;");
        assert_eq!(compute_hash(&a), compute_hash(&b));
    }
}
