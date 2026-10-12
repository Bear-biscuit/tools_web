from unittest import TestCase
from unittest.mock import patch

from app import hok_power


class HokPowerTestCase(TestCase):
    def setUp(self):
        hok_power._HERO_CACHE.clear()

    @patch("app.hok_power._load_json")
    def test_loads_normalized_hero_list(self, load_json):
        load_json.return_value = {"code": 200, "data": [{"ename": 167, "cname": "孙悟空", "title": "齐天大圣", "iconUrl": "hero.jpg"}]}
        result = hok_power.get_heroes("xxoo")
        self.assertEqual(result["source"], "xxoo")
        self.assertEqual(result["heroes"][0]["cname"], "孙悟空")

    @patch("app.hok_power._load_json")
    def test_queries_power(self, load_json):
        load_json.side_effect = [
            {"code": 200, "data": [{"ename": 167, "cname": "孙悟空", "title": "齐天大圣", "iconUrl": "hero.jpg"}]},
            {"code": 200, "data": {"uid": "167", "name": "孙悟空", "alias": "齐天大圣", "platform": "安卓-扣扣区", "photo": "hero.jpg", "province": "澳门", "provincePower": "11432", "city": "池州市", "cityPower": "8424", "area": "建宁县", "areaPower": "4538", "guobiao": "15604", "updatetime": "2026/09/17 05:38:32"}},
        ]
        result = hok_power.query_hero_power("孙悟空", "aqq", "xxoo")
        self.assertEqual(result["power"]["guobiao"], "15604")
        self.assertEqual(result["power"]["areaPower"], "4538")

    @patch("app.hok_power._load_json")
    def test_normalizes_wzryqz_power(self, load_json):
        load_json.side_effect = [
            {"value": [{"ename": 167, "cname": "孙悟空", "title": "齐天大圣"}]},
            {"code": 200, "data": {"name": "孙悟空", "photo": "hero.jpg", "Top10": "17702", "Top100": "15640", "province": [{"loc": "澳门", "val": 11432}], "city": [{"loc": "池州市", "val": 8424}], "county": [{"loc": "建宁县", "val": 4538}], "updatetime": "2026-09-16 09:00:27"}},
        ]
        result = hok_power.query_hero_power("孙悟空", "aqq", "wzryqz")
        self.assertEqual(result["power"]["guobiao"], "15640")
        self.assertEqual(result["power"]["areaPower"], "4538")

    def test_rejects_unknown_platform(self):
        with self.assertRaises(hok_power.HokPowerError):
            hok_power.query_hero_power("孙悟空", "bad", "xxoo")