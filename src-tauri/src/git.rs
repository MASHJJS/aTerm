use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitFile {
    path: String,
    status: String,
    staged: bool,
    old_path: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GitStatus {
    branch: String,
    ahead: i32,
    behind: i32,
    staged: Vec<GitFile>,
    unstaged: Vec<GitFile>,
    untracked: Vec<GitFile>,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitSummary {
    hash: String,
    short_hash: String,
    subject: String,
    author: String,
    timestamp: i64,
    relative_time: String,
    files_changed: i32,
    additions: i32,
    deletions: i32,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommitFile {
    path: String,
    status: String,
    additions: i32,
    deletions: i32,
}

fn parse_status_code(code: &str) -> &'static str {
    match code {
        "M" => "modified",
        "A" => "added",
        "D" => "deleted",
        "R" => "renamed",
        "C" => "copied",
        "U" => "unmerged",
        "?" => "untracked",
        _ => "unknown",
    }
}

fn parse_relative_time(seconds_ago: i64) -> String {
    if seconds_ago < 60 {
        "just now".to_string()
    } else if seconds_ago < 3600 {
        let mins = seconds_ago / 60;
        format!("{}m ago", mins)
    } else if seconds_ago < 86400 {
        let hours = seconds_ago / 3600;
        format!("{}h ago", hours)
    } else if seconds_ago < 604800 {
        let days = seconds_ago / 86400;
        format!("{}d ago", days)
    } else if seconds_ago < 2592000 {
        let weeks = seconds_ago / 604800;
        format!("{}w ago", weeks)
    } else {
        let months = seconds_ago / 2592000;
        format!("{}mo ago", months)
    }
}

#[tauri::command]
pub fn get_git_status(path: String) -> Result<GitStatus, String> {
    // Get current branch
    let branch_output = std::process::Command::new("git")
        .args(["-C", &path, "branch", "--show-current"])
        .output()
        .map_err(|e| e.to_string())?;
    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();

    // Get ahead/behind counts
    let mut ahead = 0;
    let mut behind = 0;
    let revlist_output = std::process::Command::new("git")
        .args(["-C", &path, "rev-list", "--left-right", "--count", "@{upstream}...HEAD"])
        .output();

    if let Ok(output) = revlist_output {
        if output.status.success() {
            let counts = String::from_utf8_lossy(&output.stdout);
            let parts: Vec<&str> = counts.trim().split_whitespace().collect();
            if parts.len() == 2 {
                behind = parts[0].parse().unwrap_or(0);
                ahead = parts[1].parse().unwrap_or(0);
            }
        }
    }

    // Get status with porcelain v1
    let status_output = std::process::Command::new("git")
        .args(["-C", &path, "status", "--porcelain=v1"])
        .output()
        .map_err(|e| e.to_string())?;

    let status_text = String::from_utf8_lossy(&status_output.stdout);

    let mut staged = Vec::new();
    let mut unstaged = Vec::new();
    let mut untracked = Vec::new();

    for line in status_text.lines() {
        if line.len() < 3 {
            continue;
        }

        let index_status = &line[0..1];
        let worktree_status = &line[1..2];
        let file_path = line[3..].to_string();

        // Handle renames (format: "R  old_path -> new_path")
        let (actual_path, old_path) = if file_path.contains(" -> ") {
            let parts: Vec<&str> = file_path.split(" -> ").collect();
            (parts[1].to_string(), Some(parts[0].to_string()))
        } else {
            (file_path, None)
        };

        // Untracked files
        if index_status == "?" {
            untracked.push(GitFile {
                path: actual_path,
                status: "untracked".to_string(),
                staged: false,
                old_path: None,
            });
            continue;
        }

        // Staged changes (index status)
        if index_status != " " && index_status != "?" {
            staged.push(GitFile {
                path: actual_path.clone(),
                status: parse_status_code(index_status).to_string(),
                staged: true,
                old_path: old_path.clone(),
            });
        }

        // Unstaged changes (worktree status)
        if worktree_status != " " {
            unstaged.push(GitFile {
                path: actual_path,
                status: parse_status_code(worktree_status).to_string(),
                staged: false,
                old_path,
            });
        }
    }

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        staged,
        unstaged,
        untracked,
    })
}

