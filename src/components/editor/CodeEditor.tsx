import { useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import Editor, { OnMount, OnChange, BeforeMount } from "@monaco-editor/react";
import type { editor } from "monaco-editor";

interface Props {
  content: string;
  language: string;
  filePath: string;
  projectRoot: string;
  onChange: (value: string) => void;
  onSave?: () => void;
}

interface TypeDefinition {
  path: string;
  content: string;
}

// Track which projects we've loaded types for
const loadedProjects = new Set<string>();
let monacoInstance: any = null;

export function CodeEditor({ content, language, filePath, projectRoot, onChange, onSave }: Props) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  const handleBeforeMount: BeforeMount = (monaco) => {
    monacoInstance = monaco;

    // Configure TypeScript/JavaScript compiler options
    const ts = (monaco.languages as any).typescript;
    if (!ts) return;

    const compilerOptions = {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      jsx: ts.JsxEmit.ReactJSX,
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      forceConsistentCasingInFileNames: true,
      resolveJsonModule: true,
      isolatedModules: true,
      noEmit: true,
      allowSyntheticDefaultImports: true,
      allowJs: true,
      checkJs: false,
      reactNamespace: "React",
      // Needed for proper JSX support
      jsxImportSource: "react",
    };

    ts.typescriptDefaults.setCompilerOptions(compilerOptions);
    ts.javascriptDefaults.setCompilerOptions(compilerOptions);

    // Enable full validation
    ts.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    ts.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Set eager model sync for better multi-file support
    ts.typescriptDefaults.setEagerModelSync(true);
  };

  // Load type definitions for the project
  useEffect(() => {
    if (!monacoInstance || loadedProjects.has(projectRoot)) return;

    async function loadTypes() {
      try {
        const definitions = await invoke<TypeDefinition[]>("read_type_definitions", {
          root: projectRoot,
        });

        const ts = (monacoInstance.languages as any).typescript;
        if (!ts) return;

        for (const def of definitions) {
          const uri = `file:///` + def.path;
          ts.typescriptDefaults.addExtraLib(def.content, uri);
        }

        loadedProjects.add(projectRoot);
        console.log(`Loaded ${definitions.length} type definitions for ${projectRoot}`);
      } catch (err) {
        console.warn("Failed to load type definitions:", err);
      }
    }

    loadTypes();
  }, [projectRoot]);

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
        fontSize: 13,
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
