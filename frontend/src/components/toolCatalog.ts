import {
  Binary,
  Braces,
  CalendarClock,
  CalendarDays,
  Clapperboard,
  Clock3,
  Clock4,
  FileCode2,
  FileImage,
  FileSpreadsheet,
  FileText,
  Fingerprint,
  GitCompare,
  Globe2,
  Hash,
  Image,
  ImageDown,
  ImagePlus,
  KeyRound,
  Link2,
  Network,
  PackageOpen,
  Palette,
  PenTool,
  QrCode,
  Scale,
  ScanLine,
  Search,
  Shapes,
  SmilePlus,
  ChefHat,
  WandSparkles,
  Trophy,
  Type,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type ToolId =
  | "json"
  | "timestamp"
  | "encoding"
  | "password"
  | "markdown"
  | "url"
  | "diff"
  | "id"
  | "jwt"
  | "hash"
  | "regex"
  | "date"
  | "csv"
  | "timezone"
  | "units"
  | "cleaner"
  | "watermark"
  | "svg"
  | "qrscan"
  | "hokpower"
  | "color"
  | "meme"
  | "country"
  | "text"
  | "image"
  | "qr"
  | "timer"
  | "cron"
  | "video"
  | "filebox"
  | "mermaid"
  | "mindmap"
  | "compress"
  | "codecard"
  | "whiteboard"
  | "flowboard"
  | "cyberchef";

export type ToolItem = {
  id: ToolId;
  label: string;
  icon: LucideIcon;
  implemented: boolean;
};

export const tools: ToolItem[] = [
  { id: "json", label: "JSON 格式化", icon: Braces, implemented: true },
  { id: "timestamp", label: "时间戳转换", icon: Clock4, implemented: true },
  { id: "encoding", label: "Base64 / URL", icon: Binary, implemented: true },
  { id: "password", label: "密码生成器", icon: KeyRound, implemented: true },
  { id: "markdown", label: "Markdown 编辑器", icon: FileText, implemented: true },
  { id: "url", label: "URL 解析器", icon: Link2, implemented: true },
  { id: "diff", label: "文本差异对比", icon: GitCompare, implemented: true },
  { id: "id", label: "UUID / 随机 ID", icon: Fingerprint, implemented: true },
  { id: "jwt", label: "JWT 解析器", icon: KeyRound, implemented: true },
  { id: "hash", label: "哈希计算器", icon: Hash, implemented: true },
  { id: "regex", label: "正则测试器", icon: Search, implemented: true },
  { id: "date", label: "日期计算器", icon: CalendarDays, implemented: true },
  { id: "csv", label: "CSV / JSON", icon: FileSpreadsheet, implemented: true },
  { id: "timezone", label: "时区会议规划", icon: Globe2, implemented: true },
  { id: "units", label: "单位换算", icon: Scale, implemented: true },
  { id: "cleaner", label: "文本清理器", icon: WandSparkles, implemented: true },
  { id: "watermark", label: "图片水印", icon: ImagePlus, implemented: true },
  { id: "svg", label: "SVG 预览优化", icon: FileCode2, implemented: true },
  { id: "qrscan", label: "二维码识别", icon: ScanLine, implemented: true },
  { id: "hokpower", label: "王者最低战力", icon: Trophy, implemented: true },
  { id: "color", label: "颜色工具", icon: Palette, implemented: true },
  { id: "meme", label: "表情包合成", icon: SmilePlus, implemented: true },
  { id: "country", label: "国家代码复制", icon: Globe2, implemented: true },
  { id: "text", label: "文字转换", icon: Type, implemented: true },
  { id: "image", label: "图像处理", icon: Image, implemented: true },
  { id: "qr", label: "二维码", icon: QrCode, implemented: true },
  { id: "timer", label: "计时器", icon: Clock3, implemented: true },
  { id: "cron", label: "Cron 表达式", icon: CalendarClock, implemented: true },
  { id: "video", label: "在线视频播放器", icon: Clapperboard, implemented: true },
  { id: "filebox", label: "文件快递柜", icon: PackageOpen, implemented: true },
  { id: "mermaid", label: "文本转图表", icon: Workflow, implemented: true },
  { id: "mindmap", label: "思维导图", icon: Network, implemented: true },
  { id: "compress", label: "图片压缩", icon: ImageDown, implemented: true },
  { id: "codecard", label: "代码分享卡片", icon: FileImage, implemented: true },
  { id: "whiteboard", label: "手绘白板", icon: PenTool, implemented: true },
  { id: "flowboard", label: "在线流程图", icon: Shapes, implemented: true },
  { id: "cyberchef", label: "CyberChef 编解码", icon: ChefHat, implemented: true },
];

export const implementedToolIds = tools
  .filter((tool) => tool.implemented)
  .map((tool) => tool.id);

export function isToolId(value: string): value is ToolId {
  return implementedToolIds.includes(value as ToolId);
}