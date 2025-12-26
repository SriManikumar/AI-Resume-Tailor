from fastapi import FastAPI, UploadFile, File
from pydantic import BaseModel
from dotenv import load_dotenv
load_dotenv()
from fastapi.responses import StreamingResponse
from docx_export import markdown_to_docx
from io import BytesIO

from fastapi.middleware.cors import CORSMiddleware

from resume_parser import extract_resume_text
from gemini_client import GeminiClient
from prompts import (
    keyword_extraction_prompt,
    KEYWORD_SCHEMA_HINT,
    tailor_prompt,
    TAILOR_SCHEMA_HINT
)
from ats import normalize_tokens, keyword_overlap_score, compute_ats_score

app = FastAPI()

# Allow React dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:5175"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ATSRequest(BaseModel):
    job_description: str
    resume_text: str
    # Gemini model selection
    llm_model: str = "gemini-2.5-flash"

class TailorRequest(BaseModel):
    job_description: str
    resume_text: str
    llm_model: str = "gemini-2.5-flash"
    strict_mode: bool = True

@app.get("/")
def root():
    return {"status": "ok"}

@app.post("/parse_resume")
async def parse_resume(file: UploadFile = File(...)):
    b = await file.read()
    text = extract_resume_text(file.filename, b)
    return {"resume_text": text}

@app.post("/ats_score")
def ats_score(req: ATSRequest):
    llm = GeminiClient(model=req.llm_model)

    kw_json = llm.generate_json(
        prompt=keyword_extraction_prompt(req.job_description),
        schema_hint=KEYWORD_SCHEMA_HINT
    )

    keywords = []
    for k in ["must_have_skills", "nice_to_have_skills", "tools_and_tech", "keywords"]:
        keywords += kw_json.get(k, [])

    keywords = normalize_tokens(keywords)

    overlap = keyword_overlap_score(keywords, req.resume_text)
    final = compute_ats_score(keyword_score=overlap["score"])

    return {
        "ats_score": final,
        "keyword_match_score": overlap["score"],
        "matches": overlap["matches"],
        "missing": overlap["missing"],
        "extracted_job_keywords": keywords
    }

@app.post("/tailor_resume")
def tailor_resume(req: TailorRequest):
    llm = GeminiClient(model=req.llm_model)

    result = llm.generate_json(
        prompt=tailor_prompt(req.resume_text, req.job_description, req.strict_mode),
        schema_hint=TAILOR_SCHEMA_HINT
    )
    print("Tailor result:", result)
    return result

@app.post("/download_resume")
def download_resume(payload: dict):
    markdown = payload.get("markdown")

    if not markdown:
        return {"error": "Missing markdown"}

    docx_bytes = markdown_to_docx(markdown)

    return StreamingResponse(
        BytesIO(docx_bytes),
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": "attachment; filename=tailored_resume.docx"
        }
    )
