import { invoke } from "@tauri-apps/api/core";

import type {
  AssembleResult,
  BlockDto,
  BlockFilter,
  DecomposedFragmentDto,
  GenreTreeDto,
  ImportReport,
  NewBlockRequest,
  ShaderDto,
  ShaderSummaryDto,
  UpdateBlockInput,
} from "../types/dto";

interface CommandMap {
  get_app_version: { args: Record<string, never>; result: string };

  import_markdown_file: { args: { path: string }; result: ImportReport };
  import_markdown_content: {
    args: { content: string; sourceLabel: string };
    result: ImportReport;
  };
  decompose_monaco_content: {
    args: { code: string };
    result: DecomposedFragmentDto[];
  };
  confirm_fragment_import: {
    args: { fragments: NewBlockRequest[] };
    result: ImportReport;
  };

  get_genres_and_categories: { args: Record<string, never>; result: GenreTreeDto[] };
  get_blocks: { args: { filter: BlockFilter }; result: BlockDto[] };
  search_blocks: { args: { query: string }; result: BlockDto[] };
  create_block: { args: { input: NewBlockRequest }; result: BlockDto };
  update_block: { args: { id: number; input: UpdateBlockInput }; result: BlockDto };
  delete_block: { args: { id: number }; result: void };
  compute_hash_preview: { args: { code: string }; result: string };
  check_duplicate: { args: { code: string }; result: BlockDto | null };

  assemble_shader_preview: {
    args: { blockIdsOrdered: number[] };
    result: AssembleResult;
  };
  save_shader: {
    args: { name: string; code: string; blockIdsOrdered: number[] };
    result: number;
  };
  list_shaders: { args: Record<string, never>; result: ShaderSummaryDto[] };
  load_shader: { args: { id: number }; result: ShaderDto };
  delete_shader: { args: { id: number }; result: void };
  export_shader_as_glsl: {
    args: { id: number; targetPath: string };
    result: void;
  };
  rename_function_in_block: {
    args: { blockId: number; oldName: string; newName: string };
    result: string;
  };
}

export type CommandName = keyof CommandMap;

export async function callCommand<K extends CommandName>(
  command: K,
  args: CommandMap[K]["args"],
): Promise<CommandMap[K]["result"]> {
  return invoke<CommandMap[K]["result"]>(command, args);
}