#[tauri::command]
pub fn get_file_diff(path: String, file: String, staged: bool) -> Result<String, String> {
    let mut args = vec!["-C", &path, "diff"];
    if staged {
        args.push("--staged");
    }
    args.push("--");
    args.push(&file);

    let output = std::process::Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    // If no diff (e.g., untracked file), show the file content
    if output.stdout.is_empty() {
        let file_path = PathBuf::from(&path).join(&file);
        if file_path.exists() {
            let content = fs::read_to_string(&file_path).unwrap_or_default();
            // Format as a pseudo-diff for new files
            let lines: Vec<String> = content.lines().map(|l| format!("+{}", l)).collect();
            return Ok(format!("New file: {}\n\n{}", file, lines.join("\n")));
        }
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[tauri::command]
pub fn stage_files(path: String, files: Vec<String>) -> Result<(), String> {
    let mut args = vec!["-C".to_string(), path, "add".to_string(), "--".to_string()];
    args.extend(files);

    let output = std::process::Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn stage_all(path: String) -> Result<(), String> {
    let output = std::process::Command::new("git")
        .args(["-C", &path, "add", "-A"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn unstage_files(path: String, files: Vec<String>) -> Result<(), String> {
    let mut args = vec!["-C".to_string(), path, "reset".to_string(), "HEAD".to_string(), "--".to_string()];
    args.extend(files);

    let output = std::process::Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn unstage_all(path: String) -> Result<(), String> {
    let output = std::process::Command::new("git")
        .args(["-C", &path, "reset", "HEAD"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn discard_changes(path: String, file: String, is_untracked: bool) -> Result<(), String> {
    if is_untracked {
        // Delete untracked file
        let file_path = PathBuf::from(&path).join(&file);
        fs::remove_file(&file_path).map_err(|e| e.to_string())?;
    } else {
        // Restore tracked file
        let output = std::process::Command::new("git")
            .args(["-C", &path, "checkout", "--", &file])
            .output()
            .map_err(|e| e.to_string())?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).to_string());
        }
    }
    Ok(())
}

#[tauri::command]
pub fn git_commit(path: String, message: String) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(["-C", &path, "commit", "-m", &message])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn git_push(path: String) -> Result<String, String> {
    // First try normal push
    let output = std::process::Command::new("git")
        .args(["-C", &path, "push"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        return Ok(String::from_utf8_lossy(&output.stdout).to_string());
    }

    // If that fails, try to set upstream
    let branch_output = std::process::Command::new("git")
        .args(["-C", &path, "branch", "--show-current"])
        .output()
        .map_err(|e| e.to_string())?;
    let branch = String::from_utf8_lossy(&branch_output.stdout).trim().to_string();

    let output = std::process::Command::new("git")
        .args(["-C", &path, "push", "-u", "origin", &branch])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn get_commit_history(path: String, limit: i32) -> Result<Vec<CommitSummary>, String> {
    // Get commit info with custom format
    let format = "%H|%h|%s|%an|%ct";
    let output = std::process::Command::new("git")
        .args(["-C", &path, "log", &format!("--format={}", format), &format!("-n{}", limit)])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap()
        .as_secs() as i64;

    let mut commits = Vec::new();
    let log_text = String::from_utf8_lossy(&output.stdout);

    for line in log_text.lines() {
        let parts: Vec<&str> = line.split('|').collect();
        if parts.len() >= 5 {
            let timestamp: i64 = parts[4].parse().unwrap_or(0);
            let seconds_ago = now - timestamp;

            commits.push(CommitSummary {
                hash: parts[0].to_string(),
                short_hash: parts[1].to_string(),
                subject: parts[2].to_string(),
                author: parts[3].to_string(),
                timestamp,
                relative_time: parse_relative_time(seconds_ago),
                files_changed: 0,
                additions: 0,
                deletions: 0,
            });
        }
    }

    // Get stats for each commit
    for commit in &mut commits {
        let stat_output = std::process::Command::new("git")
            .args(["-C", &path, "show", "--stat", "--format=", &commit.hash])
            .output();

        if let Ok(output) = stat_output {
            let stat_text = String::from_utf8_lossy(&output.stdout);
            // Parse the summary line like "3 files changed, 10 insertions(+), 5 deletions(-)"
            for line in stat_text.lines() {
                if line.contains("changed") {
                    let parts: Vec<&str> = line.split_whitespace().collect();
                    for (i, part) in parts.iter().enumerate() {
                        if *part == "file" || *part == "files" {
                            if i > 0 {
                                commit.files_changed = parts[i - 1].parse().unwrap_or(0);
                            }
                        } else if part.contains("insertion") {
                            if i > 0 {
                                commit.additions = parts[i - 1].parse().unwrap_or(0);
                            }
                        } else if part.contains("deletion") {
                            if i > 0 {
                                commit.deletions = parts[i - 1].parse().unwrap_or(0);
                            }
                        }
                    }
                    break;
                }
            }
        }
    }

    Ok(commits)
}

#[tauri::command]
pub fn get_commit_files(path: String, hash: String) -> Result<Vec<CommitFile>, String> {
    let output = std::process::Command::new("git")
        .args(["-C", &path, "show", "--numstat", "--name-status", "--format=", &hash])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err(String::from_utf8_lossy(&output.stderr).to_string());
    }

    let text = String::from_utf8_lossy(&output.stdout);
    let lines: Vec<&str> = text.lines().collect();

    let mut files = Vec::new();
    let mut numstat_map: HashMap<String, (i32, i32)> = HashMap::new();

    // First pass: collect numstat (additions/deletions)
    for line in &lines {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() == 3 {
            let additions: i32 = parts[0].parse().unwrap_or(0);
            let deletions: i32 = parts[1].parse().unwrap_or(0);
            let file_path = parts[2].to_string();
            numstat_map.insert(file_path, (additions, deletions));
        }
    }

    // Second pass: collect name-status
    for line in &lines {
        let parts: Vec<&str> = line.split('\t').collect();
        if parts.len() >= 2 && parts[0].len() == 1 {
            let status_code = parts[0];
            let file_path = if parts.len() == 3 {
                // Rename: "R\told_path\tnew_path"
                parts[2].to_string()
            } else {
                parts[1].to_string()
            };

            let (additions, deletions) = numstat_map.get(&file_path).copied().unwrap_or((0, 0));

            let status = match status_code {
                "A" => "added",
                "M" => "modified",
                "D" => "deleted",
                "R" => "renamed",
                _ => "modified",
            };

            files.push(CommitFile {
                path: file_path,
                status: status.to_string(),
                additions,
                deletions,
            });
        }
    }

    Ok(files)
}

#[tauri::command]
pub fn get_commit_diff(path: String, hash: String, file: Option<String>) -> Result<String, String> {
    let mut args = vec!["-C", &path, "show", &hash];

    let file_ref;
    if let Some(ref f) = file {
        args.push("--");
        file_ref = f.as_str();
        args.push(file_ref);
    }

    let output = std::process::Command::new("git")
        .args(&args)
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn clone_repo(url: String, destination: String) -> Result<String, String> {
    let output = std::process::Command::new("git")
        .args(["clone", &url, &destination])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        Ok(destination)
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}

#[tauri::command]
pub fn get_git_remote(path: String) -> Result<Option<String>, String> {
    let output = std::process::Command::new("git")
        .args(["-C", &path, "remote", "get-url", "origin"])
        .output()
        .map_err(|e| e.to_string())?;

    if output.status.success() {
        let remote = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(if remote.is_empty() { None } else { Some(remote) })
    } else {
        Ok(None)
    }
}
