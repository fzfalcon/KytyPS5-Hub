import { useCallback, useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open as openDialog } from "@tauri-apps/plugin-dialog";
import {
  Activity, AlertCircle, ArrowDownToLine, Check, CheckCircle2, ChevronRight,
  CircleHelp, ExternalLink, Folder, FolderOpen, Gamepad2, Github, HardDrive,
  LoaderCircle, RefreshCw, Search, Settings2, ShieldCheck, Sparkles, X,
  Layers3, Monitor, Cpu, Rss
} from "lucide-react";

type Section = "ps4" | "ps5" | "tools";
type Asset = {
  name: string; size: number; download_url: string; content_type: string | null; browser_download_url: string;
};
type Release = {
  tag_name: string; name: string; html_url: string; published_at: string | null;
  prerelease: boolean; draft: boolean; body: string; assets: Asset[];
};
type Source = {
  id: string; title: string; game: string; owner: string; repo: string;
  description: string; accent: string; section: Section; platformHint: string;
  release: Release | null;
  status: "idle" | "checking" | "ready" | "downloading" | "error" | "empty";
  message?: string; progress?: number;
};
type AppConfig = { base_dir: string | null };
type DownloadResult = { saved_files: string[]; folder: string; message: string };
type DownloadRecord = {
  source_id: string; platform: string; owner: string; repo: string; tag: string; folder: string;
  files: string[]; completed_at: string; extracted_folder: string | null;
};
type DownloadManifest = { records: DownloadRecord[] };
type FilterSection = "all" | Section;

