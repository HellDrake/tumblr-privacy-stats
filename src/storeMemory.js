function dateKey(date = new Date()) {
  const d = new Date(date.toISOString().slice(0, 10));
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export class MemoryAggregateStore {
  constructor() {
    this.state = { days: {} };
    this.retentionDays = 90;
  }

  increment(country, type, when = new Date()) {
    const key = dateKey(when);
    if (!this.state.days[key]) this.state.days[key] = { views: {}, asks: {} };
    const bucket = this.state.days[key];
    const target = type === "ask" ? bucket.asks : bucket.views;
    target[country] = (target[country] || 0) + 1;
    this.prune();
  }

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
    const cutoff = new Date();
    cutoff.setUTCDate(cutoff.getUTCDate() - this.retentionDays);
    const keepFrom = dateKey(cutoff);
    const keys = Object.keys(this.state.days || {});
    for (const k of keys) {
      if (k < keepFrom) delete this.state.days[k];
    }
  }
}

