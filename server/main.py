import json
import os
import re
import sys
import tempfile
import urllib.request
import urllib.error
from pathlib import Path

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from pydantic import BaseModel, Field

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, str(Path(__file__).resolve().parent))

from rag import extraer_texto, open_collections, recuperar_contexto  # noqa: E402

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434")
KB_DIR = os.getenv("KB_DIR", str(Path(__file__).resolve().parent.parent / "kb"))
COLLECTION = os.getenv("KB_COLLECTION", "docs")
ADJUNTOS_COLLECTION = os.getenv("KB_ADJUNTOS", "adjuntos")
EMBED_MODEL = os.getenv("EMBED_MODEL", "nomic-embed-text")
MODEL = os.getenv("CHAT_MODEL", "qwen2.5:3b")
TOP_K = int(os.getenv("TOP_K", "5"))
MAX_HISTORIAL = 8
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:8080").rstrip("/")

SYSTEM_PROMPT = (
    "Sos un asistente especializado en el proyecto helpdesk de la facultad. "
    "Respondes en espanol, de forma clara y concisa. Usa SOLO la informacion del "
    "contexto provisto para responder; si el contexto no alcanza, decilo "
    "explicitamente en vez de inventar."
)

app = FastAPI(title="Asistente Helpdesk")

colecciones = open_collections([COLLECTION, ADJUNTOS_COLLECTION], KB_DIR, EMBED_MODEL, OLLAMA_URL)

llm = ChatOllama(model=MODEL, base_url=OLLAMA_URL)

prompt = ChatPromptTemplate.from_messages([
    ("system", SYSTEM_PROMPT),
    ("human", "{entrada}"),
])


