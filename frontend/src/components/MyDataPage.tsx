import { useEffect, useState } from "react";
import { ArrowLeft, BarChart3, CircleAlert, Clock3, Save, Star, Wrench } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BrowserBar } from "./BrowserBar";
import type { AuthSession } from "../services/auth";
import { fetchMyUsage, type MyUsage } from "../services/usage";

type MyDataPageProps = {
  session: AuthSession;
  onBack: () => void;
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", { dateStyle: "medium", timeStyle: "short" });
}

export function MyDataPage({ session, onBack }: MyDataPageProps) {
  const [usage, setUsage] = useState<MyUsage | null>(null);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setBusy(true);
    fetchMyUsage(session)
      .then((data) => {
        if (active) setUsage(data);
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : "数据加载失败。");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  const chartData = (usage?.tools ?? []).slice(0, 10).map((tool) => ({
    name: tool.label.length > 6 ? `${tool.label.slice(0, 6)}…` : tool.label,
    count: tool.count,
    fullName: tool.label,
  }));

  const stats = [
    { label: "工具调用", value: usage?.totalUsage ?? 0, icon: BarChart3 },
    { label: "收藏工具", value: usage?.favoriteCount ?? 0, icon: Star },
    { label: "保存记录", value: usage?.preferenceCount ?? 0, icon: Save },
    { label: "用过种类", value: usage?.tools.length ?? 0, icon: Wrench },
  ];

  return (
    <main className="page my-data-page">
      <section className="browser-window account-window" aria-label="Bocchi 我的数据">
        <BrowserBar user={session.user} onBack={onBack} />

        <div className="account-layout my-data-layout">
          <div className="account-heading-row">
            <button className="account-back" type="button" onClick={onBack}>
              <ArrowLeft size={17} strokeWidth={2} aria-hidden="true" />
              返回工具页
            </button>
            <header className="tool-heading account-heading">
              <div className="tool-heading__icon">
                <BarChart3 size={25} strokeWidth={1.9} aria-hidden="true" />
              </div>
              <div>
                <h1>我的数据</h1>
                <p>查看你的工具使用情况、收藏和保存记录。</p>
              </div>
            </header>
          </div>

          {error && (
            <p className="workspace-error" role="alert">
              <CircleAlert size={16} aria-hidden="true" />
              {error}
            </p>
          )}

          <div className="my-data-stats">
            {stats.map((item) => {
              const Icon = item.icon;
              return (
                <article key={item.label}>
                  <span className="my-data-stats__icon"><Icon size={18} aria-hidden="true" /></span>
                  <div>
                    <strong>{busy ? "…" : item.value}</strong>
                    <small>{item.label}</small>
                  </div>
                </article>
              );
            })}
          </div>

          <section className="account-card my-data-card">
            <header>
              <div>
                <h2>工具使用排行</h2>
                <p>近 30 天内你最常使用的工具。</p>
              </div>
            </header>
            {!busy && chartData.length === 0 ? (
              <p className="my-data-empty">还没有使用记录，去打开一个工具试试吧。</p>
            ) : (
              <div className="my-data-chart">
                <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 38)}>
                  <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
                    <CartesianGrid horizontal={false} stroke="var(--line)" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" width={76} tick={{ fontSize: 10 }} />
                    <Tooltip
                      cursor={{ fill: "rgba(46,91,255,0.06)" }}
                      formatter={(value) => [`${value} 次`, "使用"]}
                      labelFormatter={(_, payload) => (payload?.[0]?.payload as { fullName?: string })?.fullName ?? ""}
                    />
                    <Bar dataKey="count" radius={[0, 8, 8, 0]} maxBarSize={20}>
                      {chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={index === 0 ? "#2e5bff" : "#8ea6f0"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </section>

          <section className="account-card my-data-card">
            <header>
              <div>
                <h2>使用明细</h2>
                <p>按最近使用排序。</p>
              </div>
            </header>
            {!busy && (usage?.tools.length ?? 0) === 0 ? (
              <p className="my-data-empty">暂无明细。</p>
            ) : (
              <div className="my-data-list">
                {busy
                  ? <p className="my-data-empty">正在加载…</p>
                  : (usage?.tools ?? []).map((tool) => (
                      <div className="my-data-row" key={tool.toolId}>
                        <div>
                          <strong>{tool.label}</strong>
                          <small><Clock3 size={12} aria-hidden="true" />{formatDate(tool.lastUsedAt)}</small>
                        </div>
                        <span>{tool.count} 次</span>
                      </div>
                    ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}