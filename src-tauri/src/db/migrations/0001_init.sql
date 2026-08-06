PRAGMA foreign_keys = ON;

CREATE TABLE genres (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    name          TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL
);

CREATE TABLE categories (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    genre_id      INTEGER NOT NULL REFERENCES genres(id) ON DELETE CASCADE,
    name          TEXT NOT NULL,
    display_order INTEGER NOT NULL,
    UNIQUE(genre_id, name)
);

CREATE TABLE blocks (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    hash             TEXT NOT NULL UNIQUE,
    name             TEXT NOT NULL,
    genre_id         INTEGER NOT NULL REFERENCES genres(id),
    category_id      INTEGER REFERENCES categories(id),
    role             TEXT NOT NULL,
    adaptation       TEXT NOT NULL,
    summary          TEXT NOT NULL,
    code_raw         TEXT NOT NULL,
    code_normalized  TEXT NOT NULL,
    block_kind       TEXT NOT NULL CHECK(block_kind IN ('function','struct','main_body','global_declaration','snippet')),
    tags             TEXT,
    source_origin    TEXT NOT NULL CHECK(source_origin IN ('seed_md','markdown_import','monaco_decomposition','manual')),
    source_file      TEXT,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_blocks_genre    ON blocks(genre_id);
CREATE INDEX idx_blocks_category ON blocks(category_id);
CREATE INDEX idx_blocks_kind     ON blocks(block_kind);

CREATE VIRTUAL TABLE blocks_fts USING fts5(
    name, role, adaptation, summary, tags,
    content='blocks', content_rowid='id'
);

CREATE TRIGGER blocks_ai AFTER INSERT ON blocks BEGIN
    INSERT INTO blocks_fts(rowid, name, role, adaptation, summary, tags)
    VALUES (new.id, new.name, new.role, new.adaptation, new.summary, new.tags);
END;

CREATE TRIGGER blocks_ad AFTER DELETE ON blocks BEGIN
    INSERT INTO blocks_fts(blocks_fts, rowid, name, role, adaptation, summary, tags)
    VALUES ('delete', old.id, old.name, old.role, old.adaptation, old.summary, old.tags);
END;

CREATE TRIGGER blocks_au AFTER UPDATE ON blocks BEGIN
    INSERT INTO blocks_fts(blocks_fts, rowid, name, role, adaptation, summary, tags)
    VALUES ('delete', old.id, old.name, old.role, old.adaptation, old.summary, old.tags);
    INSERT INTO blocks_fts(rowid, name, role, adaptation, summary, tags)
    VALUES (new.id, new.name, new.role, new.adaptation, new.summary, new.tags);
    UPDATE blocks SET updated_at = datetime('now') WHERE id = new.id;
END;

CREATE TABLE shaders (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    name            TEXT NOT NULL,
    description     TEXT,
    code_assembled  TEXT NOT NULL,
    hash            TEXT NOT NULL UNIQUE,
    created_at      TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE shader_blocks (
    shader_id             INTEGER NOT NULL REFERENCES shaders(id) ON DELETE CASCADE,
    block_id              INTEGER NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    position              INTEGER NOT NULL,
    renamed_function_map  TEXT,
    PRIMARY KEY (shader_id, position)
);

CREATE TABLE app_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
