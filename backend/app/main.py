from fastapi import FastAPI
from app.api.routes import files

app = FastAPI()

app.include_router(files.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to Clear File API"}
