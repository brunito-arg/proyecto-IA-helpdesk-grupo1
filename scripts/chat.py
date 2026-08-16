import argparse
import sys

import chromadb
import ollama
from chromadb.utils.embedding_functions import OllamaEmbeddingFunction

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SYSTEM_PROMPT = (
    "Sos un asistente especializado en el proyecto helpdesk de la facultad. "
    "Respondes en espanol, de forma clara y concisa. Usa SOLO la informacion del "
    "contexto provisto para responder; si el contexto no alcanza, decilo "
    "explicitamente en vez de inventar."
)


def build_prompt(context, question, history):
    context_text = "\n\n".join(
        f"[Fuente: {m.get('archivo', '?')}] {doc}" for doc, m in context
    )
    parts = ["Contexto del proyecto:\n```\n" + context_text + "\n```"]
    for msg in history:
        role = msg["role"]
        content = msg["content"]
        parts.append(f"{'Usuario' if role == 'user' else 'Asistente'}: {content}")
    parts.append(f"Usuario: {question}")
    return "\n\n".join(parts)


def ask(question, collection, args, history):
    context = []
    if collection is not None:
        try:
            result = collection.query(query_texts=[question], n_results=args.top_k)
            docs = result.get("documents", [[]])[0]
            metas = result.get("metadatas", [[]])[0]
            context = list(zip(docs, metas))
        except Exception as e:
            print(f"[chat] Error al recuperar contexto: {e}")
            return None

    user_prompt = build_prompt(context, question, history)
    messages = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    print("=" * 60)
    try:
        stream = ollama.chat(model=args.model, messages=messages, stream=True)
        answer_parts = []
        for piece in stream:
            token = piece["message"]["content"]
            print(token, end="", flush=True)
            answer_parts.append(token)
        print()
    except Exception as e:
        print(f"\n[chat] Error al generar respuesta (¿Ollama esta corriendo?): {e}")
        return None
    print("=" * 60)

    answer = "".join(answer_parts)
    history.append({"role": "user", "content": question})
    history.append({"role": "assistant", "content": answer})
    return history[-8:]


def main():
    parser = argparse.ArgumentParser(description="Chat RAG local con Ollama (qwen2.5:3b) sobre la documentacion del proyecto.")
    parser.add_argument("--model", default="qwen2.5:3b", help="Modelo de Ollama (default: qwen2.5:3b).")
    parser.add_argument("--embed-model", default="nomic-embed-text",
                        help="Modelo de embeddings (default: nomic-embed-text; debe coincidir con el de ingest.py).")
    parser.add_argument("--ollama-url", default="http://localhost:11434",
                        help="URL base del servidor Ollama (default: http://localhost:11434).")
    parser.add_argument("-k", "--top-k", type=int, default=5,
                        help="Cantidad de fragmentos recuperados (default: 5).")
    parser.add_argument("--db", default="kb", help="Carpeta persistente de chromadb (default: kb).")
    parser.add_argument("--collection", default="docs", help="Nombre de la coleccion (default: docs).")
    parser.add_argument("--no-rag", action="store_true",
                        help="Chatear con el modelo sin recuperar contexto de la base de conocimiento.")
    parser.add_argument("-q", "--query", default=None,
                        help="Consulta de una sola vez (sin entrar al REPL).")
    args = parser.parse_args()

    collection = None
    if not args.no_rag:
        client = chromadb.PersistentClient(path=args.db)
        embedding_fn = OllamaEmbeddingFunction(url=args.ollama_url, model_name=args.embed_model)
        try:
            collection = client.get_collection(args.collection, embedding_function=embedding_fn)
            print(f"[chat] Base de conocimiento cargada: '{args.collection}' ({collection.count()} chunks)")
        except Exception as e:
            print(f"[chat] Error: no se pudo abrir la coleccion '{args.collection}'. Corri primero scripts/ingest.py ({e})")
            sys.exit(1)

    history = []

    if args.query:
        if not ask(args.query, collection, args, history):
            sys.exit(1)
        return

    print(f"[chat] Modelo: {args.model} | 'salir' termina | 'limpiar' resetea el historial")
    print("=" * 60)
    while True:
        try:
            question = input("Tu consulta: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if not question:
            continue
        if question.lower() in ("salir", "exit", "quit"):
            break
        if question.lower() in ("limpiar", "clear"):
            history = []
            print("[chat] Historial reseteado.")
            continue

        ask(question, collection, args, history)
        history = history[-8:]

    print("Chau!")


if __name__ == "__main__":
    main()
