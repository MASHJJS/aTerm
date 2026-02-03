use serde::{Deserialize, Serialize};
use std::collections::hash_map::DefaultHasher;
use std::fs;
use std::hash::{Hash, Hasher};
use std::path::{Path, PathBuf};
use std::process::Command;
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorktreeInfo {
    pub path: String,
    pub branch: String,
}

fn ensure_git_repo(path: &str) -> Result<(), String> {
    let output = Command::new("git")
        .args(["-C", path, "rev-parse", "--is-inside-work-tree"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Not a git repository".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.trim() != "true" {
        return Err("Not a git repository".to_string());
    }

    Ok(())
}

fn get_current_branch(project_path: &str) -> Result<String, String> {
    let output = Command::new("git")
        .args(["-C", project_path, "branch", "--show-current"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Failed to determine current branch".to_string());
    }

    let branch = String::from_utf8_lossy(&output.stdout).trim().to_string();
    if branch.is_empty() {
        Ok("HEAD".to_string())
    } else {
        Ok(branch)
    }
}

fn branch_exists(project_path: &str, branch: &str) -> Result<bool, String> {
    let status = Command::new("git")
        .args([
            "-C",
            project_path,
            "show-ref",
            "--verify",
            "--quiet",
            &format!("refs/heads/{}", branch),
        ])
        .status()
        .map_err(|e| e.to_string())?;

    Ok(status.success())
}

fn slugify_task_name(name: &str) -> String {
    let mut slug = String::new();
    let mut prev_dash = false;

    for ch in name.chars() {
        let lower = ch.to_ascii_lowercase();
        if lower.is_ascii_alphanumeric() {
            slug.push(lower);
            prev_dash = false;
        } else if !prev_dash && !slug.is_empty() {
            slug.push('-');
            prev_dash = true;
        }
    }

    let slug = slug.trim_matches('-').to_string();
    if slug.is_empty() {
        "task".to_string()
    } else {
        slug
    }
}

fn generate_suffix(seed: &str) -> String {
    let mut hasher = DefaultHasher::new();
    seed.hash(&mut hasher);
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    nanos.hash(&mut hasher);
    let hash = hasher.finish();
    format!("{:03x}", hash & 0xfff)
}

fn copy_preserved_files(project_path: &Path, worktree_path: &Path) -> Result<(), String> {
    let entries = fs::read_dir(project_path).map_err(|e| e.to_string())?;
    for entry in entries {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if !path.is_file() {
            continue;
        }

        let name = entry.file_name().to_string_lossy().to_string();
        let should_copy = name == ".envrc"
            || name == "docker-compose.override.yml"
            || name.starts_with(".env");

        if should_copy {
            let dest = worktree_path.join(&name);
            fs::copy(&path, &dest)
                .map_err(|e| format!("Failed to copy {}: {}", name, e))?;
        }
    }

    Ok(())
}

#[tauri::command]
pub fn create_worktree(
    project_path: String,
    task_name: String,
    base_ref: Option<String>,
) -> Result<WorktreeInfo, String> {
    ensure_git_repo(&project_path)?;

    let project_dir = PathBuf::from(&project_path);
    let project_name = project_dir
        .file_name()
        .ok_or_else(|| "Invalid project path".to_string())?
        .to_string_lossy()
        .to_string();

    let parent_dir = project_dir
        .parent()
        .ok_or_else(|| "Project path has no parent".to_string())?;

    let worktrees_root = parent_dir.join("worktrees").join(&project_name);
    fs::create_dir_all(&worktrees_root).map_err(|e| e.to_string())?;

    let slug = slugify_task_name(&task_name);
    let base_ref = base_ref
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
        .unwrap_or(get_current_branch(&project_path)?);

    for attempt in 0..20 {
        let suffix = generate_suffix(&format!("{}-{}", task_name, attempt));
        let branch = format!("aterm/{}-{}", slug, suffix);
        let worktree_path = worktrees_root.join(format!("{}-{}", slug, suffix));

        if worktree_path.exists() {
            continue;
        }

        if branch_exists(&project_path, &branch)? {
            continue;
        }

        let status = Command::new("git")
            .args([
                "-C",
                &project_path,
                "worktree",
                "add",
                "-b",
                &branch,
                worktree_path
                    .to_str()
                    .ok_or_else(|| "Invalid worktree path".to_string())?,
                &base_ref,
            ])
            .status()
            .map_err(|e| e.to_string())?;

        if !status.success() {
            return Err("git worktree add failed".to_string());
        }

        copy_preserved_files(&project_dir, &worktree_path)?;

        return Ok(WorktreeInfo {
            path: worktree_path.to_string_lossy().to_string(),
            branch,
        });
    }

    Err("Failed to generate unique worktree path".to_string())
}

#[tauri::command]
pub fn remove_worktree(worktree_path: String) -> Result<(), String> {
    let common_dir_output = Command::new("git")
        .args([
            "-C",
            &worktree_path,
            "rev-parse",
            "--git-common-dir",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !common_dir_output.status.success() {
        return Err("Failed to locate git common dir".to_string());
    }

    let common_dir_raw = String::from_utf8_lossy(&common_dir_output.stdout)
        .trim()
        .to_string();
    let mut common_dir = PathBuf::from(&common_dir_raw);
    if common_dir.is_relative() {
        common_dir = PathBuf::from(&worktree_path).join(common_dir);
    }

    let status = Command::new("git")
        .args([
            "--git-dir",
            common_dir
                .to_str()
                .ok_or_else(|| "Invalid git common dir".to_string())?,
            "worktree",
            "remove",
            "--force",
            &worktree_path,
        ])
        .status()
        .map_err(|e| e.to_string())?;

    if !status.success() {
        return Err("git worktree remove failed".to_string());
    }

    Ok(())
}

#[tauri::command]
pub fn list_worktrees(project_path: String) -> Result<Vec<WorktreeInfo>, String> {
    ensure_git_repo(&project_path)?;

    let output = Command::new("git")
        .args(["-C", &project_path, "worktree", "list", "--porcelain"])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Failed to list worktrees".to_string());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut results = Vec::new();
    let mut current_path: Option<String> = None;
    let mut current_branch: Option<String> = None;

    for line in text.lines() {
        if let Some(rest) = line.strip_prefix("worktree ") {
            if let Some(path) = current_path.take() {
                let branch = current_branch.take().unwrap_or_else(|| "detached".to_string());
                results.push(WorktreeInfo { path, branch });
            }
            current_path = Some(rest.trim().to_string());
            current_branch = None;
        } else if let Some(rest) = line.strip_prefix("branch ") {
            let mut branch = rest.trim().to_string();
            if let Some(stripped) = branch.strip_prefix("refs/heads/") {
                branch = stripped.to_string();
            }
            current_branch = Some(branch);
        } else if line.starts_with("detached") {
            current_branch = Some("detached".to_string());
        }
    }

    if let Some(path) = current_path.take() {
        let branch = current_branch.unwrap_or_else(|| "detached".to_string());
        results.push(WorktreeInfo { path, branch });
    }

    Ok(results)
}

#[tauri::command]
pub fn list_git_branches(project_path: String) -> Result<Vec<String>, String> {
    ensure_git_repo(&project_path)?;

    let output = Command::new("git")
        .args([
            "-C",
            &project_path,
            "for-each-ref",
            "refs/heads",
            "--format=%(refname:short)",
        ])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Failed to list branches".to_string());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let mut branches: Vec<String> = text
        .lines()
        .map(|line| line.trim().to_string())
        .filter(|line| !line.is_empty())
        .collect();

    branches.sort();
    Ok(branches)
}
