"""
Pydantic schemas for API request/response models and LangChain structured output.

This module defines two kinds of models:
1. FastAPI request/response models — shape the REST API contract.
2. LangChain structured output models — tell Gemini exactly what JSON shape to return.

In Phase 1, the TutorResponse serves both purposes: LangChain parses the model's
output into this schema, and FastAPI serializes it back to the frontend.
"""

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# FastAPI Request Model
# ---------------------------------------------------------------------------

class TutorRequest(BaseModel):
    """
    What the frontend sends to POST /api/tutor.

    For Phase 1 this is intentionally minimal — just a free-form message.
    Later phases will add: code, language, mode, problem context, etc.
    """

    message: str = Field(
        ...,
        min_length=1,
        description="The user's message or question for the tutor.",
    )


# ---------------------------------------------------------------------------
# LangChain Structured Output / FastAPI Response Model
# ---------------------------------------------------------------------------

class TutorResponse(BaseModel):
    """
    The structured response returned by the tutor chain.

    LangChain's `with_structured_output()` uses this Pydantic model to
    instruct Gemini to return JSON matching this schema. FastAPI then
    serializes the same object back to the frontend.

    Fields:
        response:         The tutor's natural-language reply.
        hint_level:       How much has been revealed (0 = nothing, 5 = full solution).
        reveals_solution: Whether this response contains the complete solution.
    """

    response: str = Field(
        ...,
        description="The tutor's natural-language reply to the user.",
    )
    hint_level: int = Field(
        default=0,
        ge=0,
        le=5,
        description=(
            "How much has been revealed so far. "
            "0 = no hint, 1 = conceptual, 2 = more specific, "
            "3 = algorithmic idea, 4 = pseudocode, 5 = full solution."
        ),
    )
    reveals_solution: bool = Field(
        default=False,
        description="True only if this response contains the complete solution code.",
    )
