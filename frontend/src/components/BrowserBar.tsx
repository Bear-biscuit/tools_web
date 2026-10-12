import {
  ArrowLeft,
  Cloud,
  LockKeyhole,
  LogIn,
  LogOut,
  UserRound,
} from "lucide-react";
import type { AuthUser } from "../services/auth";
import { useAppPath } from "../lib/navigation";
import { NovaMascot } from "./NovaMascot";

type BrowserBarProps = {
  user?: AuthUser | null;
  onLogin?: () => void;
  onLogout?: () => void;
  onAccount?: () => void;
  onBack?: () => void;
};

export function BrowserBar({ user, onLogin, onLogout, onAccount, onBack }: BrowserBarProps) {
  const path = useAppPath();
  const address = window.location.host + path;

  return (
    <header className="browser-bar">
      <div className="window-controls" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>

      <NovaMascot />

      <div className="browser-address" aria-label="当前地址">
        <LockKeyhole size={13} strokeWidth={2} aria-hidden="true" />
        <span>{address}</span>
      </div>

      {user ? (
        <div className="browser-user">
          <button className="browser-user__profile" type="button" onClick={onAccount} disabled={!onAccount}>
            <span className="browser-user__avatar" aria-hidden="true">
              {user.avatar ? <img src={user.avatar} alt="" /> : user.name.slice(0, 1)}
            </span>
            <span>{user.name}</span>
          </button>
          <button type="button" onClick={onLogout} aria-label="退出登录">
            <LogOut size={14} strokeWidth={2} aria-hidden="true" />
            退出
          </button>
        </div>
      ) : onLogin ? (
        <div className="browser-guest">
          <UserRound size={15} strokeWidth={2} aria-hidden="true" />
          <span>游客模式</span>
          <button type="button" onClick={onLogin}>
            <LogIn size={14} strokeWidth={2} aria-hidden="true" />登录同步
          </button>
        </div>
      ) : onBack ? (
        <button className="browser-back" type="button" onClick={onBack}>
          <ArrowLeft size={15} strokeWidth={2} aria-hidden="true" />
          返回工具
        </button>
      ) : (
        <div className="browser-sync">
          <Cloud size={14} strokeWidth={2} aria-hidden="true" />
          <span>收藏同步预留</span>
        </div>
      )}
</header>
  );
}