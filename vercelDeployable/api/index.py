import os
import sys

# Add the current directory to sys.path to allow finding 'app'
# This helps when running on Vercel where the folder structure can be varied
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.main import app

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8030)
