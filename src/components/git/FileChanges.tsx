import { useState } from "react";
import { Check } from "lucide-react";
import type { GitFile } from "../../lib/git";
import { FileItem } from "./FileItem";

interface SectionProps {
  title: string;
  files: GitFile[];
  selectedFile: GitFile | null;
  onSelectFile: (file: GitFile) => void;
  onStage?: (file: GitFile) => void;
  onUnstage?: (file: GitFile) => void;
  onDiscard?: (file: GitFile) => void;
  onStageAll?: () => void;
  onUnstageAll?: () => void;
  onViewInModal?: (file: GitFile) => void;
  onEdit?: (file: GitFile) => void;
  onOpenInEditor?: (file: GitFile, editor: string) => void;
}

function FileSection({
  title,
  files,
  selectedFile,
  onSelectFile,
  onStage,
  onUnstage,
  onDiscard,
  onStageAll,
  onUnstageAll,
  onViewInModal,
  onEdit,
  onOpenInEditor,
}: SectionProps) {
  const [collapsed, setCollapsed] = useState(false);

  if (files.length === 0) return null;

  return (
    <div className="mb-1">
      <div
        className="flex items-center px-2 py-1.5 cursor-pointer select-none gap-1"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="text-[10px] text-muted-foreground w-3">{collapsed ? "▸" : "▾"}</span>
        <span className="text-[11px] font-semibold text-foreground uppercase tracking-wider">{title}</span>
        <span className="text-[11px] text-muted-foreground">({files.length})</span>
        <div className="ml-auto flex gap-1">
          {onStageAll && (
            <button
              className="px-1.5 py-0.5 bg-transparent border border-border rounded text-muted-foreground text-[10px] cursor-pointer opacity-70 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onStageAll(); }}
              title="Stage all"
            >
              + All
            </button>
          )}
          {onUnstageAll && (
            <button
              className="px-1.5 py-0.5 bg-transparent border border-border rounded text-muted-foreground text-[10px] cursor-pointer opacity-70 hover:opacity-100"
              onClick={(e) => { e.stopPropagation(); onUnstageAll(); }}
              title="Unstage all"
            >
              - All
            </button>
          )}
        </div>
      </div>
      {!collapsed && (
        <div className="flex flex-col">
          {files.map((file) => (
            <FileItem
              key={file.path}
              file={file}
              isSelected={selectedFile?.path === file.path && selectedFile?.staged === file.staged}
              onSelect={() => onSelectFile(file)}
              onStage={onStage ? () => onStage(file) : undefined}
              onUnstage={onUnstage ? () => onUnstage(file) : undefined}
              onDiscard={onDiscard ? () => onDiscard(file) : undefined}
              onViewInModal={onViewInModal ? () => onViewInModal(file) : undefined}
              onEdit={onEdit ? () => onEdit(file) : undefined}
              onOpenInEditor={onOpenInEditor ? (editor) => onOpenInEditor(file, editor) : undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface Props {
  staged: GitFile[];
  unstaged: GitFile[];
  untracked: GitFile[];
  selectedFile: GitFile | null;
  onSelectFile: (file: GitFile) => void;
  onStageFile: (file: GitFile) => void;
  onUnstageFile: (file: GitFile) => void;
  onDiscardFile: (file: GitFile) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
  onViewInModal: (file: GitFile) => void;
  onEdit: (file: GitFile) => void;
  onOpenInEditor: (file: GitFile, editor: string) => void;
}

export function FileChanges({
  staged,
  unstaged,
  untracked,
  selectedFile,
  onSelectFile,
  onStageFile,
  onUnstageFile,
  onDiscardFile,
  onStageAll,
  onUnstageAll,
  onViewInModal,
  onEdit,
  onOpenInEditor,
}: Props) {
  const hasChanges = staged.length > 0 || unstaged.length > 0 || untracked.length > 0;

  if (!hasChanges) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground">
        <Check className="h-6 w-6 text-green-400" />
        <span className="text-xs">No changes</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-auto flex-1">
      <FileSection
        title="Staged"
        files={staged}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
        onUnstage={onUnstageFile}
        onUnstageAll={staged.length > 0 ? onUnstageAll : undefined}
        onViewInModal={onViewInModal}
        onEdit={onEdit}
        onOpenInEditor={onOpenInEditor}
      />
      <FileSection
        title="Changes"
        files={unstaged}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
        onStage={onStageFile}
        onDiscard={onDiscardFile}
        onStageAll={unstaged.length > 0 ? () => {
          unstaged.forEach(f => onStageFile(f));
        } : undefined}
        onViewInModal={onViewInModal}
        onEdit={onEdit}
        onOpenInEditor={onOpenInEditor}
      />
      <FileSection
        title="Untracked"
        files={untracked}
        selectedFile={selectedFile}
        onSelectFile={onSelectFile}
        onStage={onStageFile}
        onDiscard={onDiscardFile}
        onStageAll={untracked.length > 0 ? () => {
          onStageAll();
        } : undefined}
        onViewInModal={onViewInModal}
        onEdit={onEdit}
        onOpenInEditor={onOpenInEditor}
      />
    </div>
  );
}
