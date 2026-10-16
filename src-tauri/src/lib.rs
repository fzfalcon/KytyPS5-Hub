use futures_util::StreamExt;
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::Mutex,
};
use tauri::Manager;
use tokio::io::AsyncWriteExt;

const USER_AGENT: &str = "KytyPS5-Hub/0.1.0";
const GITHUB_API: &str = "https://api.github.com";

#[derive(Default, Serialize, Deserialize, Clone)]
struct AppConfig {
    base_dir: Option<String>,
}

struct ConfigState(Mutex<AppConfig>);

#[derive(Serialize)]
struct ReleaseAsset {
    name: String,
    size: u64,
    download_url: String,
    content_type: Option<String>,
    browser_download_url: String,
}

#[derive(Serialize)]
struct ReleaseInfo {
    tag_name: String,
    name: String,
    html_url: String,
    published_at: Option<String>,
    prerelease: bool,
    draft: bool,
    body: String,
    assets: Vec<ReleaseAsset>,
}

#[derive(Deserialize)]
struct GithubRelease {
    tag_name: String,
    name: Option<String>,
    html_url: String,
    published_at: Option<String>,
    prerelease: bool,
    draft: bool,
    body: Option<String>,
    assets: Vec<GithubAsset>,
}

#[derive(Deserialize)]
struct GithubAsset {
    name: String,
    size: u64,
    browser_download_url: String,
    content_type: Option<String>,
}

#[derive(Deserialize)]
struct RequestedAsset {
    name: String,
    download_url: String,
}

#[derive(Serialize)]
struct DownloadResult {
    saved_files: Vec<String>,
    folder: String,
    message: String,
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create config directory: {e}"))?;
    Ok(dir.join("settings.json"))
}

fn read_config(app: &tauri::AppHandle) -> AppConfig {
    let path = match config_path(app) {
        Ok(p) => p,
        Err(_) => return AppConfig::default(),
    };
    fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str::<AppConfig>(&raw).ok())
        .unwrap_or_default()
}

fn write_config(app: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    let path = config_path(app)?;
    let raw = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    fs::write(path, raw).map_err(|e| format!("Cannot save settings: {e}"))
}

fn github_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .build()
        .map_err(|e| format!("Could not initialize HTTP client: {e}"))
}

#[tauri::command]
fn get_config(app: tauri::AppHandle, state: tauri::State<'_, ConfigState>) -> AppConfig {
    if let Ok(guard) = state.0.lock() {
        return guard.clone();
    }
    read_config(&app)
}

#[tauri::command]
fn set_base_dir(app: tauri::AppHandle, state: tauri::State<'_, ConfigState>, path: String) -> Result<AppConfig, String> {
    let candidate = PathBuf::from(&path);
    if !candidate.is_absolute() {
        return Err("Please choose an absolute folder path.".to_string());
    }
    fs::create_dir_all(&candidate).map_err(|e| format!("Cannot create selected folder: {e}"))?;
    let config = AppConfig { base_dir: Some(candidate.to_string_lossy().to_string()) };
    write_config(&app, &config)?;
    let mut guard = state.0.lock().map_err(|_| "Settings lock unavailable".to_string())?;
    *guard = config.clone();
    Ok(config)
}

#[tauri::command]
async fn latest_release(owner: String, repo: String) -> Result<Option<ReleaseInfo>, String> {
    if owner.is_empty() || repo.is_empty() || owner.contains('/') || repo.contains('/') {
        return Err("Invalid repository coordinates.".to_string());
    }
    let client = github_client()?;
    let url = format!("{GITHUB_API}/repos/{owner}/{repo}/releases?per_page=30");
    let response = client.get(&url).header("Accept", "application/vnd.github+json").send().await
        .map_err(|e| format!("GitHub request failed: {e}"))?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(format!("Repository {owner}/{repo} was not found or is private."));
    }
    if response.status() == reqwest::StatusCode::FORBIDDEN || response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("GitHub API rate limit reached. Try again later.".to_string());
    }
    if !response.status().is_success() {
        return Err(format!("GitHub API returned HTTP {}", response.status()));
    }
    let releases: Vec<GithubRelease> = response.json().await
        .map_err(|e| format!("Could not parse GitHub release response: {e}"))?;
    let chosen = releases.into_iter().filter(|r| !r.draft)
        .max_by_key(|r| r.published_at.clone().unwrap_or_default());
    Ok(chosen.map(|r| ReleaseInfo {
        tag_name: r.tag_name,
        name: r.name.unwrap_or_default(),
        html_url: r.html_url,
        published_at: r.published_at,
        prerelease: r.prerelease,
        draft: r.draft,
        body: r.body.unwrap_or_default(),
        assets: r.assets.into_iter().map(|a| ReleaseAsset {
            name: a.name.clone(),
            size: a.size,
            download_url: a.browser_download_url.clone(),
            content_type: a.content_type,
            browser_download_url: a.browser_download_url,
        }).collect(),
    }))
}

