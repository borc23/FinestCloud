FROM python:3.10-slim

COPY --from=ghcr.io/astral-sh/uv:0.12.21 /uv /uvx /bin/

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

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never

# Install dependencies first for caching
COPY pyproject.toml uv.lock ./
RUN uv sync --locked --no-dev --no-install-project

# Copy project files and install the project
COPY README.md ./
COPY src ./src
RUN uv sync --locked --no-dev

# Create necessary directories with proper permissions
RUN mkdir -p /tmp/models /tmp/uploads /tmp/huggingface_cache && \
    chmod 777 /tmp/models /tmp/uploads /tmp/huggingface_cache

# Set environment variables
ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    MODELS_DIR=/tmp/models \
    UPLOAD_FOLDER=/tmp/uploads \
    HF_HOME=/tmp/huggingface_cache

# Expose port (Render will provide PORT env variable)
EXPOSE 8000

# Run FastAPI with uvicorn
# Render provides PORT env variable, defaulting to 8000 if not set
CMD uvicorn finestcloud.main:app --host 0.0.0.0 --port ${PORT:-8000}
