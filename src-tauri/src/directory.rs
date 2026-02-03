use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DirEntry {
    name: String,
    path: String,
    is_dir: bool,
    is_git_repo: bool,
}

#[tauri::command]
pub fn list_directory(path: Option<String>) -> Result<Vec<DirEntry>, String> {
    let dir_path = path
        .map(PathBuf::from)
        .unwrap_or_else(|| dirs::home_dir().unwrap_or_else(|| PathBuf::from("/")));

    let mut entries = Vec::new();

    let read_dir = fs::read_dir(&dir_path).map_err(|e| e.to_string())?;

    for entry in read_dir.filter_map(|e| e.ok()) {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        if name.starts_with('.') && name != ".." {
            continue;
        }

        let is_dir = path.is_dir();
        let is_git_repo = is_dir && path.join(".git").exists();

        entries.push(DirEntry {
            name,
            path: path.to_string_lossy().to_string(),
            is_dir,
            is_git_repo,
        });
    }

    entries.sort_by(|a, b| {
        match (a.is_dir, b.is_dir) {
            (true, false) => std::cmp::Ordering::Less,
            (false, true) => std::cmp::Ordering::Greater,
            _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
        }
    });

    Ok(entries)
}

#[tauri::command]
pub fn get_home_dir() -> String {
    dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/"))
        .to_string_lossy()
        .to_string()
}
