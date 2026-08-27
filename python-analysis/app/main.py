# 身体画像を分析し、TypeScriptバックエンドへ結果JSONを返すPython API
import base64
import os
from io import BytesIO
from pathlib import Path

from dotenv import load_dotenv
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    AsyncOpenAI,
    RateLimitError,
)
from fastapi import (
    FastAPI,
    File,
    Form,
    HTTPException,
    UploadFile,
)
from PIL import Image, UnidentifiedImageError
from pydantic import BaseModel, Field

# プロジェクト直下の.env.localからOpenAI APIキーを読み込む
ENV_FILE_PATH = (
    Path(__file__).resolve().parents[2]
    / ".env.local"
)
load_dotenv(ENV_FILE_PATH)


def read_positive_float_env(
    name: str,
    fallback: float,
) -> float:
    try:
        value = float(os.getenv(name, str(fallback)))
    except ValueError:
        return fallback

    return value if value > 0 else fallback


def read_non_negative_int_env(
    name: str,
    fallback: int,
) -> int:
    try:
        value = int(os.getenv(name, str(fallback)))
    except ValueError:
        return fallback

    return value if value >= 0 else fallback


# OpenAI通信1回の待ち時間と、一時的な失敗時の再試行回数を読み込む
OPENAI_TIMEOUT_SECONDS = read_positive_float_env(
    "PYTHON_OPENAI_TIMEOUT_SECONDS",
    50.0,
)
OPENAI_MAX_RETRIES = read_non_negative_int_env(
    "PYTHON_OPENAI_MAX_RETRIES",
    1,
)

# OpenAI APIへ画像分析を依頼する共通クライアントを作る
openai_client = AsyncOpenAI(
    timeout=OPENAI_TIMEOUT_SECONDS,
    max_retries=OPENAI_MAX_RETRIES,
)

# Pythonが受け付ける画像形式・1枚の容量・3枚合計の容量
ALLOWED_IMAGE_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
}

MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024
MAX_TOTAL_IMAGE_SIZE_BYTES = 24 * 1024 * 1024

ALLOWED_IMAGE_FORMATS = {
    "JPEG",
    "PNG",
    "WEBP",
}

MAX_IMAGE_PIXELS = 25_000_000

# 身体画像を安全に評価し、決まった形式で返すようOpenAIへ伝える
BODY_ANALYSIS_INSTRUCTIONS = """
あなたは筋力トレーニング支援アプリの身体分析担当です。
正面・横・背面の3枚の画像を比較して、日本語で回答してください。

画像から目視できる範囲だけを評価してください。
肩・胸・背中・腕・腹部・脚などを必要に応じて評価してください。
各部位の発達、左右差、姿勢、優先して鍛える部位を説明してください。
scoreは現在の筋肉の発達度を1から10で評価してください。
priorityはhigh、medium、lowのいずれかにしてください。

病気や怪我の診断はしないでください。
体脂肪率など、画像だけでは断定できない数値を作らないでください。
年齢、人種、健康状態などを推測しないでください。
画像が不鮮明な場合は、判断できないことを明記してください。
理想体型の情報がない場合、goal_differenceには比較基準が未設定だと書いてください。
"""

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
async def validate_image(image: UploadFile) -> int:
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
            detail="画像は1枚につき8MB以下にしてください。",
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

    return len(image_bytes)


# 検査済みの画像をOpenAIへ送れるBase64データURLへ変換する
async def image_to_data_url(
    image: UploadFile,
) -> str:
    image_bytes = await image.read()
    await image.seek(0)

    encoded_image = base64.b64encode(
        image_bytes
    ).decode("utf-8")

    return (
        f"data:{image.content_type};base64,"
        f"{encoded_image}"
    )


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
    goal_body_type: str = Form(
        ...,
        min_length=1,
        max_length=30,
    ),
    height_cm: float = Form(
        ...,
        ge=50,
        le=250,
    ),
    weight_kg: float = Form(
        ...,
        ge=20,
        le=500,
    ),
    body_fat_percentage: float | None = Form(
        None,
        ge=0,
        le=80,
    ),
):
    # 正面・横・背面を同じ検査関数で安全確認し、3枚の容量を合計する
    total_image_size_bytes = 0

    for image in (
        front_image,
        side_image,
        back_image,
    ):
        total_image_size_bytes += await validate_image(
            image
        )

    if total_image_size_bytes > MAX_TOTAL_IMAGE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="画像3枚の合計は24MB以下にしてください。",
        )

    # 検査済みの3枚をOpenAIへ送れる文字列に変換する
    front_image_url = await image_to_data_url(
        front_image
    )
    side_image_url = await image_to_data_url(
        side_image
    )
    back_image_url = await image_to_data_url(
        back_image
    )

    # 任意の体脂肪率をAIへ渡せる表示へ変換する
    body_fat_text = (
        f"{body_fat_percentage}%"
        if body_fat_percentage is not None
        else "未入力"
    )

    # 理想体型と身体情報をOpenAIへ渡す文章にまとめる
    user_body_context = (
        "今回分析するユーザー情報です。\n"
        f"理想体型: {goal_body_type}\n"
        f"身長: {height_cm}cm\n"
        f"体重: {weight_kg}kg\n"
        f"体脂肪率: {body_fat_text}\n"
        "画像とこの情報を比較して、"
        "理想体型との差を説明してください。"
    )

    # 画像3枚をOpenAIへ送り、決まった形式の分析結果を受け取る
    try:
        response = await openai_client.responses.parse(
            model="gpt-5.6",
            instructions=BODY_ANALYSIS_INSTRUCTIONS,
            input=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "input_text",
                            "text": user_body_context,
                        },
                        {
                            "type": "input_text",
                            "text": "1枚目は正面画像です。",
                        },
                        {
                            "type": "input_image",
                            "image_url": front_image_url,
                            "detail": "low",
                        },
                        {
                            "type": "input_text",
                            "text": "2枚目は横画像です。",
                        },
                        {
                            "type": "input_image",
                            "image_url": side_image_url,
                            "detail": "low",
                        },
                        {
                            "type": "input_text",
                            "text": "3枚目は背面画像です。",
                        },
                        {
                            "type": "input_image",
                            "image_url": back_image_url,
                            "detail": "low",
                        },
                    ],
                },
            ],
            text_format=BodyAnalysisResponse,
            store=False,
        )
    except APITimeoutError as error:
        raise HTTPException(
            status_code=504,
            detail=(
                "AI身体分析が時間内に完了しませんでした。"
                "少し待ってからもう一度お試しください。"
            ),
        ) from error
    except APIConnectionError as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "AI身体分析サービスへ接続できません。"
                "少し待ってからもう一度お試しください。"
            ),
        ) from error
    except RateLimitError as error:
        raise HTTPException(
            status_code=429,
            detail=(
                "AI身体分析が混み合っています。"
                "少し待ってからもう一度お試しください。"
            ),
        ) from error
    except APIStatusError as error:
        if error.status_code >= 500:
            status_code = 502
            detail = (
                "AI身体分析サービスで一時的なエラーが発生しました。"
            )
        elif error.status_code in (401, 403):
            status_code = 500
            detail = "AI身体分析の設定を確認できませんでした。"
        else:
            status_code = 502
            detail = "AI身体分析へ画像を送信できませんでした。"

        raise HTTPException(
            status_code=status_code,
            detail=detail,
        ) from error

    # AIが形式どおりの結果を返さなかった場合はエラーにする
    if response.output_parsed is None:
        raise HTTPException(
            status_code=502,
            detail="身体分析結果を取得できませんでした。",
        )

    return response.output_parsed