fn safe_component(value: &str) -> String {
    let clean = sanitize_filename::sanitize(value);
    let trimmed = clean.trim_matches(['.', ' ']);
    if trimmed.is_empty() { "release".to_string() } else { trimmed.to_string() }
}

fn ensure_child(base: &Path, source_id: &str, tag: &str) -> Result<PathBuf, String> {
    let source = match source_id {
        "wolverine" => "Wolverine",
        "astro-bot" => "Astro Bot",
        "official" => "Official",
        _ => return Err("Unknown source identifier.".to_string()),
    };
    let target = base.join(source).join(safe_component(tag));
    fs::create_dir_all(&target).map_err(|e| format!("Cannot create destination folder: {e}"))?;
    Ok(target)
}

#[tauri::command]
async fn download_release(
    app: tauri::AppHandle,
    state: tauri::State<'_, ConfigState>,
    owner: String,
    repo: String,
    tag: String,
    source_id: String,
    assets: Vec<RequestedAsset>,
) -> Result<DownloadResult, String> {
    if owner.is_empty() || repo.is_empty() || owner.contains('/') || repo.contains('/') {
        return Err("Invalid repository coordinates.".to_string());
    }
    if assets.is_empty() {
        return Err("This release has no downloadable assets.".to_string());
    }
    let config = state.0.lock().map_err(|_| "Settings lock unavailable".to_string())?.clone();
    let base = config.base_dir.ok_or_else(|| "Choose a download folder in Settings first.".to_string())?;
    let base_path = PathBuf::from(base);
    let target = ensure_child(&base_path, &source_id, &tag)?;
    let client = github_client()?;
    let mut saved = Vec::new();

    for asset in assets {
        if asset.name.is_empty() || asset.download_url.is_empty() {
            continue;
        }
        // Only accept GitHub release asset URLs to avoid arbitrary URL downloads.
        let parsed = reqwest::Url::parse(&asset.download_url).map_err(|e| e.to_string())?;
        if parsed.scheme() != "https" || parsed.host_str() != Some("github.com") {
            return Err(format!("Rejected unexpected asset URL for {}.", asset.name));
        }
        let file_name = safe_component(&asset.name);
        let destination = target.join(&file_name);
        let partial = target.join(format!("{file_name}.part"));
        let response = client.get(parsed).header("Accept", "application/octet-stream").send().await
            .map_err(|e| format!("Download request failed for {}: {e}", asset.name))?;
        if !response.status().is_success() {
            return Err(format!("Download failed for {} (HTTP {}).", asset.name, response.status()));
        }
        let mut stream = response.bytes_stream();
        let mut output = tokio::fs::File::create(&partial).await
            .map_err(|e| format!("Cannot create download file: {e}"))?;
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| format!("Network interrupted while downloading {}: {e}", asset.name))?;
            output.write_all(&chunk).await.map_err(|e| format!("Cannot write download: {e}"))?;
        }
        output.flush().await.map_err(|e| e.to_string())?;
        drop(output);
        if destination.exists() {
            fs::remove_file(&destination).map_err(|e| format!("Cannot replace existing file {}: {e}", destination.display()))?;
        }
        fs::rename(&partial, &destination).map_err(|e| format!("Cannot finalize download: {e}"))?;
        saved.push(destination.to_string_lossy().to_string());
    }
    if saved.is_empty() {
        return Err("No valid release assets were downloaded.".to_string());
    }
    Ok(DownloadResult {
        saved_files: saved,
        folder: target.to_string_lossy().to_string(),
        message: format!("Downloaded release {tag} from {owner}/{repo}."),
    })
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(ConfigState(Mutex::new(AppConfig::default())))
        .setup(|app| {
            let config = read_config(&app.handle());
            if let Ok(mut state) = app.state::<ConfigState>().0.lock() {
                *state = config;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            set_base_dir,
            latest_release,
            download_release
        ])
        .run(tauri::generate_context!())
        .expect("error while running KytyPS5 Hub");
}
