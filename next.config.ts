import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "exceljs",
    "xlsx",
    "@supabase/supabase-js",
  ],
  poweredByHeader: false,
};

export default nextConfig;
