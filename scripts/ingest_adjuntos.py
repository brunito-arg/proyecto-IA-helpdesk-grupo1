import argparse
import json
import sys
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "server"))

import chromadb  # noqa: E402

from rag import IMAGE_EXTENSIONS, TEXT_EXTENSIONS, extraer_texto, get_vectorstore, split_document  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")


def login(backend_url, email, password):
    body = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(
        f"{backend_url}/api/auth/login",
        data=body,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode("utf-8"))
    return data["token"]


def fetch_incidents(backend_url, token):
    req = urllib.request.Request(
        f"{backend_url}/api/incidents",
        headers={"Authorization": f"Bearer {token}"},
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode("utf-8"))


def leer_adjunto(path):
    ext = path.suffix.lower()
    if ext in IMAGE_EXTENSIONS:
        print(f"  [warn] {path.name}: tipo imagen, sin OCR en esta version")
        return ""
    if ext not in TEXT_EXTENSIONS and ext not in (".pdf", ".docx"):
        print(f"  [warn] {path.name}: tipo {ext or 'desconocido'} no soportado")
        return ""
    return extraer_texto(path)


def main():
    parser = argparse.ArgumentParser(description="Ingiere los archivos adjuntos de los incidentes en chromadb (RAG con LangChain + Ollama).")
    parser.add_argument("--backend-url", default="http://localhost:8080",
                        help="URL del backend Spring (default: http://localhost:8080).")
    parser.add_argument("--admin-email", default="admin@helpdesk.com",
                        help="Email del admin para el GET /api/incidents (default: admin@helpdesk.com).")
    parser.add_argument("--admin-password", default="admin123",
                        help="Password del admin (default: admin123).")
    parser.add_argument("--uploads-dir", default="uploads",
                        help="Carpeta con los archivos adjuntos (default: uploads).")
    parser.add_argument("--embed-model", default="nomic-embed-text",
                        help="Modelo de Ollama para embeddings (default: nomic-embed-text).")
    parser.add_argument("--ollama-url", default="http://localhost:11434",
                        help="URL base del servidor Ollama (default: http://localhost:11434).")
    parser.add_argument("--chunk-size", type=int, default=800,
                        help="Tamano de cada chunk en caracteres (default: 800).")
    parser.add_argument("--overlap", type=int, default=100,
                        help="Superposicion entre chunks en caracteres (default: 100).")
    parser.add_argument("--db", default="kb", help="Carpeta persistente de chromadb (default: kb).")
    parser.add_argument("--collection", default="adjuntos",
                        help="Nombre de la coleccion (default: adjuntos).")
    parser.add_argument("--append", action="store_true",
                        help="No borrar la coleccion existente antes de ingerir (por defecto se reconstruye).")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    uploads_dir = Path(args.uploads_dir)
    if not uploads_dir.is_absolute():
        uploads_dir = root / uploads_dir

    token = login(args.backend_url, args.admin_email, args.admin_password)
    incidentes = fetch_incidents(args.backend_url, token)

    adjuntos = {}
    for inc in incidentes:
        if inc.get("archivoUrl"):
            adjuntos[inc["archivoUrl"]] = inc

    if not adjuntos:
        print("[ingest-adjuntos] No hay incidentes con archivos adjuntos.")
        return

    client = chromadb.PersistentClient(path=args.db)
    if not args.append:
        try:
            client.delete_collection(args.collection)
            print(f"[ingest-adjuntos] Coleccion '{args.collection}' eliminada (reconstruccion).")
        except Exception:
            pass

    store = get_vectorstore(args.collection, args.db, args.embed_model, args.ollama_url, client=client)

    total = 0
    for filename, inc in sorted(adjuntos.items()):
        path = uploads_dir / filename
        if not path.exists():
            print(f"  [warn] {filename}: no existe en {uploads_dir}")
            continue
        texto = leer_adjunto(path)
        if not texto:
            continue
        etiqueta = f"Adjunto #{inc['id']} {inc.get('titulo', '')}".strip()
        metadata = {
            "archivo": etiqueta,
            "filename": filename,
            "incident_id": inc["id"],
            "incident_titulo": inc.get("titulo", ""),
            "tipo": "adjunto",
        }
        documentos, ids = split_document(texto, metadata, args.chunk_size, args.overlap, id_prefix=f"adjunto:{filename}")
        if not documentos:
            continue
        store.add_documents(documentos, ids=ids)
        total += len(documentos)
        print(f"[ingest-adjuntos] {etiqueta} ({filename}): {len(documentos)} chunks")

    print(f"[ingest-adjuntos] Listo. {total} chunks en la coleccion '{args.collection}' (embedding: {args.embed_model}).")


if __name__ == "__main__":
    main()
