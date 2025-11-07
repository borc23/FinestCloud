FROM python:3.10-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
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

# Copy project files
COPY . .

# Create necessary directories with proper permissions
RUN mkdir -p /tmp/models /tmp/uploads /tmp/huggingface_cache && \
    chmod 777 /tmp/models /tmp/uploads /tmp/huggingface_cache

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV MODELS_DIR=/tmp/models
ENV UPLOAD_FOLDER=/tmp/uploads
ENV HF_HOME=/tmp/huggingface_cache

# Expose port (Render will provide PORT env variable)
EXPOSE 8000

# Run FastAPI with uvicorn
# Render provides PORT env variable, defaulting to 8000 if not set
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}