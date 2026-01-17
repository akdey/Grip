import os
import shutil

def clean_pycache(directory="."):
    """
    Recursively remove all __pycache__ directories and .pyc files
    """
    cleaned_count = 0
    print(f"Starting cleanup in: {os.path.abspath(directory)}")
    
    for root, dirs, files in os.walk(directory):
        # Remove __pycache__ directories
        if "__pycache__" in dirs:
            pycache_path = os.path.join(root, "__pycache__")
            try:
                shutil.rmtree(pycache_path)
                print(f"  Removed directory: {pycache_path}")
                cleaned_count += 1
            except Exception as e:
                print(f"  Error removing {pycache_path}: {e}")
        
        # Remove orphaned .pyc and .pyo files
        for file in files:
            if file.endswith((".pyc", ".pyo")):
                file_path = os.path.join(root, file)
                try:
                    os.remove(file_path)
                    print(f"  Removed file: {file_path}")
                    cleaned_count += 1
                except Exception as e:
                    print(f"  Error removing {file_path}: {e}")

    print(f"\nCleanup finished. {cleaned_count} items removed.")

if __name__ == "__main__":
    clean_pycache()
