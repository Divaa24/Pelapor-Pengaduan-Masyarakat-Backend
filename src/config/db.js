import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Build pool config with optional SSL support using DB_SSL_CERT
const poolConfig = {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};

// If a CA certificate is provided in env (escaped newlines), convert and attach it
if (process.env.DB_SSL_CERT) {
  const ca = process.env.DB_SSL_CERT.replace(/\\n/g, "\n");
  // By providing `ca` and setting rejectUnauthorized true, the client will verify the server cert
  poolConfig.ssl = {
    rejectUnauthorized:
      process.env.DB_SSL_MODE === "require" ||
      process.env.DB_SSL_MODE === "verify-full",
    ca,
  };
} else if (
  process.env.DB_SSL === "true" ||
  process.env.DB_SSL_MODE === "require"
) {
  // If SSL requested but no cert provided, enable SSL without CA (may accept system CAs)
  poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on("connect", () => console.log("✅ PostgreSQL connected"));
pool.on("error", (err) => {
  console.error("❌ DB error:", err.message);
  process.exit(1);
});

export default pool;
