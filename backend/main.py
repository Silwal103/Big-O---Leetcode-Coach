"""
FastAPI application — the HTTP layer for LeetCode Coach.

This module:
1. Loads environment variables from .env
2. Validates that GOOGLE_API_KEY is set
3. Creates the LangChain tutor chain once at startup
4. Exposes a single POST /api/tutor endpoint

The chain is created at module level (not per-request) because it's stateless —
it doesn't hold conversation history yet. Each request is independent.
"""

import os
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from models.schemas import TutorRequest, TutorResponse
from chains.tutor import create_tutor_chain


# ---------------------------------------------------------------------------
# Environment Setup
# ---------------------------------------------------------------------------
# load_dotenv() reads the .env file from the project root and sets the
# variables as environment variables. The LangChain Gemini wrapper
# (ChatGoogleGenerativeAI) automatically looks for GOOGLE_API_KEY.

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), "..", ".env"))

if not os.environ.get("GOOGLE_API_KEY"):
    raise RuntimeError(
        "GOOGLE_API_KEY is not set. "
        "Create a .env file in the project root with: GOOGLE_API_KEY=your-key-here"
    )


# ---------------------------------------------------------------------------
# Create the tutor chain once at startup
# ---------------------------------------------------------------------------
tutor_chain = create_tutor_chain()


# ---------------------------------------------------------------------------
# FastAPI App
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — runs on startup and shutdown."""
    print("[OK] LeetCode Coach backend is running")
    print("[OK] Tutor chain ready (model: gemini-3.5-flash)")
    yield
    print("[OK] Shutting down")


app = FastAPI(
    title="LeetCode Coach",
    description="AI-powered DSA tutor using LangChain + Gemini",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS — allow the Vite dev server (localhost:5173) to call our API.
# In production you'd restrict this, but for local development we're permissive.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.post("/api/tutor", response_model=TutorResponse)
async def tutor_endpoint(request: TutorRequest):
    """
    Send a message to the tutor and get a structured response.

    The request contains the user's message. The chain formats it into a
    prompt, sends it to Gemini, and parses the structured response.

    Returns:
        TutorResponse with: response text, hint_level, reveals_solution
    """
    try:
        # ainvoke() is the async version of invoke().
        # We pass a dict matching the prompt template's variables.
        result = await tutor_chain.ainvoke({
            "user_message": request.message,
            "problem_title": request.problem_title,
            "problem_description": request.problem_description,
            "constraints": request.constraints,
            "examples": request.examples,
            "code": request.code,
            "language": request.language,
            "mode": request.mode,
            "history": str(request.history),
        })

        # `result` is already a TutorResponse (thanks to structured output).
        return result

    except Exception as e:
        # Don't expose internal details to the frontend.
        # Log the full error server-side for debugging.
        print(f"[ERROR] Tutor chain error: {e}")
        raise HTTPException(
            status_code=500,
            detail="The tutor encountered an error. Please try again.",
        )


@app.post("/api/reset")
async def reset_endpoint():
    """
    Reset the current session.

    The frontend owns the local session state. This endpoint provides an
    explicit reset boundary for clients and future server-side state.
    """
    return {"status": "ok", "message": "Session reset"}


@app.get("/api/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}
