from __future__ import annotations

from typing import Any, Dict

import requests


class EmailDeliveryError(Exception):
    """Raised when the verification email cannot be delivered."""


_CODE_EMAIL_TEMPLATE = """\
<div style="margin:0;padding:24px 12px;background:#eef2fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC','Microsoft YaHei',sans-serif;">
  <div style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e6ebf5;">
    <div style="padding:22px 28px;background:linear-gradient(135deg,#2e5bff,#6a8bff);color:#ffffff;">
      <div style="font-size:19px;font-weight:700;letter-spacing:-0.02em;">Bocchi 工具台</div>
      <div style="font-size:12px;opacity:0.82;margin-top:3px;">你的个人在线工具箱</div>
    </div>
    <div style="padding:28px;">
      <h2 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#10203a;">__HEADING__</h2>
      <p style="margin:0 0 20px;font-size:14px;line-height:1.7;color:#5a6577;">__BODY__</p>
      <div style="padding:16px;border:1px dashed #b9c8ee;border-radius:12px;background:#f6f8ff;text-align:center;">
        <span style="font-size:34px;font-weight:700;letter-spacing:10px;color:#2e5bff;">__CODE__</span>
      </div>
      <p style="margin:18px 0 0;font-size:12px;line-height:1.7;color:#8a94a8;">验证码 10 分钟内有效，请勿转发或泄露给他人。</p>
    </div>
    <div style="padding:16px 28px;border-top:1px solid #eef1f7;color:#9aa3b5;font-size:11px;line-height:1.7;">
      如果不是你本人操作，请忽略这封邮件。<br />
      <span style="color:#5a6577;font-weight:600;">Bocchi 工具台</span>
    </div>
  </div>
</div>
"""


def _render_code_email(*, heading: str, body: str, code: str) -> str:
    return (
        _CODE_EMAIL_TEMPLATE
        .replace("__HEADING__", heading)
        .replace("__BODY__", body)
        .replace("__CODE__", code)
    )


def _post_email(
    *,
    api_url: str,
    token: str,
    custom_auth: str,
    from_name: str,
    to_name: str,
    to_email: str,
    subject: str,
    content: str,
) -> None:
    headers: Dict[str, str] = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if custom_auth:
        headers["x-custom-auth"] = custom_auth

    send_body: Dict[str, Any] = {
        "from_name": from_name,
        "to_name": to_name,
        "to_mail": to_email,
        "subject": subject,
        "is_html": True,
        "content": content,
    }

    try:
        response = requests.post(api_url, json=send_body, headers=headers, timeout=12)
        response.raise_for_status()
    except requests.RequestException as error:
        raise EmailDeliveryError("验证码邮件发送失败。") from error


def send_verification_email(
    *,
    api_url: str,
    token: str,
    custom_auth: str,
    from_name: str,
    to_name: str,
    to_email: str,
    code: str,
) -> None:
    content = _render_code_email(
        heading="验证你的邮箱",
        body=f"{to_name}，感谢注册 Bocchi 工具台。请输入下面的验证码完成注册：",
        code=code,
    )
    _post_email(
        api_url=api_url,
        token=token,
        custom_auth=custom_auth,
        from_name=from_name,
        to_name=to_name,
        to_email=to_email,
        subject="Bocchi 注册验证码",
        content=content,
    )


def send_password_reset_email(
    *,
    api_url: str,
    token: str,
    custom_auth: str,
    from_name: str,
    to_name: str,
    to_email: str,
    code: str,
) -> None:
    content = _render_code_email(
        heading="重置你的密码",
        body=f"{to_name}，我们收到了你的密码重置请求。请输入下面的验证码继续：",
        code=code,
    )
    _post_email(
        api_url=api_url,
        token=token,
        custom_auth=custom_auth,
        from_name=from_name,
        to_name=to_name,
        to_email=to_email,
        subject="Bocchi 重置密码验证码",
        content=content,
    )