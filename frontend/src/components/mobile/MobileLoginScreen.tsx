import { ArrowLeft, Braces, Palette } from "lucide-react";
import type { AuthSession } from "../../services/auth";
import type { ToolId } from "../toolCatalog";
import { BrandMark } from "../BrandMark";
import { LoginForm } from "../LoginForm";

type MobileLoginScreenProps = {
  onBack: () => void;
  onAuthenticated: (session: AuthSession) => void;
  onSelectTool: (toolId: ToolId) => void;
};

export function MobileLoginScreen({
  onBack,
  onAuthenticated,
  onSelectTool,
}: MobileLoginScreenProps) {
  return (
    <main className="mobile-login-page">
      <header className="mobile-login-header">
        <button type="button" onClick={onBack} aria-label="返回工具">
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
        <span>
          <span className="mobile-login-header__mark">
            <BrandMark />
          </span>
          Bocchi
        </span>
      </header>

      <section className="mobile-login-hero">
        <h1>工具不用登录，也能直接使用。</h1>
        <p>登录只用于同步收藏和偏好。当前设备上的工具数据会继续保留。</p>
        <button className="mobile-login-guest" type="button" onClick={onBack}>
          先直接使用工具
        </button>
        <div className="mobile-login-tools">
          <button type="button" onClick={() => onSelectTool("json")}>
            <Braces size={19} aria-hidden="true" />
            JSON 格式化
          </button>
          <button type="button" onClick={() => onSelectTool("color")}>
            <Palette size={19} aria-hidden="true" />
            颜色工具
          </button>
        </div>
      </section>

      <section className="mobile-login-form-card">
        <LoginForm onAuthenticated={onAuthenticated} />
      </section>
    </main>
  );
}