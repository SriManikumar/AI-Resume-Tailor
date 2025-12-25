KEYWORD_SCHEMA_HINT = """
{
  "must_have_skills": ["..."],
  "nice_to_have_skills": ["..."],
  "tools_and_tech": ["..."],
  "responsibilities": ["..."],
  "keywords": ["..."]
}
"""

def keyword_extraction_prompt(job_description: str) -> str:
    return f"""
Extract ATS keywords from the job description.

JOB DESCRIPTION:
{job_description}

Rules:
- Keep items short and specific (FastAPI, MySQL, React, Docker)
- Avoid duplicates
- Return JSON only using the schema.
""".strip()

TAILOR_SCHEMA_HINT = """
{
  "tailored_resume_markdown": "string",
  "change_log": [
    {"section": "string", "change": "string", "reason": "string"}
  ],
  "missing_skills_recommended_to_learn": ["..."]
}
"""

def tailor_prompt(resume_text: str, job_description: str, strict_mode: bool) -> str:
    strict_rule = (
        "STRICT MODE ON: Do NOT add skills or experience not clearly supported by the resume."
        if strict_mode
        else "Strict mode OFF: You may lightly infer skills ONLY if strongly implied, but never invent employers, dates, titles, or projects."
    )

    return f"""
You are a resume editor.

Goal:
Tailor the resume for ATS and recruiter clarity for the job.

Constraints:
- {strict_rule}
- Never fabricate companies, titles, dates, degrees, certifications, years of experience, or projects.
- You may rewrite bullets to include keywords ONLY if consistent with original resume content.
- If important skills are missing, put them under "missing_skills_recommended_to_learn" (do not insert as claimed skills).

Output:
Return JSON only using the schema.

RESUME:
{resume_text}

JOB DESCRIPTION:
{job_description}
""".strip()
