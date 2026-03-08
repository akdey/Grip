# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1
ENV PORT 7860

# Set the working directory in the container
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    cmake \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for better stability with Stan (Prophet) and Llama-cpp
ENV OMP_NUM_THREADS 1
ENV MKL_NUM_THREADS 1
ENV OPENBLAS_NUM_THREADS 1
ENV KMP_DUPLICATE_LIB_OK TRUE

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Build llama-cpp-python from source to ensure it links against the local glibc (Debian).
# This avoids 'libc.musl' errors common with pre-built wheels on HF Spaces.
RUN CMAKE_ARGS="-DGGML_BLAS=OFF" FORCE_CMAKE=1 pip install --no-cache-dir llama-cpp-python==0.2.89

# Pre-download the model into the image for instant startup
# Using SmolLM2-1.7B (Instruct-GGUF) - much lighter (~1GB) and faster
RUN mkdir -p models && \
    python -c "from huggingface_hub import hf_hub_download; hf_hub_download(repo_id='HuggingFaceTB/SmolLM2-1.7B-Instruct-GGUF', filename='smollm2-1.7b-instruct-q4_k_m.gguf', local_dir='models')"

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 7860

# Command to run the application using uvicorn with a single worker
# Reverting to 1 worker for debugging startup hangs on HF Spaces.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "2"]
