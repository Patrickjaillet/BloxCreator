import * as monaco from "monaco-editor";

import type { CompileError } from "../../state/store";

const GLSL_LANGUAGE_ID = "glsl";
const GLSL_KEYWORDS = [
  "attribute",
  "bool",
  "break",
  "const",
  "continue",
  "discard",
  "do",
  "else",
  "false",
  "float",
  "for",
  "highp",
  "if",
  "in",
  "inout",
  "int",
  "invariant",
  "lowp",
  "mat2",
  "mat3",
  "mat4",
  "mediump",
  "out",
  "precision",
  "return",
  "struct",
  "true",
  "uniform",
  "varying",
  "vec2",
  "vec3",
  "vec4",
  "void",
  "while",
];

let glslLanguageRegistered = false;

function registerGlslLanguageOnce(): void {
  if (glslLanguageRegistered) {
    return;
  }
  glslLanguageRegistered = true;

  monaco.languages.register({ id: GLSL_LANGUAGE_ID });
  monaco.languages.setMonarchTokensProvider(GLSL_LANGUAGE_ID, {
    keywords: GLSL_KEYWORDS,
    tokenizer: {
      root: [
        [/\/\/.*$/, "comment"],
        [/\/\*/, "comment", "@comment"],
        [/\b\d+\.\d+([eE][+-]?\d+)?\b/, "number.float"],
        [/\b\d+\b/, "number"],
        [
          /[a-zA-Z_]\w*/,
          { cases: { "@keywords": "keyword", "@default": "identifier" } },
        ],
        [/[{}()[\]]/, "@brackets"],
        [/[<>]=?|[!=]=|&&|\|\||[+\-*/%]/, "operator"],
      ],
      comment: [
        [/[^/*]+/, "comment"],
        [/\*\//, "comment", "@pop"],
        [/[/*]/, "comment"],
      ],
    },
  });
}

export class MonacoHost {
  readonly element: HTMLDivElement;
  private readonly editor: monaco.editor.IStandaloneCodeEditor;

  constructor(initialValue: string, onChange: (value: string) => void) {
    registerGlslLanguageOnce();

    this.element = document.createElement("div");
    this.element.className = "monaco-host";

    this.editor = monaco.editor.create(this.element, {
      value: initialValue,
      language: GLSL_LANGUAGE_ID,
      theme: "vs-dark",
      automaticLayout: true,
      minimap: { enabled: false },
    });

    this.editor.onDidChangeModelContent(() => {
      onChange(this.editor.getValue());
    });
  }

  getValue(): string {
    return this.editor.getValue();
  }

  setValue(value: string): void {
    if (this.editor.getValue() !== value) {
      this.editor.setValue(value);
    }
  }

  setCompileErrors(errors: CompileError[]): void {
    const model = this.editor.getModel();
    if (!model) {
      return;
    }
    const markers: monaco.editor.IMarkerData[] = errors.map((error) => ({
      severity: monaco.MarkerSeverity.Error,
      message: error.message,
      startLineNumber: error.line,
      startColumn: 1,
      endLineNumber: error.line,
      endColumn: model.getLineMaxColumn(Math.min(error.line, model.getLineCount())),
    }));
    monaco.editor.setModelMarkers(model, "glsl-compile", markers);
  }

  revealLine(line: number): void {
    this.editor.revealLineInCenter(line);
    this.editor.setPosition({ lineNumber: line, column: 1 });
    this.editor.focus();
  }

  dispose(): void {
    this.editor.dispose();
  }
}
