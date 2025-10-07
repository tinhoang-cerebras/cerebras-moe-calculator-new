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
        // Only use keys relevant to config
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
    <main style={{maxWidth: 600, margin: "2rem auto", fontFamily: "sans-serif"}}>
      <h1>MoE Memory Calculator</h1>
      <label>
        <b>Load Config File (JSON): </b>
        <input
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          style={{marginBottom: "1rem"}}
        />
      </label>
<form onSubmit={handleSubmit} style={{display: "grid", gap: "1rem", marginTop: "1rem"}}>
  <label>
    Precision:
    <select value={precision} onChange={e => setPrecision(e.target.value)}>
      {PRECISIONS.map(p => <option key={p} value={p}>{p}</option>)}
    </select>
  </label>
  <label>
    Vocab Size (V): <input type="number" name="V" value={config.V} onChange={handleConfigChange} />
  </label>
  <label>
    Hidden Size (h): <input type="number" name="h" value={config.h} onChange={handleConfigChange} />
  </label>
  <label>
    Num Layers (l): <input type="number" name="l" value={config.l} onChange={handleConfigChange} />
  </label>
  <label>
    Attention Heads (a): <input type="number" name="a" value={config.a} onChange={handleConfigChange} />
  </label>
  <label>
    Num Experts (N): <input type="number" name="N" value={config.N} onChange={handleConfigChange} />
  </label>
  <label>
    Expert Multiplier (f_mult): <input type="number" step="0.01" name="f_mult" value={config.f_mult} onChange={handleConfigChange} />
  </label>
  <label>
    Sequence Length (s): <input type="number" name="s" value={config.s} onChange={handleConfigChange} />
  </label>
  <label>
    Top K: <input type="number" name="top_k" value={config.top_k} onChange={handleConfigChange} />
  </label>
  <button type="submit" disabled={loading}>{loading ? "Calculating..." : "Calculate"}</button>
</form>
      {error && <div style={{color: "red", marginTop: "1rem"}}>{error}</div>}
      <pre style={{marginTop:"2rem", whiteSpace:"pre-wrap", background:"#eee", padding:"1rem", borderRadius:8}}>
        {result}
      </pre>
    </main>
  );
}
