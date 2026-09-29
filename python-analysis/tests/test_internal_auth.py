"""公開されたPython分析APIの内部認証を確認するテスト。"""

from pathlib import Path
import sys
import unittest
from unittest.mock import patch

PYTHON_ANALYSIS_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ANALYSIS_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ANALYSIS_ROOT))

from fastapi import HTTPException

from app.main import require_internal_api_key


class InternalApiKeyTests(unittest.TestCase):
    def test_missing_server_secret_fails_closed(self) -> None:
        with patch("app.main.PYTHON_INTERNAL_API_KEY", ""):
            with self.assertRaises(HTTPException) as raised:
                require_internal_api_key("client-secret")

        self.assertEqual(raised.exception.status_code, 503)

    def test_wrong_secret_is_rejected(self) -> None:
        with patch(
            "app.main.PYTHON_INTERNAL_API_KEY",
            "expected-secret",
        ):
            with self.assertRaises(HTTPException) as raised:
                require_internal_api_key("wrong-secret")

        self.assertEqual(raised.exception.status_code, 401)

    def test_matching_secret_is_accepted(self) -> None:
        with patch(
            "app.main.PYTHON_INTERNAL_API_KEY",
            "expected-secret",
        ):
            result = require_internal_api_key(
                "expected-secret"
            )

        self.assertIsNone(result)


if __name__ == "__main__":
    unittest.main()
