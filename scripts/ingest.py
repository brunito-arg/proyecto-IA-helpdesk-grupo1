import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "server"))

import chromadb  # noqa: E402

from rag import get_vectorstore, split_document  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

DEFAULT_DOCS = [
    "AGENTS.md",
    "instructions.md",
    ".opencode/agent/*.md",
    ".opencode/readme.md",
]


def list_docs(patterns):
    root = Path(__file__).resolve().parent.parent
    files = []
    for pattern in patterns:
        files.extend(root.glob(pattern))
    seen = set()
    unique = []
    for f in sorted(files, key=lambda p: str(p)):
        if f not in seen:
            seen.add(f)
            unique.append(f)
    return unique


def main():
    parser = argparse.ArgumentParser(description="Ingiere la documentacion del proyecto en chromadb (RAG con LangChain + Ollama).")
    parser.add_argument("--docs", nargs="+", default=DEFAULT_DOCS,
                        help="Globs de archivos a ingerir (default: docs del proyecto).")
    parser.add_argument("--embed-model", default="nomic-embed-text",
                        help="Modelo de Ollama para embeddings (default: nomic-embed-text).")
    parser.add_argument("--ollama-url", default="http://localhost:11434",
                        help="URL base del servidor Ollama (default: http://localhost:11434).")
    parser.add_argument("--chunk-size", type=int, default=800,
                        help="Tamano de cada chunk en caracteres (default: 800).")
    parser.add_argument("--overlap", type=int, default=100,
                        help="Superposicion entre chunks en caracteres (default: 100).")
    parser.add_argument("--db", default="kb", help="Carpeta persistente de chromadb (default: kb).")
    parser.add_argument("--collection", default="docs", help="Nombre de la coleccion (default: docs).")
    parser.add_argument("--append", action="store_true",
                        help="No borrar la coleccion existente antes de ingerir (por defecto se reconstruye).")
    args = parser.parse_args()

    client = chromadb.PersistentClient(path=args.db)
    if not args.append:
        try:
            client.delete_collection(args.collection)
            print(f"[ingest] Coleccion '{args.collection}' eliminada (reconstruccion).")
        except Exception:
            pass

    store = get_vectorstore(args.collection, args.db, args.embed_model, args.ollama_url, client=client)

    files = list_docs(args.docs)
    if not files:
        print("[ingest] No se encontraron archivos para los patrones dados.")
        sys.exit(1)

    print(f"[ingest] Archivos a ingerir ({len(files)}):")
    for f in files:
        print(f"  - {f}")

    total = 0
    for f in files:
        text = f.read_text(encoding="utf-8", errors="replace")
        rel = f.as_posix()
        documentos, ids = split_document(text, {"archivo": rel}, args.chunk_size, args.overlap, id_prefix=rel)
        if not documentos:
            continue
        store.add_documents(documentos, ids=ids)
        total += len(documentos)
        print(f"[ingest] {rel}: {len(documentos)} chunks")

    print(f"[ingest] Listo. {total} chunks en la coleccion '{args.collection}' (embedding: {args.embed_model}).")


if __name__ == "__main__":
    main()
