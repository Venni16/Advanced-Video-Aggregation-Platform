# Python 3.11 slim — FastAPI + CLIP service
FROM python:3.11-slim

# System deps for Pillow and torch
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# HuggingFace model cache directory
RUN mkdir -p /app/cache/huggingface
ENV HF_HOME=/app/cache/huggingface
ENV PORT=8000

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
