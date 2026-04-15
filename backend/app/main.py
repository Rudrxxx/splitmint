from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import HealthResponse

app = FastAPI(title="SplitMint", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok"}
