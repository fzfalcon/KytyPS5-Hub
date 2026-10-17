use futures_util::{stream, StreamExt};
use serde::{Deserialize, Serialize};
use std::{
    fs,
    path::{Path, PathBuf},
    process::Command,
    sync::Mutex,
};
use tauri::Manager;
use tokio::io::AsyncWriteExt;
use zip::ZipArchive;

const USER_AGENT: &str = "KytyPS5-Hub/0.2.0";
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
#[derive(Deserialize, Clone)]
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
#[derive(Serialize, Deserialize, Clone)]
struct DownloadRecord {
    source_id: String,
    #[serde(default)]
    platform: String,
    owner: String,
    repo: String,
    tag: String,
    folder: String,
    files: Vec<String>,
    completed_at: String,
    extracted_folder: Option<String>,
}
#[derive(Serialize, Deserialize, Default)]
struct DownloadManifest {
    records: Vec<DownloadRecord>,
}

fn config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create config directory: {e}"))?;
    Ok(dir.join("settings.json"))
}
fn manifest_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_config_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| format!("Cannot create config directory: {e}"))?;
    Ok(dir.join("downloads.json"))
}
fn read_config(app: &tauri::AppHandle) -> AppConfig {
    config_path(app).ok().and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}
fn write_config(app: &tauri::AppHandle, config: &AppConfig) -> Result<(), String> {
    fs::write(config_path(app)?, serde_json::to_vec_pretty(config).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Cannot save settings: {e}"))
}
fn read_manifest(app: &tauri::AppHandle) -> DownloadManifest {
    manifest_path(app).ok().and_then(|p| fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok()).unwrap_or_default()
}
fn write_manifest(app: &tauri::AppHandle, manifest: &DownloadManifest) -> Result<(), String> {
    fs::write(manifest_path(app)?, serde_json::to_vec_pretty(manifest).map_err(|e| e.to_string())?)
        .map_err(|e| format!("Cannot save download history: {e}"))
}
fn github_client() -> Result<reqwest::Client, String> {
    reqwest::Client::builder().user_agent(USER_AGENT).build()
        .map_err(|e| format!("Could not initialize HTTP client: {e}"))
}

#[tauri::command]
fn get_config(app: tauri::AppHandle, state: tauri::State<'_, ConfigState>) -> AppConfig {
    state.0.lock().map(|s| s.clone()).unwrap_or_else(|_| read_config(&app))
}
#[tauri::command]
fn set_base_dir(app: tauri::AppHandle, state: tauri::State<'_, ConfigState>, path: String) -> Result<AppConfig, String> {
    let candidate = PathBuf::from(&path);
    if !candidate.is_absolute() { return Err("Please choose an absolute folder path.".into()); }
    fs::create_dir_all(&candidate).map_err(|e| format!("Cannot create selected folder: {e}"))?;
    let config = AppConfig { base_dir: Some(candidate.to_string_lossy().to_string()) };
    write_config(&app, &config)?;
    *state.0.lock().map_err(|_| "Settings lock unavailable".to_string())? = config.clone();
    Ok(config)
}

#[tauri::command]
async fn latest_release(owner: String, repo: String) -> Result<Option<ReleaseInfo>, String> {
    if owner.is_empty() || repo.is_empty() || owner.contains('/') || repo.contains('/') {
        return Err("Invalid repository coordinates.".into());
    }
    let response = github_client()?.get(format!("{GITHUB_API}/repos/{owner}/{repo}/releases?per_page=30"))
        .header("Accept", "application/vnd.github+json").send().await
        .map_err(|e| format!("GitHub request failed: {e}"))?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(format!("Repository {owner}/{repo} was not found or is private."));
    }
    if response.status() == reqwest::StatusCode::FORBIDDEN || response.status() == reqwest::StatusCode::TOO_MANY_REQUESTS {
        return Err("GitHub API rate limit reached. Try again later.".into());
    }
    if !response.status().is_success() { return Err(format!("GitHub API returned HTTP {}", response.status())); }
    let releases: Vec<GithubRelease> = response.json().await.map_err(|e| format!("Could not parse GitHub release response: {e}"))?;
    let chosen = releases.into_iter().filter(|r| !r.draft).max_by_key(|r| r.published_at.clone().unwrap_or_default());
    Ok(chosen.map(|r| ReleaseInfo {
        tag_name: r.tag_name, name: r.name.unwrap_or_default(), html_url: r.html_url,
        published_at: r.published_at, prerelease: r.prerelease, draft: r.draft,
        body: r.body.unwrap_or_default(),
        assets: r.assets.into_iter().map(|a| ReleaseAsset {
            name: a.name.clone(), size: a.size, download_url: a.browser_download_url.clone(),
            content_type: a.content_type, browser_download_url: a.browser_download_url,
        }).collect(),
    }))
}

