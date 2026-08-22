import json
import os
import sys

import chromadb
import ollama
from chromadb.utils.embedding_functions import OllamaEmbeddingFunction
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
KB_DIR = os.getenv("KB_DIR", "kb")
COLLECTION = os.getenv("KB_COLLECTION", "docs")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
MODEL = os.getenv("CHAT_MODEL", "qwen2.5:3b")
TOP_K = int(os.getenv("TOP_K", "5"))
MAX_HISTORIAL = 8

SYSTEM_PROMPT = (
    "Sos un asistente especializado en el proyecto helpdesk de la facultad. "
    "Respondes en espanol, de forma clara y concisa. Usa SOLO la informacion del "
    "contexto provisto para responder; si el contexto no alcanza, decilo "
    "explicitamente en vez de inventar."
)

app = FastAPI(title="Asistente Helpdesk")

cliente_ollama = ollama.Client(host=OLLAMA_URL)


class Mensaje(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    mensaje: str = Field(min_length=1)
    historial: list[Mensaje] = Field(default_factory=list)


def cargar_coleccion():
    client = chromadb.PersistentClient(path=KB_DIR)
    embedding_fn = OllamaEmbeddingFunction(url=OLLAMA_URL, model_name=EMBED_MODEL)
    return client.get_collection(COLLECTION, embedding_function=embedding_fn)


try:
    coleccion = cargar_coleccion()
    print(f"[asistente] Base de conocimiento cargada: '{COLLECTION}' ({coleccion.count()} chunks)")
except Exception as e:
    coleccion = None
    print(f"[asistente] Advertencia: no se pudo abrir la coleccion '{COLLECTION}'. Corré scripts/ingest.py ({e})")


def recuperar_contexto(pregunta):
    result = coleccion.query(query_texts=[pregunta], n_results=TOP_K)
    docs = result.get("documents", [[]])[0]
    metas = result.get("metadatas", [[]])[0]
    return "\n\n".join(
        f"[Fuente: {m.get('archivo', '?')}] {doc}" for doc, m in zip(docs, metas)
    )


def build_prompt(contexto, pregunta, historial):
    parts = ["Contexto del proyecto:\n```\n" + contexto + "\n```"]
    for msg in historial:
        role = "Usuario" if msg.role == "user" else "Asistente"
        parts.append(f"{role}: {msg.content}")
    parts.append(f"Usuario: {pregunta}")
    return "\n\n".join(parts)


@app.get("/health")
def health():
    ollama_ok = False
    try:
        cliente_ollama.list()
        ollama_ok = True
    except Exception:
        pass
    return {
        "ollama": ollama_ok,
        "kb": coleccion is not None,
        "chunks": coleccion.count() if coleccion is not None else 0,
        "modelo": MODEL,
    }


@app.post("/chat")
def chat(req: ChatRequest):
    if coleccion is None:
        def error_kb():
            yield sse({"error": "Base de conocimiento no inicializada. Corré scripts/ingest.py."})
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_kb(), media_type="text/event-stream")

    historial = [m for m in req.historial if m.role in ("user", "assistant")][-MAX_HISTORIAL:]

    def stream():
        try:
            contexto = recuperar_contexto(req.mensaje)
        except Exception as e:
            yield sse({"error": f"Error al buscar en la base de conocimiento (¿Ollama está corriendo?): {e}"})
            yield "data: [DONE]\n\n"
            return

        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": build_prompt(contexto, req.mensaje, historial)},
        ]
        try:
            for piece in cliente_ollama.chat(model=MODEL, messages=messages, stream=True):
                token = piece["message"]["content"]
                if token:
                    yield sse({"token": token})
        except Exception as e:
            yield sse({"error": f"Error al generar respuesta (¿Ollama está corriendo?): {e}"})
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


def sse(data):
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
