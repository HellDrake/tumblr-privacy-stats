import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import { v4 as uuidv4 } from "uuid";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "./config.js";
import { countryFromRequest } from "./geo.js";
import { AggregateStore } from "./store.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const app = express();
if (config.trustProxy) app.set("trust proxy", 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false
}));
app.use(express.json({ limit: "5kb" }));
app.use(express.urlencoded({ extended: false, limit: "5kb" }));
app.use(cookieParser());

const allowAll = config.allowedOrigins.includes("*");
app.use(cors({
  origin: (origin, cb) => {
    if (allowAll || !origin) return cb(null, true);
    if (config.allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error("Origin not allowed"));
  },
  credentials: true
}));

app.use("/", express.static(path.join(__dirname, "../public"), {
  etag: true,
  maxAge: "7d"
}));

const DEDUP_TTL_MS = config.sessionTtlMinutes * 60 * 1000;
const dedup = new Map();
function cleanupDedup() {
  const now = Date.now();
  for (const [k, exp] of dedup.entries()) {
    if (exp <= now) dedup.delete(k);
  }
}
setInterval(cleanupDedup, Math.min(DEDUP_TTL_MS, 5 * 60 * 1000)).unref();

const store = new AggregateStore();

app.get("/health", (req, res) => res.json({ ok: true }));

function getOrSetSessionId(req, res) {
  let sid = req.cookies[config.sessionCookieName];
  if (!sid) {
    sid = uuidv4();
    res.cookie(config.sessionCookieName, sid, {
      httpOnly: true,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      maxAge: DEDUP_TTL_MS,
      path: "/"
    });
  }
  return sid;
}

app.get("/session/clear", (req, res) => {
  res.clearCookie(config.sessionCookieName, {
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    path: "/"
  });
  res.json({ cleared: true });
});

app.post("/collect", (req, res) => {
  const { type = "view", page = "", vp = undefined } = req.body || {};
  const eventType = type === "ask" ? "ask" : "view";
  const pagePath = typeof page === "string" ? page.slice(0, 300) : "";
  if (vp && typeof vp === "object") {
    const w = Number(vp.w), h = Number(vp.h);
    if (!(Number.isFinite(w) && Number.isFinite(h))) {
      return res.status(400).json({ error: "invalid viewport" });
    }
  }

  const country = countryFromRequest(req) || "ZZ";
  const sid = getOrSetSessionId(req, res);

  const key = `${sid}|${eventType}|${pagePath}`;
  const now = Date.now();
  const seen = dedup.get(key);
  if (!seen || seen <= now) {
    dedup.set(key, now + DEDUP_TTL_MS);
    store.increment(country, eventType, new Date());
  }

  res.status(204).end();
});

app.get("/stats", (req, res) => {
  const day = store.totalsForDays(1);
  const week = store.totalsForDays(7);
  const month = store.totalsForDays(30);
  res.json({ updatedAt: new Date().toISOString(), periods: { day, week, month } });
});

