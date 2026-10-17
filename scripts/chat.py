import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "server"))

from langchain_core.prompts import ChatPromptTemplate  # noqa: E402
from langchain_ollama import ChatOllama  # noqa: E402

from rag import open_collections, recuperar_contexto  # noqa: E402

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

SYSTEM_PROMPT = (
    "Sos un asistente especializado en el proyecto helpdesk de la facultad. "
    "Respondes en espanol, de forma clara y concisa. Usa SOLO la informacion del "
    "contexto provisto para responder; si el contexto no alcanza, decilo "
    "explicitamente en vez de inventar."
)


def build_prompt(contexto, pregunta, historial):
    parts = ["Contexto del proyecto:\n```\n" + contexto + "\n```"]
    for msg in historial:
        role = "Usuario" if msg["role"] == "user" else "Asistente"
        parts.append(f"{role}: {msg['content']}")
    parts.append(f"Usuario: {pregunta}")
    return "\n\n".join(parts)


def ask(question, stores, args, history, llm, prompt):
    contexto = ""
    if stores:
        try:
            contexto = recuperar_contexto(question, stores, args.top_k)
        except Exception as e:
            print(f"[chat] Error al recuperar contexto: {e}")
            return None

    messages = prompt.format_messages(entrada=build_prompt(contexto, question, history))

    print("=" * 60)
    try:
        answer_parts = []
        for chunk in llm.stream(messages):
            token = chunk.content
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
    parser = argparse.ArgumentParser(description="Chat RAG local con LangChain + Ollama (qwen2.5:3b) sobre la documentacion del proyecto.")
    parser.add_argument("--model", default="qwen2.5:3b", help="Modelo de Ollama (default: qwen2.5:3b).")
    parser.add_argument("--embed-model", default="nomic-embed-text",
                        help="Modelo de embeddings (default: nomic-embed-text; debe coincidir con el de ingest.py).")
    parser.add_argument("--ollama-url", default="http://localhost:11434",
                        help="URL base del servidor Ollama (default: http://localhost:11434).")
    parser.add_argument("-k", "--top-k", type=int, default=5,
                        help="Cantidad de fragmentos recuperados (default: 5).")
    parser.add_argument("--db", default="kb", help="Carpeta persistente de chromadb (default: kb).")
    parser.add_argument("--collection", default="docs", help="Nombre de la coleccion (default: docs).")
    parser.add_argument("--adjuntos-collection", default="adjuntos",
                        help="Nombre de la coleccion de adjuntos (default: adjuntos).")
    parser.add_argument("--no-rag", action="store_true",
                        help="Chatear con el modelo sin recuperar contexto de la base de conocimiento.")
    parser.add_argument("-q", "--query", default=None,
                        help="Consulta de una sola vez (sin entrar al REPL).")
    args = parser.parse_args()

    stores = []
    if not args.no_rag:
        stores = open_collections(
            [args.collection, args.adjuntos_collection],
            args.db,
            args.embed_model,
            args.ollama_url,
        )
        if not stores:
            print("[chat] Error: no hay colecciones disponibles. Corri primero scripts/ingest.py")
            sys.exit(1)

    llm = ChatOllama(model=args.model, base_url=args.ollama_url)
    prompt = ChatPromptTemplate.from_messages([
        ("system", SYSTEM_PROMPT),
        ("human", "{entrada}"),
    ])

    history = []

    if args.query:
        if not ask(args.query, stores, args, history, llm, prompt):
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

        ask(question, stores, args, history, llm, prompt)
        history = history[-8:]

    print("Chau!")


if __name__ == "__main__":
    main()
