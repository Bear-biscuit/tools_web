import { FolderOpen, Star, UserRound } from "lucide-react";

type MobileBottomNavProps = {
  onOpenTools: () => void;
  onOpenFavorites: () => void;
  onAccount: () => void;
  isLoggedIn: boolean;
};

export function MobileBottomNav({
  onOpenTools,
  onOpenFavorites,
  onAccount,
  isLoggedIn,
}: MobileBottomNavProps) {
  return (
    <nav className="mobile-bottom-nav" aria-label="移动端导航">
      <button type="button" onClick={onOpenTools}>
        <FolderOpen size={20} strokeWidth={1.9} aria-hidden="true" />
        <span>工具</span>
      </button>
      <button type="button" onClick={onOpenFavorites}>
        <Star size={20} strokeWidth={1.9} aria-hidden="true" />
        <span>收藏</span>
      </button>
      <button type="button" onClick={onAccount}>
        <UserRound size={20} strokeWidth={1.9} aria-hidden="true" />
        <span>{isLoggedIn ? "账户" : "登录"}</span>
      </button>
    </nav>
  );
}