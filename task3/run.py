import os
import sys
import uvicorn

if __name__ == "__main__":
    # Ensure backend directory is in sys.path and set working directory to backend
    base_dir = os.path.dirname(os.path.abspath(__file__))
    backend_dir = os.path.join(base_dir, "backend")
    sys.path.insert(0, backend_dir)
    os.chdir(backend_dir)
    
    print("\n" + "=" * 65)
    print("  🚀 AURA HARMONY - AI MUSIC GENERATION STUDIO")
    print("  🌐 Studio Interface: http://localhost:8000")
    print("  API Server:        http://localhost:8000/api/status")
    print("=" * 65 + "\n")
    
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)
