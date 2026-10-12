import { lazy, Suspense, useState } from "react";
import { Clock3, Search, Star } from "lucide-react";
import { useMediaQuery } from "../hooks/useMediaQuery";
import type { AuthSession } from "../services/auth";
import { ColorTool } from "../tools/color/ColorTool";
import { FileBoxTool } from "../tools/filebox/FileBoxTool";
import { ImageTool } from "../tools/image/ImageTool";
import { CountryCodeTool } from "../tools/country/CountryCodeTool";
import { JsonFormatter } from "../tools/json/JsonFormatter";
import { MemeTool } from "../tools/meme/MemeTool";
import { QrTool } from "../tools/qr/QrTool";
import { TextConvertTool } from "../tools/text/TextConvertTool";
import { TimerTool } from "../tools/timer/TimerTool";
import { BrowserBar } from "./BrowserBar";
import { MobileWorkspace } from "./mobile/MobileWorkspace";
import { isToolId, tools, type ToolId } from "./toolCatalog";

const TimestampTool = lazy(() => import("../tools/timestamp/TimestampTool").then((module) => ({ default: module.TimestampTool })));
const EncodingTool = lazy(() => import("../tools/encoding/EncodingTool").then((module) => ({ default: module.EncodingTool })));
const PasswordGeneratorTool = lazy(() => import("../tools/password/PasswordGeneratorTool").then((module) => ({ default: module.PasswordGeneratorTool })));
const MarkdownTool = lazy(() => import("../tools/markdown/MarkdownTool").then((module) => ({ default: module.MarkdownTool })));
const UrlParserTool = lazy(() => import("../tools/url/UrlParserTool").then((module) => ({ default: module.UrlParserTool })));
const TextDiffTool = lazy(() => import("../tools/diff/TextDiffTool").then((module) => ({ default: module.TextDiffTool })));
const IdGeneratorTool = lazy(() => import("../tools/id/IdGeneratorTool").then((module) => ({ default: module.IdGeneratorTool })));
const JwtTool = lazy(() => import("../tools/jwt/JwtTool").then((module) => ({ default: module.JwtTool })));
const HashTool = lazy(() => import("../tools/hash/HashTool").then((module) => ({ default: module.HashTool })));
const RegexTool = lazy(() => import("../tools/regex/RegexTool").then((module) => ({ default: module.RegexTool })));
const DateCalculatorTool = lazy(() => import("../tools/date/DateCalculatorTool").then((module) => ({ default: module.DateCalculatorTool })));
const CsvJsonTool = lazy(() => import("../tools/csv/CsvJsonTool").then((module) => ({ default: module.CsvJsonTool })));
const TimezoneTool = lazy(() => import("../tools/timezone/TimezoneTool").then((module) => ({ default: module.TimezoneTool })));
const UnitConverterTool = lazy(() => import("../tools/units/UnitConverterTool").then((module) => ({ default: module.UnitConverterTool })));
const TextCleanerTool = lazy(() => import("../tools/cleaner/TextCleanerTool").then((module) => ({ default: module.TextCleanerTool })));
const WatermarkTool = lazy(() => import("../tools/watermark/WatermarkTool").then((module) => ({ default: module.WatermarkTool })));
const SvgTool = lazy(() => import("../tools/svg/SvgTool").then((module) => ({ default: module.SvgTool })));
const QrScanTool = lazy(() => import("../tools/qrscan/QrScanTool").then((module) => ({ default: module.QrScanTool })));
const HokPowerTool = lazy(() => import("../tools/hokpower/HokPowerTool").then((module) => ({ default: module.HokPowerTool })));
const CronTool = lazy(() => import("../tools/cron/CronTool").then((module) => ({ default: module.CronTool })));
const VideoPlayerTool = lazy(() => import("../tools/video/VideoPlayerTool").then((module) => ({ default: module.VideoPlayerTool })));
const MermaidTool = lazy(() => import("../tools/mermaid/MermaidTool").then((module) => ({ default: module.MermaidTool })));
const MindmapTool = lazy(() => import("../tools/mindmap/MindmapTool").then((module) => ({ default: module.MindmapTool })));
const ImageCompressTool = lazy(() => import("../tools/compress/ImageCompressTool").then((module) => ({ default: module.ImageCompressTool })));
const CodeCardTool = lazy(() => import("../tools/codecard/CodeCardTool").then((module) => ({ default: module.CodeCardTool })));
const WhiteboardTool = lazy(() => import("../tools/whiteboard/WhiteboardTool").then((module) => ({ default: module.WhiteboardTool })));
const FlowboardTool = lazy(() => import("../tools/flowboard/FlowboardTool").then((module) => ({ default: module.FlowboardTool })));
const CyberChefTool = lazy(() => import("../tools/cyberchef/CyberChefTool").then((module) => ({ default: module.CyberChefTool })));