fn safe_component(value: &str) -> String {
    let clean = sanitize_filename::sanitize(value);
    let trimmed = clean.trim_matches(['.', ' ']);
    if trimmed.is_empty() { "release".to_string() } else { trimmed.to_string() }
}
fn source_folder(source_id: &str) -> Result<String, String> {
    let folder = match source_id {
        "wolverine" => "Senaxx".to_string(),
        "astro-bot" => "Jetsku".to_string(),
        "official" => "Official".to_string(),
        _ => safe_component(source_id),
    };
    if folder.is_empty() || folder == "." || folder == ".." {
        return Err("Invalid source identifier.".into());
    }
    Ok(folder)
}
fn ensure_child(base: &Path, source_id: &str, tag: &str, platform: &str) -> Result<PathBuf, String> {
    let platform_dir = match platform {
        "windows" => "Windows",
        "linux" => "Linux",
        "macos" => "macOS",
        "all" => "All-assets",
        _ => return Err("Unknown platform selector.".into()),
    };
    let target = base.join(source_folder(source_id)?).join(safe_component(tag)).join(platform_dir);
    fs::create_dir_all(&target).map_err(|e| format!("Cannot create destination folder: {e}"))?;
    Ok(target)
}

async fn download_one(client: reqwest::Client, target: PathBuf, asset: RequestedAsset) -> Result<String, String> {
    if asset.name.is_empty() || asset.download_url.is_empty() { return Err("Asset name or URL is empty.".into()); }
    let parsed = reqwest::Url::parse(&asset.download_url).map_err(|e| e.to_string())?;
    if parsed.scheme() != "https" || parsed.host_str() != Some("github.com") {
        return Err(format!("Rejected unexpected asset URL for {}.", asset.name));
    }
    let file_name = safe_component(&asset.name);
    let destination = target.join(&file_name);
    let partial = target.join(format!("{file_name}.part"));
    let response = client.get(parsed).header("Accept", "application/octet-stream").send().await
        .map_err(|e| format!("Download request failed for {}: {e}", asset.name))?;
    if !response.status().is_success() { return Err(format!("Download failed for {} (HTTP {}).", asset.name, response.status())); }
    let mut stream = response.bytes_stream();
    let mut output = tokio::fs::File::create(&partial).await.map_err(|e| format!("Cannot create download file: {e}"))?;
    while let Some(chunk) = stream.next().await {
        let chunk = chunk.map_err(|e| format!("Network interrupted while downloading {}: {e}", asset.name))?;
        output.write_all(&chunk).await.map_err(|e| format!("Cannot write download: {e}"))?;
    }
    output.flush().await.map_err(|e| e.to_string())?;
    drop(output);
    if destination.exists() { fs::remove_file(&destination).map_err(|e| format!("Cannot replace existing file {}: {e}", destination.display()))?; }
    fs::rename(&partial, &destination).map_err(|e| format!("Cannot finalize download: {e}"))?;
    Ok(destination.to_string_lossy().to_string())
}

