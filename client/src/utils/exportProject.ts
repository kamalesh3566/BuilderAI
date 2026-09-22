import { detectDependencies } from "./sandpackUtils";
import toast from "react-hot-toast";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Project } from "../types";

export async function exportProjectZip(project: Project | null): Promise<void> {
  if (!project) return;
  const toastId = toast.loading("Packaging project source code...");
  try {
    const { saveAs } = await import("file-saver");

    const zip = new JSZip();

    // Normalize files and detect dependencies from import statements
    const fileMap: Record<string, string> = {};
    for (const [path, content] of Object.entries(project.files || {})) {
      const fileCode = typeof content === "string" ? content : (content as any)?.content || "";
      fileMap[path] = fileCode;
    }
    const detectedDeps = detectDependencies(fileMap);

    // Safe package name
    const safeName =
      (project.name || "my-website")
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, "-")
        .replace(/^-+|-+$/g, "") || "my-website";

    // Add package.json
    zip.file(
      "package.json",
      JSON.stringify(
        {
          name: safeName,
          private: true,
          version: "0.1.0",
          type: "module",
          scripts: {
            dev: "vite",
            build: "vite build",
            preview: "vite preview",
          },
          dependencies: {
            react: "^18.2.0",
            "react-dom": "^18.2.0",
            ...detectedDeps,
          },
          devDependencies: {
            "@vitejs/plugin-react": "^4.2.0",
            vite: "^5.0.0",
            tailwindcss: "^3.4.0",
            autoprefixer: "^10.4.0",
            postcss: "^8.4.0",
          },
        },
        null,
        2
      )
    );

    // Add vite.config.js configured for JSX parsing in both .js and .jsx files
    zip.file(
      "vite.config.js",
      `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  esbuild: {
    loader: 'jsx',
    include: /src\\/.*\\.jsx?$/,
    exclude: [],
  },
  optimizeDeps: {
    esbuildOptions: {
      loader: {
        '.js': 'jsx',
      },
    },
  },
});
`
    );

    // Add index.html
    zip.file(
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${(project.name || "My Website").replace(/</g, "&lt;")}</title>
  <script src="https://cdn.tailwindcss.com"></script>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/index.jsx"></script>
</body>
</html>
`
    );

    // Add index.jsx entry
    zip.file(
      "src/index.jsx",
      `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')).render(<App />);
`
    );

    // Strict deny-list and path traversal defense
    const BLOCKED_PATTERNS = [
      /^\.env/i,
      /\.git/i,
      /credentials/i,
      /service-account/i,
      /id_rsa/i,
      /\.pem$/i,
      /\.key$/i,
      /\.npmrc/i,
      /token/i,
      /secret/i,
      /private_key/i,
    ];

    for (const [path, content] of Object.entries(fileMap)) {
      // Remove leading slashes and eliminate any ../ directory traversal components
      const sanitizedPath = path
        .replace(/^[\/\\]+/, "")
        .replace(/\.\.[\/\\]/g, "")
        .replace(/^[a-zA-Z]:[\/\\]/, "");

      const baseName = sanitizedPath.split(/[\/\\]/).pop()?.toLowerCase() || "";
      if (BLOCKED_PATTERNS.some((pattern) => pattern.test(baseName))) continue;

      if (sanitizedPath && !sanitizedPath.includes("\0")) {
        zip.file(`src/${sanitizedPath}`, content);
      }
    }

    const blob = await zip.generateAsync({ type: "blob" });
    const fileName = `${safeName}.zip`;
    saveAs(blob, fileName);
    toast.success(`Exported ${fileName} successfully!`, { id: toastId });
  } catch (error) {
    console.error("Export project error:", error);
    toast.error("Failed to export project ZIP archive", { id: toastId });
  }
}
