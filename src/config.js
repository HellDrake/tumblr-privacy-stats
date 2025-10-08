export const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  trustProxy: process.env.TRUST_PROXY === "true" || false,
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "*")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "tpga_sid",
  sessionTtlMinutes: parseInt(process.env.SESSION_TTL_MINUTES || "30", 10),
  cookieSecure: process.env.COOKIE_SECURE === "true" || false,
  cookieSameSite: process.env.COOKIE_SAMESITE || "None",
  retentionDays: parseInt(process.env.RETENTION_DAYS || "90", 10),
  allowCountryOverride: process.env.ALLOW_COUNTRY_OVERRIDE === "true" || false,
  dataFile: process.env.DATA_FILE || "data/aggregates.json",
  storeBackend: process.env.STORE_BACKEND || "file" // 'file' | 'memory' | future: 'kv' | 'pg'
};

