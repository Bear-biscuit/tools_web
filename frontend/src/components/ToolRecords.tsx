import { useEffect, useState } from "react";
import { Check, Save, Trash2 } from "lucide-react";
import type { AuthSession } from "../services/auth";
import { getPreference, savePreference } from "../services/account";

export type ToolRecord = {
  id: string;
  title: string;
  content: string;
  updatedAt: string;
};

type ToolRecordsProps = {
  recordKey: string;
  session: AuthSession | null;
  content?: string;
  getContent?: () => string;
  defaultName: string;
  onOpen: (record: ToolRecord) => void;
};

export function ToolRecords({
  recordKey,
  session,
  content = "",
  getContent,
  defaultName,
  onOpen,
}: ToolRecordsProps) {
  const [records, setRecords] = useState<ToolRecord[]>([]);
  const [activeId, setActiveId] = useState("");
  const [draftName, setDraftName] = useState("");
  const [notice, setNotice] = useState("");

  const hasStreamingContent = Boolean(getContent);
  const currentContent = (getContent?.() ?? content).trim();

  useEffect(() => {
    let active = true;
    getPreference<ToolRecord[]>(recordKey, session)
      .then((value) => {
        if (!active) return;
        setRecords(Array.isArray(value) ? value : []);
        setActiveId("");
        setDraftName("");
      })
      .catch(() => {
        if (active) setRecords([]);
      });
    return () => {
      active = false;
    };
  }, [recordKey, session]);

  function openRecord(recordId: string) {
    const record = records.find((item) => item.id === recordId);
    if (!record) return;
    setActiveId(record.id);
    setDraftName(record.title);
    onOpen(record);
  }

  async function saveRecord() {
    const latestContent = (getContent?.() ?? content).trim();
    if (!latestContent) {
      setNotice("还没有可保存的内容。");
      return;
    }
    const now = new Date().toISOString();
    const title = draftName.trim() || `${defaultName} ${records.length + 1}`;
    let next: ToolRecord[];

    if (activeId) {
      next = records.map((item) =>
        item.id === activeId ? { ...item, title, content: latestContent, updatedAt: now } : item,
      );
    } else {
      const record: ToolRecord = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        title,
        content: latestContent,
        updatedAt: now,
      };
      next = [...records, record];
      setActiveId(record.id);
      setDraftName(record.title);
    }

    try {
      await savePreference(recordKey, next, session);
      setRecords(next);
      setNotice("记录已保存");
    } catch {
      setNotice("保存失败，请稍后重试。");
    }
  }

  async function deleteRecord() {
    if (!activeId) return;
    const next = records.filter((item) => item.id !== activeId);
    try {
      await savePreference(recordKey, next, session);
      setRecords(next);
      setActiveId("");
      setDraftName("");
      setNotice("记录已删除");
    } catch {
      setNotice("删除失败，请稍后重试。");
    }
  }

  return (
    <div className="tool-records">
      <input
        value={draftName}
        onChange={(event) => {
          setDraftName(event.target.value);
          setNotice("");
        }}
        placeholder="记录名称"
        aria-label="记录名称"
      />
      <button className="tool-button tool-button--primary" type="button" onClick={() => void saveRecord()} disabled={hasStreamingContent ? false : !currentContent}>
        <Save size={15} />保存记录
      </button>
      <select value={activeId} onChange={(event) => openRecord(event.target.value)} aria-label="打开记录">
        <option value="">打开记录…</option>
        {records.map((record) => (
          <option key={record.id} value={record.id}>{record.title}</option>
        ))}
      </select>
      <button className="tool-button" type="button" onClick={() => void deleteRecord()} disabled={!activeId}>
        <Trash2 size={15} />删除
      </button>
      {notice && <span className="tool-records__notice"><Check size={13} />{notice}</span>}
    </div>
  );
}