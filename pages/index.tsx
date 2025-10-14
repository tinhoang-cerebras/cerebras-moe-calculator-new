import { useState, useRef, useEffect, ChangeEvent } from "react";

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

const initialConfigTemplate = {
  name: "Default MoE Configuration",
  V: 32000,
  h: 4096,
  l: 32,
  a: 32,
  N: 8,
  f_mult: 1.25,
  s: 2048,
  top_k: 2,
  precision: "bfloat16"
};

export default function Home() {
  const [precision, setPrecision] = useState("bfloat16");
  const [config, setConfig] = useState<Config>(defaultConfig);
  const [memoryResult, setMemoryResult] = useState("");
  const [flopsResult, setFlopsResult] = useState("");
  const [loadingMemory, setLoadingMemory] = useState(false);
  const [loadingFlops, setLoadingFlops] = useState(false);
  const [error, setError] = useState("");
  const [showTemplate, setShowTemplate] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [copied, setCopied] = useState(false);

  // Editable JSON Template State
  const [configTemplate, setConfigTemplate] = useState<any>(initialConfigTemplate);
  const [editMode, setEditMode] = useState(false);
  const [editValue, setEditValue] = useState(JSON.stringify(initialConfigTemplate, null, 2));
  const [editError, setEditError] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Handle modal mount/unmount for animation
  useEffect(() => {
    if (showTemplate) {
      setModalVisible(true);
    } else if (modalVisible) {
      // Wait for animation before removing from DOM
      const timeout = setTimeout(() => {
        setModalVisible(false);
        setEditMode(false);
        setEditError("");
      }, 180);
      return () => clearTimeout(timeout);
    }
  }, [showTemplate, modalVisible]);

  // If template changes, update edit value
  useEffect(() => {
    setEditValue(JSON.stringify(configTemplate, null, 2));
  }, [configTemplate, showTemplate]);

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
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCalculate = async (operation: "memory" | "flops") => {
    if (operation === "memory") {
      setLoadingMemory(true);
      setFlopsResult(""); // Clear compute result when showing memory
    } else {
      setLoadingFlops(true);
      setMemoryResult(""); // Clear memory result when showing compute
    }
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

  const handleReset = () => {
    setConfig(defaultConfig);
    setPrecision("bfloat16");
    setMemoryResult("");
    setFlopsResult("");
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(editMode ? editValue : JSON.stringify(configTemplate, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1300);
  };

  const handleEdit = () => {
    setEditMode(true);
    setEditValue(JSON.stringify(configTemplate, null, 2));
    setEditError("");
  };

  const handleCancelEdit = () => {
    setEditMode(false);
    setEditError("");
    setEditValue(JSON.stringify(configTemplate, null, 2));
  };

  const handleSaveEdit = () => {
    try {
      const parsed = JSON.parse(editValue);
      setConfigTemplate(parsed);
      setEditMode(false);
      setEditError("");
    } catch (e) {
      setEditError("Invalid JSON format.");
    }
  };

  const handleDownload = () => {
    const dataStr = "data:application/json;charset=utf-8," + encodeURIComponent(editMode ? editValue : JSON.stringify(configTemplate, null, 2));
    const a = document.createElement("a");
    a.href = dataStr;
    a.download = "moe-config.json";
    document.body.appendChild(a);
    a.click();
    setTimeout(() => document.body.removeChild(a), 0);
  };

  // NEW: Reset the template in the modal (and cancel edit mode)
  const handleModalReset = () => {
    setConfigTemplate(initialConfigTemplate);
    setEditMode(false);
    setEditError("");
    setEditValue(JSON.stringify(initialConfigTemplate, null, 2));
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#fff",
        display: "flex",
        alignItems: "flex-start", // Top alignment
        justifyContent: "center",
        paddingTop: 0,
        paddingBottom: 0,
        fontFamily: "Inter, Segoe UI, Arial, sans-serif"
      }}
    >
      {/* Modal for JSON template with animation */}
      {modalVisible && (
        <div
          onClick={() => setShowTemplate(false)}
          style={{
            position: "fixed",
            zIndex: 100,
            inset: 0,
            background: "rgba(30, 41, 59, 0.38)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "opacity 180ms cubic-bezier(.4,0,.2,1)",
            opacity: showTemplate ? 1 : 0,
            pointerEvents: showTemplate ? "auto" : "none"
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 14,
              maxWidth: 500,
              width: "90vw",
              boxShadow: "0 4px 32px rgba(0,0,0,0.18)",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              border: "1px solid #e5e7eb",
              position: "relative",
              transform: showTemplate
                ? "scale(1) translateY(0px)"
                : "scale(0.96) translateY(18px)",
              opacity: showTemplate ? 1 : 0,
              transition:
                "opacity 180ms cubic-bezier(.4,0,.2,1), transform 180ms cubic-bezier(.4,0,.2,1)"
            }}
          >
            <h3 style={{ fontWeight: 600, fontSize: "1.15rem", marginBottom: "1rem", color: "#1e293b" }}>
              Config JSON Template
            </h3>
            {editMode ? (
              <>
                <textarea
                  value={editValue}
                  onChange={e => setEditValue(e.target.value)}
                  style={{
                    background: "#f9fafb",
                    color: "#22223b",
                    borderRadius: 8,
                    padding: "1rem",
                    fontSize: "0.97rem",
                    fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                    border: "1px solid #e5e7eb",
                    minHeight: 210,
                    resize: "vertical",
                    marginBottom: "1rem"
                  }}
                  rows={10}
                  spellCheck={false}
                  autoFocus
                />
                {editError && (
                  <div style={{ color: "#b91c1c", background: "#fee2e2", borderRadius: 8, fontWeight: 500, padding: "0.5rem", marginBottom: "1rem" }}>
                    {editError}
                  </div>
                )}
              </>
            ) : (
              <pre
                style={{
                  background: "#f9fafb",
                  color: "#22223b",
                  borderRadius: 8,
                  padding: "1rem",
                  fontSize: "0.97rem",
                  lineHeight: 1.5,
                  marginBottom: "1.5rem",
                  fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                  overflowX: "auto"
                }}
              >
                {JSON.stringify(configTemplate, null, 2)}
              </pre>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.5rem", marginTop: 2, flexWrap: 'wrap' }}>
              {!editMode && (
                <button
                  onClick={handleEdit}
                  style={{
                    border: "none",
                    borderRadius: 6,
                    padding: "0.5rem 1.2rem",
                    background: "linear-gradient(to bottom, #e5e7eb, #d1d5db)",
                    color: "#333",
                    fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                    fontWeight: 400,
                    cursor: "pointer",
                    fontSize: "1rem",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                    transition: "background 0.18s"
                  }}
                >
                  Edit
                </button>
              )}
              {editMode && (
                <>
                  <button
                    onClick={handleSaveEdit}
                    style={{
                      border: "none",
                      borderRadius: 6,
                      padding: "0.5rem 1.2rem",
                      background: "linear-gradient(to bottom, #e0fbe7, #a7f3d0)",
                      color: "#14532d",
                      fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                      fontWeight: 400,
                      cursor: "pointer",
                      fontSize: "1rem",
                      boxShadow: "0 2px 8px rgba(34,197,94,0.06)",
                      transition: "background 0.18s"
                    }}
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    style={{
                      border: "none",
                      borderRadius: 6,
                      padding: "0.5rem 1.2rem",
                      background: "linear-gradient(to bottom, #fee2e2, #fecaca)",
                      color: "#b91c1c",
                      fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                      fontWeight: 400,
                      cursor: "pointer",
                      fontSize: "1rem",
                      boxShadow: "0 2px 8px rgba(239,68,68,0.06)",
                      transition: "background 0.18s"
                    }}
                  >
                    Cancel
                  </button>
                </>
              )}
              <button
                onClick={handleCopy}
                style={{
                  border: "none",
                  borderRadius: 6,
                  padding: "0.5rem 1.2rem",
                  background: "linear-gradient(to bottom, #e5e7eb, #d1d5db)",
                  color: "#333",
                  fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                  fontWeight: 400,
                  cursor: "pointer",
                  fontSize: "1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "background 0.18s"
                }}
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                style={{
                  border: "none",
                  borderRadius: 6,
                  padding: "0.5rem 1.2rem",
                  background: "linear-gradient(to bottom, #e0e7ef, #cbd5e1)",
                  color: "#1e293b",
                  fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                  fontWeight: 400,
                  cursor: "pointer",
                  fontSize: "1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "background 0.18s"
                }}
              >
                Download
              </button>
              {/* NEW: Reset button */}
              <button
                onClick={handleModalReset}
                style={{
                  border: "none",
                  borderRadius: 6,
                  padding: "0.5rem 1.2rem",
                  background: "linear-gradient(to bottom, #fef9c3, #fde68a)",
                  color: "#92400e",
                  fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                  fontWeight: 400,
                  cursor: "pointer",
                  fontSize: "1rem",
                  boxShadow: "0 2px 8px rgba(202,138,4,0.06)",
                  transition: "background 0.18s"
                }}
                title="Reset config JSON template to default"
              >
                Reset
              </button>
              <button
                onClick={() => setShowTemplate(false)}
                style={{
                  border: "none",
                  borderRadius: 6,
                  padding: "0.5rem 1.2rem",
                  background: "linear-gradient(to bottom, #e5e7eb, #d1d5db)",
                  color: "#333",
                  fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
                  fontWeight: 400,
                  cursor: "pointer",
                  fontSize: "1rem",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
                  transition: "background 0.18s"
                }}
                autoFocus
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          background: "#fff",
          borderRadius: 20,
          border: "2px solid #e5e7eb",
          padding: "2.5rem 2.5rem",
          maxWidth: 400,
          width: "100%"
        }}
      >
        {/* Template Link */}
        <div style={{ marginBottom: 8 }}>
          <button
            type="button"
            onClick={() => setShowTemplate(true)}
            style={{
              border: "none",
              background: "none",
              color: "#2563eb",
              textDecoration: "underline",
              cursor: "pointer",
              fontSize: "1rem",
              padding: 0,
              margin: 0,
              fontWeight: 400
            }}
          >
            Show config JSON template
          </button>
        </div>

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
            {loadingMemory ? "Calculating..." : "How much memory do I need?"}
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
            {loadingFlops ? "Calculating..." : "How much compute do I need?"}
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

        {/* Reset Button */}
        <button
          type="button"
          onClick={handleReset}
          style={{
            marginTop: "2rem",
            width: "100%",
            padding: "0.75rem",
            borderRadius: 8,
            border: "none",
            background: "linear-gradient(to bottom, #f3f4f6 0%, #d1d5db 100%)",
            color: "#333",
            fontWeight: 400,
            fontSize: "1.08rem",
            fontFamily: "Menlo, Monaco, 'Liberation Mono', Consolas, monospace",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
            transition: "background 0.18s"
          }}
        >
          Reset
        </button>
      </div>
    </main>
  );
}
