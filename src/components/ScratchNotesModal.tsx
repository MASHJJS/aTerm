import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { ProjectConfig, AppConfig } from "../lib/config";
import type { ScratchNote } from "../lib/notes";
import { createScratchNote } from "../lib/notes";
import { NoteItem } from "./scratch-notes/NoteItem";

interface Props {
  isOpen: boolean;
  project: ProjectConfig | null;
  onClose: () => void;
  config: AppConfig;
  onConfigChange: (config: AppConfig) => void;
}

export function ScratchNotesModal({
  isOpen,
  project,
  onClose,
  config,
  onConfigChange,
}: Props) {
  const [newNoteContent, setNewNoteContent] = useState("");
  const [editingNote, setEditingNote] = useState<ScratchNote | null>(null);

  useEffect(() => {
    if (isOpen) {
      setNewNoteContent("");
      setEditingNote(null);
    }
  }, [isOpen]);

  if (!project) return null;

  const notes = project.scratchNotes || [];

  function updateProjectNotes(newNotes: ScratchNote[]) {
    const updatedProject = { ...project!, scratchNotes: newNotes };
    const newProjects = config.projects.map((p) =>
      p.id === project!.id ? updatedProject : p
    );
    onConfigChange({ ...config, projects: newProjects });
  }

  function handleAddNote() {
    if (!newNoteContent.trim()) return;

    if (editingNote) {
      // Update existing note
      const updatedNote: ScratchNote = {
        ...editingNote,
        content: newNoteContent.trim(),
        updatedAt: new Date().toISOString(),
      };
      const newNotes = notes.map((n) =>
        n.id === editingNote.id ? updatedNote : n
      );
      updateProjectNotes(newNotes);
      setEditingNote(null);
    } else {
      // Add new note
      const newNote = createScratchNote(newNoteContent.trim());
      updateProjectNotes([newNote, ...notes]);
    }
    setNewNoteContent("");
  }

  function handleEdit(note: ScratchNote) {
    setEditingNote(note);
    setNewNoteContent(note.content);
  }

  function handleCopy(note: ScratchNote) {
    navigator.clipboard.writeText(note.content);
  }

  function handleDelete(note: ScratchNote) {
    const newNotes = notes.filter((n) => n.id !== note.id);
    updateProjectNotes(newNotes);
  }

  function handleCancel() {
    if (editingNote) {
      setEditingNote(null);
      setNewNoteContent("");
    } else {
      onClose();
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Scratch Notes</DialogTitle>
        </DialogHeader>

        <div className="mt-2 flex flex-col gap-4">
          {notes.length > 0 && (
            <ScrollArea className="max-h-[300px]">
              <div className="flex flex-col gap-2 pr-4">
                {notes.map((note) => (
                  <NoteItem
                    key={note.id}
                    note={note}
                    onEdit={handleEdit}
                    onCopy={handleCopy}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {notes.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No notes yet. Add one below.
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Textarea
              value={newNoteContent}
              onChange={(e) => setNewNoteContent(e.target.value)}
              placeholder="Add a scratch note..."
              className="min-h-[100px] text-sm font-mono"
            />
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={handleCancel}>
            {editingNote ? "Cancel Edit" : "Close"}
          </Button>
          <Button
            onClick={handleAddNote}
            disabled={!newNoteContent.trim()}
          >
            {editingNote ? "Update" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
