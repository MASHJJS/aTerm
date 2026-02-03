// Provider registry pattern adapted from agent-os

export type ProviderId = "claude" | "opencode" | "codex" | "aider" | "cursor" | "gemini" | "shell";

export interface ProviderDefinition {
  id: ProviderId;
  name: string;
  cli: string;
  description: string;
  supportsResume: boolean;
  modelFlag?: string;
  defaultArgs?: string[];
  autoApproveFlag?: string; // Flag to skip permission prompts
}

export const PROVIDERS: Record<ProviderId, ProviderDefinition> = {
  claude: {
    id: "claude",
    name: "Claude Code",
    cli: "claude",
    description: "Anthropic's Claude Code CLI",
    supportsResume: true,
    defaultArgs: [],
    autoApproveFlag: "--dangerously-skip-permissions",
  },
  opencode: {
    id: "opencode",
    name: "OpenCode",
    cli: "opencode",
    description: "Open-source AI coding assistant",
    supportsResume: false,
    autoApproveFlag: undefined, // Managed via config
  },
  codex: {
    id: "codex",
    name: "Codex",
    cli: "codex",
    description: "OpenAI Codex CLI",
    supportsResume: false,
    autoApproveFlag: "--approval-mode full-auto",
  },
  aider: {
    id: "aider",
    name: "Aider",
    cli: "aider",
    description: "AI pair programming in your terminal",
    supportsResume: false,
    modelFlag: "--model",
    autoApproveFlag: "--yes",
  },
  cursor: {
    id: "cursor",
    name: "Cursor",
    cli: "cursor",
    description: "Cursor AI CLI",
    supportsResume: false,
    autoApproveFlag: undefined, // Not supported
  },
  gemini: {
    id: "gemini",
    name: "Gemini CLI",
    cli: "gemini",
    description: "Google's Gemini CLI",
    supportsResume: false,
    autoApproveFlag: "--yolo",
  },
  shell: {
    id: "shell",
    name: "Shell",
    cli: "",
    description: "Plain terminal shell",
    supportsResume: false,
    autoApproveFlag: undefined, // N/A
  },
};

export function getProviderCommand(providerId: ProviderId): string | undefined {
  const provider = PROVIDERS[providerId];
  if (!provider || providerId === "shell") return undefined;
  return provider.cli;
}

export function buildProviderCommand(
  providerId: ProviderId,
  skipPermissions?: boolean
): string | undefined {
  const provider = PROVIDERS[providerId];
  if (!provider || providerId === "shell") return undefined;

  const parts = [provider.cli, ...(provider.defaultArgs || [])].filter(Boolean);
  if (skipPermissions && provider.autoApproveFlag) {
    parts.push(provider.autoApproveFlag);
  }

  return parts.join(" ").trim() || undefined;
}

export function getProviderList(): ProviderDefinition[] {
  return Object.values(PROVIDERS);
}