#[tauri::command]
async fn download_release(
    app: tauri::AppHandle, state: tauri::State<'_, ConfigState>,
    owner: String, repo: String, tag: String, source_id: String, platform: String, assets: Vec<RequestedAsset>,
) -> Result<DownloadResult, String> {
    if owner.is_empty() || repo.is_empty() || owner.contains('/') || repo.contains('/') { return Err("Invalid repository coordinates.".into()); }
    if assets.is_empty() { return Err("This release has no downloadable assets.".into()); }
    let base = state.0.lock().map_err(|_| "Settings lock unavailable".to_string())?.base_dir.clone()
        .ok_or_else(|| "Choose a download folder in Settings first.".to_string())?;
    let target = ensure_child(Path::new(&base), &source_id, &tag, &platform)?;
    let client = github_client()?;
    // Up to three assets are downloaded concurrently to improve throughput without overwhelming hosts.
    let results: Vec<Result<String, String>> = stream::iter(assets.into_iter().map(|asset| {
        download_one(client.clone(), target.clone(), asset)
    })).buffer_unordered(3).collect().await;
    let mut saved = Vec::new();
    let mut errors = Vec::new();
    for result in results {
        match result { Ok(path) => saved.push(path), Err(error) => errors.push(error) }
    }
    if saved.is_empty() { return Err(errors.join("\n")); }
    let mut manifest = read_manifest(&app);
    manifest.records.retain(|r| !(r.source_id == source_id && r.tag == tag && r.platform == platform));
    manifest.records.push(DownloadRecord {
        source_id: source_id.clone(), platform: platform.clone(), owner: owner.clone(), repo: repo.clone(), tag: tag.clone(),
        folder: target.to_string_lossy().to_string(), files: saved.clone(),
        completed_at: chrono_like_timestamp(), extracted_folder: None,
    });
    write_manifest(&app, &manifest)?;
    let message = if errors.is_empty() { format!("Downloaded {tag} from {owner}/{repo}.") }
        else { format!("Downloaded some assets; {} failed: {}", errors.len(), errors.join("; ")) };
    Ok(DownloadResult { saved_files: saved, folder: target.to_string_lossy().to_string(), message })
}

fn chrono_like_timestamp() -> String {
    // Human-readable local completion marker; does not require a time dependency.
    format!("unix-{}", std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
}

#[tauri::command]
fn get_download_history(app: tauri::AppHandle) -> DownloadManifest {
    read_manifest(&app)
}

#[tauri::command]
fn extract_archive(app: tauri::AppHandle, source_id: String, tag: String, archive_path: String) -> Result<String, String> {
    let manifest_path = manifest_path(&app)?;
    let _ = manifest_path; // Ensures app config path is writable before doing extraction.
    let archive = PathBuf::from(&archive_path);
    let base_dir = archive.parent().ok_or("Archive has no parent directory.")?;
    if archive.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("zip")) != Some(true) {
        return Err("Automatic extraction currently supports ZIP archives. Other formats remain downloaded and can be opened manually.".into());
    }
    let dest = base_dir.join(format!("extracted-{}", safe_component(&tag)));
    fs::create_dir_all(&dest).map_err(|e| format!("Cannot create extraction folder: {e}"))?;
    let file = fs::File::open(&archive).map_err(|e| format!("Cannot open archive: {e}"))?;
    let mut zip = ZipArchive::new(file).map_err(|e| format!("Invalid ZIP archive: {e}"))?;
    for i in 0..zip.len() {
        let mut item = zip.by_index(i).map_err(|e| format!("Cannot read ZIP entry: {e}"))?;
        let Some(relative) = item.enclosed_name().map(|p| p.to_path_buf()) else {
            return Err(format!("Unsafe path in ZIP archive: {}", item.name()));
        };
        let out = dest.join(relative);
        if item.is_dir() {
            fs::create_dir_all(&out).map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) = out.parent() { fs::create_dir_all(parent).map_err(|e| e.to_string())?; }
            let mut output = fs::File::create(&out).map_err(|e| e.to_string())?;
            std::io::copy(&mut item, &mut output).map_err(|e| format!("Extraction failed: {e}"))?;
        }
    }
    let mut manifest = read_manifest(&app);
    if let Some(record) = manifest.records.iter_mut().rev().find(|r| r.source_id == source_id && r.tag == tag) {
        record.extracted_folder = Some(dest.to_string_lossy().to_string());
    }
    write_manifest(&app, &manifest)?;
    Ok(dest.to_string_lossy().to_string())
}


