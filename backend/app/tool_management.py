from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

TOOL_IDS = [
    "json", "timestamp", "encoding", "password",
    "markdown", "url", "diff", "id", "jwt", "hash", "regex", "date",
    "csv", "timezone", "units", "cleaner", "watermark", "svg", "qrscan", "hokpower",
    "color", "meme", "country", "text", "image", "qr", "timer", "cron", "video", "filebox", "mermaid", "mindmap", "compress", "codecard", "whiteboard", "flowboard", "cyberchef",
]
TOOL_ORDER = {tool_id: index for index, tool_id in enumerate(TOOL_IDS)}
TOOL_LABELS = {
    "json": "JSON 格式化", "timestamp": "时间戳转换", "encoding": "Base64 / URL",
    "password": "密码生成器", "markdown": "Markdown 编辑器", "url": "URL 解析器",
    "diff": "文本差异对比", "id": "UUID / 随机 ID", "jwt": "JWT 解析器",
    "hash": "哈希计算器", "regex": "正则测试器", "date": "日期计算器",
    "csv": "CSV / JSON", "timezone": "时区会议规划", "units": "单位换算",
    "cleaner": "文本清理器", "watermark": "图片水印", "svg": "SVG 预览优化", "qrscan": "二维码识别", "hokpower": "王者最低战力",
    "color": "颜色工具", "meme": "表情包合成",
    "country": "国家代码复制", "text": "文字转换", "image": "图像处理",
    "qr": "二维码", "timer": "计时器", "cron": "Cron 表达式",
    "video": "在线视频播放器", "filebox": "文件快递柜",
    "mermaid": "文本转图表", "mindmap": "思维导图", "compress": "图片压缩",
    "codecard": "代码分享卡片", "whiteboard": "手绘白板", "flowboard": "在线流程图",
    "cyberchef": "CyberChef 编解码",
}


def ensure_tool_settings(connection: Any) -> None:
    now = datetime.now(timezone.utc).isoformat()
    connection.executemany(
        """
        INSERT INTO tool_settings (tool_id, enabled, updated_at)
        VALUES (?, 1, ?)
        ON CONFLICT(tool_id) DO NOTHING
        """,
        [(tool_id, now) for tool_id in TOOL_IDS],
    )


def list_tool_settings(connection: Any) -> list[dict]:
    ensure_tool_settings(connection)
    rows = connection.execute(
        """
        SELECT tool_id, enabled, updated_at
        FROM tool_settings
        """
    ).fetchall()
    items = [
        {
            "id": str(row["tool_id"]),
            "label": TOOL_LABELS.get(str(row["tool_id"]), str(row["tool_id"])),
            "enabled": bool(row["enabled"]),
            "updatedAt": str(row["updated_at"]),
        }
        for row in rows
        if str(row["tool_id"]) in TOOL_IDS
    ]
    return sorted(items, key=lambda item: TOOL_ORDER.get(item["id"], len(TOOL_IDS)))


def is_tool_enabled(connection: Any, tool_id: str) -> bool:
    ensure_tool_settings(connection)
    row = connection.execute("SELECT enabled FROM tool_settings WHERE tool_id = ?", (tool_id,)).fetchone()
    return bool(row["enabled"]) if row else False


def set_tool_enabled(connection: Any, tool_id: str, enabled: bool) -> bool:
    ensure_tool_settings(connection)
    cursor = connection.execute(
        "UPDATE tool_settings SET enabled = ?, updated_at = ? WHERE tool_id = ?",
        (1 if enabled else 0, datetime.now(timezone.utc).isoformat(), tool_id),
    )
    connection.commit()
    return cursor.rowcount > 0


def record_tool_usage(connection: Any, tool_id: str, user_id: str | None = None) -> None:
    connection.execute(
        "INSERT INTO tool_usage_events (tool_id, user_id, created_at) VALUES (?, ?, ?)",
        (tool_id, user_id, datetime.now(timezone.utc).isoformat()),
    )
    connection.commit()


def tool_usage_stats(connection: Any, days: int = 30) -> dict:
    settings = list_tool_settings(connection)
    period_days = max(1, min(int(days), 365))
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=period_days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)

    totals = {
        str(row["tool_id"]): {
            "total": int(row["total"]),
            "authenticated": int(row["authenticated"]),
            "anonymous": int(row["anonymous"]),
            "uniqueUsers": int(row["unique_users"]),
        }
        for row in connection.execute(
            """
            SELECT tool_id, COUNT(*) AS total,
                   SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) AS authenticated,
                   SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) AS anonymous,
                   COUNT(DISTINCT user_id) AS unique_users
            FROM tool_usage_events WHERE created_at >= ? GROUP BY tool_id
            """,
            (start.isoformat(),),
        ).fetchall()
    }

    daily_rows = connection.execute(
        """
        SELECT date(created_at) AS day, COUNT(*) AS total,
               SUM(CASE WHEN user_id IS NOT NULL THEN 1 ELSE 0 END) AS authenticated,
               SUM(CASE WHEN user_id IS NULL THEN 1 ELSE 0 END) AS anonymous
        FROM tool_usage_events WHERE created_at >= ? GROUP BY date(created_at)
        """,
        (start.isoformat(),),
    ).fetchall()
    daily_lookup = {str(row["day"]): row for row in daily_rows}
    daily = []
    for offset in range(period_days):
        day = (start + timedelta(days=offset)).date()
        row = daily_lookup.get(day.isoformat())
        daily.append({
            "date": day.isoformat(),
            "total": int(row["total"]) if row else 0,
            "authenticated": int(row["authenticated"]) if row else 0,
            "anonymous": int(row["anonymous"]) if row else 0,
        })

    tools = []
    for item in settings:
        stats = totals.get(item["id"], {"total": 0, "authenticated": 0, "anonymous": 0, "uniqueUsers": 0})
        tools.append({**item, **stats})
    return {
        "days": period_days,
        "total": sum(item["total"] for item in tools),
        "authenticated": sum(item["authenticated"] for item in tools),
        "anonymous": sum(item["anonymous"] for item in tools),
        "daily": daily,
        "tools": tools,
    }
