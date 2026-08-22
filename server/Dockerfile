FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY main.py .
ENV KB_DIR=/app/kb \
    OLLAMA_URL=http://host.docker.internal:11434
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
