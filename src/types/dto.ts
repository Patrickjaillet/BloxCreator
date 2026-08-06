export type BlockKind =
  | "function"
  | "struct"
  | "main_body"
  | "global_declaration"
  | "snippet";

export type SourceOrigin =
  | "seed_md"
  | "markdown_import"
  | "monaco_decomposition"
  | "manual";

export interface GenreDto {
  id: number;
  name: string;
  displayOrder: number;
}

export interface CategoryDto {
  id: number;
  genreId: number;
  name: string;
  displayOrder: number;
}

export interface GenreTreeDto {
  id: number;
  name: string;
  displayOrder: number;
  categories: CategoryDto[];
}

export interface BlockDto {
  id: number;
  hash: string;
  name: string;
  genreId: number;
  categoryId: number | null;
  role: string;
  adaptation: string;
  summary: string;
  codeRaw: string;
  codeNormalized: string;
  blockKind: BlockKind;
  tags: string | null;
  sourceOrigin: SourceOrigin;
  sourceFile: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShaderSummaryDto {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShaderDto {
  id: number;
  name: string;
  description: string | null;
  codeAssembled: string;
  hash: string;
  blockIdsOrdered: number[];
  createdAt: string;
  updatedAt: string;
}

export interface BlockFilter {
  genreId?: number;
  categoryId?: number;
  blockKind?: BlockKind;
  tag?: string;
}

export interface NewBlockRequest {
  name: string;
  genreId: number;
  categoryId?: number;
  role: string;
  adaptation: string;
  summary: string;
  codeRaw: string;
  blockKind?: BlockKind;
  tags?: string;
  sourceOrigin: SourceOrigin;
  sourceFile?: string;
}

export interface UpdateBlockInput {
  name?: string;
  genreId?: number;
  categoryId?: number;
  role?: string;
  adaptation?: string;
  summary?: string;
  tags?: string;
}

export interface DuplicateInfo {
  attemptedName: string;
  existingBlockId: number;
}

export interface ImportParseError {
  line: number;
  message: string;
}

export interface ImportReport {
  totalFound: number;
  inserted: BlockDto[];
  duplicates: DuplicateInfo[];
  errors: ImportParseError[];
}

export interface DecomposedFragmentDto {
  kind: BlockKind;
  name: string | null;
  codeRaw: string;
}

export interface FunctionConflict {
  name: string;
  blockA: number;
  blockB: number;
}

export interface AssembleResult {
  code: string;
  conflicts: FunctionConflict[];
}

/** Mirrors the externally-tagged serialization of the Rust `AppError` enum (error.rs). */
export type AppError =
  | { database: string }
  | { parse: { line: number; message: string } }
  | { duplicate: { existingId: number } }
  | { io: string }
  | { functionConflict: { name: string; blockA: number; blockB: number } };
