import io
import json
import os

from fastapi import FastAPI, Form, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from groq import Groq
from ultralytics import YOLO
from PIL import Image
from supabase import create_client, Client

# ── Configuration ─────────────────────────────────────────────────────────────

SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
GROQ_API_KEY = os.environ["GROQ_API_KEY"]

# ── Clients ───────────────────────────────────────────────────────────────────

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
groq_client = Groq(api_key=GROQ_API_KEY)
yolo_model = YOLO("yolov8n.pt")

# ── FastAPI app ───────────────────────────────────────────────────────────────

app = FastAPI(title="Situation Center 2.0 API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
)

# ── Prompts ───────────────────────────────────────────────────────────────────

CLASSIFY_PROMPT = """Ты — ассистент по городской инфраструктуре. Анализируй жалобы граждан на русском языке.

Верни ТОЛЬКО валидный JSON-объект с тремя ключами:
- "category": одно из — "ЖКХ", "Дороги", "Безопасность"
- "priority": одно из — "Низкий", "Средний", "Высокий"
- "summary": краткое описание проблемы из 3-5 слов на русском языке

Правила category:
- "Дороги": дороги, ямы, светофоры, асфальт, тротуары, дорожное покрытие
- "Безопасность": преступления, драки, угрозы, подозрительные лица, кражи
- "ЖКХ": трубы, отопление, вода, свет, лифт, мусор, канализация

Правила priority:
- "Высокий": угроза жизни, авария, срочная ситуация, утечка газа
- "Средний": серьёзная, но не экстренная проблема
- "Низкий": незначительная или плановая проблема

Только JSON. Никаких пояснений."""

CHAT_SYSTEM_PROMPT = """Ты — ИИ-аналитик и главный цифровой диспетчер Ситуационного Центра Казахстана. \
Перед тобой оперативная база данных реального времени (жалобы граждан). \
Твоя задача — мгновенно отвечать на вопросы оператора, группировать критические аварии по локациям \
(Кордай, Шымкент, Алматы и т.д.), рекомендовать экстренные службы для отправки на место \
и генерировать успокаивающие официальные тексты-ответы для публикаций жителям в соцсетях. \
Отвечай авторитетно, структурировано (используй списки и жирный шрифт), строго по делу, на русском языке."""

# ── Pydantic schemas ──────────────────────────────────────────────────────────

class ChatRequest(BaseModel):
    message: str

# ── Internal helpers ──────────────────────────────────────────────────────────

def run_llm(text: str) -> dict:
    response = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": CLASSIFY_PROMPT},
            {"role": "user",   "content": text},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
    )
    result = json.loads(response.choices[0].message.content)

    if result.get("category") not in {"ЖКХ", "Дороги", "Безопасность"}:
        result["category"] = "ЖКХ"
    if result.get("priority") not in {"Низкий", "Средний", "Высокий"}:
        result["priority"] = "Средний"
    if not result.get("summary"):
        result["summary"] = "Обращение гражданина"

    return {
        "category": result["category"],
        "priority": result["priority"],
        "summary":  result["summary"],
    }


def run_yolo(image_bytes: bytes) -> list[str]:
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    results = yolo_model(image)
    return sorted({results[0].names[int(c)] for c in results[0].boxes.cls.tolist()})


def _format_complaints_context(complaints: list[dict]) -> str:
    if not complaints:
        return "Нет активных обращений в базе данных."
    lines = [
        f"- [{c.get('priority', '?')}] {c.get('category', '?')}: "
        f"{c.get('summary', '?')} | {str(c.get('text', ''))[:140]}"
        for c in complaints
    ]
    return "\n".join(lines)

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.post("/api/analyze")
async def analyze(
    complaint: str = Form(...),
    image: UploadFile | None = File(default=None),
    city: str = Form(default=None),
    district: str = Form(default=None),
    latitude: float = Form(default=None),
    longitude: float = Form(default=None),
):
    # 1. Classify text
    try:
        llm_result = run_llm(complaint)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}")

    # 2. Object detection (optional)
    detected_tags: list[str] = []
    if image is not None:
        try:
            detected_tags = run_yolo(await image.read())
        except Exception as exc:
            print(f"YOLO error (non-fatal): {exc}")

    tags_str: str | None = ", ".join(detected_tags) if detected_tags else None

    # 3. Persist (use real submitted coordinates, not random values)
    try:
        supabase.table("complaints").insert({
            "text":      complaint,
            "category":  llm_result["category"],
            "priority":  llm_result["priority"],
            "summary":   llm_result["summary"],
            "tags":      tags_str,
            "city":      city,
            "district":  district,
            "latitude":  latitude,
            "longitude": longitude,
        }).execute()
    except Exception as exc:
        print(f"Supabase insert error (non-fatal): {exc}")

    return JSONResponse({
        "category": llm_result["category"],
        "priority": llm_result["priority"],
        "summary":  llm_result["summary"],
        "tags":     tags_str,
    })


@app.post("/api/chat")
async def chat(request: ChatRequest):
    # 1. Fetch live complaints from Supabase for LLM context
    try:
        result = (
            supabase.table("complaints")
            .select("priority, category, summary, text, created_at")
            .order("created_at", desc=True)
            .limit(50)
            .execute()
        )
        complaints = result.data or []
    except Exception as exc:
        print(f"Supabase fetch error (non-fatal): {exc}")
        complaints = []

    context = _format_complaints_context(complaints)

    # 2. Call Groq with dispatcher system prompt + live data
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": CHAT_SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"ОПЕРАТИВНЫЕ ДАННЫЕ (последние {len(complaints)} обращений):\n"
                        f"{context}\n\n"
                        f"ВОПРОС ОПЕРАТОРА:\n{request.message}"
                    ),
                },
            ],
            temperature=0.3,
            max_tokens=1024,
        )
        reply = response.choices[0].message.content
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"LLM error: {exc}")

    return {"reply": reply}
