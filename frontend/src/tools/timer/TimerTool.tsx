import { reportToolUsage } from "../../services/toolUsage";
import { useEffect, useMemo, useRef, useState } from "react";
import { BellRing, Check, Clock3, Pause, Play, RotateCcw, TimerReset } from "lucide-react";
import { getPreference, savePreference } from "../../services/account";
import type { AuthSession } from "../../services/auth";
import {
  getSystemNotificationState,
  registerSystemNotificationWorker,
  requestSystemNotificationPermission,
  showSystemNotification,
  type SystemNotificationState,
} from "./notifications";

type TimerToolProps = { session: AuthSession | null };

const presets = [
  { id: "focus", label: "专注", minutes: 25 },
  { id: "short", label: "短休", minutes: 5 },
  { id: "long", label: "长休", minutes: 15 },
  { id: "sixty", label: "一小时", minutes: 60 },
] as const;

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getNotificationCopy(state: SystemNotificationState) {
  if (state === "granted") return "已开启，计时结束时发送系统通知。";
  if (state === "denied") return "已被浏览器拦截，请在站点设置中允许通知。";
  if (state === "insecure") return "当前 HTTP 地址不支持系统通知，请使用 HTTPS 访问。";
  if (state === "unsupported") return "当前浏览器不支持系统通知。";
  return "开启后，即使切到其他标签页也能收到提醒。";
}

function playFinishedTone() {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const context = new AudioContextClass();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(660, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, context.currentTime + 0.28);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.55);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 0.58);
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // Audio feedback is optional.
  }
}

export function TimerTool({ session }: TimerToolProps) {
  const [duration, setDuration] = useState(25 * 60);
  const [remaining, setRemaining] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [customMinutes, setCustomMinutes] = useState(30);
  const [notificationState, setNotificationState] = useState<SystemNotificationState>("default");
  const [notificationBusy, setNotificationBusy] = useState(false);
  const endAtRef = useRef(0);
  const durationRef = useRef(duration);
  durationRef.current = duration;
  const progress = duration > 0 ? remaining / duration : 0;
  const notificationStateRef = useRef(notificationState);
  notificationStateRef.current = notificationState;

  useEffect(() => {
    const state = getSystemNotificationState();
    setNotificationState(state);
    if (state === "granted") void registerSystemNotificationWorker();
  }, []);

  useEffect(() => {
    let active = true;
    getPreference<number>("timer.last-minutes", session)
      .then((minutes) => {
        if (!active || !Number.isFinite(minutes) || !minutes || minutes < 1 || minutes > 600) return;
        const next = Math.round(minutes * 60);
        setDuration(next);
        setRemaining(next);
        setCustomMinutes(Math.round(minutes));
      })
      .catch(() => undefined);
    return () => { active = false; };
  }, [session]);

  useEffect(() => {
    if (!running) return;
    endAtRef.current = Date.now() + remaining * 1000;
    const tick = () => {
      const next = Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000));
      setRemaining(next);
      if (next > 0) return;
      setRunning(false);
      setFinished(true);
      playFinishedTone();
      if (notificationStateRef.current === "granted") {
        void showSystemNotification(
          "Bocchi 计时结束",
          `${Math.round(durationRef.current / 60)} 分钟计时已完成，点击返回计时器。`,
        );
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [running]);

  function startTimer() {
    if (remaining <= 0) setRemaining(duration);
    setFinished(false);
    setRunning(true);
    void reportToolUsage("timer");
    void savePreference("timer.last-minutes", duration / 60, session).catch(() => undefined);
    if (notificationState === "default") {
      void enableNotifications();
    }
  }

  async function enableNotifications() {
    setNotificationBusy(true);
    try {
      const next = await requestSystemNotificationPermission();
      setNotificationState(next);
    } finally {
      setNotificationBusy(false);
    }
  }

  function pauseTimer() {
    setRunning(false);
    setRemaining(Math.max(0, Math.ceil((endAtRef.current - Date.now()) / 1000)));
  }

  function resetTimer() {
    setRunning(false);
    setFinished(false);
    setRemaining(duration);
  }

  function choosePreset(minutes: number) {
    const next = minutes * 60;
    setRunning(false);
    setFinished(false);
    setDuration(next);
    setRemaining(next);
    setCustomMinutes(minutes);
  }

  function applyCustomMinutes() {
    const minutes = Math.min(600, Math.max(1, Math.round(customMinutes || 1)));
    choosePreset(minutes);
  }

  const statusText = useMemo(() => {
    if (finished) return "本轮计时已完成";
    if (running) return "计时进行中";
    if (remaining < duration) return "已暂停";
    return "准备开始";
  }, [duration, finished, remaining, running]);

  return (
    <section className="timer-tool" aria-labelledby="timer-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <Clock3 size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="timer-tool-title">计时器</h1>
          <p>用专注、休息或自定义时长管理一段完整时间。</p>
        </div>
      </header>

      <div className="timer-workbench">
        <section className="timer-stage">
          <div
            className={`timer-dial${running ? " is-running" : ""}${finished ? " is-finished" : ""}`}
            style={{ "--timer-progress": `${Math.max(0, Math.min(1, progress)) * 360}deg` } as React.CSSProperties}
          >
            <div className="timer-dial__inner">
              <span>{statusText}</span>
              <strong>{formatTime(remaining)}</strong>
              <small>共 {Math.round(duration / 60)} 分钟</small>
            </div>
          </div>

          <div className="timer-actions">
            {running ? (
              <button className="timer-primary" type="button" onClick={pauseTimer}>
                <Pause size={19} fill="currentColor" aria-hidden="true" />
                暂停
              </button>
            ) : (
              <button className="timer-primary" type="button" onClick={startTimer}>
                <Play size={19} fill="currentColor" aria-hidden="true" />
                {remaining < duration ? "继续" : "开始"}
              </button>
            )}
            <button className="tool-button" type="button" onClick={resetTimer}>
              <RotateCcw size={17} strokeWidth={2} aria-hidden="true" />
              重置
            </button>
          </div>
        </section>

        <section className="timer-settings">
          <div>
            <span className="timer-section-title">快速选择</span>
            <div className="timer-presets">
              {presets.map((preset) => (
                <button
                  className={duration === preset.minutes * 60 ? "is-active" : ""}
                  key={preset.id}
                  type="button"
                  onClick={() => choosePreset(preset.minutes)}
                >
                  <strong>{preset.minutes}</strong>
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="timer-custom">
            <label htmlFor="timer-custom-minutes">自定义分钟数</label>
            <div>
              <input
                id="timer-custom-minutes"
                type="number"
                min="1"
                max="600"
                value={customMinutes}
                onChange={(event) => setCustomMinutes(Number(event.target.value))}
              />
              <button className="tool-button" type="button" onClick={applyCustomMinutes}>
                <TimerReset size={17} strokeWidth={2} aria-hidden="true" />
                应用
              </button>
            </div>
          </div>

          <div className="timer-note timer-notification-note">
            <BellRing size={18} strokeWidth={2} aria-hidden="true" />
            <div>
              <strong>系统通知</strong>
              <span>{getNotificationCopy(notificationState)}</span>
            </div>
            {notificationState === "default" ? (
              <button className="timer-notification-action" type="button" onClick={enableNotifications} disabled={notificationBusy}>
                {notificationBusy ? "请求中…" : "开启"}
              </button>
            ) : notificationState === "granted" ? (
              <Check size={16} strokeWidth={2.2} aria-hidden="true" />
            ) : null}
          </div>
        </section>
      </div>
    </section>
  );
}


