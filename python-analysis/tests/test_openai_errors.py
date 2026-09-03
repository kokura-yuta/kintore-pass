"""OpenAI画像分析が失敗したときのHTTPエラーを確認するテスト。"""

from io import BytesIO
from pathlib import Path
from types import SimpleNamespace
import sys
import unittest
from unittest.mock import AsyncMock, patch

# どのフォルダからテストしてもpython-analysis/appを読めるようにする
PYTHON_ANALYSIS_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ANALYSIS_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ANALYSIS_ROOT))

import httpx2
from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from app.main import analyze_body, openai_client
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    RateLimitError,
)


def make_test_image() -> UploadFile:
    """テスト用の小さなPNG画像をメモリ上で作る。"""
    image_bytes = BytesIO()
    Image.new(
        "RGB",
        (8, 8),
        color=(120, 120, 120),
    ).save(image_bytes, format="PNG")
    image_bytes.seek(0)

    return UploadFile(
        file=image_bytes,
        filename="test.png",
        headers=Headers(
            {"content-type": "image/png"}
        ),
    )


def make_openai_request() -> httpx2.Request:
    """OpenAI SDKエラーに必要なテスト用リクエストを作る。"""
    return httpx2.Request(
        "POST",
        "https://api.openai.com/v1/responses",
    )


def make_openai_response(
    status_code: int,
) -> httpx2.Response:
    """OpenAI SDKエラーに必要なテスト用レスポンスを作る。"""
    return httpx2.Response(
        status_code,
        request=make_openai_request(),
    )


class OpenAIErrorResponseTests(
    unittest.IsolatedAsyncioTestCase,
):
    """OpenAI側の失敗を利用者向けHTTPエラーへ変換できるか確認する。"""

    async def call_analyze(self) -> None:
        """3枚の正常画像で身体分析関数を呼ぶ。"""
        await analyze_body(
            front_image=make_test_image(),
            side_image=make_test_image(),
            back_image=make_test_image(),
            safety_identifier="test-user",
            goal_body_type="細マッチョ",
            height_cm=170,
            weight_kg=65,
            body_fat_percentage=None,
        )

    async def assert_openai_error(
        self,
        openai_error: Exception,
        expected_status: int,
        expected_detail: str,
    ) -> None:
        """OpenAI失敗と、期待するHTTPエラーの対応を確認する。"""
        with patch.object(
            openai_client.responses,
            "parse",
            new=AsyncMock(side_effect=openai_error),
        ):
            with self.assertRaises(
                HTTPException
            ) as raised:
                await self.call_analyze()

        self.assertEqual(
            raised.exception.status_code,
            expected_status,
        )
        self.assertEqual(
            raised.exception.detail,
            expected_detail,
        )

    async def test_timeout_returns_504(self) -> None:
        await self.assert_openai_error(
            APITimeoutError(make_openai_request()),
            504,
            "AI身体分析が時間内に完了しませんでした。"
            "少し待ってからもう一度お試しください。",
        )

    async def test_connection_error_returns_503(
        self,
    ) -> None:
        await self.assert_openai_error(
            APIConnectionError(
                request=make_openai_request()
            ),
            503,
            "AI身体分析サービスへ接続できません。"
            "少し待ってからもう一度お試しください。",
        )

    async def test_rate_limit_returns_429(self) -> None:
        await self.assert_openai_error(
            RateLimitError(
                "rate limit",
                response=make_openai_response(429),
                body=None,
            ),
            429,
            "AI身体分析が混み合っています。"
            "少し待ってからもう一度お試しください。",
        )

    async def test_authentication_error_returns_500(
        self,
    ) -> None:
        await self.assert_openai_error(
            APIStatusError(
                "authentication error",
                response=make_openai_response(401),
                body=None,
            ),
            500,
            "AI身体分析の設定を確認できませんでした。",
        )

    async def test_openai_server_error_returns_502(
        self,
    ) -> None:
        await self.assert_openai_error(
            APIStatusError(
                "server error",
                response=make_openai_response(500),
                body=None,
            ),
            502,
            "AI身体分析サービスで一時的なエラーが発生しました。",
        )

    async def test_missing_parsed_result_returns_502(
        self,
    ) -> None:
        with patch.object(
            openai_client.responses,
            "parse",
            new=AsyncMock(
                return_value=SimpleNamespace(
                    output_parsed=None
                )
            ),
        ):
            with self.assertRaises(
                HTTPException
            ) as raised:
                await self.call_analyze()

        self.assertEqual(
            raised.exception.status_code,
            502,
        )
        self.assertEqual(
            raised.exception.detail,
            "身体分析結果を取得できませんでした。",
        )


if __name__ == "__main__":
    unittest.main()