const sourceDefaults: Source[] = [
  // PS4-origin games with native PC port projects and active forks discovered from Reddit/GitHub.
  { id:"pt-pc-port", title:"P.T. PC Port", game:"PS4 NATIVE PC PORT", owner:"LoreanXavier", repo:"pt-pc", description:"Native PC rebuild of the playable teaser; supply your own PS4 game data.", accent:"violet", section:"ps4", platformHint:"Windows · Linux", release:null, status:"idle" },
  { id:"bloodborne-linux", title:"Bloodborne · bbport", game:"BLOODBORNE · LINUX UPSTREAM", owner:"deadinside28", repo:"bloodborne_pc", description:"Original Linux base for the bbport project family.", accent:"blue", section:"ps4", platformHint:"Linux", release:null, status:"idle" },
  { id:"bloodborne-windows", title:"Bloodborne · Windows", game:"BLOODBORNE · WINDOWS FORK", owner:"Supermedo", repo:"bloodborne_pc", description:"Windows runtime fork with launcher, rendering options and updates.", accent:"amber", section:"ps4", platformHint:"Windows", release:null, status:"idle" },
  { id:"bloodborne-but-pc", title:"BloodBorneButPc", game:"BLOODBORNE · COMMUNITY FORK", owner:"Awakenchan", repo:"BloodBorneButPc", description:"Windows launcher and engine-focused fork; bring your own game dump.", accent:"violet", section:"ps4", platformHint:"Windows", release:null, status:"idle" },
  { id:"bloodborne-win-mrsuss60", title:"Bloodborne · Win32", game:"BLOODBORNE · WINDOWS RUNTIME", owner:"Mrsuss60", repo:"bloodborne_pc_windows_port", description:"Native Windows runtime adaptation based on the bbport project.", accent:"blue", section:"ps4", platformHint:"Windows", release:null, status:"idle" },
  { id:"bloodborne-jgamrot", title:"Bloodborne · Setup Fork", game:"BLOODBORNE · INSTALLER FOCUSED", owner:"Jgamrot", repo:"bloodborne_pc", description:"Setup-focused branch based on the upstream Windows project.", accent:"amber", section:"ps4", platformHint:"Windows", release:null, status:"idle" },
  { id:"bloodborne-crowned", title:"Crowned Workshop", game:"BLOODBORNE · ENHANCED FORK", owner:"TatsunaKyo", repo:"bloodborne_pc", description:"Rendering, frame-pacing and graphics options in a community fork.", accent:"violet", section:"ps4", platformHint:"Windows", release:null, status:"idle" },
  { id:"bloodborne-bbhost", title:"bbhost", game:"BLOODBORNE · ALTERNATIVE RUNTIME", owner:"droogie", repo:"bbhost", description:"Separate Bloodborne PC runtime project with Windows/Linux support.", accent:"blue", section:"ps4", platformHint:"Windows · Linux", release:null, status:"idle" },
  { id:"bloodborne-linux-ayoze", title:"Bloodborne Linux Fork", game:"BLOODBORNE · LINUX / STEAM DECK", owner:"ayozetr", repo:"bloodborne_linux", description:"Linux-focused fork with controls, upscaling and compatibility work.", accent:"green", section:"ps4", platformHint:"Linux", release:null, status:"idle" },
  { id:"bloodborne-mac", title:"Bloodborne · macOS source", game:"BLOODBORNE · SOURCE PROJECT", owner:"Wooloomooloo2", repo:"bloodborne_mac_port", description:"macOS port source; check the repository for build requirements and binaries.", accent:"violet", section:"ps4", platformHint:"macOS · Source", release:null, status:"idle" },
  { id:"bloodborne-pyl1nx", title:"Bloodborne · Achievement Fork", game:"BLOODBORNE · WINDOWS FORK", owner:"pyL1nx", repo:"bloodborne_pc", description:"Community fork with a Windows launcher and integrated achievement work.", accent:"amber", section:"ps4", platformHint:"Windows", release:null, status:"idle" },

  // PS5 development, emulation and native execution / compatibility layers.
  { id:"kytyps5-official", title:"KytyPS5 Official", game:"PS5 EMULATOR · UPSTREAM", owner:"KytyPS5", repo:"KytyPS5", description:"Official upstream PS5 emulator development builds.", accent:"violet", section:"ps5", platformHint:"Windows", release:null, status:"idle" },
  { id:"kytyps5-senaxx", title:"Senaxx · Wolverine", game:"PS5 GAME-SPECIFIC EXPERIMENT", owner:"Senaxx", repo:"KytyPS5", description:"Community build stream focused on Wolverine testing.", accent:"amber", section:"ps5", platformHint:"Windows", release:null, status:"idle" },
  { id:"kytyps5-jetsku", title:"Jetsku · Astro Bot", game:"PS5 GAME-SPECIFIC EXPERIMENT", owner:"Jetsku", repo:"KytyPS5", description:"Experimental KytyPS5 builds with Astro Bot and other compatibility work.", accent:"blue", section:"ps5", platformHint:"Windows", release:null, status:"idle" },
  { id:"anyps5", title:"AnyPS5", game:"PS5 NATIVE EXECUTION / RELINKER", owner:"boykopovar", repo:"AnyPS5", description:"Experimental tools for relinking PS5 executables and reimplementing system APIs.", accent:"green", section:"ps5", platformHint:"Windows · Linux", release:null, status:"idle" },
  { id:"prosper", title:"prosper", game:"PS5 → PC COMPATIBILITY LAYER", owner:"mattias800", repo:"prosper", description:"Experimental user-space PS5 compatibility layer for PC; game support varies.", accent:"blue", section:"ps5", platformHint:"Windows · Linux · macOS", release:null, status:"idle" },
  { id:"prosper-ng", title:"prosperNG", game:"PS5 → PC COMMUNITY FORK", owner:"snapetech-org", repo:"prosperNG", description:"Community fork tracking PS5-on-PC compatibility work and game milestones.", accent:"violet", section:"ps5", platformHint:"Windows · Linux · macOS", release:null, status:"idle" },

  // Related console emulation tools belong in the hub, but are distinguished from native PC ports.
  { id:"shadps4", title:"shadPS4", game:"PS4 EMULATOR", owner:"shadps4-emu", repo:"shadPS4", description:"PlayStation 4 emulator for PC; compatibility depends on the game and build.", accent:"blue", section:"tools", platformHint:"Windows · Linux", release:null, status:"idle" },
  { id:"fpps4", title:"fpPS4", game:"PS4 EMULATOR · EXPERIMENTAL", owner:"red-prig", repo:"fpPS4", description:"Experimental PS4 emulator project for Windows.", accent:"amber", section:"tools", platformHint:"Windows", release:null, status:"idle" },
  { id:"kyty-ps4", title:"Kyty", game:"PS4 / PS5 EMULATION RESEARCH", owner:"InoriRus", repo:"Kyty", description:"Legacy emulator research project; check repository activity before choosing a build.", accent:"violet", section:"tools", platformHint:"Windows", release:null, status:"idle" },
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
  return Number.isNaN(date.getTime()) ? "Date unavailable" : date.toLocaleDateString(undefined, { year:"numeric", month:"short", day:"numeric" });
}
function repoUrl(source: Source) { return `https://github.com/${source.owner}/${source.repo}`; }

