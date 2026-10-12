import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Check,
  CircleAlert,
  KeyRound,
  Mail,
  Save,
  Trash2,
  Upload,
  UserRound,
} from "lucide-react";
import { BrowserBar } from "./BrowserBar";
import { createAvatarDataUrl } from "../lib/avatar";
import {
  updatePassword,
  updateProfile,
  type AuthSession,
} from "../services/auth";

type AccountPageProps = {
  session: AuthSession;
  onBack: () => void;
  onUpdated: (session: AuthSession) => void;
  onLogout: () => void;
  onData: () => void;
};

export function AccountPage({
  session,
  onBack,
  onUpdated,
  onLogout,
  onData,
}: AccountPageProps) {
  const [name, setName] = useState(session.user.name);
  const [avatar, setAvatar] = useState(session.user.avatar ?? "");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileNotice, setProfileNotice] = useState("");
  const [profileError, setProfileError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(session.user.name);
    setAvatar(session.user.avatar ?? "");
  }, [session]);

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setProfileBusy(true);
    setProfileNotice("");
    setProfileError("");
    try {
      setAvatar(await createAvatarDataUrl(file));
      setProfileNotice("头像已准备好，点击保存资料后生效。");
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : "头像处理失败。");
    } finally {
      setProfileBusy(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    if (!normalizedName) {
      setProfileError("名称不能为空。");
      return;
    }

    setProfileBusy(true);
    setProfileNotice("");
    setProfileError("");
    try {
      const nextSession = await updateProfile(session, {
        name: normalizedName,
        avatar,
      });
      onUpdated(nextSession);
      setName(nextSession.user.name);
      setAvatar(nextSession.user.avatar);
      setProfileNotice("账户资料已保存。");
    } catch (reason) {
      setProfileError(reason instanceof Error ? reason.message : "资料保存失败。");
    } finally {
      setProfileBusy(false);
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordNotice("");
    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("新密码至少需要 8 个字符。");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的新密码不一致。");
      return;
    }

    setPasswordBusy(true);
    try {
      await updatePassword(session, { currentPassword, newPassword });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordNotice("密码已更新，下次登录请使用新密码。");
    } catch (reason) {
      setPasswordError(reason instanceof Error ? reason.message : "密码修改失败。");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <main className="page account-page">
      <section className="browser-window account-window" aria-label="Bocchi 账户设置">
        <BrowserBar user={session.user} onBack={onBack} />

        <div className="account-layout">
          <div className="account-heading-row">
            <button className="account-back" type="button" onClick={onBack}>
              <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
              返回工具页
            </button>
            <header className="tool-heading account-heading">
              <div className="tool-heading__icon">
                <UserRound size={25} strokeWidth={1.9} aria-hidden="true" />
              </div>
              <div>
                <h1>账户设置</h1>
                <p>管理你的名称、头像和登录密码。</p>
              </div>
            </header>
          </div>

          <section className="account-card account-profile-card">
            <header>
              <div>
                <h2>个人资料</h2>
                <p>头像会压缩后保存到你的 Bocchi 账户。</p>
              </div>
            </header>

            <form onSubmit={saveProfile}>
              <div className="account-avatar-editor">
                <div className="account-avatar-preview" aria-label="头像预览">
                  {avatar ? <img src={avatar} alt="" /> : <span>{name.slice(0, 1) || "B"}</span>}
                </div>
                <div className="account-avatar-actions">
                  <button type="button" onClick={() => avatarInputRef.current?.click()} disabled={profileBusy}>
                    <Upload size={16} strokeWidth={2} aria-hidden="true" />
                    上传头像
                  </button>
                  {avatar && (
                    <button type="button" onClick={() => setAvatar("")} disabled={profileBusy}>
                      <Trash2 size={16} strokeWidth={2} aria-hidden="true" />
                      移除头像
                    </button>
                  )}
                  <small>支持 PNG、JPG、WebP，原图不超过 8 MB。</small>
                  <input
                    ref={avatarInputRef}
                    className="visually-hidden"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarChange}
                  />
                </div>
              </div>

              <label className="account-field">
                <span>名称</span>
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} />
              </label>

              <label className="account-field">
                <span>邮箱</span>
                <div className="account-readonly">
                  <Mail size={16} strokeWidth={1.9} aria-hidden="true" />
                  <input value={session.user.email} readOnly />
                </div>
              </label>

              <button className="account-primary" type="submit" disabled={profileBusy}>
                <Save size={17} strokeWidth={2} aria-hidden="true" />
                {profileBusy ? "正在保存…" : "保存资料"}
              </button>

              <div className="account-feedback" aria-live="polite">
                {profileError ? (
                  <p className="account-feedback--error"><CircleAlert size={16} aria-hidden="true" />{profileError}</p>
                ) : profileNotice ? (
                  <p className="account-feedback--success"><Check size={16} aria-hidden="true" />{profileNotice}</p>
                ) : null}
              </div>
            </form>
          </section>

          <section className="account-card account-password-card">
            <header>
              <div>
                <h2>修改密码</h2>
                <p>新密码至少 8 个字符，修改后其他设备仍会保持当前登录，直到会话过期。</p>
              </div>
            </header>

            <form onSubmit={savePassword}>
              <label className="account-field">
                <span>当前密码</span>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                />
              </label>
              <label className="account-field">
                <span>新密码</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <label className="account-field">
                <span>确认新密码</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </label>
              <button className="account-primary" type="submit" disabled={passwordBusy}>
                <KeyRound size={17} strokeWidth={2} aria-hidden="true" />
                {passwordBusy ? "正在修改…" : "修改密码"}
              </button>
              <div className="account-feedback" aria-live="polite">
                {passwordError ? (
                  <p className="account-feedback--error"><CircleAlert size={16} aria-hidden="true" />{passwordError}</p>
                ) : passwordNotice ? (
                  <p className="account-feedback--success"><Check size={16} aria-hidden="true" />{passwordNotice}</p>
                ) : null}
              </div>
            </form>
          </section>

          <aside className="account-card account-session-card">
            <header>
              <h2>账户与安全</h2>
            </header>
            <p>当前登录：<strong>{session.user.email}</strong></p>
            <p>身份：{session.user.role}</p>
            <button className="account-data" type="button" onClick={onData}>
              <BarChart3 size={16} strokeWidth={2} aria-hidden="true" />
              查看我的数据
            </button>
            <button className="account-logout" type="button" onClick={onLogout}>
              退出当前账户
            </button>
          </aside>
        </div>
      </section>
    </main>
  );
}
