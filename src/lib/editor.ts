// Editor pane types and utilities

export interface FileNode {
  name: string;
  path: string; // Relative to project root
  isDir: boolean;
  children?: FileNode[];
  isLoaded?: boolean; // For lazy loading directories
}

export interface ManagedFile {
  path: string;
  content: string;
  isDirty: boolean;
  originalContent: string;
  language: string; // Monaco language ID
}

// Map file extensions to Monaco language IDs
const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  // JavaScript/TypeScript
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  mjs: "javascript",
  cjs: "javascript",
  mts: "typescript",
  cts: "typescript",

  // Web
  html: "html",
  htm: "html",
  css: "css",
  scss: "scss",
  sass: "scss",
  less: "less",

  // Data/Config
  json: "json",
  jsonc: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  xml: "xml",
  csv: "plaintext",

  // Markdown/Docs
  md: "markdown",
  mdx: "markdown",
  txt: "plaintext",

  // Programming
  py: "python",
  rs: "rust",
  go: "go",
  java: "java",
  kt: "kotlin",
  kts: "kotlin",
  scala: "scala",
  rb: "ruby",
  php: "php",
  c: "c",
  cpp: "cpp",
  cc: "cpp",
  cxx: "cpp",
  h: "c",
  hpp: "cpp",
  hxx: "cpp",
  cs: "csharp",
  swift: "swift",
  m: "objective-c",
  mm: "objective-c",
  lua: "lua",
  r: "r",
  jl: "julia",
  dart: "dart",
  zig: "zig",

  // Shell
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  fish: "shell",
  ps1: "powershell",
  psm1: "powershell",

  // SQL
  sql: "sql",
  mysql: "sql",
  pgsql: "sql",

  // Dockerfile/Containers
  dockerfile: "dockerfile",

  // Config files
  env: "plaintext",
  gitignore: "plaintext",
  dockerignore: "plaintext",
  editorconfig: "ini",
  ini: "ini",
  conf: "ini",
  cfg: "ini",
  properties: "ini",

  // GraphQL
  graphql: "graphql",
  gql: "graphql",

  // Other
  vue: "vue",
  svelte: "html",
};

// Special filenames that have specific languages
const FILENAME_TO_LANGUAGE: Record<string, string> = {
  Dockerfile: "dockerfile",
  Makefile: "makefile",
  Rakefile: "ruby",
  Gemfile: "ruby",
  Podfile: "ruby",
  Vagrantfile: "ruby",
  ".gitignore": "plaintext",
  ".dockerignore": "plaintext",
  ".env": "plaintext",
  ".env.local": "plaintext",
  ".env.development": "plaintext",
  ".env.production": "plaintext",
  "package.json": "json",
  "tsconfig.json": "jsonc",
  "jsconfig.json": "jsonc",
  ".prettierrc": "json",
  ".eslintrc": "json",
  "Cargo.toml": "toml",
  "go.mod": "go",
  "go.sum": "plaintext",
};

export function getLanguageFromPath(filePath: string): string {
  const fileName = filePath.split("/").pop() || "";

  // Check special filenames first
  if (fileName in FILENAME_TO_LANGUAGE) {
    return FILENAME_TO_LANGUAGE[fileName];
  }

  // Get extension
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return "plaintext";
  }

  const ext = fileName.slice(lastDot + 1).toLowerCase();
  return EXTENSION_TO_LANGUAGE[ext] || "plaintext";
}
