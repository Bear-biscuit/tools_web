import { useRef, useState } from "react";
import { Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { PenTool } from "lucide-react";
import type { AuthSession } from "../../services/auth";
import { ToolRecords, type ToolRecord } from "../../components/ToolRecords";
import { ToolShare } from "../../components/ToolShare";

type WhiteboardToolProps = {
  session: AuthSession | null;
};

export function WhiteboardTool({ session }: WhiteboardToolProps) {
  const documentRef = useRef<unknown>(null);
  const apiRef = useRef<{ updateScene: (scene: unknown) => void } | null>(null);
  const [initialDocument, setInitialDocument] = useState<unknown>(null);
  const [editorKey, setEditorKey] = useState(0);

  function openRecord(record: ToolRecord) {
    try {
      const raw = JSON.parse(record.content) as { elements?: unknown; files?: unknown } & Record<string, unknown>;
      const next = { elements: raw.elements ?? [], files: raw.files ?? {} };
      documentRef.current = next;
      if (apiRef.current) {
        apiRef.current.updateScene(next);
      } else {
        setInitialDocument(next);
        setEditorKey((value) => value + 1);
      }
    } catch {
      documentRef.current = null;
      setInitialDocument(null);
    }
  }

  return (
    <section className="whiteboard-tool" aria-labelledby="whiteboard-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><PenTool size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="whiteboard-tool-title">手绘白板</h1><p>基于 Excalidraw 的手绘风格在线白板，支持保存到账户记录。</p></div>
      </header>

      <div className="whiteboard-shell" onWheel={(event) => event.preventDefault()}>
        <Excalidraw
          key={editorKey}
          langCode="zh-CN"
          excalidrawAPI={(api) => {
            apiRef.current = api as unknown as { updateScene: (scene: unknown) => void };
          }}
          initialData={initialDocument as never}
          onChange={(elements, _appState, files) => {
            documentRef.current = { elements: [...elements], files };
          }}
        />
      </div>

      <ToolRecords
        recordKey="whiteboard.records"
        session={session}
        getContent={() => (documentRef.current ? JSON.stringify(documentRef.current) : "")}
        defaultName="手绘白板"
        onOpen={openRecord}
      />

      <ToolShare
        kind="whiteboard"
        session={session}
        getContent={() => (documentRef.current ? JSON.stringify(documentRef.current) : "")}
        defaultTitle="手绘白板"
      />
    </section>
  );
}