import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";
import "./App.css";

const API_BASE = "http://127.0.0.1:8000";

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [resumeText, setResumeText] = useState("");
  const [jobDescription, setJobDescription] = useState("");

  const [model, setModel] = useState("gemini-2.5-flash");
  const [strictMode, setStrictMode] = useState(true);

  const [atsResult, setAtsResult] = useState(null);
  const [tailored, setTailored] = useState(null);
  const [loading, setLoading] = useState(false);

  async function parseResume() {
    if (!resumeFile) {
      alert("Upload a PDF/DOCX resume first.");
      return;
    }

    setLoading(true);
    setAtsResult(null);
    setTailored(null);

    try {
      const formData = new FormData();
      formData.append("file", resumeFile);

      const res = await axios.post(`${API_BASE}/parse_resume`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setResumeText(res.data.resume_text || "");
    } catch (err) {
      console.error(err);
      alert("Parse failed. Is backend running on 127.0.0.1:8000?");
    } finally {
      setLoading(false);
    }
  }

  async function getATSScore() {
    if (!resumeText.trim()) return alert("Parse the resume first.");
    if (!jobDescription.trim()) return alert("Paste a job description.");

    setLoading(true);
    setAtsResult(null);

    try {
      const res = await axios.post(`${API_BASE}/ats_score`, {
        job_description: jobDescription,
        resume_text: resumeText,
        llm_model: model,
      });

      setAtsResult(res.data);
    } catch (err) {
      console.error(err);
      alert("ATS score failed. Check backend terminal for error.");
    } finally {
      setLoading(false);
    }
  }

  async function tailorResume() {
    if (!resumeText.trim()) return alert("Parse the resume first.");
    if (!jobDescription.trim()) return alert("Paste a job description.");

    setLoading(true);
    setTailored(null);

    try {
      const res = await axios.post(`${API_BASE}/tailor_resume`, {
        job_description: jobDescription,
        resume_text: resumeText,
        llm_model: model,
        strict_mode: strictMode,
      });

      setTailored(res.data);
    } catch (err) {
      console.error(err);
      alert("Tailor failed. Check backend terminal for error.");
    } finally {
      setLoading(false);
    }
  }

  async function downloadResume() {
    if (!tailored?.tailored_resume_markdown) return;

    try {
      const res = await axios.post(
        `${API_BASE}/download_resume`,
        { markdown: tailored.tailored_resume_markdown },
        { responseType: "blob" }
      );

      const blob = new Blob([res.data], {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tailored_resume.docx";
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Download failed");
      console.error(err);
    }
  }

  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">Resume ATS + Tailor</h1>
        <p className="app-subtitle">Powered by Gemini AI</p>
      </header>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">1. Upload Resume</h2>
        </div>
        <div className="card-content">
          <div className="form-group">
            <div className="file-input-wrapper">
              <input
                type="file"
                id="resume-file"
                className="file-input"
                accept=".pdf,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
              <label htmlFor="resume-file" className="file-input-label">
                📎 Choose Resume File
              </label>
            </div>
            <button onClick={parseResume} className="btn btn-primary">
              📄 Parse Resume
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Resume Text:</label>
            <textarea
              rows={8}
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="Resume text appears here after parsing..."
              className="textarea"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">2. Job Description</h2>
        </div>
        <div className="card-content">
          <div className="form-group">
            <label className="form-label">Paste Job Description:</label>
            <textarea
              rows={10}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste the job description here..."
              className="textarea"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">3. Gemini Options</h2>
        </div>
        <div className="card-content">
          <div className="form-group">
            <label className="form-label">Model:</label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="gemini-2.5-flash"
              className="input-field"
              style={{ width: "300px" }}
            />
          </div>

          <div className="checkbox-wrapper">
            <input
              type="checkbox"
              id="strict-mode"
              className="checkbox-input"
              checked={strictMode}
              onChange={(e) => setStrictMode(e.target.checked)}
            />
            <label htmlFor="strict-mode" className="checkbox-label">
              Strict mode (no invented skills)
            </label>
          </div>

          <div className="btn-group" style={{ marginTop: "1.5rem" }}>
            <button onClick={getATSScore} className="btn btn-secondary">
              📊 Get ATS Score
            </button>
            <button onClick={tailorResume} className="btn btn-primary">
              🎯 Tailor Resume
            </button>
            {loading && <span className="loading">⏳ Processing...</span>}
          </div>
        </div>
      </div>

      {atsResult && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">📊 ATS Analysis Results</h2>
          </div>
          <div className="card-content">
            <div className="score-display">
              <div className="score-item">
                <span className="score-value">{atsResult.ats_score}/100</span>
                <span className="score-label">ATS Score</span>
              </div>
              <div className="score-item">
                <span className="score-value">{atsResult.keyword_match_score}/100</span>
                <span className="score-label">Keyword Match</span>
              </div>
            </div>

            <div className="keyword-grid">
              <div className="keyword-section">
                <h3 className="keyword-title">✅ Matches</h3>
                <ul className="keyword-list">
                  {(atsResult.matches?.slice(0, 30) || []).map((match, i) => (
                    <li key={i} className="keyword-item">{match}</li>
                  ))}
                </ul>
              </div>

              <div className="keyword-section">
                <h3 className="keyword-title">❌ Missing</h3>
                <ul className="keyword-list">
                  {(atsResult.missing?.slice(0, 30) || []).map((missing, i) => (
                    <li key={i} className="keyword-item">{missing}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {tailored && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">✨ Tailored Resume</h2>
          </div>
          <div className="card-content">
            <div className="tailored-content">
              <ReactMarkdown>{tailored.tailored_resume_markdown || ""}</ReactMarkdown>
            </div>

            <button onClick={downloadResume} className="btn btn-success" style={{ marginTop: "1.5rem" }}>
              📥 Download Tailored Resume (DOCX)
            </button>

            <div className="changelog-section">
              <h3 className="changelog-title">📝 Change Log</h3>
              <ul style={{ listStyle: "none", padding: 0 }}>
                {(tailored.change_log || []).map((change, i) => (
                  <li key={i} className="changelog-item">
                    <strong>{change.section}:</strong> {change.change}
                    <span className="changelog-reason">{change.reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="skills-section">
              <h3 className="skills-title">🎯 Missing Skills Recommended to Learn</h3>
              <div className="skills-list">
                {(tailored.missing_skills_recommended_to_learn || []).map((skill, i) => (
                  <span key={i} className="skill-tag">{skill}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
