import { Bookmark, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { tools, type ToolId } from "./toolCatalog";

type LaunchTool = {
  id: ToolId;
  label: string;
  detail: string;
  icon: LucideIcon;
  size: "hero" | "wide" | "standard";
  tone: "blue" | "yellow" | "plain";
  implemented: boolean;
};

type ToolPresentation = Pick<LaunchTool, "detail" | "size" | "tone">;

type BrandPanelProps = {
  favoriteIds: string[];
  lastTool: ToolId;
  toolStatus: Record<string, boolean>;
  onSelectTool: (toolId: ToolId) => void;
};

const featuredToolIds = new Set<ToolId>(["json", "color", "image", "qr", "video", "filebox"]);

const toolPresentation: Record<ToolId, ToolPresentation> = {
  json: { detail: "格式化、压缩与导出", size: "hero", tone: "yellow" },
  timestamp: { detail: "Unix 与日期互转", size: "standard", tone: "plain" },
  encoding: { detail: "Base64 与 URL 编解码", size: "standard", tone: "plain" },
  password: { detail: "随机密码与强度评估", size: "standard", tone: "plain" },
  markdown: { detail: "Markdown 编辑与 HTML 导出", size: "standard", tone: "plain" },
  url: { detail: "URL 结构与 Query 编辑", size: "standard", tone: "plain" },
  diff: { detail: "逐行比较文本差异", size: "standard", tone: "plain" },
  id: { detail: "UUID 与随机标识符", size: "standard", tone: "plain" },
  jwt: { detail: "Decode JWT 内容", size: "standard", tone: "plain" },
  hash: { detail: "文本与文件摘要计算", size: "standard", tone: "plain" },
  regex: { detail: "测试匹配与替换", size: "standard", tone: "plain" },
  date: { detail: "日期差与日期偏移", size: "standard", tone: "plain" },
  csv: { detail: "CSV 与 JSON 相互转换", size: "standard", tone: "plain" },
  timezone: { detail: "多城市会议时间规划", size: "standard", tone: "plain" },
  units: { detail: "常用单位快速换算", size: "standard", tone: "plain" },
  cleaner: { detail: "批量清理文本格式", size: "standard", tone: "plain" },
  watermark: { detail: "图片文字水印", size: "standard", tone: "plain" },
  svg: { detail: "SVG 预览与优化", size: "standard", tone: "plain" },
  qrscan: { detail: "图片与摄像头识别", size: "standard", tone: "plain" },
  hokpower: { detail: "王者荣耀最低战力查询", size: "standard", tone: "plain" },
  color: { detail: "取色、配色与图片取色", size: "wide", tone: "blue" },
  meme: { detail: "组合两个 Emoji", size: "standard", tone: "plain" },
  country: { detail: "复制国际区号", size: "standard", tone: "plain" },
  text: { detail: "Unicode 字体转换", size: "standard", tone: "plain" },
  image: { detail: "缩放、旋转与格式转换", size: "standard", tone: "plain" },
  qr: { detail: "生成并下载二维码", size: "standard", tone: "plain" },
  timer: { detail: "专注与系统通知", size: "standard", tone: "plain" },
  cron: { detail: "构建、解析与执行预览", size: "standard", tone: "plain" },
  video: { detail: "直链、HLS 与嵌入播放", size: "wide", tone: "plain" },
  filebox: { detail: "取件码寄送文本与文件", size: "wide", tone: "blue" },
  mermaid: { detail: "Mermaid 文本生成图表", size: "standard", tone: "plain" },
  mindmap: { detail: "Markdown 转思维导图", size: "standard", tone: "plain" },
  compress: { detail: "本地压缩与格式转换", size: "standard", tone: "plain" },
  codecard: { detail: "代码生成分享图片", size: "standard", tone: "plain" },
  whiteboard: { detail: "Excalidraw 手绘白板", size: "standard", tone: "plain" },
  flowboard: { detail: "tldraw 流程图编辑器", size: "standard", tone: "plain" },
  cyberchef: { detail: "编码、加密与数据分析", size: "standard", tone: "plain" },
};

const allToolTiles: LaunchTool[] = tools.map((tool) => ({
  ...tool,
  ...toolPresentation[tool.id],
}));

const toolTiles = allToolTiles.filter((tool) => featuredToolIds.has(tool.id));
const implementedToolCount = allToolTiles.filter((tool) => tool.implemented).length;

function getToolStatus(
  tool: LaunchTool,
  favoriteIds: string[],
  lastTool: ToolId,
  toolStatus: Record<string, boolean>,
) {
  if (toolStatus[tool.id] === false) return "已暂停";
  if (favoriteIds.includes(tool.id)) return "已收藏";
  if (tool.id === lastTool && tool.implemented) return "最近使用";
  if (tool.implemented) return "可直接使用";
  return "待接入";
}

export function BrandPanel({
  favoriteIds,
  lastTool,
  toolStatus,
  onSelectTool,
}: BrandPanelProps) {
  return (
    <aside className="brand-panel">
      <header className="brand-panel__header">
        <div className="brand">
          <span className="brand__mark">
            <BrandMark />
          </span>
          <span className="brand__word">Bocchi</span>
        </div>

        <span className="saved-label">
          <Bookmark size={15} strokeWidth={2.1} aria-hidden="true" />
          无需登录
        </span>
      </header>

      <div className="brand-panel__copy">
        <h1>所有常用工具，在同一个入口打开。</h1>
        <p>现在就可以直接使用；登录后，收藏和偏好会跟随你的账户。</p>
      </div>

      <section className="tool-mosaic" aria-label="工具启动台">
        <div className="tool-mosaic__header">
          <span>工具启动台</span>
          <span>
            <Sparkles size={14} strokeWidth={2} aria-hidden="true" />
            可直接打开，无需先登录
          </span>
        </div>

        <div className="tool-mosaic__grid">
          {toolTiles.map((tool) => {
            const Icon = tool.icon;
            const status = getToolStatus(tool, favoriteIds, lastTool, toolStatus);

            return (
              <button
                className={`tool-tile tool-tile--${tool.size} tool-tile--${tool.tone}`}
                key={tool.id}
                type="button"
                disabled={!tool.implemented || toolStatus[tool.id] === false}
                onClick={() => onSelectTool(tool.id)}
              >
                <span className="tool-tile__icon">
                  <Icon size={23} strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="tool-tile__copy">
                  <strong>{tool.label}</strong>
                  <small>{tool.detail}</small>
                </span>
                <span className="tool-tile__status">{status}</span>
              </button>
            );
          })}
        </div>

        <div className="tool-mosaic__more">
          <span>启动台展示精选工具，其他工具可在工作台侧栏打开。</span>
          <button type="button" onClick={() => onSelectTool(lastTool)}>
            查看全部 {implementedToolCount} 个工具
          </button>
        </div>
      </section>

      <footer className="brand-panel__footer">
        <span className="status-dot" aria-hidden="true" />
        本机保存 · 登录后同步
      </footer>
    </aside>
  );
}