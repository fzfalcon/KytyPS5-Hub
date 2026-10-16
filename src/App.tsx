import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import { openPath, openUrl } from "@tauri-apps/plugin-opener";
import {
  Activity, AlertCircle, ArrowDownToLine, Check, CheckCircle2, ChevronRight,
  CircleHelp, ExternalLink, Folder, FolderOpen, Gamepad2, Github, HardDrive,
  LoaderCircle, RefreshCw, Settings2, ShieldCheck, Sparkles, X
} from "lucide-react";

type Asset = {
  name: string;
  size: number;
  download_url: string;
  content_type: string | null;
  browser_download_url: string;
};
type Release = {
  tag_name: string;
  name: string;
  html_url: string;
  published_at: string | null;
  prerelease: boolean;
  draft: boolean;
  body: string;
  assets: Asset[];
};
type Source = {
  id: string;
  title: string;
  game: string;
  owner: string;
  repo: string;
  description: string;
  accent: string;
  release: Release | null;
  status: "idle" | "checking" | "ready" | "downloading" | "error" | "empty";
  message?: string;
  progress?: number;
};
type AppConfig = { base_dir: string | null };
type DownloadResult = { saved_files: string[]; folder: string; message: string };
type DownloadRecord = {
  source_id: string; owner: string; repo: string; tag: string; folder: string;
  files: string[]; completed_at: string; extracted_folder: string | null;
};
type DownloadManifest = { records: DownloadRecord[] };

const sourceDefaults: Source[] = [
  {
    id: "wolverine", title: "Senaxx", game: "WOLVERINE EXPERIMENTAL BUILDS",
    owner: "Senaxx", repo: "KytyPS5", description: "Wolverine experimental branch",
    accent: "amber", release: null, status: "idle",
  },
  {
    id: "astro-bot", title: "Jetsku", game: "ASTRO BOT EXPERIMENTAL BUILDS",
    owner: "Jetsku", repo: "KytyPS5", description: "Astro Bot experimental branch",
    accent: "blue", release: null, status: "idle",
  },
  {
    id: "official", title: "Official KytyPS5", game: "UPSTREAM RELEASES",
    owner: "KytyPS5", repo: "KytyPS5", description: "Official upstream repository",
    accent: "violet", release: null, status: "idle",
  },
];

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "Unknown size";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes, index = 0;
  while (value >= 1024 && index < units.length - 1) { value /= 1024; index++; }
  return `${value.toFixed(index >= 2 ? 1 : 0)} ${units[index]}`;
}
function formatDate(value: string | null | undefined) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
function repoUrl(source: Source) { return `https://github.com/${source.owner}/${source.repo}`; }

