from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.schemas import HealthResponse
from app.routers import auth, groups, expenses, balances

app = FastAPI(title="SplitMint", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(groups.router, prefix="/groups", tags=["groups"])
app.include_router(expenses.router, prefix="/groups", tags=["expenses"])
app.include_router(balances.router, prefix="/groups", tags=["balances"])


@app.get("/health", response_model=HealthResponse)
def health_check():
    return {"status": "ok"}