# 身体画像を分析し、TypeScriptバックエンドへ結果JSONを返すPython API
from io import BytesIO

from fastapi import FastAPI, File, HTTPException, UploadFile
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

# Pythonが受け付ける画像形式と1枚あたりの最大容量
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024

ALLOWED_IMAGE_FORMATS = {
    "JPEG",
    "PNG",
    "WEBP",
}

MAX_IMAGE_PIXELS = 25_000_000

app = FastAPI(
    title="MUSCLE PAS Body Analysis API",
)

class BodyAreaResult(BaseModel):
    body_part: str
    score: int = Field(ge=1, le=10)
    priority: str
    observation: str
    recommendation: str


class BodyAnalysisResponse(BaseModel):
    summary: str
    goal_difference: str
    areas: list[BodyAreaResult]

# アップロード画像1枚の形式・容量を安全確認する
async def validate_image(image: UploadFile) -> None:
    if image.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(
            status_code=415,
            detail="JPEG・PNG・WebP画像を使用してください。",
        )

    image_bytes = await image.read(
        MAX_IMAGE_SIZE_BYTES + 1
    )

    if len(image_bytes) == 0:
        raise HTTPException(
            status_code=400,
            detail="空の画像は使用できません。",
        )

    if len(image_bytes) > MAX_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="画像は1枚につき10MB以下にしてください。",
        )

        # 受信データを実際に画像として開いて検査する
    try:
        with Image.open(
            BytesIO(image_bytes)
        ) as opened_image:
            if (
                opened_image.format
                not in ALLOWED_IMAGE_FORMATS
            ):
                raise HTTPException(
                    status_code=415,
                    detail=(
                        "対応していない画像形式です。"
                    ),
                )

            width, height = opened_image.size

            if (
                width <= 0
                or height <= 0
                or width * height
                > MAX_IMAGE_PIXELS
            ):
                raise HTTPException(
                    status_code=413,
                    detail=(
                        "画像の縦横サイズが大きすぎます。"
                    ),
                )

            opened_image.verify()

    except (
        UnidentifiedImageError,
        OSError,
        Image.DecompressionBombError,
    ) as error:
        raise HTTPException(
            status_code=400,
            detail=(
                "正常な画像ファイルではありません。"
            ),
        ) from error

    await image.seek(0)

   


@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "service": "body-analysis",
    }

@app.post(
    "/analyze",
    response_model=BodyAnalysisResponse,
)
async def analyze_body(
    front_image: UploadFile = File(...),
    side_image: UploadFile = File(...),
    back_image: UploadFile = File(...),
):

        # 正面・横・背面を同じ検査関数で確認する
    for image in (
        front_image,
        side_image,
        back_image,
    ):
        await validate_image(image)

    
    return BodyAnalysisResponse(
        summary="仮の身体分析結果です。",
        goal_difference=(
            "理想体型との差は今後画像から分析します。"
        ),
        areas=[
            BodyAreaResult(
                body_part="肩",
                score=5,
                priority="high",
                observation="仮の観察結果です。",
                recommendation=(
                    "サイドレイズを優先します。"
                ),
            ),
        ],
    )