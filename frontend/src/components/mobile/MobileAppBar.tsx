import { LogIn, Star, UserRound } from "lucide-react";
import type { AuthUser } from "../../services/auth";
import { BrandMark } from "../BrandMark";

type MobileAppBarProps = {
  title: string;
  isFavorite: boolean;
  user?: AuthUser | null;
  onToggleFavorite: () => void;
  onOpenTools: () => void;
  onLogin: () => void;
  onAccount: () => void;
};

export function MobileAppBar({
  title,
  isFavorite,
  user,
  onToggleFavorite,
  onOpenTools,
  onLogin,
  onAccount,
}: MobileAppBarProps) {
  return (
    <header className="mobile-app-bar">
      <button className="mobile-app-bar__brand" type="button" onClick={onOpenTools} aria-label="打开工具列表">
        <span className="mobile-app-bar__mark">
          <BrandMark />
        </span>
        <span>
          <small>Bocchi</small>
          <strong>{title}</strong>
        </span>
      </button>

      <div className="mobile-app-bar__actions">
        <button
          className={isFavorite ? "is-active" : ""}
          type="button"
          onClick={onToggleFavorite}
          aria-label={isFavorite ? "取消收藏" : "收藏当前工具"}
        >
          <Star size={19} fill={isFavorite ? "currentColor" : "none"} aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={user ? onAccount : onLogin}
          aria-label={user ? "账户设置" : "登录同步"}
        >
          {user?.avatar ? (
            <img className="mobile-app-bar__avatar" src={user.avatar} alt="" />
          ) : user ? (
            <UserRound size={19} aria-hidden="true" />
          ) : (
            <LogIn size={19} aria-hidden="true" />
          )}
        </button>
      </div>
    </header>
  );
}
