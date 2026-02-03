use serde_json::Value;
use std::fs;
use std::path::PathBuf;

fn get_config_path() -> PathBuf {
    dirs::config_dir()
        .unwrap_or_else(|| PathBuf::from("."))
        .join("aterm")
        .join("config.json")
}

fn ensure_config_dir() -> std::io::Result<()> {
    let config_path = get_config_path();
    if let Some(parent) = config_path.parent() {
        fs::create_dir_all(parent)?;
    }
    Ok(())
}

#[tauri::command]
pub fn load_config() -> Result<Value, String> {
    let config_path = get_config_path();

    if !config_path.exists() {
        // Return null, frontend will use defaults
        return Ok(Value::Null);
    }

    let content = fs::read_to_string(&config_path).map_err(|e| e.to_string())?;
    let config: Value = serde_json::from_str(&content).map_err(|e| e.to_string())?;
    Ok(config)
}

#[tauri::command]
pub fn save_config(config: Value) -> Result<(), String> {
    ensure_config_dir().map_err(|e| e.to_string())?;
    let config_path = get_config_path();
    let content = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&config_path, content).map_err(|e| e.to_string())?;
    Ok(())
}
