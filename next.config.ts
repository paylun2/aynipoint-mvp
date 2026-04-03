import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Anti-Clickjacking: bloquea que otros sitios incrusten AyniPoint en un iframe
          { key: 'X-Frame-Options', value: 'DENY' },
          // Anti-MIME-Sniffing: evita que el navegador adivine el tipo de archivo
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          // Control de información en el header Referer
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          // Habilita prefetch DNS para mejorar rendimiento
          { key: 'X-DNS-Prefetch-Control', value: 'on' },
          // Deshabilita APIs del navegador que no usamos (reduce superficie de ataque)
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
