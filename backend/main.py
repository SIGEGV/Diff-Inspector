from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import difflib
from typing import List, Dict, Optional
import os

app = FastAPI(title="Diff Checker API")

# CORS configuration for Railway deployment
# Update the frontend URL after deploying to Railway
allowed_origins = [
    "http://localhost:3000",  # Local development
    "http://localhost:5173",  # Vite dev server
]

# Add Railway frontend URL from environment variable if available
railway_frontend_url = os.getenv("FRONTEND_URL")
if railway_frontend_url:
    allowed_origins.append(railway_frontend_url)
    # Also add without trailing slash
    allowed_origins.append(railway_frontend_url.rstrip("/"))

# For development, allow all origins (remove in production)
# Comment out the line below after adding your Railway frontend URL
allowed_origins.append("*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins if "*" not in allowed_origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DiffRequest(BaseModel):
    original: str
    modified: str

class WordDiff(BaseModel):
    type: str  # 'equal', 'delete', 'insert'
    text: str

class DiffLine(BaseModel):
    type: str  # 'add', 'remove', 'context', 'modify'
    original_line: int | None
    modified_line: int | None
    original_content: str | None
    modified_content: str | None
    word_diffs: List[WordDiff] | None = None

def get_word_diff(text1: str, text2: str) -> List[WordDiff]:
    """Calculate word-level diff for inline highlighting"""
    matcher = difflib.SequenceMatcher(None, text1, text2)
    result = []
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            result.append(WordDiff(type='equal', text=text1[i1:i2]))
        elif tag == 'delete':
            result.append(WordDiff(type='delete', text=text1[i1:i2]))
        elif tag == 'insert':
            result.append(WordDiff(type='insert', text=text2[j1:j2]))
        elif tag == 'replace':
            result.append(WordDiff(type='delete', text=text1[i1:i2]))
            result.append(WordDiff(type='insert', text=text2[j1:j2]))
    
    return result

@app.post("/api/diff", response_model=List[DiffLine])
async def calculate_diff(request: DiffRequest):
    """
    Calculate diff using Python's difflib (Myers algorithm - O(ND) complexity)
    Returns side-by-side diff with word-level highlighting
    """
    original_lines = request.original.splitlines()
    modified_lines = request.modified.splitlines()
    
    matcher = difflib.SequenceMatcher(None, original_lines, modified_lines)
    result = []
    
    for tag, i1, i2, j1, j2 in matcher.get_opcodes():
        if tag == 'equal':
            for i in range(i1, i2):
                result.append(DiffLine(
                    type='context',
                    original_line=i + 1,
                    modified_line=j1 + (i - i1) + 1,
                    original_content=original_lines[i],
                    modified_content=modified_lines[j1 + (i - i1)],
                    word_diffs=None
                ))
        elif tag == 'delete':
            for i in range(i1, i2):
                result.append(DiffLine(
                    type='remove',
                    original_line=i + 1,
                    modified_line=None,
                    original_content=original_lines[i],
                    modified_content=None,
                    word_diffs=None
                ))
        elif tag == 'insert':
            for j in range(j1, j2):
                result.append(DiffLine(
                    type='add',
                    original_line=None,
                    modified_line=j + 1,
                    original_content=None,
                    modified_content=modified_lines[j],
                    word_diffs=None
                ))
        elif tag == 'replace':
            # For modified lines, calculate word-level diff
            max_lines = max(i2 - i1, j2 - j1)
            for idx in range(max_lines):
                orig_idx = i1 + idx if idx < (i2 - i1) else None
                mod_idx = j1 + idx if idx < (j2 - j1) else None
                
                if orig_idx is not None and mod_idx is not None:
                    # Both lines exist - show as modified with word diff
                    word_diffs = get_word_diff(original_lines[orig_idx], modified_lines[mod_idx])
                    result.append(DiffLine(
                        type='modify',
                        original_line=orig_idx + 1,
                        modified_line=mod_idx + 1,
                        original_content=original_lines[orig_idx],
                        modified_content=modified_lines[mod_idx],
                        word_diffs=word_diffs
                    ))
                elif orig_idx is not None:
                    # Only original line
                    result.append(DiffLine(
                        type='remove',
                        original_line=orig_idx + 1,
                        modified_line=None,
                        original_content=original_lines[orig_idx],
                        modified_content=None,
                        word_diffs=None
                    ))
                else:
                    # Only modified line
                    result.append(DiffLine(
                        type='add',
                        original_line=None,
                        modified_line=mod_idx + 1,
                        original_content=None,
                        modified_content=modified_lines[mod_idx],
                        word_diffs=None
                    ))
    
    return result

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
