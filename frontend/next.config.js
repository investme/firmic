import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    "192.168.56.1",
    "100.125.142.233",
    "localhost",
  ],

  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;