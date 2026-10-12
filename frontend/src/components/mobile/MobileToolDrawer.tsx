import { Check, Search, X } from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import { isToolId, type ToolId } from "../toolCatalog";

type MobileToolItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  implemented: boolean;
};

type MobileToolDrawerProps = {
  open: boolean;
  mode: "all" | "favorites";
  tools: MobileToolItem[];
  favoriteIds: string[];
  toolStatus: Record<string, boolean>;
  activeTool: ToolId;
  onSelect: (toolId: ToolId) => void;
  onClose: () => void;
};

export function MobileToolDrawer({
  open,
  mode,
  tools,
  favoriteIds,
  toolStatus,
  activeTool,
  onSelect,
  onClose,
}: MobileToolDrawerProps) {
  const [query, setQuery] = useState("");
  if (!open) return null;

  const visibleTools = (mode === "favorites"
    ? tools.filter((tool) => tool.implemented && favoriteIds.includes(tool.id))
    : tools.filter((tool) => tool.implemented)
  ).filter((tool) => {
    const keyword = query.trim().toLowerCase();
    return !keyword || tool.label.toLowerCase().includes(keyword) || tool.id.toLowerCase().includes(keyword);
  });

  return (
    <div className="mobile-tool-sheet" role="dialog" aria-modal="true" aria-label={mode === "favorites" ? "收藏工具" : "全部工具"}>
      <button className="mobile-tool-sheet__backdrop" type="button" onClick={onClose} aria-label="关闭工具列表" />
      <section className="mobile-tool-sheet__panel">
        <header>
          <div>
            <span>{mode === "favorites" ? "收藏工具" : "全部工具"}</span>
            <small>{query.trim() ? `${visibleTools.length} 个结果` : mode === "favorites" ? `${visibleTools.length} 个收藏` : `${tools.filter((tool) => tool.implemented).length} 个已接入`}</small>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">
            <X size={20} aria-hidden="true" />
          </button>
        </header>

        <label className="mobile-tool-sheet__search">
          <Search size={16} aria-hidden="true" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索工具" aria-label="搜索工具" />
        </label>

        {visibleTools.length ? (
          <div className="mobile-tool-sheet__list">
            {visibleTools.map((tool) => {
              const Icon = tool.icon;
              const isActive = tool.id === activeTool;
              const isFavorite = favoriteIds.includes(tool.id);
              return (
                <button
                  className={isActive ? "is-active" : ""}
                  key={tool.id}
                  type="button"
                  disabled={!tool.implemented || toolStatus[tool.id] === false}
                  onClick={() => {
                    if (isToolId(tool.id)) {
                      onSelect(tool.id);
                      onClose();
                    }
                  }}
                >
                  <span className="mobile-tool-sheet__icon">
                    <Icon size={20} aria-hidden="true" />
                  </span>
                  <span>
                    <strong>{tool.label}</strong>
                    <small>{toolStatus[tool.id] === false ? "已暂停" : tool.implemented ? (isFavorite ? "已收藏" : "可直接使用") : "待接入"}</small>
                  </span>
                  {isActive && <Check size={18} aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="mobile-tool-sheet__empty">{mode === "favorites" ? "还没有收藏工具。打开工具后点击右上角星标。" : query.trim() ? "没有匹配的工具。" : "暂时没有可用工具。"}</p>
        )}
      </section>
    </div>
  );
}