export default function App() {
  const [sources, setSources] = useState<Source[]>(sourceDefaults);
  const [config, setConfig] = useState<AppConfig>({ base_dir: null });
  const [checking, setChecking] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{kind:"success"|"error"|"info";text:string}|null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [platform, setPlatform] = useState("windows");
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const [launchChoices, setLaunchChoices] = useState<{sourceId:string;folder:string;paths:string[]}|null>(null);
  const [activeSection, setActiveSection] = useState<FilterSection>("all");
  const [query, setQuery] = useState("");

  const refreshConfig = useCallback(async () => {
    try {
      const next = await invoke<AppConfig>("get_config");
      setConfig(next);
      const manifest = await invoke<DownloadManifest>("get_download_history");
      setHistory(manifest.records ?? []);
    } catch (error) {
      setNotice({kind:"error",text:`Could not load settings/history: ${String(error)}`});
    }
  }, []);

  const checkAll = useCallback(async (quiet = false) => {
    setChecking(true);
    setSources(current => current.map(s => ({...s,status:"checking",message:undefined,progress:undefined})));
    if (!quiet) setNotice({kind:"info",text:`Checking ${sourceDefaults.length} public GitHub sources…`});
    const results = await Promise.all(sourceDefaults.map(async source => {
      try {
        const release = await invoke<Release | null>("latest_release",{owner:source.owner,repo:source.repo});
        return {id:source.id,release,status:release?"ready" as const:"empty" as const,
          message:release?undefined:"No published release found. Open the repository for source code or CI-build information."};
      } catch (error) {
        return {id:source.id,release:null,status:"error" as const,message:String(error)};
      }
    }));
    setSources(current => current.map(source => {
      const result = results.find(r=>r.id===source.id)!;
      return {...source,release:result.release,status:result.status,message:result.message};
    }));
    try {
      const manifest = await invoke<DownloadManifest>("get_download_history");
      setHistory(manifest.records ?? []);
    } catch { /* UI can still display release results without local history. */ }
    const errors = results.filter(r=>r.status==="error").length;
    const found = results.filter(r=>r.release).length;
    setLastChecked(new Date().toISOString());
    setChecking(false);
    if (!quiet) setNotice({
      kind: errors?"error":"success",
      text: errors?`Checked with ${errors} source errors. ${found}/${sourceDefaults.length} published releases found.`:`Update check complete. ${found}/${sourceDefaults.length} sources have published releases.`,
    });
  }, []);

  useEffect(() => {
    void refreshConfig();
    void checkAll(true);
  }, [refreshConfig,checkAll]);

  const chooseFolder = async () => {
    try {
      const selected = await openDialog({directory:true,multiple:false,title:"Choose a download drive or parent folder"});
      if (typeof selected !== "string") return;
      await invoke("set_base_dir",{path:selected});
      setConfig({base_dir:selected});
      setNotice({kind:"success",text:`Download location set to ${selected}`});
      setSettingsOpen(false);
    } catch (error) {
      setNotice({kind:"error",text:`Could not set folder: ${String(error)}`});
    }
  };

  const platformMatches = (name: string) => {
    const n = name.toLowerCase();
    if (platform==="all") return true;
    const isMac = /macos|mac-os|darwin|osx|\.dmg|\.pkg|\.app/i.test(n);
    const isLinux = /linux|\.appimage|\.deb|\.rpm|\.tar\.gz|\.tar\.xz/i.test(n);
    const isWindows = /windows|win64|win-x64|win_x64|win32|\.exe|msvc/i.test(n);
    if (platform==="windows") return !isMac && !isLinux && (isWindows || !/(macos|mac-os|darwin|osx|linux|\.dmg|\.pkg|\.appimage|\.deb|\.rpm|\.apk|\.ipa)/i.test(n));
    if (platform==="linux") return !isMac && !isWindows && isLinux;
    if (platform==="macos") return isMac && !isWindows && !isLinux;
    return true;
  };

  const downloadSource = async (source: Source) => {
    if (!source.release) {
      setNotice({kind:"error",text:"No published release is available. Open the repository to inspect source builds and CI artifacts."});
      return;
    }
    const selectedAssets = source.release.assets.filter(a=>platformMatches(a.name));
    if (!selectedAssets.length) {
      setNotice({kind:"error",text:`${source.title}: no assets matched ${platform==="windows"?"Windows x64":platform==="linux"?"Linux x64":platform==="macos"?"macOS":"the selected filter"}. Choose “Show all assets” if the filenames are ambiguous.`});
      return;
    }
    if (!config.base_dir) {
      setSettingsOpen(true);
      setNotice({kind:"info",text:"Choose a download location first."});
      return;
    }
    setBusyId(source.id);
    setSources(current=>current.map(s=>s.id===source.id?{...s,status:"downloading",progress:0}:s));
    setNotice({kind:"info",text:`Downloading ${source.title}…`});
    try {
      const result = await invoke<DownloadResult>("download_release",{
        owner:source.owner,repo:source.repo,tag:source.release.tag_name,sourceId:source.id,platform,
        assets:selectedAssets.map(a=>({name:a.name,download_url:a.browser_download_url})),
      });
      let extractedFolder: string|null = null;
      const zipFile=result.saved_files.find(path=>path.toLowerCase().endsWith(".zip"));
      if (zipFile && platform==="windows") {
        try {
          extractedFolder=await invoke<string>("extract_archive",{sourceId:source.id,tag:source.release.tag_name,archivePath:zipFile});
        } catch (error) {
          setNotice({kind:"info",text:`Downloaded successfully, but ZIP extraction was skipped: ${String(error)}`});
        }
      }
      const manifest=await invoke<DownloadManifest>("get_download_history");
      setHistory(manifest.records ?? []);
      setSources(current=>current.map(s=>s.id===source.id?{...s,status:"ready",progress:100}:s));
      setNotice({kind:"success",text:`Downloaded ${result.saved_files.length} asset(s) to ${result.folder}${extractedFolder?"; ZIP extracted.": "."}`});
    } catch (error) {
      setSources(current=>current.map(s=>s.id===source.id?{...s,status:"error",message:String(error)}:s));
      setNotice({kind:"error",text:`Download failed: ${String(error)}`});
    } finally { setBusyId(null); }
  };

  const visibleSources = useMemo(()=>sources.filter(source=>{
    const matchesSection=activeSection==="all" || source.section===activeSection;
    const search=`${source.title} ${source.game} ${source.owner}/${source.repo} ${source.description}`.toLowerCase();
    return matchesSection && search.includes(query.trim().toLowerCase());
  }),[sources,activeSection,query]);

  const downloadAll = async () => {
    const matching = visibleSources.filter(s=>s.release && s.release.assets.some(a=>platformMatches(a.name)));
    for (const source of matching) await downloadSource(source);
    setNotice({kind:"success",text:`Finished attempting downloads for ${matching.length} listed source(s).`});
  };

  const isDownloaded = (source: Source) => !!source.release && history.some(r=>
    r.source_id===source.id && r.tag===source.release!.tag_name && r.platform===platform &&
    r.files.length>0 && r.files.every(file=>!file.toLowerCase().endsWith(".part")));
  const availableUpdates = sources.filter(s=>s.release && !isDownloaded(s) && s.release.assets.some(a=>platformMatches(a.name))).length;
  const readyCount = useMemo(()=>sources.filter(s=>s.release).length,[sources]);
  const assetCount = useMemo(()=>sources.reduce((n,s)=>n+(s.release?.assets.length??0),0),[sources]);
  const showSection = (section: FilterSection) => setActiveSection(section);

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><Gamepad2 size={24}/></div>
          <div><div className="brand-name">PS4&5onPC <span>Hub</span></div><div className="brand-subtitle">PORTS · BUILDS · UPDATES</div></div>
        </div>
        <div className="nav-label">LIBRARY</div>
        <button className={`nav-item ${activeSection==="all"?"active":""}`} onClick={()=>showSection("all")}><Activity size={17}/> All projects <span className="nav-count">{sources.length}</span></button>
        <button className={`nav-item ${activeSection==="ps4"?"active":""}`} onClick={()=>showSection("ps4")}><span className="nav-console-logo ps4-logo">PS4</span> PS4 PC ports <span className="nav-count">{sources.filter(s=>s.section==="ps4").length}</span></button>
        <button className={`nav-item ${activeSection==="ps5"?"active":""}`} onClick={()=>showSection("ps5")}><span className="nav-console-logo ps5-logo">PS5</span> PS5 development <span className="nav-count">{sources.filter(s=>s.section==="ps5").length}</span></button>
        <button className={`nav-item ${activeSection==="tools"?"active":""}`} onClick={()=>showSection("tools")}><Layers3 size={17}/> Emulators & tools <span className="nav-count">{sources.filter(s=>s.section==="tools").length}</span></button>
        <button className="nav-item" onClick={()=>setSettingsOpen(true)}><Settings2 size={17}/> Download settings</button>
        <div className="sidebar-spacer"/>
        <div className="sidebar-note"><ShieldCheck size={18}/><div><strong>Curated public sources</strong><p>Release metadata is checked live. Community status does not guarantee a build is playable or safe.</p></div></div>
        <div className="sidebar-footer"><span className="status-dot"/> Windows desktop · v0.4.0</div>
      </aside>

      <section className="main-content">
        <header className="topbar">
          <div className="breadcrumbs">PS4&5onPC <ChevronRight size={14}/> <strong>{activeSection==="all"?"All projects":activeSection==="ps4"?"PS4 PC ports":activeSection==="ps5"?"PS5 development":"Emulators & tools"}</strong></div>
          <div className="top-actions">
            <button className="button secondary small" onClick={()=>setSettingsOpen(true)}><Settings2 size={15}/> Settings</button>
            <button className="button primary small" disabled={checking} onClick={()=>void checkAll()}>{checking?<LoaderCircle className="spin" size={15}/>:<RefreshCw size={15}/>} Check all</button>
          </div>
        </header>

        <div className="page">
          <div className="hero hero-unified">
            <div>
              <div className="eyebrow"><Sparkles size={13}/> ONE LIBRARY FOR PLAYSTATION-ON-PC PROJECTS</div>
              <h1>PS4&5onPC Hub</h1>
              <p>Discover native PC ports of PS4 games, PS5 compatibility-layer development, emulator releases, and game-focused community builds in one place.</p>
              <div className="hero-buttons">
                <button className="button primary" onClick={()=>void checkAll()} disabled={checking}>{checking?<LoaderCircle className="spin" size={17}/>:<RefreshCw size={17}/>} Refresh releases</button>
                <button className="button secondary" onClick={()=>void downloadAll()} disabled={!!busyId}><ArrowDownToLine size={17}/> Download visible updates</button>
              </div>
            </div>
            <div className="hero-console-logos">
              <button className="console-tile ps4-tile" onClick={()=>showSection("ps4")}><span className="console-mark">PS4</span><strong>Native PC ports</strong><small>PS4-origin games</small></button>
              <button className="console-tile ps5-tile" onClick={()=>showSection("ps5")}><span className="console-mark">PS5</span><strong>PS5 development</strong><small>Emulation & native execution</small></button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card"><div className="stat-icon purple"><Github size={18}/></div><div><span>TRACKED PROJECTS</span><strong>{sources.length.toString().padStart(2,"0")}</strong><small>Public source repositories/forks</small></div></div>
            <div className="stat-card"><div className="stat-icon green"><CheckCircle2 size={18}/></div><div><span>RELEASES FOUND</span><strong>{readyCount}<em> / {sources.length}</em></strong><small>Published releases detected</small></div></div>
            <div className="stat-card"><div className="stat-icon blue"><ArrowDownToLine size={18}/></div><div><span>DOWNLOAD ASSETS</span><strong>{assetCount}</strong><small>Across detected releases</small></div></div>
          </div>

          <section className="update-ribbon">
            <div className="update-ribbon-icon"><Rss size={18}/></div>
            <div className="update-ribbon-copy"><strong>{checking?"Checking public release feeds…":`${availableUpdates} project${availableUpdates===1?"":"s"} with a release not recorded for ${platform==="windows"?"Windows":platform==="linux"?"Linux":platform==="macos"?"macOS":"the selected filter"}`}</strong><span>No startup popup — new releases are shown here and in each project's status label.</span></div>
            <div className="ribbon-meta">{lastChecked?`Checked ${new Date(lastChecked).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:"Waiting for first check"}</div>
          </section>

          <div className="section-heading">
            <div><h2>{activeSection==="all"?"Project catalog":activeSection==="ps4"?"PS4 native PC ports":activeSection==="ps5"?"PS5 builds & development":"Emulators & related tools"}</h2><p>{visibleSources.length} listed project(s) · Latest published release, including prereleases where available.</p></div>
            <div className="section-controls">
              <label className="search-control"><Search size={14}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search games or projects…"/></label>
              <label className="platform-label">Platform
                <select value={platform} onChange={e=>setPlatform(e.target.value)} className="platform-select">
                  <option value="windows">Windows x64 (default)</option><option value="linux">Linux x64</option><option value="macos">macOS</option><option value="all">Show all assets</option>
                </select>
              </label>
            </div>
          </div>

          <div className="source-grid">
            {visibleSources.map(source=>{
              const release=source.release, isBusy=busyId===source.id;
              const matchingAssets=release?.assets.filter(a=>platformMatches(a.name)) ?? [];
              const record=release?history.find(r=>r.source_id===source.id&&r.tag===release.tag_name&&r.platform===platform):undefined;
              const label=source.section==="ps4"?"PS4":source.section==="ps5"?"PS5":"TOOLS";
              return <article className={`source-card ${source.accent} ${source.section}`} key={source.id}>
                <div className="card-topline">
                  <div className={`catalog-console ${source.section==="ps4"?"ps4-logo":source.section==="ps5"?"ps5-logo":"tools-logo"}`}>{label}</div>
                  <span className={`source-status ${source.status}`}>
                    {source.status==="checking"?<><LoaderCircle size={12} className="spin"/> Checking</>:
                     source.status==="downloading"?<><LoaderCircle size={12} className="spin"/> Downloading</>:
                     source.status==="error"?<><AlertCircle size={12}/> Error</>:
                     isDownloaded(source)?<><CheckCircle2 size={12}/> Downloaded</>:
                     release && matchingAssets.length===0?"No matching asset":
                     release?<><ArrowDownToLine size={12}/> Update available</>:source.status==="empty"?"No published release":"Waiting"}
                  </span>
                </div>
                <div className="source-label">{source.game}</div>
                <h3>{source.title}</h3>
                <p className="source-description">{source.description}</p>
                <div className="source-platform"><Monitor size={12}/>{source.platformHint}</div>
                <button className="repo-link repo-link-button" onClick={()=>void invoke("open_external_url",{url:repoUrl(source)}).catch(error=>setNotice({kind:"error",text:`Could not open repository: ${String(error)}`}))}><Github size={14}/>{source.owner}/{source.repo}<ExternalLink size={12}/></button>
                <div className="release-panel">
                  {release?<><div className="release-row"><span>Latest published release</span><span className={`release-type ${release.prerelease?"pre":"stable"}`}>{release.prerelease?"PRERELEASE":"STABLE"}</span></div><strong className="release-name">{release.name||release.tag_name}</strong><div className="release-meta"><span>{release.tag_name}</span><span>{formatDate(release.published_at)}</span></div><div className="asset-summary"><ArrowDownToLine size={14}/>{release.assets.length} asset(s) · {formatBytes(release.assets.reduce((sum,a)=>sum+a.size,0))}</div></>
                  :<div className="empty-release"><CircleHelp size={17}/><span>{source.message||(source.status==="checking"?"Checking GitHub…":"No release data yet. Open the repository to inspect development builds.")}</span></div>}
                </div>
                {source.status==="downloading"&&<div className="progress-track"><div style={{width:`${source.progress??0}%`}}/></div>}
                <div className="card-actions">
                  <button className="button primary full" disabled={!release||!matchingAssets.length||isBusy} onClick={()=>void downloadSource(source)}>{isBusy?<LoaderCircle className="spin" size={16}/>:<ArrowDownToLine size={16}/>} {isBusy?"Downloading…":record?"Download again":"Download release"}</button>
                  <button className="icon-button" title="Open project repository" onClick={()=>void invoke("open_external_url",{url:repoUrl(source)}).catch(error=>setNotice({kind:"error",text:String(error)}))}><ExternalLink size={16}/></button>
                </div>
                {isDownloaded(source)&&<div className="post-download-actions"><button className="button secondary small" onClick={()=>record&&void invoke("open_folder",{path:record.folder}).catch(error=>setNotice({kind:"error",text:String(error)}))}><FolderOpen size={14}/> Open folder</button><button className="button secondary small" onClick={async()=>{
                  if(!record)return; const folder=record.extracted_folder||record.folder;
                  try{const paths=await invoke<string[]>("find_executables",{folder});if(!paths.length)setNotice({kind:"info",text:"No Windows executable detected. Check this project's launch instructions."});else if(paths.length===1){await invoke("launch_executable",{path:paths[0]});setNotice({kind:"success",text:"Executable launched."});}else setLaunchChoices({sourceId:source.id,folder,paths});}
                  catch(error){setNotice({kind:"error",text:`Could not launch build: ${String(error)}`});}
                }}><Gamepad2 size={14}/> Launch</button></div>}
              </article>;
            })}
          </div>

          {visibleSources.length===0&&<div className="empty-catalog"><Search size={22}/><strong>No projects match this filter</strong><span>Try another search term or select All projects.</span><button className="button secondary small" onClick={()=>{setQuery("");setActiveSection("all");}}>Clear filters</button></div>}

          <section className="community-panel">
            <div className="panel-heading"><div><h3>Community discovery</h3><p>Watch active project discussions; community posts are leads, not compatibility guarantees.</p></div><Rss size={18}/></div>
            <div className="community-links">
              <button className="community-link" onClick={()=>void invoke("open_external_url",{url:"https://www.reddit.com/r/BloodbornePC/"}).catch(error=>setNotice({kind:"error",text:String(error)}))}><span className="community-platform">PS4</span><span><strong>Bloodborne PC ports</strong><small>Windows, Linux and Mac forks</small></span><ExternalLink size={14}/></button>
              <button className="community-link" onClick={()=>void invoke("open_external_url",{url:"https://www.reddit.com/r/emulators/"}).catch(error=>setNotice({kind:"error",text:String(error)}))}><span className="community-platform ps5-logo">PS5</span><span><strong>Emulation & native-execution news</strong><small>Discover new builds and research updates</small></span><ExternalLink size={14}/></button>
              <button className="community-link" onClick={()=>void invoke("open_external_url",{url:"https://www.reddit.com/r/ps4homebrew/"}).catch(error=>setNotice({kind:"error",text:String(error)}))}><span className="community-platform ps4-logo">PS4</span><span><strong>PS4 homebrew scene</strong><small>Separate console-side ports and tools</small></span><ExternalLink size={14}/></button>
              <button className="community-link" onClick={()=>void invoke("open_external_url",{url:"https://anyps5.dev/"}).catch(error=>setNotice({kind:"error",text:String(error)}))}><span className="community-platform ps5-logo">PS5</span><span><strong>AnyPS5 compatibility</strong><small>Community game milestones and status reports</small></span><ExternalLink size={14}/></button>
            </div>
          </section>

          <section className="panel history-panel"><div className="panel-heading"><div><h3>Recent downloads</h3><p>Saved download history across all tracked projects.</p></div><FolderOpen size={18}/></div>
            {history.length===0?<p className="history-empty">No downloads yet. Pick a release to build your local library.</p>:[...history].reverse().slice(0,5).map(record=><div className="history-row" key={`${record.source_id}-${record.tag}-${record.platform}`}><div className="history-icon"><CheckCircle2 size={16}/></div><div className="history-details"><strong>{record.owner}/{record.repo} · {record.tag}</strong><span>{record.platform} · {record.files.length} file(s) · {record.extracted_folder?"Extracted":"Downloaded"} · {record.folder}</span></div><button className="icon-button" title="Open build folder" onClick={()=>void invoke("open_folder",{path:record.extracted_folder||record.folder}).catch(error=>setNotice({kind:"error",text:String(error)}))}><FolderOpen size={15}/></button></div>)}
          </section>

          <div className="bottom-grid">
            <section className="panel"><div className="panel-heading"><div><h3>Download destination</h3><p>One parent folder, separate project and version directories.</p></div><button className="icon-button" onClick={()=>setSettingsOpen(true)} title="Change destination"><Settings2 size={17}/></button></div>
              <div className="destination-row"><div className="destination-icon"><HardDrive size={19}/></div><div className="destination-text"><strong>{config.base_dir||"No folder selected"}</strong><span>{config.base_dir?"Each project uses its own source/version folders.":"Choose a drive or folder to enable downloads."}</span></div><button className="button secondary small" onClick={()=>void chooseFolder()}><FolderOpen size={15}/> Browse</button></div>
            </section>
            <section className="panel safety-panel"><div className="panel-heading"><div><h3>Update policy</h3><p>Clear source attribution for public releases.</p></div><ShieldCheck size={19}/></div><div className="policy-item"><Check size={15}/><span>Live GitHub Releases metadata</span></div><div className="policy-item"><Check size={15}/><span>Native ports, emulators and tools labelled separately</span></div><div className="policy-item"><Check size={15}/><span>No startup modal; updates remain on the dashboard</span></div></section>
          </div>

          {notice&&<div className={`notice ${notice.kind}`}><span>{notice.kind==="error"?<AlertCircle size={17}/>:notice.kind==="success"?<CheckCircle2 size={17}/>:<Activity size={17}/>} {notice.text}</span><button onClick={()=>setNotice(null)} aria-label="Dismiss"><X size={15}/></button></div>}
          <footer className="page-footer"><span>PS4&5onPC Hub · Community source catalog</span><span>Live metadata from GitHub · Build status is not a playability guarantee</span></footer>
        </div>
      </section>

      {launchChoices&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setLaunchChoices(null);}}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="launch-title">
        <div className="modal-header"><div className="modal-title-icon"><Gamepad2 size={20}/></div><div><h2 id="launch-title">Choose executable</h2><p>This build contains multiple Windows executables.</p></div><button className="icon-button" onClick={()=>setLaunchChoices(null)} aria-label="Close"><X size={18}/></button></div>
        <div className="settings-content launch-list">{launchChoices.paths.map(path=><button key={path} className="launch-option" onClick={async()=>{try{await invoke("launch_executable",{path});setLaunchChoices(null);setNotice({kind:"success",text:"Executable launched."});}catch(error){setNotice({kind:"error",text:String(error)});}}}><Gamepad2 size={15}/><span>{path}</span><ExternalLink size={13}/></button>)}</div>
      </section></div>}

      {settingsOpen&&<div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setSettingsOpen(false);}}><section className="settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <div className="modal-header"><div className="modal-title-icon"><Folder size={20}/></div><div><h2 id="settings-title">Download settings</h2><p>Choose the parent folder for every project.</p></div><button className="icon-button" onClick={()=>setSettingsOpen(false)} aria-label="Close settings"><X size={18}/></button></div>
        <div className="settings-content"><label>Base download folder</label><div className="folder-picker"><span>{config.base_dir||"Select a drive or folder…"}</span><button className="button secondary small" onClick={()=>void chooseFolder()}><FolderOpen size={15}/> Browse</button></div>
          <div className="folder-preview"><div><Folder size={15}/><span>PS4 PC ports</span><code>pt-pc-port/…</code></div><div><Folder size={15}/><span>PS5 development</span><code>anyps5/…</code></div><div><Folder size={15}/><span>Emulators & tools</span><code>shadps4/…</code></div></div>
          <p className="settings-help">Files are stored under the selected parent directory, then a project-specific folder and release tag. The location is saved in the app configuration directory.</p>
        </div>
        <div className="modal-footer"><button className="button secondary" onClick={()=>setSettingsOpen(false)}>Close</button><button className="button primary" onClick={()=>{setSettingsOpen(false);if(!config.base_dir)void chooseFolder();}}>Save settings</button></div>
      </section></div>}
    </main>
  );
}
