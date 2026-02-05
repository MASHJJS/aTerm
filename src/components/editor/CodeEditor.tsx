import { useRef, useEffect } from "react";
import Editor, { OnMount, OnChange, BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface Props {
  content: string;
  language: string;
  filePath: string;
  projectRoot: string;
  fontSize?: number;
  onChange: (value: string) => void;
  onSave?: () => void;
}

export function CodeEditor({ content, language, filePath, projectRoot, fontSize = 13, onChange, onSave }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleBeforeMount: BeforeMount = (monaco) => {
    const ts = (monaco.languages as any).typescript;
    if (!ts) return;

    // Configure TypeScript/JavaScript compiler options
    ts.typescriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    });

    ts.javascriptDefaults.setCompilerOptions({
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      jsx: ts.JsxEmit.ReactJSX,
      allowJs: true,
      allowSyntheticDefaultImports: true,
      esModuleInterop: true,
    });

    // Disable semantic validation (module resolution, cross-file type checking)
    // since Monaco doesn't have access to the full filesystem.
    // Syntax validation still catches actual syntax errors.
    // Use `tsc --noEmit` in terminal for full type checking.
    ts.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });

    ts.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
    });
  };

  const handleMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Create a model with the proper file URI so TypeScript knows the file path
    const uri = monaco.Uri.parse(`file://${projectRoot}/${filePath}`);
    let model = monaco.editor.getModel(uri);

    if (!model) {
      model = monaco.editor.createModel(content, language, uri);
    } else {
      model.setValue(content);
    }

    editor.setModel(model);

    // Add save command
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      onSave?.();
    });

    // Focus editor
    editor.focus();
  };

  const handleChange: OnChange = (value) => {
    onChange(value || "");
  };

  // Focus editor when content changes (new file opened)
  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  }, [content]);

  return (
    <Editor
      height="100%"
      language={language}
      value={content}
      theme="vs-dark"
      beforeMount={handleBeforeMount}
      onChange={handleChange}
      onMount={handleMount}
      options={{
        fontSize,
        fontFamily: "SF Mono, Menlo, Monaco, monospace",
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        wordWrap: "on",
        lineNumbers: "on",
        renderLineHighlight: "line",
        tabSize: 2,
        insertSpaces: true,
        automaticLayout: true,
        padding: { top: 8 },
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
      }}
    />
  );
}
