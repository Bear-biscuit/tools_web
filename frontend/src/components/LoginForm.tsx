import type { AuthSession } from "../services/auth";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  LogIn,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  History,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  UserRound,
} from "lucide-react";
import {
  AuthError,
  authenticate,
  clearRememberedEmail,
  getRememberedEmail,
  setRememberedEmail,
} from "../services/auth";
import { requestPasswordResetCode, requestRegistrationCode, verifyPasswordReset, verifyRegistration } from "../services/registration";

type FieldName = "email" | "password";
type FieldErrors = Partial<Record<FieldName, string>>;
type SubmitStatus = "idle" | "submitting" | "success";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email: string) {
  if (!email.trim()) return "请输入邮箱地址";
  if (!emailPattern.test(email.trim())) return "请输入有效的邮箱地址";
  return "";
}

function validatePassword(password: string) {
  if (!password) return "请输入密码";
  return "";
}

type LoginFormProps = {
  onAuthenticated: (session: AuthSession) => void;
};

export function LoginForm({ onAuthenticated }: LoginFormProps) {
  const rememberedEmail = getRememberedEmail();
  const [email, setEmail] = useState(rememberedEmail);
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(Boolean(rememberedEmail));
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");
  const [userName, setUserName] = useState("");
  const [view, setView] = useState<"login" | "forgot" | "register">("login");
  const [forgotStep, setForgotStep] = useState<"email" | "verify" | "done">("email");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirm, setResetConfirm] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetNotice, setResetNotice] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [registerStep, setRegisterStep] = useState<"details" | "verify">("details");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regCode, setRegCode] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [regError, setRegError] = useState("");
  const [regNotice, setRegNotice] = useState("");
  const [regLoading, setRegLoading] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);


  useEffect(() => {
    if (status === "success") successHeadingRef.current?.focus();
  }, [status]);

  function updateField(field: FieldName, value: string) {
    if (field === "email") setEmail(value);
    else setPassword(value);

    if (errors[field]) {
      const nextMessage = field === "email" ? validateEmail(value) : validatePassword(value);
      setErrors((current) => ({ ...current, [field]: nextMessage }));
    }

    if (formError) setFormError("");
    if (notice) setNotice("");
  }

  function handleEmailChange(event: ChangeEvent<HTMLInputElement>) {
    updateField("email", event.target.value);
  }

  function handlePasswordChange(event: ChangeEvent<HTMLInputElement>) {
    updateField("password", event.target.value);
  }

  function handleEmailBlur() {
    setErrors((current) => ({ ...current, email: validateEmail(email) }));
  }

  function handlePasswordBlur() {
    setErrors((current) => ({ ...current, password: validatePassword(password) }));
    setCapsLock(false);
  }

  function handlePasswordKeyEvent(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FieldErrors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    const hasErrors = Object.values(nextErrors).some(Boolean);
    setErrors(nextErrors);
    setNotice("");

    if (hasErrors) {
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setStatus("submitting");
    setFormError("");

    try {
      const session = await authenticate({ email, password });

      if (remember) setRememberedEmail(email.trim());
      else clearRememberedEmail();

      setUserName(session.user.name);
      setStatus("success");
      window.setTimeout(() => onAuthenticated(session), 700);
    } catch (error) {
      setStatus("idle");
      setFormError(
        error instanceof AuthError
          ? error.message
          : "暂时无法登录，请稍后再试。",
      );
      passwordRef.current?.focus();
      passwordRef.current?.select();
    }
  }

  function resetForm() {
    setPassword("");
    setStatus("idle");
    setFormError("");
    setNotice("");
    setErrors({});
    setUserName("");
    window.setTimeout(() => passwordRef.current?.focus(), 0);
  }

  function openForgot() {
    setView("forgot");
    setForgotStep("email");
    setResetEmail("");
    setResetCode("");
    setResetPassword("");
    setResetConfirm("");
    setResetError("");
    setResetNotice("");
    setFormError("");
    setNotice("");
  }

  function openRegister() {
    setView("register");
    setRegisterStep("details");
    setRegName("");
    setRegEmail("");
    setRegCode("");
    setRegPassword("");
    setRegConfirm("");
    setRegError("");
    setRegNotice("");
    setFormError("");
    setNotice("");
  }

  async function handleResetRequest(event?: FormEvent) {
    event?.preventDefault();
    setResetError("");
    setResetNotice("");
    if (!emailPattern.test(resetEmail.trim())) {
      setResetError("请输入有效的邮箱地址。");
      return;
    }
    setResetLoading(true);
    try {
      const result = await requestPasswordResetCode({ email: resetEmail });
      if (result.debugCode) {
        setResetCode(result.debugCode);
        setResetNotice(`开发环境验证码：${result.debugCode}，已自动填入。`);
      } else {
        setResetNotice("验证码已发送，请检查邮箱。");
      }
      setForgotStep("verify");
    } catch (reason) {
      setResetError(reason instanceof Error ? reason.message : "验证码发送失败。");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResetVerify(event: FormEvent) {
    event.preventDefault();
    setResetError("");
    setResetNotice("");
    if (!/^\d{6}$/.test(resetCode)) {
      setResetError("请输入 6 位邮箱验证码。");
      return;
    }
    if (resetPassword.length < 8) {
      setResetError("密码至少需要 8 个字符。");
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError("两次输入的密码不一致。");
      return;
    }
    setResetLoading(true);
    try {
      await verifyPasswordReset({ email: resetEmail, code: resetCode, newPassword: resetPassword });
      setForgotStep("done");
    } catch (reason) {
      setResetError(reason instanceof Error ? reason.message : "密码重置失败。");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleRegisterRequest(event?: FormEvent) {
    event?.preventDefault();
    setRegError("");
    setRegNotice("");
    if (regName.trim().length < 2) {
      setRegError("请输入至少 2 个字符的姓名。");
      return;
    }
    if (!emailPattern.test(regEmail.trim())) {
      setRegError("请输入有效的邮箱地址。");
      return;
    }
    setRegLoading(true);
    try {
      const result = await requestRegistrationCode({ name: regName, email: regEmail });
      if (result.debugCode) {
        setRegCode(result.debugCode);
        setRegNotice(`开发环境验证码：${result.debugCode}，已自动填入。`);
      } else {
        setRegNotice("验证码已发送，请检查邮箱。");
      }
      setRegisterStep("verify");
    } catch (reason) {
      setRegError(reason instanceof Error ? reason.message : "验证码发送失败。");
    } finally {
      setRegLoading(false);
    }
  }

  async function handleRegisterVerify(event: FormEvent) {
    event.preventDefault();
    setRegError("");
    setRegNotice("");
    if (!/^\d{6}$/.test(regCode)) {
      setRegError("请输入 6 位邮箱验证码。");
      return;
    }
    if (regPassword.length < 8) {
      setRegError("密码至少需要 8 个字符。");
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError("两次输入的密码不一致。");
      return;
    }
    setRegLoading(true);
    try {
      const session = await verifyRegistration({ email: regEmail, code: regCode, password: regPassword });
      setUserName(session.user.name);
      setStatus("success");
      window.setTimeout(() => onAuthenticated(session), 700);
    } catch (reason) {
      setRegError(reason instanceof Error ? reason.message : "注册失败，请重试。");
    } finally {
      setRegLoading(false);
    }
  }
  if (status === "success") {
    return (
      <div className="success-state" aria-live="polite">
        <span className="success-state__icon">
          <Check size={30} strokeWidth={2.2} aria-hidden="true" />
        </span>
        <h1 tabIndex={-1} ref={successHeadingRef}>
          工具台已解锁
        </h1>
        <p className="success-state__body">
          {userName ? `${userName}，` : ""}身份验证已完成。下一步可以接入收藏、偏好和操作记录的数据存储。
        </p>

        <div className="success-summary" aria-label="下一步能力">
          <span>
            <Star size={17} aria-hidden="true" />
            收藏
          </span>
          <span>
            <SlidersHorizontal size={17} aria-hidden="true" />
            偏好
          </span>
          <span>
            <History size={17} aria-hidden="true" />
            最近操作
          </span>
        </div>

        <button className="secondary-button" type="button" onClick={resetForm}>
          使用其他账号登录
        </button>
      </div>
    );
  }

  if (view === "forgot") {
    return (
      <div className="form-wrap">
        <header className="form-header">
          <div className="mobile-brand">
            <span className="mobile-brand__mark">
              <KeyRound size={21} strokeWidth={2} aria-hidden="true" />
            </span>
            Bocchi 工具台
          </div>
          <h1>{forgotStep === "done" ? "密码已重置" : "重置密码"}</h1>
          <p>
            {forgotStep === "email"
              ? "输入注册邮箱，我们会发送验证码。"
              : forgotStep === "verify"
                ? "输入验证码并设置一个新密码。"
                : "现在可以用新密码登录你的账户了。"}
          </p>
        </header>

        {resetError && (
          <div className="form-alert" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{resetError}</span>
          </div>
        )}
        {resetNotice && (
          <div className="form-notice" role="status">
            <Check size={17} aria-hidden="true" />
            <span>{resetNotice}</span>
          </div>
        )}

        {forgotStep === "email" && (
          <form className="login-form" onSubmit={handleResetRequest} noValidate>
            <div className="field">
              <label htmlFor="reset-email">邮箱地址</label>
              <div className="input-wrap">
                <Mail className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reset-email"
                  name="reset-email"
                  type="email"
                  value={resetEmail}
                  placeholder="name@company.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(event) => setResetEmail(event.target.value)}
                />
              </div>
            </div>
            <button className="login-button" type="submit" disabled={resetLoading}>
              {resetLoading ? "正在发送…" : "发送验证码"}
            </button>
          </form>
        )}

        {forgotStep === "verify" && (
          <form className="login-form" onSubmit={handleResetVerify} noValidate>
            <div className="field">
              <label htmlFor="reset-code">邮箱验证码</label>
              <div className="input-wrap">
                <ShieldCheck className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reset-code"
                  name="reset-code"
                  value={resetCode}
                  placeholder="6 位验证码"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  onChange={(event) => setResetCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="reset-password">新密码</label>
              <div className="input-wrap">
                <LockKeyhole className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reset-password"
                  name="reset-password"
                  type="password"
                  value={resetPassword}
                  placeholder="至少 8 个字符"
                  autoComplete="new-password"
                  onChange={(event) => setResetPassword(event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="reset-confirm">确认新密码</label>
              <div className="input-wrap">
                <LockKeyhole className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reset-confirm"
                  name="reset-confirm"
                  type="password"
                  value={resetConfirm}
                  placeholder="再次输入新密码"
                  autoComplete="new-password"
                  onChange={(event) => setResetConfirm(event.target.value)}
                />
              </div>
            </div>
            <button className="login-button" type="submit" disabled={resetLoading}>
              {resetLoading ? "正在重置…" : "确认重置密码"}
            </button>
            <button className="text-button" type="button" onClick={() => handleResetRequest()} disabled={resetLoading}>
              重新发送验证码
            </button>
          </form>
        )}

        {forgotStep === "done" && (
          <div className="success-state" aria-live="polite">
            <span className="success-state__icon">
              <Check size={30} strokeWidth={2.2} aria-hidden="true" />
            </span>
            <h1>密码已重置</h1>
            <p className="success-state__body">现在可以用新密码登录你的账户了。</p>
            <button className="secondary-button" type="button" onClick={() => setView("login")}>
              返回登录
            </button>
          </div>
        )}

        {forgotStep !== "done" && (
          <button className="secondary-button" type="button" onClick={() => setView("login")}>
            返回登录
          </button>
        )}
      </div>
    );
  }

  if (view === "register") {
    return (
      <div className="form-wrap">
        <header className="form-header">
          <div className="mobile-brand">
            <span className="mobile-brand__mark">
              <UserRound size={21} strokeWidth={2} aria-hidden="true" />
            </span>
            Bocchi 工具台
          </div>
          <h1>创建账户</h1>
          <p>
            {registerStep === "details"
              ? "填写姓名和邮箱，我们会发送验证码。"
              : "输入验证码并设置一个密码。"}
          </p>
        </header>

        {regError && (
          <div className="form-alert" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{regError}</span>
          </div>
        )}
        {regNotice && (
          <div className="form-notice" role="status">
            <Check size={17} aria-hidden="true" />
            <span>{regNotice}</span>
          </div>
        )}

        {registerStep === "details" && (
          <form className="login-form" onSubmit={handleRegisterRequest} noValidate>
            <div className="field">
              <label htmlFor="reg-name">姓名</label>
              <div className="input-wrap">
                <UserRound className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reg-name"
                  name="reg-name"
                  value={regName}
                  placeholder="你的名字"
                  autoComplete="name"
                  onChange={(event) => setRegName(event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="reg-email">邮箱地址</label>
              <div className="input-wrap">
                <Mail className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reg-email"
                  name="reg-email"
                  type="email"
                  value={regEmail}
                  placeholder="name@company.com"
                  autoComplete="email"
                  inputMode="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  onChange={(event) => setRegEmail(event.target.value)}
                />
              </div>
            </div>
            <button className="login-button" type="submit" disabled={regLoading}>
              {regLoading ? "正在发送…" : "发送邮箱验证码"}
            </button>
          </form>
        )}

        {registerStep === "verify" && (
          <form className="login-form" onSubmit={handleRegisterVerify} noValidate>
            <div className="register-email-summary">
              <Mail size={17} aria-hidden="true" />
              <span>{regEmail}</span>
              <button type="button" onClick={() => setRegisterStep("details")}>修改</button>
            </div>
            <div className="field">
              <label htmlFor="reg-code">邮箱验证码</label>
              <div className="input-wrap">
                <ShieldCheck className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reg-code"
                  name="reg-code"
                  value={regCode}
                  placeholder="6 位验证码"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  onChange={(event) => setRegCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="reg-password">设置密码</label>
              <div className="input-wrap">
                <LockKeyhole className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reg-password"
                  name="reg-password"
                  type="password"
                  value={regPassword}
                  placeholder="至少 8 个字符"
                  autoComplete="new-password"
                  onChange={(event) => setRegPassword(event.target.value)}
                />
              </div>
            </div>
            <div className="field">
              <label htmlFor="reg-confirm">确认密码</label>
              <div className="input-wrap">
                <LockKeyhole className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
                <input
                  id="reg-confirm"
                  name="reg-confirm"
                  type="password"
                  value={regConfirm}
                  placeholder="再次输入密码"
                  autoComplete="new-password"
                  onChange={(event) => setRegConfirm(event.target.value)}
                />
              </div>
            </div>
            <button className="login-button" type="submit" disabled={regLoading}>
              {regLoading ? "正在创建…" : "完成注册"}
            </button>
            <button className="text-button" type="button" onClick={() => handleRegisterRequest()} disabled={regLoading}>
              重新发送验证码
            </button>
          </form>
        )}

        <button className="secondary-button" type="button" onClick={() => setView("login")}>
          返回登录
        </button>
      </div>
    );
  }

  return (
    <div className="form-wrap">
      <header className="form-header">
        <div className="mobile-brand">
          <span className="mobile-brand__mark">
            <KeyRound size={21} strokeWidth={2} aria-hidden="true" />
          </span>
          Bocchi 工具台
        </div>
        <h1>回到你的工具台</h1>
        <p>登录后继续使用收藏和偏好设置。</p>
      </header>

      {formError && (
        <div className="form-alert" role="alert">
          <CircleAlert size={18} aria-hidden="true" />
          <span>{formError}</span>
        </div>
      )}

      {notice && (
        <div className="form-notice" role="status">
          <Check size={17} aria-hidden="true" />
          <span>{notice}</span>
        </div>
      )}

      <form className="login-form" id="login-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="email">邮箱地址</label>
          <div className={`input-wrap${errors.email ? " input-wrap--error" : ""}`}>
            <Mail className="input-icon" size={18} strokeWidth={1.8} aria-hidden="true" />
            <input
              ref={emailRef}
              id="email"
              name="email"
              type="email"
              value={email}
              placeholder="name@company.com"
              autoComplete="username"
              inputMode="email"
              enterKeyHint="next"
              autoCapitalize="none"
              spellCheck={false}
              aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? "email-error" : undefined}
              onChange={handleEmailChange}
              onBlur={handleEmailBlur}
            />
          </div>
          <p className="field-error" id="email-error" aria-live="polite">
            {errors.email}
          </p>
        </div>

        <div className="field">
          <div className="label-row">
            <label htmlFor="password">密码</label>
            <button
              className="text-button"
              type="button"
              onClick={() =>
                openForgot()
              }
            >
              忘记密码？
            </button>
          </div>
          <div className={`input-wrap${errors.password ? " input-wrap--error" : ""}`}>
            <LockKeyhole
              className="input-icon"
              size={18}
              strokeWidth={1.8}
              aria-hidden="true"
            />
            <input
              ref={passwordRef}
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              placeholder="输入你的密码"
              autoComplete="current-password"
              enterKeyHint="done"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              onChange={handlePasswordChange}
              onBlur={handlePasswordBlur}
              onKeyDown={handlePasswordKeyEvent}
              onKeyUp={handlePasswordKeyEvent}
            />
            <button
              className="password-toggle"
              type="button"
              aria-label={showPassword ? "隐藏密码" : "显示密码"}
              aria-pressed={showPassword}
              onClick={() => setShowPassword((visible) => !visible)}
            >
              {showPassword ? (
                <EyeOff size={18} strokeWidth={1.9} aria-hidden="true" />
              ) : (
                <Eye size={18} strokeWidth={1.9} aria-hidden="true" />
              )}
            </button>
          </div>
          <p className="field-error" id="password-error" aria-live="polite">
            {errors.password || (capsLock ? "大写锁定已开启" : "")}
          </p>
          <button
            className="text-button text-button--mobile"
            type="button"
            onClick={() =>
              openForgot()
            }
          >
            忘记密码？
          </button>
        </div>
        <div className="form-options">
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
            />
            <span className="checkbox" aria-hidden="true">
              <Check size={12} strokeWidth={2.4} />
            </span>
            <span>在这台设备上记住邮箱</span>
          </label>
        </div>

        <button
          className={`login-button${status === "submitting" ? " is-loading" : ""}`}
          type="submit"
          disabled={status === "submitting"}
          aria-busy={status === "submitting"}
        >
          {status === "submitting" ? (
            <>
              <span className="button-loader" aria-hidden="true" />
              正在验证
            </>
          ) : (
            <>
              <LogIn size={18} strokeWidth={2} aria-hidden="true" />
              进入工具台
            </>
          )}
        </button>
      </form>

      <button className="secondary-button" type="button" onClick={openRegister}>
        创建 Bocchi 账户
      </button>

      <p className="account-note">
        登录后同步收藏和偏好。
      </p>

      <footer className="form-footer">
        <a href="#privacy" onClick={(event) => event.preventDefault()}>
          隐私政策
        </a>
        <span aria-hidden="true">/</span>
        <a href="#terms" onClick={(event) => event.preventDefault()}>
          服务条款
        </a>
        <span className="form-footer__copyright">© 2026 Bocchi</span>
      </footer>
    </div>
  );
}