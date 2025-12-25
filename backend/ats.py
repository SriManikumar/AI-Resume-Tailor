from typing import List, Dict
import re

def normalize_tokens(items: List[str]) -> List[str]:
    cleaned = []
    for x in items:
        x = x.strip().lower()
        x = re.sub(r"\s+", " ", x)
        if x:
            cleaned.append(x)
    return sorted(list(set(cleaned)))

def keyword_overlap_score(job_keywords: List[str], resume_text: str) -> Dict[str, object]:
    resume_lower = resume_text.lower()
    matches, missing = [], []

    for kw in job_keywords:
        if kw.lower() in resume_lower:
            matches.append(kw)
        else:
            missing.append(kw)

    if not job_keywords:
        return {"score": 0, "matches": matches, "missing": missing}

    score = int(round(100 * (len(matches) / len(job_keywords))))
    return {"score": score, "matches": matches, "missing": missing}

def compute_ats_score(keyword_score: int, format_score: int = 80, responsibility_score: int = 70) -> int:
    final_score = (
        0.50 * keyword_score +
        0.30 * responsibility_score +
        0.20 * format_score
    )
    return int(round(final_score))
