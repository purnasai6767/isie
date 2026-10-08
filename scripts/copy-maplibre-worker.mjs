import { copyFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const publicDirectory = resolve(root, "public");

await mkdir(publicDirectory, { recursive: true });
await copyFile(
  resolve(root, "node_modules", "maplibre-gl", "dist", "maplibre-gl-worker.mjs"),
  resolve(publicDirectory, "maplibre-gl-worker.mjs")
);
