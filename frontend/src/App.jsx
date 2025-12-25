import { useState } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

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

  return (
    <div style={{ maxWidth: 1000, margin: "30px auto", fontFamily: "Arial" }}>
      <h2>Resume ATS + Tailor (Gemini)</h2>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8 }}>
        <h3>1) Upload Resume</h3>
        <input
          type="file"
          accept=".pdf,.docx"
          onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
        />
        <button onClick={parseResume} style={{ marginLeft: 10 }}>
          Parse Resume
        </button>

        <div style={{ marginTop: 12 }}>
          <textarea
            rows={8}
            value={resumeText}
            onChange={(e) => setResumeText(e.target.value)}
            placeholder="Resume text appears here after parsing."
            style={{ width: "100%" }}
          />
        </div>
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginTop: 16 }}>
        <h3>2) Job Description</h3>
        <textarea
          rows={10}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste job description here..."
          style={{ width: "100%" }}
        />
      </div>

      <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginTop: 16 }}>
        <h3>3) Gemini Options</h3>

        <label>Model: </label>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          style={{ width: 250 }}
          placeholder="gemini-1.5-flash"
        />

        <label style={{ marginLeft: 12 }}>
          <input
            type="checkbox"
            checked={strictMode}
            onChange={(e) => setStrictMode(e.target.checked)}
          />
          Strict mode (no invented skills)
        </label>

        <div style={{ marginTop: 12 }}>
          <button onClick={getATSScore}>Get ATS Score</button>
          <button onClick={tailorResume} style={{ marginLeft: 10 }}>
            Tailor Resume
          </button>

          {loading && <span style={{ marginLeft: 12 }}>Working...</span>}
        </div>
      </div>

      {atsResult && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginTop: 16 }}>
          <h3>ATS Result</h3>
          <p><b>ATS Score:</b> {atsResult.ats_score}/100</p>
          <p><b>Keyword Match:</b> {atsResult.keyword_match_score}/100</p>

          <div style={{ display: "flex", gap: 20 }}>
            <div style={{ flex: 1 }}>
              <h4>Matches</h4>
              <ul>
                {atsResult.matches?.slice(0, 30).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>

            <div style={{ flex: 1 }}>
              <h4>Missing</h4>
              <ul>
                {atsResult.missing?.slice(0, 30).map((x, i) => <li key={i}>{x}</li>)}
              </ul>
            </div>
          </div>
        </div>
      )}

      {tailored && (
        <div style={{ padding: 12, border: "1px solid #ddd", borderRadius: 8, marginTop: 16 }}>
          <h3>Tailored Resume</h3>
          <ReactMarkdown>{tailored.tailored_resume_markdown || ""}</ReactMarkdown>

          <h4 style={{ marginTop: 20 }}>Change Log</h4>
          <ul>
            {(tailored.change_log || []).map((c, i) => (
              <li key={i}>
                <b>{c.section}:</b> {c.change}
                <br />
                <i>{c.reason}</i>
              </li>
            ))}
          </ul>

          <h4>Missing skills recommended to learn</h4>
          <ul>
            {(tailored.missing_skills_recommended_to_learn || []).map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
