"""
The tutor chain — the core LangChain learning piece.

This module builds a LangChain "chain" that connects:

    ChatPromptTemplate  →  ChatGoogleGenerativeAI  →  TutorResponse

Each component is a LangChain **Runnable** — an object with `.invoke()` and
`.ainvoke()` methods. The pipe operator `|` composes them using **LCEL**
(LangChain Expression Language), so data flows left-to-right.

## Key LangChain Concepts Demonstrated

### 1. Chat Model (`ChatGoogleGenerativeAI`)
A wrapper around the Gemini API that conforms to LangChain's `BaseChatModel`
interface. This means you could swap Gemini for OpenAI, Anthropic, or any
other provider by changing one line — the rest of the chain stays the same.

### 2. ChatPromptTemplate
Builds a list of chat messages (system, human, AI) from a template with
variables like `{user_message}`. This separates prompt engineering from
application logic.

### 3. Structured Output (`with_structured_output`)
Tells the model to return JSON matching a Pydantic schema. LangChain handles
the parsing — you get back a Python object, not a raw string. Under the hood
this uses Gemini's function-calling / JSON mode.

### 4. LCEL Chain (the pipe operator)
`prompt | structured_model` creates a new Runnable that:
  1. Formats the prompt template with your input variables
  2. Sends the formatted messages to Gemini
  3. Parses the response into a TutorResponse object

You call the whole thing with `chain.ainvoke({"user_message": "..."})`.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Path & Environment Setup
# ---------------------------------------------------------------------------
# Ensure the backend directory is in sys.path so imports work cleanly regardless
# of whether Python is executed from the project root or the backend folder,
# and in IDE language servers (Pylance/Pyright).
backend_dir = Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# Automatically load .env if not already loaded into environment
if not os.environ.get("GOOGLE_API_KEY") and not os.environ.get("GEMINI_API_KEY"):
    load_dotenv(backend_dir.parent / ".env")
    load_dotenv(backend_dir / ".env")

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
except ImportError:  # pragma: no cover - compatibility with older package layouts
    from langchain_google_genai.chat_models import ChatGoogleGenerativeAI

from langchain_core.prompts import ChatPromptTemplate

try:
    from models.schemas import TutorResponse
    from chains.prompts import TUTOR_SYSTEM_PROMPT
except ImportError:
    from backend.models.schemas import TutorResponse
    from backend.chains.prompts import TUTOR_SYSTEM_PROMPT


def create_tutor_chain(
    model_name: str = "gemini-3.5-flash",
    temperature: float = 0.3,
    api_key: str | None = None,
):
    """
    Build and return the tutor chain.

    Args:
        model_name: The Gemini model identifier (default: "gemini-3.5-flash").
        temperature: Sampling temperature (0.0 = deterministic, 1.0 = creative).
        api_key: Optional explicit API key (falls back to GOOGLE_API_KEY env var).

    Returns:
        A LangChain Runnable that accepts {"user_message": str}
        and returns a TutorResponse.

    Architecture:
        ChatPromptTemplate → ChatGoogleGenerativeAI (with structured output)

    Usage:
        chain = create_tutor_chain()
        result = await chain.ainvoke({"user_message": "Give me a hint for Two Sum"})
        print(result.response)          # "Think about what you need to remember..."
        print(result.hint_level)        # 1
        print(result.reveals_solution)  # False
    """

    # -----------------------------------------------------------------------
    # Step 1: Create the Chat Model
    # -----------------------------------------------------------------------
    # ChatGoogleGenerativeAI wraps the Gemini API. It reads GOOGLE_API_KEY
    # from the environment or uses the provided api_key.
    resolved_api_key = api_key or os.environ.get("GOOGLE_API_KEY") or os.environ.get("GEMINI_API_KEY")
    kwargs = {
        "model": model_name,
        "temperature": temperature,
    }
    if resolved_api_key:
        kwargs["api_key"] = resolved_api_key

    model = ChatGoogleGenerativeAI(**kwargs)

    # -----------------------------------------------------------------------
    # Step 2: Create the Prompt Template
    # -----------------------------------------------------------------------
    # ChatPromptTemplate.from_messages() creates a template with typed
    # message slots:
    #   - ("system", ...) → sets the AI's persona and rules
    #   - ("human", ...) → the user's actual question
    prompt = ChatPromptTemplate.from_messages([
        ("system", TUTOR_SYSTEM_PROMPT),
        (
            "human",
            """\
User request:
{user_message}

Assistance mode:
{mode}

Mode-specific instruction:
{mode_instructions}

Current hint level:
{hint_level}

Problem title:
{problem_title}

Problem statement:
{problem_description}

Constraints:
{constraints}

Examples:
{examples}

Programming language:
{language}

Current user code:
{code}

Recent conversation history:
{history}
""",
        ),
    ])

    # -----------------------------------------------------------------------
    # Step 3: Add Structured Output
    # -----------------------------------------------------------------------
    # `with_structured_output()` wraps the model so that its output is
    # parsed into a Pydantic object (TutorResponse) instead of raw text.
    structured_model = model.with_structured_output(TutorResponse)

    # -----------------------------------------------------------------------
    # Step 4: Compose the Chain with LCEL
    # -----------------------------------------------------------------------
    # The pipe operator `|` connects Runnables in sequence:
    #   prompt | structured_model
    chain = prompt | structured_model

    return chain
