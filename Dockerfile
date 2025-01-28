# Build stage
FROM python:3.9-slim AS builder

# Install only essential build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    ffmpeg \
    git \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set work directory
WORKDIR /app

# Copy only requirements first
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Final stage
FROM python:3.9-slim

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy only necessary fonts
COPY ./fonts/Arial.ttf /usr/share/fonts/custom/
COPY ./fonts/Roboto-Regular.ttf /usr/share/fonts/custom/

# Rebuild font cache
RUN fc-cache -f -v

# Copy Python packages from builder
COPY --from=builder /usr/local/lib/python3.9/site-packages/ /usr/local/lib/python3.9/site-packages/

# Copy application code
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV WHISPER_CACHE_DIR="/app/whisper_cache"
RUN mkdir -p ${WHISPER_CACHE_DIR}

EXPOSE 8080

# Create run script
RUN echo '#!/bin/bash\n\
gunicorn --bind 0.0.0.0:8080 \
    --workers ${GUNICORN_WORKERS:-2} \
    --timeout ${GUNICORN_TIMEOUT:-300} \
    --worker-class sync \
    --keep-alive 80 \
    app:app' > /app/run_gunicorn.sh && \
    chmod +x /app/run_gunicorn.sh

CMD ["/app/run_gunicorn.sh"]