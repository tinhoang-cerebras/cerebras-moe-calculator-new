// This file should be placed in your Next.js project's pages/api directory.

import type { NextApiRequest, NextApiResponse } from "next";

const PRECISION_BYTES: Record<string, number> = {
  float32: 4,
  bfloat16: 2,
  float16: 2,
  int8: 1,
  int4: 0.5,
};

type PrecisionType = keyof typeof PRECISION_BYTES;

interface MoEConfig {
  V: number;
  h: number;
  l: number;
  a: number;
  N: number;
  f_mult: number;
  s: number;
  top_k: number;
}

function getDefaultConfig(): MoEConfig {
  return {
    V: 32000,
    h: 4096,
    l: 32,
    a: 32,
    N: 8,
    f_mult: 1.25,
    s: 2048,
    top_k: 2,
  };
}

class MoEMemoryCalculator {
  config: MoEConfig;
  precision: PrecisionType;
  bytes_per_param: number;

  constructor(config: MoEConfig, precision: PrecisionType) {
    this.config = config;
    this.precision = precision;
    this.bytes_per_param = PRECISION_BYTES[precision];
  }

  calculate_embedding_weights() {
    const { V, h } = this.config;
    const k = this.bytes_per_param;
    return 2 * k * V * h;
  }

  calculate_ln_weights() {
    const { h } = this.config;
    const k = this.bytes_per_param;
    return 4 * k * h;
  }

  calculate_attention_weights() {
    const { h } = this.config;
    const k = this.bytes_per_param;
    return 4 * k * h * (h + 1);
  }

  calculate_router_weights() {
    const { N, h } = this.config;
    const k = this.bytes_per_param;
    return k * N * (h + 1);
  }

  calculate_moe_layer_weights() {
    const { N, h, f_mult } = this.config;
    const k = this.bytes_per_param;
    return k * N * h * (3 * f_mult * h + 2 * f_mult + 1);
  }

  calculate_decoder_weights() {
    return (
      this.calculate_ln_weights() +
      this.calculate_attention_weights() +
      this.calculate_router_weights() +
      this.calculate_moe_layer_weights()
    );
  }

  calculate_model_weights() {
    const { l } = this.config;
    return this.calculate_embedding_weights() + l * this.calculate_decoder_weights();
  }

  calculate_kv_cache() {
    const { l, s, h } = this.config;
    const k = this.bytes_per_param;
    return 2 * k * l * s * h;
  }

  // FLOPs calculations
  calculate_embedding_flops() {
    const { s, V, h } = this.config;
    return 4 * s * V * h;
  }

  calculate_ln_flops() {
    const { s, h } = this.config;
    return 14 * s * h;
  }

  calculate_attention_flops() {
    const { s, h, a } = this.config;
    return s * (8 * h ** 2 + 4 * s * h + 3 * s * a);
  }

  calculate_rope_flops() {
    const { h } = this.config;
    return 0.75 * h;
  }

  calculate_router_flops() {
    const { s, N, h } = this.config;
    return s * N * (2 * h + 3);
  }

  calculate_moe_layer_flops() {
    const { top_k, s, f_mult, h } = this.config;
    return 2 * top_k * s * f_mult * h * (4 * h + 3);
  }

  calculate_linear_layer_flops() {
    const { s, V, h } = this.config;
    return 2 * s * V * h;
  }

  calculate_decoder_flops() {
    return (
      this.calculate_ln_flops() +
      this.calculate_attention_flops() +
      this.calculate_rope_flops() +
      this.calculate_router_flops() +
      this.calculate_moe_layer_flops()
    );
  }

  calculate_prefill_flops() {
    const { l } = this.config;
    return this.calculate_embedding_flops() + l * this.calculate_decoder_flops();
  }

  calculate_attention_flops_decode() {
    const { s, h, a } = this.config;
    return 8 * h ** 2 + 4 * s * h + 3 * s * a;
  }

  calculate_decoder_flops_decode() {
    const orig_s = this.config.s;
    this.config.s = 1;
    const ln = this.calculate_ln_flops();
    const rope = this.calculate_rope_flops();
    const router = this.calculate_router_flops();
    const moe_layer = this.calculate_moe_layer_flops();
    this.config.s = orig_s;
    const attention = this.calculate_attention_flops_decode();
    return ln + attention + rope + router + moe_layer;
  }

  calculate_decode_flops() {
    const orig_s = this.config.s;
    this.config.s = 1;
    const embedding = this.calculate_embedding_flops();
    this.config.s = orig_s;
    const { l } = this.config;
    const decoder = this.calculate_decoder_flops_decode();
    return embedding + l * decoder;
  }

  calculate_total() {
    const weights_bytes = this.calculate_model_weights();
    const kv_cache_bytes = this.calculate_kv_cache();
    const total_bytes = weights_bytes + kv_cache_bytes;

    const prefill_flops = this.calculate_prefill_flops();
    const decode_flops = this.calculate_decode_flops();

    const bytes_to_gb = 1024 ** 3;

    return {
      weights_gb: weights_bytes / bytes_to_gb,
      kv_cache_gb: kv_cache_bytes / bytes_to_gb,
      total_gb: total_bytes / bytes_to_gb,
      weights_bytes,
      kv_cache_bytes,
      total_bytes,
      prefill_flops,
      decode_flops,
      precision: this.precision,
    };
  }
}

function formatResult(metrics: ReturnType<MoEMemoryCalculator["calculate_total"]>) {
  const prefill_tflops = metrics.prefill_flops / 1e12;
  const decode_tflops = metrics.decode_flops / 1e12;

  return `
Memory Requirements for MoE Model

Precision: ${metrics.precision}
Model Weights: ${metrics.weights_gb.toFixed(2)} GB
KV-Cache: ${metrics.kv_cache_gb.toFixed(2)} GB

TOTAL MEMORY NEEDED: ${metrics.total_gb.toFixed(2)} GB!

FLOPs Requirements

Prefill FLOPs: ${prefill_tflops.toFixed(2)} TFLOPs
Decode FLOPs (per token): ${decode_tflops.toFixed(6)} TFLOPs

`;
}

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const config: MoEConfig = {
    ...getDefaultConfig(),
    ...(req.body.config || {}),
  };
  const precision: PrecisionType =
    req.body.precision in PRECISION_BYTES
      ? req.body.precision
      : "bfloat16";

  try {
    const calculator = new MoEMemoryCalculator(config, precision);
    const metrics = calculator.calculate_total();
    res.status(200).json({
      result: formatResult(metrics),
      metrics,
    });
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
