import { reportToolUsage } from "../../services/toolUsage";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeftRight,
  Check,
  Clipboard,
  Download,
  LoaderCircle,
  Search,
  Shuffle,
  Sparkles,
  X,
} from "lucide-react";
import {
  fetchEmojiCombination,
  fetchEmojiList,
  fetchRandomEmojiCombination,
  type EmojiCombination,
  type EmojiOption,
} from "./emojiApi";

const PAGE_SIZE = 120;

export function MemeTool() {
  const [emojis, setEmojis] = useState<EmojiOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [activeSide, setActiveSide] = useState<"left" | "right">("left");
  const [combo, setCombo] = useState<EmojiCombination | null>(null);
  const [comboLoading, setComboLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [notice, setNotice] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const usageEligibleRef = useRef(false);

  useEffect(() => {
    let active = true;

    fetchEmojiList()
      .then((items) => {
        if (!active) return;
        setEmojis(items);
        setLeft(items[0]?.id ?? "");
        setRight(items[1]?.id ?? "");
      })
      .catch(() => {
        if (active) setNotice("Emoji 列表加载失败，请确认后端已启动。");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!left || !right) return;
    let active = true;
    setComboLoading(true);
    setNotice("");

    fetchEmojiCombination(left, right)
      .then((result) => {
        if (active) {
          setCombo(result);
          if (result && usageEligibleRef.current) {
            usageEligibleRef.current = false;
            void reportToolUsage("meme");
          }
          if (!result) setNotice("当前完整数据集没有这两个 Emoji 的组合。");
        }
      })
      .catch(() => {
        if (active) {
          setCombo(null);
          usageEligibleRef.current = false;
          setNotice("组合查询失败，请稍后重试。");
        }
      })
      .finally(() => {
        if (active) setComboLoading(false);
      });

    return () => {
      active = false;
    };
  }, [left, right]);

  const filteredEmojis = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return emojis;
    return emojis.filter(
      (emoji) =>
        emoji.id.toLowerCase().includes(keyword) ||
        emoji.glyph.includes(query.trim()),
    );
  }, [emojis, query]);

  const visibleEmojis = filteredEmojis.slice(0, visibleCount);
  const leftEmoji = emojis.find((emoji) => emoji.id === left);
  const rightEmoji = emojis.find((emoji) => emoji.id === right);

  function chooseEmoji(id: string) {
    usageEligibleRef.current = true;
    if (activeSide === "left") setLeft(id);
    else setRight(id);
  }

  async function randomize() {
    usageEligibleRef.current = false;
    setComboLoading(true);
    try {
      const result = await fetchRandomEmojiCombination();
      setLeft(result.left);
      setRight(result.right);
      void reportToolUsage("meme");
      setCombo(result);
      setNotice("已从完整数据集中随机生成一个组合。");
    } catch {
      setNotice("随机组合失败，请稍后重试。");
    } finally {
      setComboLoading(false);
    }
  }

  function swapSides() {
    setLeft(right);
    setRight(left);
    setNotice("已交换左右 Emoji。");
  }

  async function copyImage() {
    if (!combo) return;

    try {
      const response = await fetch(combo.imageUrl);
      const blob = await response.blob();
      await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
      setNotice("合成表情已复制到剪贴板。");
    } catch {
      setNotice("浏览器无法复制图片，请使用下载按钮。");
    }
  }

  async function downloadImage() {
    if (!combo) return;

    try {
      const response = await fetch(combo.imageUrl);
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = `bocchi-emoji-${left}-${right}.png`;
      anchor.click();
      URL.revokeObjectURL(objectUrl);
      setNotice("图片已开始下载。");
    } catch {
      setNotice("图片下载失败，请稍后重试。");
    }
  }
  return (
    <section className="meme-tool" aria-labelledby="meme-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon">
          <Sparkles size={25} strokeWidth={1.9} aria-hidden="true" />
        </div>
        <div>
          <h1 id="meme-tool-title">表情包合成</h1>
          <p>完整数据由后端 SQLite 查询，前端仅按需加载 Emoji 和结果图片。</p>
        </div>
      </header>

      <div className="meme-workbench">
        <section className="meme-composer">
          <div className="meme-source-row">
            <button
              className={activeSide === "left" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveSide("left")}
            >
              <small>左侧</small>
              <span>{leftEmoji?.glyph ?? "…"}</span>
              <strong>{leftEmoji?.id ?? "加载中"}</strong>
            </button>
            <button className="meme-swap" type="button" onClick={swapSides} aria-label="交换左右 Emoji">
              <ArrowLeftRight size={18} aria-hidden="true" />
            </button>
            <button
              className={activeSide === "right" ? "is-active" : ""}
              type="button"
              onClick={() => setActiveSide("right")}
            >
              <small>右侧</small>
              <span>{rightEmoji?.glyph ?? "…"}</span>
              <strong>{rightEmoji?.id ?? "加载中"}</strong>
            </button>
          </div>

          <div className="meme-result">
            {comboLoading ? (
              <div className="meme-result__empty">
                <LoaderCircle className="meme-loader" size={30} aria-hidden="true" />
                <span>正在查询完整组合数据…</span>
              </div>
            ) : combo ? (
              <img src={combo.imageUrl} alt={`${leftEmoji?.id}与${rightEmoji?.id}的合成表情`} />
            ) : (
              <div className="meme-result__empty">
                <strong>暂无该组合</strong>
                <span>完整数据集里没有这两个 Emoji 的合成结果。</span>
              </div>
            )}
          </div>

          <div className="meme-actions">
            <button className="tool-button meme-picker-trigger" type="button" onClick={() => setPickerOpen(true)}>
              <Search size={16} aria-hidden="true" />
              选择 Emoji
            </button>
            <button className="tool-button" type="button" onClick={randomize}>
              <Shuffle size={16} aria-hidden="true" />
              随机组合
            </button>
            <button className="tool-button tool-button--primary" type="button" onClick={copyImage} disabled={!combo}>
              <Clipboard size={16} aria-hidden="true" />
              复制图片
            </button>
            <button className="tool-button" type="button" onClick={downloadImage} disabled={!combo}>
              <Download size={16} aria-hidden="true" />
              下载
            </button>
          </div>
        </section>

        <section className={`meme-picker${pickerOpen ? " is-open" : ""}`}>
          <header>
            <span>选择 Emoji</span>
            <small>{filteredEmojis.length} 个可选</small>
                      <button className="meme-picker-close" type="button" onClick={() => setPickerOpen(false)} aria-label="关闭 Emoji 选择">
              <X size={20} aria-hidden="true" />
            </button>
</header>

          <label className="meme-search">
            <Search size={15} aria-hidden="true" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setVisibleCount(PAGE_SIZE);
              }}
              placeholder="搜索 Emoji 或代码，例如 😀 / u1f600"
            />
          </label>

          {loading ? (
            <p className="meme-picker__state">正在从后端加载完整 Emoji 列表…</p>
          ) : (
            <>
              <div className="meme-emoji-grid">
                {visibleEmojis.map((emoji) => (
                  <button
                    className={left === emoji.id || right === emoji.id ? "is-selected" : ""}
                    key={emoji.id}
                    type="button"
                    onClick={() => chooseEmoji(emoji.id)}
                    aria-label={`选择 ${emoji.id}`}
                  >
                    <span>{emoji.glyph}</span>
                    <small>{emoji.id}</small>
                  </button>
                ))}
              </div>
              {visibleCount < filteredEmojis.length && (
                <button className="meme-load-more" type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}>
                  显示更多（剩余 {filteredEmojis.length - visibleCount} 个）
                </button>
              )}
            </>
          )}
        </section>
      </div>

      {pickerOpen && <button className="meme-picker-backdrop" type="button" onClick={() => setPickerOpen(false)} aria-label="关闭 Emoji 选择" />}

      <div className="meme-feedback" aria-live="polite">
        {notice && (
          <p>
            <Check size={16} strokeWidth={2.2} aria-hidden="true" />
            {notice}
          </p>
        )}
      </div>
    </section>
  );
}