import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ATSectionHeader } from "@/components/ui/at-section-header";
import { ATFormField } from "@/components/ui/at-form-field";
import { ATListItem, ATListItemContent } from "@/components/ui/at-list-item";
import { ATColorDot } from "@/components/ui/at-color-dot";
import { Plus, X, Download } from "lucide-react";
import type { TerminalProfile } from "../../lib/profiles";
import type { ProjectConfig } from "../../lib/config";

interface ProfilesTabProps {
  profiles: TerminalProfile[];
  projects: ProjectConfig[];
  onProfilesChange: (profiles: TerminalProfile[]) => void;
  onImportClick: () => void;
  importError: string | null;
}

export function ProfilesTab({
  profiles,
  projects,
  onProfilesChange,
  onImportClick,
  importError,
}: ProfilesTabProps) {
  const [editingProfile, setEditingProfile] = useState<TerminalProfile | null>(null);

  function handleProfileSave(profile: TerminalProfile) {
    const exists = profiles.some((p) => p.id === profile.id);
    const newProfiles = exists
      ? profiles.map((p) => (p.id === profile.id ? profile : p))
      : [...profiles, profile];
    onProfilesChange(newProfiles);
    setEditingProfile(null);
  }

  function handleProfileDelete(profileId: string) {
    onProfilesChange(profiles.filter((p) => p.id !== profileId));
  }

  return (
    <div className="mb-6">
      <ATSectionHeader
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              className="h-6 text-[11px]"
              onClick={onImportClick}
            >
              <Download className="h-3 w-3 mr-1" />
              Import iTerm2
            </Button>
            <Button
              size="sm"
              className="h-6 text-[11px]"
              onClick={() =>
                setEditingProfile({
                  id: crypto.randomUUID(),
                  name: "",
                  command: "",
                  color: "#888888",
                })
              }
            >
              <Plus className="h-3 w-3 mr-1" />
              New
            </Button>
          </>
        }
      >
        Terminal Profiles
      </ATSectionHeader>

      {importError && (
        <div className="mb-3 p-2 bg-destructive/10 border border-destructive/20 rounded text-[11px] text-destructive">
          {importError}
        </div>
      )}

      {editingProfile ? (
        <ProfileEditor
          profile={editingProfile}
          projects={projects}
          onSave={handleProfileSave}
          onCancel={() => setEditingProfile(null)}
        />
      ) : (
        <ProfileList
          profiles={profiles}
          projects={projects}
          onEdit={setEditingProfile}
          onDelete={handleProfileDelete}
        />
      )}
    </div>
  );
}

// Group profiles by project
function groupProfilesByProject(
  profiles: TerminalProfile[]
): { global: TerminalProfile[]; byProject: Map<string, TerminalProfile[]> } {
  const global: TerminalProfile[] = [];
  const byProject = new Map<string, TerminalProfile[]>();

  for (const profile of profiles) {
    if (!profile.projectId) {
      global.push(profile);
    } else {
      const existing = byProject.get(profile.projectId) || [];
      existing.push(profile);
      byProject.set(profile.projectId, existing);
    }
  }

  return { global, byProject };
}

function ProfileEditor({
  profile,
  projects,
  onSave,
  onCancel,
}: {
  profile: TerminalProfile;
  projects: ProjectConfig[];
  onSave: (p: TerminalProfile) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState(profile.name);
  const [command, setCommand] = useState(profile.command || "");
  const [color, setColor] = useState(profile.color);
  const [scrollback, setScrollback] = useState<string>(
    profile.scrollback?.toString() || ""
  );
  const [projectId, setProjectId] = useState<string>(profile.projectId || "_global");

  function handleSave() {
    if (!name.trim()) return;
    const scrollbackNum = scrollback ? parseInt(scrollback, 10) : undefined;
    onSave({
      ...profile,
      name: name.trim(),
      command: command.trim() || undefined,
      color,
      scrollback: scrollbackNum && scrollbackNum >= 1000 ? scrollbackNum : undefined,
      projectId: projectId === "_global" ? undefined : projectId,
    });
  }

  return (
    <div className="flex flex-col gap-3.5 p-4 bg-muted rounded-lg border border-border">
      <ATFormField label="Name">
        <Input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Dev Server"
        />
      </ATFormField>

      <ATFormField label="Command (optional)">
        <Input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="e.g., npm run dev"
        />
      </ATFormField>

      <ATFormField label="Scope" hint="Project-scoped profiles only appear for that project">
        <Select value={projectId} onValueChange={setProjectId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Global (all projects)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_global">Global (all projects)</SelectItem>
            {projects.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ATFormField>

      <ATFormField label="Color">
        <div className="flex gap-2 items-center">
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-8 h-8 p-0 border-none rounded cursor-pointer"
          />
          <Input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="flex-1"
          />
        </div>
      </ATFormField>

      <ATFormField label="Scrollback (optional)" hint="Override global scrollback for this profile">
        <Input
          type="number"
          min={1000}
          max={100000}
          step={1000}
          value={scrollback}
          onChange={(e) => setScrollback(e.target.value)}
          placeholder="Use default"
          className="w-28"
        />
      </ATFormField>

      <div className="flex justify-end gap-2 mt-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </div>
  );
}

function ProfileList({
  profiles,
  projects,
  onEdit,
  onDelete,
}: {
  profiles: TerminalProfile[];
  projects: ProjectConfig[];
  onEdit: (profile: TerminalProfile) => void;
  onDelete: (profileId: string) => void;
}) {
  const { global, byProject } = groupProfilesByProject(profiles);
  const projectsWithProfiles = projects.filter((p) => byProject.has(p.id));

  return (
    <div className="flex flex-col gap-4">
      {global.length > 0 && (
        <div>
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            Global
          </h4>
          <div className="flex flex-col gap-1.5">
            {global.map((profile) => (
              <ProfileItem
                key={profile.id}
                profile={profile}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      )}

      {projectsWithProfiles.map((project) => (
        <div key={project.id}>
          <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
            {project.name}
          </h4>
          <div className="flex flex-col gap-1.5">
            {byProject.get(project.id)?.map((profile) => (
              <ProfileItem
                key={profile.id}
                profile={profile}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ProfileItem({
  profile,
  onEdit,
  onDelete,
}: {
  profile: TerminalProfile;
  onEdit: (profile: TerminalProfile) => void;
  onDelete: (profileId: string) => void;
}) {
  return (
    <ATListItem
      actions={
        <>
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-[10px]"
            onClick={() => onEdit(profile)}
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            className="h-6 w-6"
            onClick={() => onDelete(profile.id)}
          >
            <X className="h-3 w-3" />
          </Button>
        </>
      }
    >
      <ATListItemContent
        title={profile.name}
        subtitle={profile.command || "Default shell"}
        icon={<ATColorDot color={profile.color} size="lg" />}
      />
    </ATListItem>
  );
}
