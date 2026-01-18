import sys
import os

# Add the current directory (api/) to sys.path so 'app' can be imported
# This is required for Vercel serverless functions to correctly resolve imports
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
