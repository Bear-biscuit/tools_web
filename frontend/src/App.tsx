import { lazy, Suspense, useEffect, useState } from "react";
import { AccountPage } from "./components/AccountPage";
import { BrandPanel } from "./components/BrandPanel";
import { BrowserBar } from "./components/BrowserBar";
import { LoginForm } from "./components/LoginForm";
import { MobileLoginScreen } from "./components/mobile/MobileLoginScreen";
import { Workspace, type ToolId } from "./components/Workspace";
import { isToolId } from "./components/toolCatalog";
import { useMediaQuery } from "./hooks/useMediaQuery";
import { navigate, useAppPath } from "./lib/navigation";
import { useSeo } from "./seo/useSeo";
import { getFavoriteToolIds, setToolFavorite } from "./services/account";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  type AuthSession,
} from "./services/auth";

const AdminPage = lazy(() => import("./components/AdminPage").then((module) => ({ default: module.AdminPage })));
const MyDataPage = lazy(() => import("./components/MyDataPage").then((module) => ({ default: module.MyDataPage })));
const SharedPage = lazy(() => import("./components/SharedPage").then((module) => ({ default: module.SharedPage })));

const LAST_TOOL_KEY = "nova.last-tool";

function getToolFromPath(path: string): ToolId {
  const match = /^\/tools\/([^/]+)$/.exec(path);
  const candidate = match?.[1] ?? "";
  return isToolId(candidate) ? candidate : "json";
}

function getLastTool(): ToolId {
  try {
    const stored = window.localStorage.getItem(LAST_TOOL_KEY) ?? "";
    return isToolId(stored) ? stored : "json";
  } catch {
    return "json";
  }
}

export default function App() {
  const appPath = useAppPath();
  const isMobile = useMediaQuery("(max-width: 900px)");
  const [session, setSession] = useState<AuthSession | null>(getStoredSession);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [lastTool, setLastTool] = useState<ToolId>(getLastTool);
  const [toolStatus, setToolStatus] = useState<Record<string, boolean>>({});

  const path = appPath === "/" && !session ? "/login" : appPath;
  useSeo(appPath);


  useEffect(() => {
    let active = true;
    const loadToolStatus = () => {
      fetch("/api/tools/status")
        .then((response) => response.json() as Promise<{ tools?: Array<{ id: string; enabled: boolean }> }>)
        .then((payload) => {
          if (!active) return;
          setToolStatus(Object.fromEntries((payload.tools ?? []).map((tool) => [tool.id, tool.enabled])));
        })
        .catch(() => undefined);
    };
    loadToolStatus();
    window.addEventListener("focus", loadToolStatus);
    return () => {
      active = false;
      window.removeEventListener("focus", loadToolStatus);
    };
  }, []);

  useEffect(() => {
    let active = true;

    getFavoriteToolIds(session)
      .then((ids) => {
        if (active) setFavoriteIds(ids);
      })
      .catch(() => {
        if (active) setFavoriteIds([]);
      });

    return () => {
      active = false;
    };
  }, [session]);

  function selectTool(toolId: ToolId) {
    if (toolStatus[toolId] === false) return;
    setLastTool(toolId);
    try {
      window.localStorage.setItem(LAST_TOOL_KEY, toolId);
    } catch {
      // Last-tool storage is optional.
    }
    navigate(`/tools/${toolId}`);
  }

  async function toggleFavorite(toolId: ToolId) {
    const next = await setToolFavorite(
      toolId,
      !favoriteIds.includes(toolId),
      session,
    );
    setFavoriteIds(next);
  }
  async function handleAuthenticated(authenticatedSession: AuthSession) {
    setStoredSession(authenticatedSession);
    setSession(authenticatedSession);
    navigate(`/tools/${lastTool}`);
  }

  function handleAccountUpdated(nextSession: AuthSession) {
    setStoredSession(nextSession);
    setSession(nextSession);
  }

  function logout() {
    clearStoredSession();
    setSession(null);
    navigate("/login");
  }

  const activeTool = path === "/" ? lastTool : getToolFromPath(path);

  if (path === "/admin") {
    return (
      <Suspense fallback={<main className="admin-page"><div className="tool-loading">正在加载管理后台…</div></main>}>
        <AdminPage />
      </Suspense>
    );
  }

  if (path === "/account") {
    if (!session) {
      navigate("/login", true);
      return null;
    }

    return (
      <AccountPage
        session={session}
        onBack={() => navigate(`/tools/${lastTool}`)}
        onUpdated={handleAccountUpdated}
        onLogout={logout}
        onData={() => navigate("/account/data")}
      />
    );
  }

  if (path === "/account/data") {
    if (!session) {
      navigate("/login", true);
      return null;
    }

    return (
      <Suspense fallback={<main className="page"><div className="tool-loading">正在加载个人数据…</div></main>}>
        <MyDataPage session={session} onBack={() => navigate(`/tools/${lastTool}`)} />
      </Suspense>
    );
  }

  if (path === "/login") {
    if (isMobile) {
      return (
        <MobileLoginScreen
          onBack={() => navigate(`/tools/${lastTool}`)}
          onAuthenticated={handleAuthenticated}
          onSelectTool={selectTool}
        />
      );
    }

    return (
      <>
        <a className="skip-link" href="#login-form">
          跳到登录表单
        </a>
        <main className="page">
          <section className="browser-window" aria-label="Bocchi 账户登录">
            <BrowserBar onBack={() => navigate(`/tools/${lastTool}`)} />
            <div className="browser-window__body">
              <BrandPanel
                favoriteIds={favoriteIds}
                lastTool={lastTool}
                toolStatus={toolStatus}
                onSelectTool={selectTool}
              />
              <section className="auth-panel">
                <LoginForm onAuthenticated={handleAuthenticated} />
              </section>
            </div>
          </section>
        </main>
      </>
    );
  }

  const shareMatch = /^\/s\/([^/]+)$/.exec(path);
  if (shareMatch) {
    return (
      <Suspense fallback={<main className="shared-page"><div className="tool-loading">正在加载分享…</div></main>}>
        <SharedPage code={shareMatch[1]} />
      </Suspense>
    );
  }

  return (
    <Workspace
      session={session}
      toolStatus={toolStatus}
      activeTool={activeTool}
      favoriteIds={favoriteIds}
      onSelectTool={selectTool}
      onToggleFavorite={toggleFavorite}
      onLogin={() => navigate("/login")}
      onAccount={() => navigate("/account")}
      onLogout={logout}
    />
  );
}
