use std::fs;
use std::sync::Mutex;

static STARTUP_FILE: Mutex<Option<String>> = Mutex::new(None);

#[tauri::command]
fn get_startup_file() -> Option<String> {
    STARTUP_FILE.lock().unwrap().clone()
}

#[tauri::command]
fn read_startup_file() -> Option<Vec<u8>> {
    let path = STARTUP_FILE.lock().unwrap().clone()?;
    fs::read(&path).ok()
}

#[tauri::command]
fn write_file(path: String, data: Vec<u8>) -> Result<(), String> {
    fs::write(&path, &data).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_ai_config() -> Option<String> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("ai-config.json")));
    exe_dir.and_then(|p| fs::read_to_string(&p).ok())
}

#[tauri::command]
fn get_funclists() -> Vec<serde_json::Value> {
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|d| d.join("funclist")));
    let mut results = Vec::new();
    if let Some(base) = exe_dir {
        if let Ok(entries) = fs::read_dir(&base) {
            for entry in entries.flatten() {
                let path = entry.path();
                if !path.is_dir() { continue; }
                let json_path = path.join("FuncList.json");
                if let Ok(content) = fs::read_to_string(&json_path) {
                    if let Ok(mut val) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(obj) = val.as_object_mut() {
                            let folder = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                            obj.insert("__folder".into(), folder.into());
                            results.push(val);
                        }
                    }
                }
            }
        }
    }
    results
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run(args: Vec<String>) {
  // 记录所有参数到日志文件
  let log_path = std::env::current_exe()
    .unwrap_or_default()
    .parent()
    .unwrap_or(std::path::Path::new("."))
    .join("knotlink_startup.log");
  let _ = fs::write(&log_path, format!("args: {:?}\n", args));

  // 拖拽/双击打开的文件路径
  if let Some(path) = args.into_iter().find(|a| a.ends_with(".kln")) {
    let _ = fs::write(&log_path, format!("found kln: {}\n", path));
    *STARTUP_FILE.lock().unwrap() = Some(path);
  }

  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .plugin(tauri_plugin_fs::init())
    .invoke_handler(tauri::generate_handler![get_funclists, get_startup_file, read_startup_file, write_file, read_ai_config])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