#[tauri::command]
fn open_external_url(url: String) -> Result<(), String> {
    let parsed = reqwest::Url::parse(&url).map_err(|e| format!("Invalid URL: {e}"))?;
    let host = parsed.host_str().unwrap_or_default();
    let allowed = ["github.com", "www.github.com", "reddit.com", "www.reddit.com", "anyps5.dev", "www.anyps5.dev", "anyps5games.com", "www.anyps5games.com"];
    if parsed.scheme() != "https" || !allowed.contains(&host) {
        return Err("Only approved HTTPS project and Reddit URLs are allowed.".into());
    }
    open::that(parsed.as_str()).map_err(|e| format!("Could not open browser: {e}"))
}

#[tauri::command]
fn open_folder(path: String) -> Result<(), String> {
    let folder = PathBuf::from(&path);
    if !folder.is_dir() { return Err(format!("Folder does not exist: {}", folder.display())); }
    open::that(folder).map_err(|e| format!("Could not open folder in File Explorer: {e}"))
}

#[tauri::command]
fn launch_executable(path: String) -> Result<(), String> {
    let executable = PathBuf::from(&path);
    if !executable.is_absolute() || !executable.is_file() { return Err("Executable file was not found.".into()); }
    let ext = executable.extension().and_then(|e| e.to_str()).unwrap_or_default();
    if !ext.eq_ignore_ascii_case("exe") { return Err("Only Windows .exe files can be launched by this build.".into()); }
    let parent = executable.parent().ok_or("Executable has no parent folder.")?;
    Command::new(&executable).current_dir(parent).spawn().map_err(|e| format!("Could not launch executable: {e}"))?;
    Ok(())
}

#[tauri::command]
fn find_executables(folder: String) -> Result<Vec<String>, String> {
    fn visit(path: &Path, results: &mut Vec<String>, depth: usize) -> Result<(), String> {
        if depth > 5 || results.len() >= 100 { return Ok(()); }
        let entries = fs::read_dir(path).map_err(|e| e.to_string())?;
        for entry in entries {
            let entry = entry.map_err(|e| e.to_string())?;
            let p = entry.path();
            if p.is_dir() { visit(&p, results, depth + 1)?; }
            else if p.extension().and_then(|e| e.to_str()).map(|e| e.eq_ignore_ascii_case("exe")) == Some(true) {
                results.push(p.to_string_lossy().to_string());
            }
        }
        Ok(())
    }
    let mut results = Vec::new();
    visit(Path::new(&folder), &mut results, 0)?;
    Ok(results)
}

#[tauri::command]
fn remove_download(app: tauri::AppHandle, source_id: String, tag: String, delete_files: bool) -> Result<(), String> {
    let mut manifest = read_manifest(&app);
    if let Some(index) = manifest.records.iter().position(|r| r.source_id == source_id && r.tag == tag) {
        let record = manifest.records.remove(index);
        if delete_files {
            let folder = PathBuf::from(&record.folder);
            if folder.exists() { fs::remove_dir_all(folder).map_err(|e| format!("Could not delete build folder: {e}"))?; }
        }
        write_manifest(&app, &manifest)?;
    }
    Ok(())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(ConfigState(Mutex::new(AppConfig::default())))
        .setup(|app| {
            let config = read_config(&app.handle());
            if let Ok(mut state) = app.state::<ConfigState>().0.lock() { *state = config; }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config, set_base_dir, latest_release, download_release,
            get_download_history, extract_archive, launch_executable,
            find_executables, remove_download, open_external_url, open_folder
        ])
        .run(tauri::generate_context!())
        .expect("error while running KytyPS5 Hub");
}