export default function App() {
  const [sources, setSources] = useState<Source[]>(sourceDefaults);
  const [config, setConfig] = useState<AppConfig>({ base_dir: null });
  const [checking, setChecking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [platform, setPlatform] = useState("windows");
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const [launchChoices, setLaunchChoices] = useState<{ sourceId: string; folder: string; paths: string[] } | null>(null);

  const refreshConfig = useCallback(async () => {
    try {
      const next = await invoke<AppConfig>("get_config");
      setConfig(next);
      const manifest = await invoke<DownloadManifest>("get_download_history");
      setHistory(manifest.records ?? []);
    } catch (error) {
      setNotice({ kind: "error", text: `Could not load settings/history: ${String(error)}` });
    }
  }, []);

  const checkAll = useCallback(async (quiet = false) => {
    setChecking(true);
    setSources(current => current.map(s => ({ ...s, status: "checking", message: undefined, progress: undefined })));
    if (!quiet) setNotice({ kind: "info", text: "Checking all three GitHub repositories…" });
    const results = await Promise.all(sourceDefaults.map(async source => {
      try {
        const release = await invoke<Release | null>("latest_release", { owner: source.owner, repo: source.repo });
        return { id: source.id, release, status: release ? "ready" as const : "empty" as const,
          message: release ? undefined : "No published release found. This repository may publish source commits or CI artifacts instead." };
      } catch (error) {
        return { id: source.id, release: null, status: "error" as const, message: String(error) };
      }
    }));
    setSources(current => current.map(source => {
      const result = results.find(r => r.id === source.id)!;
      return { ...source, release: result.release, status: result.status, message: result.message };
    }));
    const errors = results.filter(r => r.status === "error").length;
    const found = results.filter(r => r.release).length;
    setLastChecked(new Date().toISOString());
    setChecking(false);
    if (!quiet) setNotice({
      kind: errors ? "error" : "success",
      text: errors ? `Checked with ${errors} source error(s). ${found}/3 releases found.` : `Update check complete. ${found}/3 sources have published releases.`,
    });
  }, []);

  useEffect(() => {
    void refreshConfig();
    void checkAll(true);
  }, [refreshConfig, checkAll]);

  const chooseFolder = async () => {
    try {
      const selected = await openDialog({ directory: true, multiple: false, title: "Choose KytyPS5 Hub download drive/folder" });
      if (typeof selected !== "string") return;
      await invoke("set_base_dir", { path: selected });
      setConfig({ base_dir: selected });
      setNotice({ kind: "success", text: `Download location set to ${selected}` });
      setSettingsOpen(false);
    } catch (error) {
      setNotice({ kind: "error", text: `Could not set folder: ${String(error)}` });
    }
  };

  const platformMatches = (name: string) => {
    const n = name.toLowerCase();
    if (platform === "all") return true;
    if (platform === "windows") {
      // Prefer clearly labelled Windows assets, but keep generic assets because many projects use generic names.
      return /windows|win64|win-x64|win_x64|x64|amd64|\.exe|\.zip/i.test(n) || !/linux|\.deb|\.rpm|\.appimage|\.dmg|\.pkg|\.apk|\.ipa/i.test(n);
    }
    return /linux|\.appimage|\.deb|\.rpm|\.tar\.gz|\.tar\.xz/i.test(n);
  };

  const downloadSource = async (source: Source) => {
    if (!source.release) {
      setNotice({ kind: "error", text: "No published release is available for this source. A development-build workflow can be added separately if the repository exposes CI artifacts." });
      return;
    }
    const selectedAssets = source.release.assets.filter(a => platformMatches(a.name));
    if (!selectedAssets.length) {
      setNotice({ kind: "error", text: `${source.title}: no assets matched ${platform === "windows" ? "Windows x64" : platform === "linux" ? "Linux" : "the selected filter"}. Choose “All assets” to inspect every download.` });
      return;
    }
    if (!config.base_dir) {
      setSettingsOpen(true);
      setNotice({ kind: "info", text: "Choose a download location first." });
      return;
    }
    setBusyId(source.id);
    setSources(current => current.map(s => s.id === source.id ? { ...s, status: "downloading", progress: 0 } : s));
    setNotice({ kind: "info", text: `Downloading ${source.title}…` });
    try {
      const result = await invoke<DownloadResult>("download_release", {
        owner: source.owner, repo: source.repo,
        tag: source.release.tag_name, sourceId: source.id,
        assets: selectedAssets.map(a => ({ name: a.name, download_url: a.browser_download_url })),
      });
      let extractedFolder: string | null = null;
      const zipFile = result.saved_files.find(path => path.toLowerCase().endsWith(".zip"));
      if (zipFile) {
        try {
          extractedFolder = await invoke<string>("extract_archive", {
            sourceId: source.id, tag: source.release.tag_name, archivePath: zipFile,
          });
        } catch (extractError) {
          setNotice({ kind: "info", text: `Downloaded successfully, but automatic extraction was skipped: ${String(extractError)}` });
        }
      }
      const manifest = await invoke<DownloadManifest>("get_download_history");
      setHistory(manifest.records ?? []);
      setSources(current => current.map(s => s.id === source.id ? { ...s, status: "ready", progress: 100 } : s));
      setNotice({ kind: "success", text: `${source.title} downloaded. ${result.saved_files.length} file(s) saved. ${extractedFolder ? "ZIP extracted." : "Open the folder to inspect the downloaded files."}` });
    } catch (error) {
      setSources(current => current.map(s => s.id === source.id ? { ...s, status: "error", message: String(error) } : s));
      setNotice({ kind: "error", text: `Download failed: ${String(error)}` });
    } finally {
      setBusyId(null);
    }
  };

  const downloadAll = async () => {
    for (const source of sources) {
      if (source.release && source.release.assets.length) await downloadSource(source);
    }
    setNotice({ kind: "success", text: "Finished attempting downloads for all sources with release assets." });
  };

  const readyCount = useMemo(() => sources.filter(s => s.release).length, [sources]);
  const assetCount = useMemo(() => sources.reduce((n, s) => n + (s.release?.assets.length ?? 0), 0), [sources]);
  const isDownloaded = (source: Source) => !!source.release && history.some(r =>
    r.source_id === source.id && r.tag === source.release!.tag_name &&
    r.files.length > 0 && r.files.every(file => file.toLowerCase().endsWith(".part") ? false : true));

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Gamepad2 size={24} /></div>
          <div><div className="brand-name">KytyPS5 <span>Hub</span></div><div className="brand-subtitle">MULTI-SOURCE MANAGER</div></div>
        </div>
        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item active"><Activity size={17} /> Overview</div>
        <div className="nav-item" onClick={() => setSettingsOpen(true)} role="button" tabIndex={0}><Settings2 size={17} /> Download settings</div>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <ShieldCheck size={18} />
          <div><strong>Source-aware updates</strong><p>Each repository is tracked independently. Existing builds are not overwritten by this downloader.</p></div>
        </div>
        <div className="sidebar-footer"><span className="status-dot" /> Windows desktop · v0.1.0</div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">Workspace <ChevronRight size={14} /> <strong>Overview</strong></div>
          <div className="top-actions">
            <button className="button secondary small" onClick={() => setSettingsOpen(true)}><Settings2 size={15} /> Settings</button>
            <button className="button primary small" disabled={checking} onClick={() => void checkAll()}>
              {checking ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />} Check updates
            </button>
          </div>
        </header>

        <div className="page">
          <div className="hero">
            <div>
              <div className="eyebrow"><Sparkles size={13} /> YOUR EMULATOR BUILDS, IN ONE PLACE</div>
              <h1>KytyPS5 Hub</h1>
              <p>Track the latest releases from three independent KytyPS5 sources. Review build details and keep each download neatly separated.</p>
              <div className="hero-buttons">
                <button className="button primary" onClick={() => void checkAll()} disabled={checking}>
                  {checking ? <LoaderCircle className="spin" size={17} /> : <RefreshCw size={17} />} Check all sources
                </button>
                <button className="button secondary" onClick={() => void downloadAll()} disabled={!!busyId}>
                  <ArrowDownToLine size={17} /> Download available builds
                </button>
              </div>
            </div>
            <div className="hero-graphic" aria-hidden="true">
              <div className="orbit orbit-one" /><div className="orbit orbit-two" />
              <div className="hero-chip"><Gamepad2 size={58} strokeWidth={1.2} /></div>
              <span className="chip-dot dot-a" /><span className="chip-dot dot-b" /><span className="chip-dot dot-c" />
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon purple"><Github size={18} /></div><div><span>TRACKED SOURCES</span><strong>03</strong><small>Independent repositories</small></div></div>
            <div className="stat-card"><div className="stat-icon green"><CheckCircle2 size={18} /></div><div><span>RELEASES FOUND</span><strong>{readyCount}<em> / 3</em></strong><small>Published releases detected</small></div></div>
            <div className="stat-card"><div className="stat-icon blue"><ArrowDownToLine size={18} /></div><div><span>DOWNLOAD ASSETS</span><strong>{assetCount}</strong><small>Across detected releases</small></div></div>
          </div>

          <div className="section-heading">
            <div><h2>Tracked sources</h2><p>Latest published release, including prereleases when available.</p></div>
            <div className="section-controls">
              <label className="platform-label">Platform
                <select value={platform} onChange={e => setPlatform(e.target.value)} className="platform-select">
                  <option value="windows">Windows x64 (default)</option>
                  <option value="linux">Linux x64</option>
                  <option value="all">Show all assets</option>
                </select>
              </label>
              <span className="updated-label">{lastChecked ? `Last checked ${new Date(lastChecked).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Not checked yet"}</span>
            </div>
          </div>

          <div className="source-grid">
            {sources.map(source => {
              const release = source.release;
              const isBusy = busyId === source.id;
              return <article className={`source-card ${source.accent}`} key={source.id}>
                <div className="card-topline"><div className={`source-icon ${source.accent}`}><Gamepad2 size={22} /></div><span className={`source-status ${source.status}`}>
                  {source.status === "checking" ? <><LoaderCircle size={12} className="spin" /> Checking</> :
                   source.status === "downloading" ? <><LoaderCircle size={12} className="spin" /> Downloading</> :
                   source.status === "error" ? <><AlertCircle size={12} /> Error</> :
                   isDownloaded(source) ? <><CheckCircle2 size={12} /> Up to date</> :
                   release ? <><ArrowDownToLine size={12} /> Update available</> : source.status === "empty" ? "No release" : "Waiting"}
                </span></div>
                <div className="source-label">{source.game}</div>
                <h3>{source.title}</h3>
                <p className="source-description">{source.description}</p>
                <button className="repo-link repo-link-button" onClick={() => void openUrl(repoUrl(source)).catch(error => setNotice({ kind: "error", text: `Could not open repository: ${String(error)}` }))}><Github size={14} /> {source.owner}/{source.repo} <ExternalLink size={12} /></button>
                <div className="release-panel">
                  {release ? <>
                    <div className="release-row"><span>Latest release</span><span className={`release-type ${release.prerelease ? "pre" : "stable"}`}>{release.prerelease ? "PRERELEASE" : "STABLE"}</span></div>
                    <strong className="release-name">{release.name || release.tag_name}</strong>
                    <div className="release-meta"><span>{release.tag_name}</span><span>{formatDate(release.published_at)}</span></div>
                    <div className="asset-summary"><ArrowDownToLine size={14} /> {release.assets.length} asset(s) · {formatBytes(release.assets.reduce((sum, a) => sum + a.size, 0))}</div>
                  </> : <div className="empty-release"><CircleHelp size={17} /><span>{source.message || (source.status === "checking" ? "Checking GitHub…" : "Release details will appear here.")}</span></div>}
                </div>
                {source.status === "downloading" && <div className="progress-track"><div style={{ width: `${source.progress ?? 0}%` }} /></div>}
                <div className="card-actions">
                  <button className="button primary full" disabled={!release || !release.assets.length || isBusy} onClick={() => void downloadSource(source)}>
                    {isBusy ? <LoaderCircle className="spin" size={16} /> : <ArrowDownToLine size={16} />}
                    {isBusy ? "Downloading…" : "Download release"}
                  </button>
                  {release && <button className="icon-button" title="Open release page" onClick={() => void openUrl(release.html_url).catch(error => setNotice({ kind: "error", text: `Could not open release page: ${String(error)}` }))}><ExternalLink size={16} /></button>}
                </div>
                {isDownloaded(source) && <div className="post-download-actions">
                  <button className="button secondary small" onClick={() => {
                    const record = history.find(r => r.source_id === source.id && r.tag === source.release?.tag_name);
                    if (record) void openPath(record.folder).catch(error => setNotice({ kind: "error", text: `Could not open folder: ${String(error)}` }));
                  }}><FolderOpen size={14} /> Open folder</button>
                  <button className="button secondary small" onClick={async () => {
                    const record = history.find(r => r.source_id === source.id && r.tag === source.release?.tag_name);
                    if (!record) return;
                    const folder = record.extracted_folder || record.folder;
                    try {
                      const paths = await invoke<string[]>("find_executables", { folder });
                      if (!paths.length) {
                        setNotice({ kind: "info", text: "No .exe was detected in this build. Open the folder and check the repository's launch instructions." });
                      } else if (paths.length === 1) {
                        await invoke("launch_executable", { path: paths[0] });
                        setNotice({ kind: "success", text: "Emulator launched." });
                      } else {
                        setLaunchChoices({ sourceId: source.id, folder, paths });
                      }
                    } catch (error) {
                      setNotice({ kind: "error", text: `Could not launch build: ${String(error)}` });
                    }
                  }}><Gamepad2 size={14} /> Launch emulator</button>
                </div>}
              </article>;
            })}
          </div>

          <section className="panel history-panel">
            <div className="panel-heading"><div><h3>Recent downloads</h3><p>Download history is saved between app launches.</p></div><FolderOpen size={18} /></div>
            {history.length === 0 ? <p className="history-empty">No downloads yet. Download a release to build your local library.</p> :
              [...history].reverse().slice(0, 5).map(record => <div className="history-row" key={`${record.source_id}-${record.tag}`}>
                <div className="history-icon"><CheckCircle2 size={16} /></div>
                <div className="history-details"><strong>{record.owner} · {record.tag}</strong><span>{record.files.length} file(s) · {record.extracted_folder ? "Extracted" : "Downloaded"} · {record.folder}</span></div>
                <button className="icon-button" title="Open build folder" onClick={() => void openPath(record.extracted_folder || record.folder).catch(error => setNotice({ kind: "error", text: String(error) }))}><FolderOpen size={15} /></button>
              </div>)}
          </section>

          <div className="bottom-grid">
            <section className="panel">
              <div className="panel-heading"><div><h3>Download destination</h3><p>Each source gets a dedicated folder.</p></div><button className="icon-button" onClick={() => setSettingsOpen(true)} title="Change destination"><Settings2 size={17} /></button></div>
              <div className="destination-row"><div className="destination-icon"><HardDrive size={19} /></div><div className="destination-text"><strong>{config.base_dir || "No folder selected"}</strong><span>{config.base_dir ? "Wolverine · Astro Bot · Official subfolders will be created here" : "Choose a drive or folder to enable downloads"}</span></div><button className="button secondary small" onClick={() => void chooseFolder()}><FolderOpen size={15} /> Browse</button></div>
            </section>
            <section className="panel safety-panel">
              <div className="panel-heading"><div><h3>Update policy</h3><p>Built for safe, transparent downloads.</p></div><ShieldCheck size={19} /></div>
              <div className="policy-item"><Check size={15} /><span>Checks all sources automatically on launch</span></div>
              <div className="policy-item"><Check size={15} /><span>Labels stable releases and prereleases</span></div>
              <div className="policy-item"><Check size={15} /><span>Downloads into source-specific version folders</span></div>
            </section>
          </div>

          {notice && <div className={`notice ${notice.kind}`}><span>{notice.kind === "error" ? <AlertCircle size={17} /> : notice.kind === "success" ? <CheckCircle2 size={17} /> : <Activity size={17} />}{notice.text}</span><button onClick={() => setNotice(null)} aria-label="Dismiss"><X size={15} /></button></div>}
          <footer className="page-footer"><span>KytyPS5 Hub · Community build manager</span><span>Repository metadata supplied by GitHub</span></footer>
        </div>
      </section>

      {launchChoices && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setLaunchChoices(null); }}>
        <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="launch-title">
          <div className="modal-header"><div className="modal-title-icon"><Gamepad2 size={20} /></div><div><h2 id="launch-title">Choose executable</h2><p>This build contains multiple Windows executables.</p></div><button className="icon-button" onClick={() => setLaunchChoices(null)} aria-label="Close"><X size={18} /></button></div>
          <div className="settings-content launch-list">
            {launchChoices.paths.map(path => <button key={path} className="launch-option" onClick={async () => {
              try { await invoke("launch_executable", { path }); setLaunchChoices(null); setNotice({ kind: "success", text: "Executable launched." }); }
              catch (error) { setNotice({ kind: "error", text: String(error) }); }
            }}><Gamepad2 size={15} /><span>{path}</span><ExternalLink size={13} /></button>)}
          </div>
        </section>
      </div>}

      {settingsOpen && <div className="modal-backdrop" onMouseDown={e => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
        <section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
          <div className="modal-header"><div className="modal-title-icon"><Folder size={20} /></div><div><h2 id="settings-title">Download settings</h2><p>Choose the parent folder for all source builds.</p></div><button className="icon-button" onClick={() => setSettingsOpen(false)} aria-label="Close settings"><X size={18} /></button></div>
          <div className="settings-content">
            <label>Base download folder</label>
            <div className="folder-picker"><span>{config.base_dir || "Select a drive or folder…"}</span><button className="button secondary small" onClick={() => void chooseFolder()}><FolderOpen size={15} /> Browse</button></div>
            <div className="folder-preview">
              <div><Folder size={15} /><span>Wolverine</span><code>Senaxx/KytyPS5</code></div>
              <div><Folder size={15} /><span>Astro Bot</span><code>Jetsku/KytyPS5</code></div>
              <div><Folder size={15} /><span>Official</span><code>KytyPS5/KytyPS5</code></div>
            </div>
            <p className="settings-help">Each download is placed under its source folder and release tag. The app stores its folder setting in the Windows app configuration directory.</p>
          </div>
          <div className="modal-footer"><button className="button secondary" onClick={() => setSettingsOpen(false)}>Close</button><button className="button primary" onClick={() => { setSettingsOpen(false); if (!config.base_dir) void chooseFolder(); }}>Save settings</button></div>
        </section>
      </div>}
    </main>
  );
}
