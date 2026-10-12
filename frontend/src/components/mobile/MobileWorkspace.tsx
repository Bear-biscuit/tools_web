import { type ReactNode, useState } from "react";
import type { AuthSession } from "../../services/auth";
import type { ToolId, ToolItem } from "../toolCatalog";
import { MobileAppBar } from "./MobileAppBar";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileToolDrawer } from "./MobileToolDrawer";

type MobileWorkspaceProps = {
  activeTool: ToolId;
  favoriteIds: string[];
  toolStatus: Record<string, boolean>;
  tools: ToolItem[];
  session: AuthSession | null;
  children: ReactNode;
  onSelectTool: (toolId: ToolId) => void;
  onToggleFavorite: (toolId: ToolId) => Promise<void>;
  onLogin: () => void;
  onAccount: () => void;
};

export function MobileWorkspace({
  activeTool,
  favoriteIds,
  toolStatus,
  tools,
  session,
  children,
  onSelectTool,
  onToggleFavorite,
  onLogin,
  onAccount,
}: MobileWorkspaceProps) {
  const [drawer, setDrawer] = useState<{ open: boolean; mode: "all" | "favorites" }>({
    open: false,
    mode: "all",
  });

  const activeName = tools.find((tool) => tool.id === activeTool)?.label ?? "工具";
  const isFavorite = favoriteIds.includes(activeTool);

  return (
    <div className="mobile-workspace">
      <MobileAppBar
        title={activeName}
        isFavorite={isFavorite}
        user={session?.user}
        onToggleFavorite={() => onToggleFavorite(activeTool)}
        onOpenTools={() => setDrawer({ open: true, mode: "all" })}
        onLogin={onLogin}
        onAccount={onAccount}
      />

      <main className="mobile-workspace__content">{children}</main>

      <MobileBottomNav
        isLoggedIn={Boolean(session)}
        onOpenTools={() => setDrawer({ open: true, mode: "all" })}
        onOpenFavorites={() => setDrawer({ open: true, mode: "favorites" })}
        onAccount={onAccount}
      />

      <MobileToolDrawer
        open={drawer.open}
        mode={drawer.mode}
        tools={tools}
        favoriteIds={favoriteIds}
        toolStatus={toolStatus}
        activeTool={activeTool}
        onSelect={onSelectTool}
        onClose={() => setDrawer((current) => ({ ...current, open: false }))}
      />
    </div>
  );
}
