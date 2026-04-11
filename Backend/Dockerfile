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

# Install llama-cpp-python using pre-built CPU wheels. 
# We use v0.3.15 as it is more likely to have a pre-compiled binary available for Python 3.11 than the brand new 0.3.20.
# The --only-binary flag ensures we never trigger a slow source compilation on HF.
RUN pip install --no-cache-dir llama-cpp-python==0.3.15 --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu --only-binary=:all:

# Pre-download the model into the image for instant startup on HF Spaces.
# Using Gemma 4 E4B (Instruct-GGUF) - ~2.5GB model file.
RUN mkdir -p models && \
    python -c "from huggingface_hub import hf_hub_download; hf_hub_download(repo_id='bartowski/google_gemma-4-E4B-it-GGUF', filename='google_gemma-4-E4B-it-Q4_K_M.gguf', local_dir='models')"

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 7860

# Command to run the application using uvicorn with a single worker
# Reverting to 1 worker for debugging startup hangs on HF Spaces.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860", "--workers", "1"]
