import geoip from "geoip-lite";
import { config } from "./config.js";

// Returns a 2-letter ISO country code, or 'ZZ' for unknown.
export function countryFromRequest(req) {
  // Optional override for testing or controlled environments
  if (config.allowCountryOverride) {
    const override = req.header("X-Country-Override");
    if (override && /^[A-Z]{2}$/.test(override)) return override;
  }

  // Prefer X-Forwarded-For when behind proxies (only if trustProxy enabled)
  let ip = undefined;
  if (req.app.get("trust proxy")) {
    const xff = req.headers["x-forwarded-for"]; // may be list
    if (typeof xff === "string") ip = xff.split(",")[0].trim();
    else if (Array.isArray(xff)) ip = xff[0];
  }
  // Fallback to remoteAddress
  if (!ip) {
    ip = req.socket?.remoteAddress || req.connection?.remoteAddress || "";
  }

  // Map IPv6-mapped IPv4 ::ffff:1.2.3.4
  if (ip.startsWith("::ffff:")) ip = ip.substring(7);

  // Geolocate in-memory; do not persist IP anywhere
  let country = "ZZ";
  try {
    const lookup = geoip.lookup(ip);
    if (lookup && lookup.country) {
      country = lookup.country;
    }
  } catch (_) {
    // silently ignore
  }

  // Explicitly drop the ip variable reference
  ip = undefined; // ensure not used beyond this point
  return country || "ZZ";
}