class Mensaje(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    mensaje: str = Field(min_length=1)
    historial: list[Mensaje] = Field(default_factory=list)
    token: str | None = Field(default=None, max_length=4096)


def build_prompt(contexto, pregunta, historial, incidentes):
    parts = ["Contexto del proyecto:\n```\n" + contexto + "\n```"]
    if incidentes:
        parts.append("Incidentes del usuario (en tiempo real):\n```\n" + incidentes + "\n```")
    for msg in historial:
        role = "Usuario" if msg.role == "user" else "Asistente"
        parts.append(f"{role}: {msg.content}")
    parts.append(f"Usuario: {pregunta}")
    return "\n\n".join(parts)


def _http_json(url, token=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read().decode("utf-8"))


def _http_get_text(url):
    req = urllib.request.Request(url, headers={"Accept": "*/*"})
    with urllib.request.urlopen(req, timeout=20) as resp:
        return resp.read()


def listar_incidentes(token):
    if not token:
        return None
    try:
        return _http_json(f"{BACKEND_URL}/api/incidents", token=token)
    except urllib.error.HTTPError as e:
        if e.code == 401:
            return "AUTH"
        raise
    except Exception:
        raise


def obtener_incidente(incident_id, token):
    return _http_json(f"{BACKEND_URL}/api/incidents/{incident_id}", token=token)


def obtener_comentarios(incident_id, token):
    return _http_json(f"{BACKEND_URL}/api/incidents/{incident_id}/comments", token=token)


def leer_adjunto(archivo_url):
    if not archivo_url:
        return None
    try:
        contenido = _http_get_text(f"{BACKEND_URL}/uploads/{archivo_url}")
    except Exception:
        return "[No se pudo descargar el adjunto]"
    if isinstance(contenido, bytes):
        nombre = Path(archivo_url).name
        temp = Path(tempfile.gettempdir()) / nombre
        temp.parent.mkdir(parents=True, exist_ok=True)
        temp.write_bytes(contenido)
        return extraer_texto(temp)


def _detectar_id_incidente(pregunta):
    m = re.search(r"#\s*(\d+)", pregunta)
    if m:
        return int(m.group(1))
    m = re.search(r"\bincidente[s]?\s+(\d+)\b", pregunta, re.IGNORECASE)
    if m:
        return int(m.group(1))
    return None


def construir_contexto_incidentes(token, pregunta):
    if not token:
        return None, None
    try:
        incidentes = listar_incidentes(token)
    except Exception as e:
        raise RuntimeError(f"No se pudo consultar los incidentes: {e}")

    if incidentes == "AUTH":
        return "AUTH", None
    if not isinstance(incidentes, list):
        return None, None

    lineas = []
    for it in incidentes:
        lineas.append(
            f"#{it.get('id')} | {it.get('titulo')} | {it.get('categoria')} | "
            f"{it.get('prioridad')} | {it.get('estado')} | usuario: {it.get('usuarioNombre')} | "
            f"tecnico: {it.get('tecnicoNombre') or 'sin asignar'}"
        )
    bloque = "\n".join(lineas) if lineas else "No hay incidentes disponibles."

    inc_id = _detectar_id_incidente(pregunta)
    if inc_id is not None:
        permitidos = {it.get("id") for it in incidentes}
        if inc_id in permitidos:
            try:
                det = obtener_incidente(inc_id, token)
            except Exception:
                det = None
            if det:
                bloque += "\n\nDetalle del incidente:\n" + json.dumps(det, ensure_ascii=False)
                try:
                    comentarios = obtener_comentarios(inc_id, token)
                    if comentarios:
                        bloque += "\nComentarios:\n" + json.dumps(comentarios, ensure_ascii=False)
                except Exception:
                    pass
            adj = det.get("archivoUrl") if isinstance(det, dict) else None
            if adj:
                bloque += "\n\nContenido del adjunto:\n" + (leer_adjunto(adj) or "[sin contenido]")
        else:
            bloque += "\n\n(El usuario NO tiene permiso para ver el detalle del incidente #%s solicitado.)" % inc_id

    return bloque, inc_id


@app.get("/health")
def health():
    ollama_ok = False
    try:
        urllib.request.urlopen(f"{OLLAMA_URL}/api/tags", timeout=5)
        ollama_ok = True
    except Exception:
        pass
    backend_ok = False
    try:
        urllib.request.urlopen(f"{BACKEND_URL}/api/auth/login", timeout=5)
    except urllib.error.HTTPError:
        backend_ok = True
    except Exception:
        pass
    return {
        "ollama": ollama_ok,
        "kb": len(colecciones) > 0,
        "chunks": sum(c._collection.count() for c in colecciones),
        "colecciones": [c._collection.name for c in colecciones],
        "modelo": MODEL,
        "backend": backend_ok,
    }


@app.post("/chat")
def chat(req: ChatRequest):
    if not colecciones:
        def error_kb():
            yield sse({"error": "Base de conocimiento no inicializada. Corré scripts/ingest.py."})
            yield "data: [DONE]\n\n"
        return StreamingResponse(error_kb(), media_type="text/event-stream")

    historial = [m for m in req.historial if m.role in ("user", "assistant")][-MAX_HISTORIAL:]

    def stream():
        try:
            contexto = recuperar_contexto(req.mensaje, colecciones, TOP_K)
        except Exception as e:
            yield sse({"error": f"Error al buscar en la base de conocimiento (¿Ollama está corriendo?): {e}"})
            yield "data: [DONE]\n\n"
            return

        incidentes = None
        try:
            incidentes, _ = construir_contexto_incidentes(req.token, req.mensaje)
        except RuntimeError as e:
            yield sse({"error": str(e)})
            yield "data: [DONE]\n\n"
            return
        except Exception as e:
            yield sse({"error": f"No se pudieron cargar los incidentes: {e}"})
            yield "data: [DONE]\n\n"
            return

        if incidentes == "AUTH":
            yield sse({"error": "Tu sesión expiró o el token no es válido. Volvé a iniciar sesión."})
            yield "data: [DONE]\n\n"
            return

        messages = prompt.format_messages(entrada=build_prompt(contexto, req.mensaje, historial, incidentes))
        try:
            for chunk in llm.stream(messages):
                token = chunk.content
                if token:
                    yield sse({"token": token})
        except Exception as e:
            yield sse({"error": f"Error al generar respuesta (¿Ollama está corriendo?): {e}"})
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")


def sse(data):
    return f"data: {json.dumps(data, ensure_ascii=False)}\n\n"