export type { ToolId } from "./toolCatalog";

type WorkspaceProps = {
  session: AuthSession | null;
  activeTool: ToolId;
  favoriteIds: string[];
  toolStatus: Record<string, boolean>;
  onSelectTool: (toolId: ToolId) => void;
  onToggleFavorite: (toolId: ToolId) => Promise<void>;
  onLogin: () => void;
  onAccount: () => void;
  onLogout: () => void;
};

export function Workspace({
  session,
  activeTool,
  favoriteIds,
  toolStatus,
  onSelectTool,
  onToggleFavorite,
  onLogin,
  onAccount,
  onLogout,
}: WorkspaceProps) {
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [favoriteError, setFavoriteError] = useState("");
  const [toolQuery, setToolQuery] = useState("");
  const favoriteTools = tools.filter(
    (tool) => tool.implemented && toolStatus[tool.id] !== false && favoriteIds.includes(tool.id),
  );
  const implementedTools = tools.filter((tool) => tool.implemented);
  const filteredTools = tools.filter((tool) => {
    const query = toolQuery.trim().toLowerCase();
    if (!query) return true;
    return tool.label.toLowerCase().includes(query) || tool.id.toLowerCase().includes(query);
  });

  async function toggleFavorite() {
    setFavoriteError("");
    try {
      await onToggleFavorite(activeTool);
    } catch {
      setFavoriteError("收藏更新失败。");
    }
  }

  function renderToolButton(tool: (typeof tools)[number]) {
    const Icon = tool.icon;
    const isActive = tool.id === activeTool;
    const isFavorite = favoriteIds.includes(tool.id);

    return (
      <button
        className={`tool-nav__item${isActive ? " is-active" : ""}`}
        key={tool.id}
        type="button"
        disabled={!tool.implemented || toolStatus[tool.id] === false}
        aria-current={isActive ? "page" : undefined}
        onClick={() => {
          if (isToolId(tool.id)) onSelectTool(tool.id);
        }}
      >
        <Icon size={17} strokeWidth={1.9} aria-hidden="true" />
        <span>{tool.label}</span>
        {isFavorite ? (
          <Star
            className="tool-nav__favorite"
            size={13}
            fill="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          />
        ) : toolStatus[tool.id] === false ? (
          <small>已暂停</small>
        ) : !tool.implemented ? (
          <small>待接入</small>
        ) : null}
      </button>
    );
  }

  const activeToolName =
    tools.find((tool) => tool.id === activeTool)?.label ?? "工具";
  const isFavorite = favoriteIds.includes(activeTool);
  const activeContent = toolStatus[activeTool] === false ? (
    <section className="tool-paused-state" aria-live="polite">
      <Clock3 size={28} strokeWidth={1.8} aria-hidden="true" />
      <strong>这个工具已暂停</strong>
      <p>管理员暂时关闭了此工具，请稍后再试。</p>
    </section>
  ) : (
    <>
      {activeTool === "json" && <JsonFormatter />}
      {activeTool === "timestamp" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载时间戳工具…</div>}>
          <TimestampTool />
        </Suspense>
      )}
      {activeTool === "encoding" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载编码工具…</div>}>
          <EncodingTool />
        </Suspense>
      )}
      {activeTool === "password" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载密码生成器…</div>}>
          <PasswordGeneratorTool />
        </Suspense>
      )}
      {activeTool === "markdown" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载 Markdown 编辑器…</div>}>
          <MarkdownTool />
        </Suspense>
      )}
      {activeTool === "url" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载 URL 解析器…</div>}>
          <UrlParserTool />
        </Suspense>
      )}
      {activeTool === "diff" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载文本差异工具…</div>}>
          <TextDiffTool />
        </Suspense>
      )}
      {activeTool === "id" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载随机 ID 工具…</div>}>
          <IdGeneratorTool />
        </Suspense>
      )}
      {activeTool === "jwt" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载 JWT 解析器…</div>}>
          <JwtTool />
        </Suspense>
      )}
      {activeTool === "hash" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载哈希计算器…</div>}>
          <HashTool />
        </Suspense>
      )}
      {activeTool === "regex" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载正则测试器…</div>}>
          <RegexTool />
        </Suspense>
      )}
      {activeTool === "date" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载日期计算器…</div>}>
          <DateCalculatorTool />
        </Suspense>
      )}
      {activeTool === "csv" && <Suspense fallback={<div className="tool-loading" role="status">正在加载 CSV 转换…</div>}><CsvJsonTool /></Suspense>}
      {activeTool === "timezone" && <Suspense fallback={<div className="tool-loading" role="status">正在加载时区工具…</div>}><TimezoneTool /></Suspense>}
      {activeTool === "units" && <Suspense fallback={<div className="tool-loading" role="status">正在加载单位换算…</div>}><UnitConverterTool /></Suspense>}
      {activeTool === "cleaner" && <Suspense fallback={<div className="tool-loading" role="status">正在加载文本清理…</div>}><TextCleanerTool /></Suspense>}
      {activeTool === "watermark" && <Suspense fallback={<div className="tool-loading" role="status">正在加载图片水印…</div>}><WatermarkTool /></Suspense>}
      {activeTool === "svg" && <Suspense fallback={<div className="tool-loading" role="status">正在加载 SVG 工具…</div>}><SvgTool /></Suspense>}
      {activeTool === "qrscan" && <Suspense fallback={<div className="tool-loading" role="status">正在加载二维码识别…</div>}><QrScanTool /></Suspense>}
      {activeTool === "hokpower" && <Suspense fallback={<div className="tool-loading" role="status">正在加载战力查询…</div>}><HokPowerTool /></Suspense>}
      {activeTool === "color" && <ColorTool session={session} />}
      {activeTool === "meme" && <MemeTool />}
      {activeTool === "country" && <CountryCodeTool />}
      {activeTool === "text" && <TextConvertTool />}
      {activeTool === "image" && <ImageTool />}
      {activeTool === "qr" && <QrTool />}
      {activeTool === "timer" && <TimerTool session={session} />}
      {activeTool === "cron" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载 Cron 工具…</div>}>
          <CronTool />
        </Suspense>
      )}
      {activeTool === "video" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载视频播放器…</div>}>
          <VideoPlayerTool />
        </Suspense>
      )}
      {activeTool === "filebox" && <FileBoxTool session={session} />}
      {activeTool === "mermaid" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载文本转图表…</div>}>
          <MermaidTool session={session} />
        </Suspense>
      )}
      {activeTool === "mindmap" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载思维导图…</div>}>
          <MindmapTool session={session} />
        </Suspense>
      )}
      {activeTool === "compress" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载图片压缩…</div>}>
          <ImageCompressTool />
        </Suspense>
      )}
      {activeTool === "codecard" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载代码卡片…</div>}>
          <CodeCardTool session={session} />
        </Suspense>
      )}
      {activeTool === "whiteboard" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载手绘白板…</div>}>
          <WhiteboardTool session={session} />
        </Suspense>
      )}
      {activeTool === "flowboard" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载在线流程图…</div>}>
          <FlowboardTool session={session} />
        </Suspense>
      )}
      {activeTool === "cyberchef" && (
        <Suspense fallback={<div className="tool-loading" role="status">正在加载 CyberChef…</div>}>
          <CyberChefTool />
        </Suspense>
      )}
    </>
  );

  if (isMobile) {
    return (
      <MobileWorkspace
        activeTool={activeTool}
        favoriteIds={favoriteIds}
        toolStatus={toolStatus}
        tools={tools}
        session={session}
        onSelectTool={onSelectTool}
        onToggleFavorite={onToggleFavorite}
        onLogin={onLogin}
        onAccount={onAccount}
      >
        {activeContent}
      </MobileWorkspace>
    );
  }

  return (
    <main className="page">
      <section className="browser-window workspace-window" aria-label="Bocchi 工具工作区">
        <BrowserBar user={session?.user} onLogin={onLogin} onAccount={onAccount} onLogout={onLogout} />

        <div className="workspace-layout">
          <aside className="tool-sidebar">
            <section className="tool-sidebar__group">
              <div className="tool-sidebar__heading">
                <span>收藏工具</span>
                <small>{favoriteTools.length} 个</small>
              </div>
              {favoriteTools.length ? (
                <nav className="tool-nav tool-nav--favorites tool-nav--favorites-scroll" aria-label="收藏工具">
                  {favoriteTools.map(renderToolButton)}
                </nav>
              ) : (
                <p className="tool-sidebar__empty">还没有收藏，打开工具后点击“收藏工具”。</p>
              )}
            </section>

            <section className="tool-sidebar__group tool-sidebar__group--all">
              <div className="tool-sidebar__heading">
                <span>全部工具</span>
                <small>{implementedTools.length} 个已接入</small>
              </div>
              <label className="tool-sidebar__search">
                <Search size={14} strokeWidth={2} aria-hidden="true" />
                <input
                  value={toolQuery}
                  onChange={(event) => setToolQuery(event.target.value)}
                  placeholder="搜索工具"
                  aria-label="搜索工具"
                />
              </label>
              {filteredTools.length ? (
                <nav className="tool-nav tool-nav--scroll" aria-label="全部工具">
                  {filteredTools.map(renderToolButton)}
                </nav>
              ) : (
                <p className="tool-sidebar__empty">没有匹配的工具。</p>
              )}
            </section>

            {!session && (
              <button className="sidebar-login" type="button" onClick={onLogin}>
                <Star size={18} strokeWidth={2} aria-hidden="true" />
                <span>
                  <strong>登录到 Bocchi</strong>
                  <small>同步收藏和偏好</small>
                </span>
              </button>
            )}

            <p className={`tool-sidebar__note${session ? "" : " is-guest"}`}>
              {session
                ? "收藏与偏好会同步到你的账户。"
                : "当前为游客模式，工具数据只保存在本机。"}
            </p>
          </aside>

          <section className="workspace-main">
            <div className="workspace-actionbar">
              <span>{activeToolName}</span>
              <button
                className={isFavorite ? "is-favorite" : ""}
                type="button"
                onClick={toggleFavorite}
              >
                <Star
                  size={16}
                  strokeWidth={2}
                  fill={isFavorite ? "currentColor" : "none"}
                  aria-hidden="true"
                />
                {isFavorite ? "已收藏" : "收藏工具"}
              </button>
            </div>

            {favoriteError && (
              <p className="workspace-error" role="alert">
                {favoriteError}
              </p>
            )}

            {activeContent}
          </section>
        </div>
      </section>
    </main>
  );
}




