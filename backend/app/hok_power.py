from __future__ import annotations

import time
from typing import Any

import requests

HERO_TYPES = {"aqq", "awx", "iqq", "iwx"}
SOURCE_ORDER = ["xxoo", "wzryqz", "sapi"]
PLATFORM_LABELS = {"aqq": "\u5b89\u5353-QQ\u533a", "awx": "\u5b89\u5353-\u5fae\u4fe1\u533a", "iqq": "iOS-QQ\u533a", "iwx": "iOS-\u5fae\u4fe1\u533a"}
SOURCES = {
    "xxoo": {
        "label": "XXOO API",
        "list_url": "https://api.xxoo.team/hero/getHeroList.php",
        "info_url": "https://api.xxoo.team/hero/getHeroInfo.php",
        "referer": "https://xxoo.team/interface/p002.html",
    },
    "wzryqz": {
        "label": "WZRYQZ API",
        "list_url": "https://api.wzryqz.cn/getheros",
        "info_url": "https://api.wzryqz.cn/gethero",
        "referer": "https://wx.wrtt.top/",
    },
    "sapi": {
        "label": "SAPI.run",
        "list_url": "https://www.sapi.run/hero/herolist.json",
        "info_url": "https://www.sapi.run/hero/select.php",
        "referer": "https://www.sapi.run/",
    },
}
CACHE_SECONDS = 1800
_HERO_CACHE: dict[str, tuple[float, list[dict[str, Any]]]] = {}


class HokPowerError(RuntimeError):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.message = message
        self.status_code = status_code


def _load_json(url: str, source_id: str, params: dict[str, str] | None = None) -> Any:
    source = SOURCES[source_id]
    try:
        response = requests.get(
            url,
            params=params,
            headers={
                "User-Agent": "Mozilla/5.0 (Bocchi tools_web)",
                "Referer": source["referer"],
                "Accept": "application/json,text/plain,*/*",
            },
            timeout=(4, 12),
        )
        response.raise_for_status()
        response.encoding = "utf-8"
        payload = response.json()
    except (requests.RequestException, ValueError) as error:
        raise HokPowerError(f"{source['label']} \u8bf7\u6c42\u5931\u8d25") from error
    if isinstance(payload, dict) and "code" in payload and int(payload.get("code", 0)) != 200:
        raise HokPowerError(f"{source['label']} \u8fd4\u56de\u5f02\u5e38")
    return payload


def _hero_items(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, list):
        return [item for item in payload if isinstance(item, dict)]
    if isinstance(payload, dict):
        for key in ("data", "value"):
            if isinstance(payload.get(key), list):
                return [item for item in payload[key] if isinstance(item, dict)]
    return []


def get_heroes(source_id: str = "auto") -> dict[str, Any]:
    source_ids = SOURCE_ORDER if source_id == "auto" else [source_id]
    errors: list[str] = []
    for current in source_ids:
        if current not in SOURCES:
            raise HokPowerError("\u4e0d\u652f\u6301\u7684\u63a5\u53e3\u6e90", 400)
        cached = _HERO_CACHE.get(current)
        if cached and cached[0] > time.monotonic():
            return {"source": current, "sourceLabel": SOURCES[current]["label"], "heroes": cached[1]}
        try:
            payload = _load_json(SOURCES[current]["list_url"], current)
            heroes = _hero_items(payload)
            if not heroes:
                raise HokPowerError(f"{SOURCES[current]['label']} \u82f1\u96c4\u5217\u8868\u4e3a\u7a7a")
            normalized = []
            for item in heroes:
                if not item.get("cname"):
                    continue
                ename = str(item.get("ename", ""))
                normalized.append({
                    "ename": ename,
                    "cname": str(item.get("cname", "")),
                    "title": str(item.get("title", "")),
                    "iconUrl": str(item.get("iconUrl") or f"https://game.gtimg.cn/images/yxzj/img201606/heroimg/{ename}/{ename}.jpg"),
                    "heroType": item.get("hero_type"),
                    "heroType2": item.get("hero_type2"),
                })
            _HERO_CACHE[current] = (time.monotonic() + CACHE_SECONDS, normalized)
            return {"source": current, "sourceLabel": SOURCES[current]["label"], "heroes": normalized}
        except HokPowerError as error:
            errors.append(error.message)
    raise HokPowerError("\uff1b".join(errors) or "\u82f1\u96c4\u5217\u8868\u52a0\u8f7d\u5931\u8d25")


