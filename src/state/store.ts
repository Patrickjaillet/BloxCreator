import type { BlockDto, BlockFilter, FunctionConflict, GenreTreeDto } from "../types/dto";

export interface AssemblerEntry {
  blockId: number;
  locked: boolean;
}

export interface CompileError {
  line: number;
  message: string;
}

export interface ViewportState {
  playing: boolean;
  time: number;
  mouse: [number, number, number, number];
}

export interface AppState {
  genres: GenreTreeDto[];
  blocks: BlockDto[];
  activeFilter: BlockFilter;
  searchQuery: string;
  monacoContent: string;
  assemblerSelection: AssemblerEntry[];
  functionConflicts: FunctionConflict[];
  viewport: ViewportState;
  compileErrors: CompileError[];
  theme: "dark";
}

export function createInitialAppState(): AppState {
  return {
    genres: [],
    blocks: [],
    activeFilter: {},
    searchQuery: "",
    monacoContent: "",
    assemblerSelection: [],
    functionConflicts: [],
    viewport: { playing: true, time: 0, mouse: [0, 0, 0, 0] },
    compileErrors: [],
    theme: "dark",
  };
}

type Listener<T> = (state: Readonly<T>) => void;

export class Store<T> {
  private state: T;
  private readonly listeners = new Set<Listener<T>>();

  constructor(initialState: T) {
    this.state = initialState;
  }

  getState(): Readonly<T> {
    return this.state;
  }

  setState(partial: Partial<T>): void {
    this.state = { ...this.state, ...partial };
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
}

export const appStore = new Store<AppState>(createInitialAppState());
