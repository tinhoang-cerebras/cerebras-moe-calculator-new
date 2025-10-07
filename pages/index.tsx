import { useState, ChangeEvent, FormEvent } from "react";

const PRECISIONS = [
  "float32",
  "bfloat16",
  "float16",
  "int8",
  "int4",
];

export default function Home() {
  const [precision, setPrecision] = useState("bfloat16");
  const [memoryResult, setMemoryResult] = useState("");
  const [flopsResult, setFlopsResult] = useState("");
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [loadingFlops, setLoadingFlops] = useState(false);
  const [error, setError] = useState("");

  const handleCalculate = async (operation: "memory" | "flops") => {
    if (operation === "memory") setLoadingMemory(true);
    else setLoadingFlops(true);
    setError("");
    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ precision, operation })
      });
      const data = await res.json();
      if (data.error) {
        setError("Error: " + data.error);
        if (operation === "memory") setMemoryResult("");
        else setFlopsResult("");
      } else {
        if (operation === "memory") setMemoryResult(data.result || "");
        else setFlopsResult(data.result || "");
      }
    } catch (err) {
      setError("Failed to fetch results.");
    } finally {
      setLoadingMemory(false);
      setLoadingFlops(false);
    }
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff",
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
          maxWidth: 400,
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
        <form
          onSubmit={(e) => e.preventDefault()}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            marginTop: "1rem"
          }}
        >
          <label style={{ fontWeight: 500 }}>
            Precision:
            <select
              value={precision}
              onChange={e => setPrecision(e.target.value)}
              style={{
                marginTop: 8,
                padding: "0.6rem",
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
          <div style={{ display: "flex", gap: "1rem" }}>
            <button
              type="button"
              disabled={loadingMemory}
              onClick={() => handleCalculate("memory")}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: 8,
                border: "none",
                background: loadingMemory ? "#cbd5e1" : "#2563eb",
                color: "#fff",
                fontWeight: 600,
                fontSize: "1.08rem",
                cursor: loadingMemory ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(37,99,235,.06)",
                transition: "background 0.18s"
              }}
            >
              {loadingMemory ? "Calculating..." : "Calculate Memory"}
            </button>
            <button
              type="button"
              disabled={loadingFlops}
              onClick={() => handleCalculate("flops")}
              style={{
                flex: 1,
                padding: "0.75rem",
                borderRadius: 8,
                border: "none",
                background: loadingFlops ? "#cbd5e1" : "#10b981",
                color: "#fff",
                fontWeight: 600,
                fontSize: "1.08rem",
                cursor: loadingFlops ? "not-allowed" : "pointer",
                boxShadow: "0 2px 8px rgba(16,185,129,.09)",
                transition: "background 0.18s"
              }}
            >
              {loadingFlops ? "Calculating..." : "Calculate FLOPs"}
            </button>
          </div>
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
        {memoryResult && (
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
            {memoryResult
              .split('\n')
              .filter(line => !/^=+$/.test(line.trim()))
              .join('\n')}
          </div>
        )}
        {flopsResult && (
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
              padding: "1.5rem",
              marginTop: "2rem",
              color: "#14532d",
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
            {flopsResult
              .split('\n')
              .filter(line => !/^=+$/.test(line.trim()))
              .join('\n')}
          </div>
        )}
      </div>
    </main>
  );
}
