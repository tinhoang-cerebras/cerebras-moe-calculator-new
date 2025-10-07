import { useState, ChangeEvent, FormEvent } from "react";

type Config = {
  V: number;
  h: number;
  l: number;
  a: number;
  N: number;
  f_mult: number;
  s: number;
  top_k: number;
};

const defaultConfig: Config = {
  V: 32000,
  h: 4096,
  l: 32,
  a: 32,
  N: 8,
  f_mult: 1.25,
  s: 2048,
  top_k: 2,
};

const PRECISIONS = [
  "float32",
  "bfloat16",
  "float16",
  "int8",
  "int4",
];

export default function Home() {
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [precision, setPrecision] = useState("bfloat16");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleConfigChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setConfig((prev) => ({
      ...prev,
      [name]: name === "f_mult" ? parseFloat(value) : parseInt(value),
    }));
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        const loadedConfig: Config = { ...defaultConfig, ...parsed };
        setConfig(loadedConfig);
        setError("");
      } catch {
        setError("Invalid JSON configuration file.");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult("");
    setError("");
    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, precision }),
      });
      const data = await res.json();
      if (data.result) setResult(data.result);
      else setError("Error: " + (data.error || "Unknown error"));
    } catch (err) {
      setError("Failed to fetch results.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #e0e7ef 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "Inter, Segoe UI, Arial, sans-serif"
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          boxShadow: "0 4px 32px rgba(0,0,0,0.07)",
          padding: "2.5rem 2.5rem",
          maxWidth: 800,
          width: "100%"
        }}
      >
        <h1 style={{
          fontSize: "2rem",
          fontWeight: 700,
          marginBottom: 8,
          color: "#2e3548"
        }}>
          MoE Memory Calculator
        </h1>
        <p style={{ color: "#6b7280", marginBottom: "1.5rem" }}>
          Estimate memory & compute for Mixture-of-Experts models.
        </p>
        <label style={{ marginBottom: 12, display: "block", fontWeight: 500 }}>
          <span style={{ fontSize: "0.97rem" }}>Load your config file (JSON):</span>
          <input
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            style={{
              marginTop: 6,
              display: "block",
              fontSize: "1rem"
            }}
          />
        </label>
        <form
          onSubmit={handleSubmit}
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem 2rem",
            marginTop: "1rem"
          }}
        >
          {/* Precision at the top, span both columns */}
          <label style={{ fontWeight: 500, gridColumn: "1 / span 2" }}>
            Precision:
            <select
              value={precision}
              onChange={e => setPrecision(e.target.value)}
              style={{
                marginTop: 4,
                padding: "0.5rem",
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                fontSize: "1rem",
                width: "100%"
              }}
            >
              {PRECISIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </label>
          {/* All other fields, 2 per row */}
          {([
            { label: "Vocab Size (V):", name: "V", type: "number" },
            { label: "Hidden Size (h):", name: "h", type: "number" },
            { label: "Num Layers (l):", name: "l", type: "number" },
            { label: "Attention Heads (a):", name: "a", type: "number" },
            { label: "Num Experts (N):", name: "N", type: "number" },
            { label: "Expert Multiplier (f_mult):", name: "f_mult", type: "number", step: "0.01" },
            { label: "Sequence Length (s):", name: "s", type: "number" },
            { label: "Top K:", name: "top_k", type: "number" }
          ] as const).map(field => {
            const key = field.name as keyof Config;
            return (
              <label key={field.name} style={{ fontWeight: 500 }}>
                {field.label}
                <input
                  type={field.type}
                  name={field.name}
                  value={config[key]}
                  onChange={handleConfigChange}
                  {...("step" in field ? { step: field.step } : {})}
                  style={{
                    marginTop: 4,
                    width: "100%",
                    padding: "0.5rem",
                    borderRadius: 8,
                    border: "1px solid #e5e7eb",
                    background: "#f9fafb",
                    fontSize: "1rem"
                  }}
                />
              </label>
            );
          })}
          {/* Calculate button spans both columns */}
          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8,
              padding: "0.75rem",
              borderRadius: 8,
              border: "none",
              background: loading ? "#cbd5e1" : "#2563eb",
              color: "#fff",
              fontWeight: 600,
              fontSize: "1.08rem",
              cursor: loading ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,.06)",
              transition: "background 0.18s",
              gridColumn: "1 / span 2"
            }}
          >
            {loading ? "Calculating..." : "Calculate"}
          </button>
        </form>
        {error && (
          <div style={{
            color: "#b91c1c",
            background: "#fee2e2",
            borderRadius: 8,
            padding: "0.75rem",
            marginTop: 18,
            fontWeight: 500
          }}>
            {error}
          </div>
        )}
        {result && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              padding: "1.5rem",
              marginTop: "2rem",
              color: "#264653",
              fontSize: "1.07rem",
              fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              border: "1px solid #e5e7eb",
              maxWidth: "100%",
              overflowX: "auto",
              boxSizing: "border-box",
              minWidth: 0,
            }}
          >
            {/* Remove lines with only "====..." for a cleaner look */}
            {result
              .split('\n')
              .filter(line => !/^=+$/.test(line.trim()))
              .join('\n')
            }
          </div>
        )}
      </div>
    </main>
  );
}
