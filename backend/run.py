import uvicorn
import sys
import os

if __name__ == "__main__":
    # Ensure backend directory is in python path
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    
    # Read host and port from environment (Render compatibility)
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", "8000"))
    
    # Disable reload on Render to improve performance
    reload_mode = os.getenv("RENDER") is None
    
    uvicorn.run("app.main:app", host=host, port=port, reload=reload_mode)
