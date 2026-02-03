use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ITermProfile {
    name: String,
    guid: String,
    command: Option<String>,
    working_directory: Option<String>,
}

#[tauri::command]
pub fn get_iterm_profiles() -> Result<Vec<ITermProfile>, String> {
    let plist_path = dirs::home_dir()
        .unwrap_or_else(|| PathBuf::from("/"))
        .join("Library/Preferences/com.googlecode.iterm2.plist");

    if !plist_path.exists() {
        return Err("iTerm2 preferences not found".to_string());
    }

    let plist_value: plist::Value = plist::from_file(&plist_path)
        .map_err(|e| format!("Failed to read iTerm2 plist: {}", e))?;

    let dict = plist_value.as_dictionary()
        .ok_or("Invalid plist format")?;

    let bookmarks = dict.get("New Bookmarks")
        .and_then(|v| v.as_array())
        .ok_or("No profiles found in iTerm2")?;

    let mut profiles = Vec::new();

    for bookmark in bookmarks {
        if let Some(bookmark_dict) = bookmark.as_dictionary() {
            let name = bookmark_dict.get("Name")
                .and_then(|v| v.as_string())
                .unwrap_or("Unnamed")
                .to_string();

            let guid = bookmark_dict.get("Guid")
                .and_then(|v| v.as_string())
                .unwrap_or("")
                .to_string();

            // Get command - prefer "Initial Text" (Send Text at Start) over "Command"
            let command = bookmark_dict.get("Initial Text")
                .and_then(|v| v.as_string())
                .filter(|s| !s.is_empty())
                .or_else(|| bookmark_dict.get("Command")
                    .and_then(|v| v.as_string())
                    .filter(|s| !s.is_empty()))
                .map(|s| s.to_string());

            let working_directory = bookmark_dict.get("Working Directory")
                .and_then(|v| v.as_string())
                .filter(|s| !s.is_empty())
                .map(|s| s.to_string());

            if !guid.is_empty() {
                profiles.push(ITermProfile {
                    name,
                    guid,
                    command,
                    working_directory,
                });
            }
        }
    }

    Ok(profiles)
}
