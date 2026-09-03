"""身体分析へ渡す画像の形式・破損・容量を確認するテスト。"""

from io import BytesIO
from pathlib import Path
import base64
import sys
import unittest

PYTHON_ANALYSIS_ROOT = Path(__file__).resolve().parents[1]
if str(PYTHON_ANALYSIS_ROOT) not in sys.path:
    sys.path.insert(0, str(PYTHON_ANALYSIS_ROOT))

from fastapi import HTTPException, UploadFile
from PIL import Image
from starlette.datastructures import Headers

from app.main import (
    MAX_IMAGE_SIZE_BYTES,
    image_to_data_url,
    validate_image,
)


def make_upload(
    content: bytes,
    content_type: str = "image/png",
    filename: str = "test.png",
) -> UploadFile:
    return UploadFile(
        file=BytesIO(content),
        filename=filename,
        headers=Headers({"content-type": content_type}),
    )


def make_png() -> bytes:
    output = BytesIO()
    Image.new("RGB", (8, 8), color=(80, 100, 120)).save(
        output,
        format="PNG",
    )
    return output.getvalue()


class ImageValidationTests(unittest.IsolatedAsyncioTestCase):
    async def assert_http_error(
        self,
        image: UploadFile,
        expected_status: int,
    ) -> None:
        with self.assertRaises(HTTPException) as raised:
            await validate_image(image)

        self.assertEqual(raised.exception.status_code, expected_status)

    async def test_valid_png_is_accepted_and_rewound(self) -> None:
        content = make_png()
        image = make_upload(content)

        size = await validate_image(image)

        self.assertEqual(size, len(content))
        self.assertEqual(await image.read(), content)

    async def test_non_image_content_type_is_rejected(self) -> None:
        await self.assert_http_error(
            make_upload(b"plain text", "text/plain", "test.txt"),
            415,
        )

    async def test_empty_file_is_rejected(self) -> None:
        await self.assert_http_error(make_upload(b""), 400)

    async def test_corrupted_image_is_rejected(self) -> None:
        await self.assert_http_error(
            make_upload(b"this is not a real png"),
            400,
        )

    async def test_image_over_8mb_is_rejected(self) -> None:
        await self.assert_http_error(
            make_upload(b"0" * (MAX_IMAGE_SIZE_BYTES + 1)),
            413,
        )

    async def test_image_is_converted_to_data_url(self) -> None:
        content = make_png()
        result = await image_to_data_url(make_upload(content))

        prefix, encoded = result.split(",", 1)
        self.assertEqual(prefix, "data:image/png;base64")
        self.assertEqual(base64.b64decode(encoded), content)


if __name__ == "__main__":
    unittest.main()
