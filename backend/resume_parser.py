import fitz  # PyMuPDF
from docx import Document
import io

def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    doc = fitz.open(stream=pdf_bytes, filetype="pdf")
    parts = []
    for page in doc:
        parts.append(page.get_text("text"))
    return "\n".join(parts).strip()

def extract_text_from_docx(docx_bytes: bytes) -> str:
    f = io.BytesIO(docx_bytes)
    doc = Document(f)
    return "\n".join([p.text for p in doc.paragraphs]).strip()

def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    name = filename.lower()
    if name.endswith(".pdf"):
        return extract_text_from_pdf(file_bytes)
    if name.endswith(".docx"):
        return extract_text_from_docx(file_bytes)
    raise ValueError("Unsupported file type. Upload PDF or DOCX.")
