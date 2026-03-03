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
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for better stability with Stan (Prophet) and Llama-cpp
ENV OMP_NUM_THREADS 1
ENV MKL_NUM_THREADS 1
ENV OPENBLAS_NUM_THREADS 1
ENV LLAMA_NO_AVX 1

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir -r requirements.txt

# Install llama-cpp-python using pre-built CPU-only wheels
RUN pip install llama-cpp-python==0.2.76 --extra-index-url https://abetlen.github.io/llama-cpp-python/whl/cpu --only-binary :all:

# Pre-download the model into the image for instant startup. 
# Explicitly disable symlinks to ensure the file is at the exact path app/models/Phi-3...
RUN mkdir -p models && \
    python -c "from huggingface_hub import hf_hub_download; hf_hub_download(repo_id='microsoft/Phi-3-mini-4k-instruct-gguf', filename='Phi-3-mini-4k-instruct-q4.gguf', local_dir='models', local_dir_use_symlinks=False)"

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 7860

# Command to run the application using uvicorn directly
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
