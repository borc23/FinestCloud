FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    software-properties-common \
    git \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .

# Install Python dependencies
RUN pip3 install --no-cache-dir -r requirements.txt
RUN pip3 install gunicorn

# Copy project
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /tmp/models /tmp/uploads /tmp/huggingface_cache && chmod 777 /tmp/models /tmp/uploads /tmp/huggingface_cache

# Set environment variables
ENV PORT=7860
ENV FLASK_APP=run.py
ENV FLASK_DEBUG=0
ENV FLASK_ENV=production
ENV CACHE_TYPE=SimpleCache
ENV MODELS_DIR=/tmp/models
ENV UPLOAD_FOLDER=/tmp/uploads

# Use a different port - HF Spaces expects 7860
CMD gunicorn run:app --bind 0.0.0.0:7860 --workers 1 --threads 8