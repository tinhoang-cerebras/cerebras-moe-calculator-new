import { useState, useRef, ChangeEvent } from "react";

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
  const [precision, setPrecision] = useState("bfloat16");
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [memoryResult, setMemoryResult] = useState("");
  const [flopsResult, setFlopsResult] = useState("");
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [loadingFlops, setLoadingFlops] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      const event = { target: { files: [file] } } as unknown as ChangeEvent<HTMLInputElement>;
      handleFileChange(event);
    }
  };

  const handleCalculate = async (operation: "memory" | "flops") => {
    if (operation === "memory") setLoadingMemory(true);
    else setLoadingFlops(true);
    setError("");
    try {
      const res = await fetch("/api/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config, precision, operation })
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

        {/* Dropzone File Upload */}
        <label
          style={{
            display: "block",
            fontWeight: 500,
            marginBottom: 24
          }}
        >
          <div
            style={{
              border: "2px dashed #d1d5db",
              borderRadius: 12,
              padding: "2rem",
              textAlign: "center",
              background: "#f9fafb",
              cursor: "pointer",
              transition: "border-color 0.2s",
              color: "#374151",
              fontSize: "1rem"
            }}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={e => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={handleDrop}
            tabIndex={0}
            onKeyPress={e => {
              if (e.key === "Enter" || e.key === " ") {
                fileInputRef.current?.click();
              }
            }}
          >
            <span style={{
              color: "#6b7280",
              fontWeight: 400
            }}>
              Drop your config file or "click" to choose file
            </span>
            <br />
            <span style={{ fontSize: "0.97rem", color: "#6b7280" }}>
              (JSON config file)
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              style={{
                display: "none"
              }}
              tabIndex={-1}
            />
          </div>
        </label>

        {/* New Text Between Upload and Precision */}
        <div style={{
          textAlign: 'center',
          color: '#6b7280',
          marginBottom: 10,
          marginTop: -10,
          fontSize: "1rem"
        }}>
          or select a precision below
        </div>

        {/* Precision Dropdown */}
        <label style={{ fontWeight: 500, display: "block", margin: "16px 0" }}>
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

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "1rem", marginTop: 24 }}>
          <button
            type="button"
            disabled={loadingMemory}
            onClick={() => handleCalculate("memory")}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 8,
              border: "none",
              background: loadingMemory
                ? "linear-gradient(to bottom, #e5e7eb, #d1d5db)"
                : "linear-gradient(to bottom, #e5e7eb 0%, #d1d5db 100%)",
              color: "#333",
              fontWeight: 400,
              fontSize: "1.08rem",
              fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
              cursor: loadingMemory ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(37,99,235,.06)",
              transition: "background 0.18s"
            }}
          >
            {loadingMemory ? "Calculating..." : "How much memory do I need"}
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
              background: loadingFlops
                ? "linear-gradient(to bottom, #e5e7eb, #d1d5db)"
                : "linear-gradient(to bottom, #e5e7eb 0%, #d1d5db 100%)",
              color: "#333",
              fontWeight: 400,
              fontSize: "1.08rem",
              fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
              cursor: loadingFlops ? "not-allowed" : "pointer",
              boxShadow: "0 2px 8px rgba(16,185,129,.09)",
              transition: "background 0.18s"
            }}
          >
            {loadingFlops ? "Calculating..." : "How fast will it run"}
          </button>
        </div>
        {/* Error */}
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
        {/* Memory Result */}
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
        {/* FLOPs Result */}
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
