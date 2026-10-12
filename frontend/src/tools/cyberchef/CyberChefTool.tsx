import { ChefHat, ExternalLink } from "lucide-react";

const CYBERCHEF_URL = "https://gchq.github.io/CyberChef/";

export function CyberChefTool() {
  return (
    <section className="cyberchef-tool" aria-labelledby="cyberchef-tool-title">
      <header className="tool-heading">
        <div className="tool-heading__icon"><ChefHat size={25} strokeWidth={1.9} aria-hidden="true" /></div>
        <div><h1 id="cyberchef-tool-title">CyberChef 编解码</h1><p>官方 CyberChef 实例，支持编码、加密、压缩和数据分析。</p></div>
      </header>
      <div className="cyberchef-actions">
        <a className="tool-button" href={CYBERCHEF_URL} target="_blank" rel="noreferrer"><ExternalLink size={15} />在新窗口打开</a>
      </div>
      <div className="cyberchef-shell">
        <iframe src={CYBERCHEF_URL} title="CyberChef" loading="lazy" allow="clipboard-read; clipboard-write" />
      </div>
    </section>
  );
}