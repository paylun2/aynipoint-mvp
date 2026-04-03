import type { Config } from "tailwindcss";

export default {
    darkMode: "class",
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                "primary": "#0f1729",
                "primary-b2b": "#f69f09",
                "accent": "#F59E0B",
                "background-light": "#f8f7f5",
                "background-dark": "#0f172a",
                "navy-light": "#1f232e",
                "navy-900": "#0f172a",
                "navy-800": "#1e293b",
                "navy-700": "#334155",
                "slate-custom": "#3e475b"
            },
            fontFamily: {
                "display": ["Inter", "sans-serif"],
                "mono": ["JetBrains Mono", "monospace"]
            },
            borderRadius: {
                "DEFAULT": "0.25rem",
                "lg": "0.5rem",
                "xl": "0.75rem",
                "full": "9999px"
            },
        },
    },
    plugins: [],
} satisfies Config;