def _lowest(items: Any) -> dict[str, Any] | None:
    if not isinstance(items, list):
        return None
    candidates = [item for item in items if isinstance(item, dict) and item.get("val") is not None]
    return min(candidates, key=lambda item: int(item.get("val", 0))) if candidates else None


def _normalize_wzryqz(data: dict[str, Any], matched: dict[str, Any], hero_type: str) -> dict[str, Any]:
    province = _lowest(data.get("province")) or {}
    city = _lowest(data.get("city")) or {}
    county = _lowest(data.get("county")) or {}
    return {
        "uid": str(data.get("heroId", matched["ename"])),
        "name": str(data.get("name", matched["cname"])),
        "alias": str(matched.get("title", "")),
        "platform": PLATFORM_LABELS.get(hero_type, hero_type),
        "photo": str(data.get("photo", matched["iconUrl"])),
        "province": str(province.get("loc", "")),
        "provincePower": str(province.get("val", "")),
        "city": str(city.get("loc", "")),
        "cityPower": str(city.get("val", "")),
        "area": str(county.get("loc", "")),
        "areaPower": str(county.get("val", "")),
        "guobiao": str(data.get("Top100", data.get("Top10", ""))),
        "updatetime": str(data.get("updatetime", "")),
    }


def _normalize_standard(data: dict[str, Any], matched: dict[str, Any]) -> dict[str, Any]:
    return {
        "uid": str(data.get("uid", matched["ename"])),
        "name": str(data.get("name", matched["cname"])),
        "alias": str(data.get("alias", matched["title"])),
        "platform": str(data.get("platform", "")),
        "photo": str(data.get("photo", matched["iconUrl"])),
        "province": str(data.get("province", "")),
        "provincePower": str(data.get("provincePower", "")),
        "city": str(data.get("city", "")),
        "cityPower": str(data.get("cityPower", "")),
        "area": str(data.get("area", "")),
        "areaPower": str(data.get("areaPower", "")),
        "guobiao": str(data.get("guobiao", "")),
        "updatetime": str(data.get("updatetime", "")),
    }


def query_hero_power(hero: str, hero_type: str, source_id: str = "auto") -> dict[str, Any]:
    hero = hero.strip()
    hero_type = hero_type.strip().lower()
    if not hero:
        raise HokPowerError("\u8bf7\u8f93\u5165\u82f1\u96c4\u540d\u79f0", 422)
    if hero_type not in HERO_TYPES:
        raise HokPowerError("\u4e0d\u652f\u6301\u7684\u533a\u670d\u7c7b\u578b", 422)
    source_ids = SOURCE_ORDER if source_id == "auto" else [source_id]
    errors: list[str] = []
    for current in source_ids:
        if current not in SOURCES:
            raise HokPowerError("\u4e0d\u652f\u6301\u7684\u63a5\u53e3\u6e90", 400)
        try:
            hero_list = get_heroes(current)["heroes"]
            matched = next((item for item in hero_list if item["cname"] == hero), None)
            if matched is None:
                raise HokPowerError("\u6ca1\u6709\u627e\u5230\u8fd9\u4e2a\u82f1\u96c4", 404)
            payload = _load_json(SOURCES[current]["info_url"], current, {"hero": matched["cname"], "type": hero_type})
            data = payload.get("data") if isinstance(payload, dict) else None
            if not isinstance(data, dict):
                raise HokPowerError(f"{SOURCES[current]['label']} \u672a\u8fd4\u56de\u6218\u529b\u6570\u636e")
            power = _normalize_wzryqz(data, matched, hero_type) if current == "wzryqz" else _normalize_standard(data, matched)
            return {"source": current, "sourceLabel": SOURCES[current]["label"], "message": str(payload.get("message", payload.get("msg", ""))), "power": power}
        except HokPowerError as error:
            errors.append(error.message)
            continue
    raise HokPowerError("\uff1b".join(errors) or "\u6218\u529b\u67e5\u8be2\u5931\u8d25")