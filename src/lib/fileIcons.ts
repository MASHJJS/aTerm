// File icons based on extension/name
// Returns a simple emoji-based icon for minimal dependencies

type FileIconInfo = {
  icon: string;
  color: string;
};

const EXTENSION_ICONS: Record<string, FileIconInfo> = {
  // JavaScript/TypeScript
  js: { icon: "JS", color: "#f7df1e" },
  jsx: { icon: "JS", color: "#61dafb" },
  ts: { icon: "TS", color: "#3178c6" },
  tsx: { icon: "TS", color: "#3178c6" },

  // Web
  html: { icon: "<>", color: "#e34c26" },
  css: { icon: "#", color: "#264de4" },
  scss: { icon: "#", color: "#cc6699" },

  // Data
  json: { icon: "{}", color: "#cbcb41" },
  yaml: { icon: "Y", color: "#cb171e" },
  yml: { icon: "Y", color: "#cb171e" },
  toml: { icon: "T", color: "#9c4121" },

  // Markdown
  md: { icon: "M", color: "#083fa1" },
  mdx: { icon: "M", color: "#fcb32c" },

  // Programming
  py: { icon: "Py", color: "#3776ab" },
  rs: { icon: "Rs", color: "#dea584" },
  go: { icon: "Go", color: "#00add8" },
  java: { icon: "J", color: "#b07219" },
  rb: { icon: "Rb", color: "#701516" },
  php: { icon: "P", color: "#4f5d95" },
  c: { icon: "C", color: "#555555" },
  cpp: { icon: "C+", color: "#f34b7d" },
  h: { icon: "H", color: "#555555" },
  cs: { icon: "C#", color: "#178600" },
  swift: { icon: "Sw", color: "#fa7343" },

  // Shell
  sh: { icon: ">_", color: "#89e051" },
  bash: { icon: ">_", color: "#89e051" },
  zsh: { icon: ">_", color: "#89e051" },

  // SQL
  sql: { icon: "DB", color: "#e38c00" },

  // Config
  env: { icon: "E", color: "#ecd53f" },
  gitignore: { icon: "G", color: "#f05032" },
  dockerfile: { icon: "D", color: "#2496ed" },

  // Images (typically not edited, but shown)
  png: { icon: "I", color: "#a074c4" },
  jpg: { icon: "I", color: "#a074c4" },
  jpeg: { icon: "I", color: "#a074c4" },
  gif: { icon: "I", color: "#a074c4" },
  svg: { icon: "I", color: "#ffb13b" },
  ico: { icon: "I", color: "#a074c4" },

  // Lock files
  lock: { icon: "L", color: "#6b7280" },
};

const FILENAME_ICONS: Record<string, FileIconInfo> = {
  "package.json": { icon: "N", color: "#cb3837" },
  "package-lock.json": { icon: "N", color: "#cb3837" },
  "tsconfig.json": { icon: "TS", color: "#3178c6" },
  "vite.config.ts": { icon: "V", color: "#646cff" },
  "vite.config.js": { icon: "V", color: "#646cff" },
  Dockerfile: { icon: "D", color: "#2496ed" },
  Makefile: { icon: "M", color: "#6d8086" },
  README: { icon: "R", color: "#083fa1" },
  "README.md": { icon: "R", color: "#083fa1" },
  LICENSE: { icon: "L", color: "#d4a017" },
  ".gitignore": { icon: "G", color: "#f05032" },
  ".env": { icon: "E", color: "#ecd53f" },
  ".env.local": { icon: "E", color: "#ecd53f" },
  "Cargo.toml": { icon: "C", color: "#dea584" },
  "Cargo.lock": { icon: "C", color: "#dea584" },
  "go.mod": { icon: "Go", color: "#00add8" },
  "go.sum": { icon: "Go", color: "#00add8" },
};

const DEFAULT_FILE: FileIconInfo = { icon: "F", color: "#6b7280" };
const FOLDER: FileIconInfo = { icon: "", color: "#f59e0b" };

export function getFileIcon(fileName: string, isDir: boolean): FileIconInfo {
  if (isDir) {
    return FOLDER;
  }

  // Check special filenames
  if (fileName in FILENAME_ICONS) {
    return FILENAME_ICONS[fileName];
  }

  // Get extension
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) {
    return DEFAULT_FILE;
  }

  const ext = fileName.slice(lastDot + 1).toLowerCase();
  return EXTENSION_ICONS[ext] || DEFAULT_FILE;
}
