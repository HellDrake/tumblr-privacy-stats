import fs from "fs";
import path from "path";
import { config } from "./config.js";

function ensureDir(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJsonSafe(file) {
  try {
    if (!fs.existsSync(file)) return { days: {} };
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw || "{\"days\":{}}") || { days: {} };
  } catch (_) {
    return { days: {} };
  }
}

function writeJsonAtomic(file, data) {
  ensureDir(file);
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file);
}

function dateKey(date = new Date()) {
  // YYYY-MM-DD in UTC
  const d = new Date(date.toISOString().slice(0, 10));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export class AggregateStore {
  constructor(file = config.dataFile) {
    this.file = file;
    this.state = readJsonSafe(this.file);
    if (!this.state.days) this.state.days = {};
    this.retentionDays = config.retentionDays;
  }

  increment(country, type, when = new Date()) {
    const key = dateKey(when);
    if (!this.state.days[key]) {
      this.state.days[key] = { views: {}, asks: {} };
    }
    const bucket = this.state.days[key];
    const target = type === "ask" ? bucket.asks : bucket.views;
    target[country] = (target[country] || 0) + 1;

    this.prune();
    writeJsonAtomic(this.file, this.state);
  }

  // Returns aggregated counts for last N days inclusive
  totalsForDays(daysBack) {
    const acc = { views: {}, asks: {} };
    const now = new Date();
    for (let i = 0; i < daysBack; i++) {
      const d = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() - i
      ));
      const key = dateKey(d);
      const bucket = this.state.days[key];
      if (!bucket) continue;
      for (const [cc, count] of Object.entries(bucket.views || {})) {
        acc.views[cc] = (acc.views[cc] || 0) + count;
      }
      for (const [cc, count] of Object.entries(bucket.asks || {})) {
        acc.asks[cc] = (acc.asks[cc] || 0) + count;
      }
    }
    return acc;
  }

  prune() {
    if (!this.retentionDays || this.retentionDays <= 0) return;
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - this.retentionDays);
    const keepFrom = dateKey(cutoff);
    const keys = Object.keys(this.state.days || {});
    for (const k of keys) {
      if (k < keepFrom) delete this.state.days[k];
    }
  }
}

