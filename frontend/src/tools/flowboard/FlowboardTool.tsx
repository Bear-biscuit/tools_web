import { useRef } from "react";
import { getSnapshot, loadSnapshot, Tldraw, type Editor } from "tldraw";
import "tldraw/tldraw.css";
import { Shapes } from "lucide-react";
import type { AuthSession } from "../../services/auth";
import { ToolRecords, type ToolRecord } from "../../components/ToolRecords";
import { ToolShare } from "../../components/ToolShare";

const TLDRAW_LICENSE_KEY = import.meta.env.VITE_TLDRAW_LICENSE_KEY as string | undefined;

type FlowboardToolProps = {
  session: AuthSession | null;
};

export function FlowboardTool({ session }: FlowboardToolProps) {
  const editorRef = useRef<Editor | null>(null);

  function getContent() {
    const editor = editorRef.current;
    if (!editor) return "";
    return JSON.stringify(getSnapshot(editor.store));
  }

  function openRecord(record: ToolRecord) {
    const editor = editorRef.current;
    if (!editor) return;
    try {
      const snapshot = JSON.parse(record.content) as ReturnType<typeof getSnapshot>;
      loadSnapshot(editor.store, snapshot);
    } catch {
      // 旧版或无法解析的记录直接忽略，保留当前画布
    }
  }

  return (
    <section className="flowboard-tool" aria-labelledby="flowboard-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><Shapes size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div>
          <h1 id="flowboard-tool-title">在线流程图</h1>
          <p>基于 tldraw 的自由画布，支持画笔、形状、连线、文本与便签，登录后可保存记录。</p>
        </div>
      </header>

      <div className="flowboard-shell">
        <Tldraw
          licenseKey={TLDRAW_LICENSE_KEY}
          onMount={(editor) => {
            editorRef.current = editor;
          }}
        />
      </div>

      <ToolRecords
        recordKey="flowboard.records"
        session={session}
        getContent={getContent}
        defaultName="在线流程图"
        onOpen={openRecord}
      />

      <ToolShare
        kind="flowboard"
        session={session}
        getContent={getContent}
        defaultTitle="在线流程图"
      />
    </section>
  );
}