import { cp, mkdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const standalone = resolve(root, ".next", "standalone");
const staticOutput = resolve(standalone, ".next", "static");

await mkdir(resolve(standalone, ".next"), { recursive: true });
await Promise.all([
  cp(resolve(root, ".next", "static"), staticOutput, { recursive: true }),
  cp(resolve(root, "public"), resolve(standalone, "public"), { recursive: true }),
]);
