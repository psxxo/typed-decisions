// Builds the plugin's native Control UI bundle.
//
// `openclaw plugins build` only serves the tool/feature scaffolds (it reads
// static tool metadata from the backend entry). This plugin is a provider
// plugin that ships a prebuilt browser bundle instead, which the manifest
// supports directly through `controlUi.entry` + `controlUi.styles`.
//
// Usage: node scripts/build-ui.mjs [--check]

import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(rootDir, "src", "control-ui.ts");
const manifestPath = join(rootDir, "openclaw.plugin.json");
const distDir = join(rootDir, "dist", "control-ui");
const check = process.argv.includes("--check");

const result = await build({
  entryPoints: [sourcePath],
  bundle: true,
  format: "esm",
  target: ["es2022"],
  platform: "browser",
  legalComments: "none",
  sourcemap: false,
  write: false,
  outdir: distDir,
  entryNames: "index",
  external: ["openclaw", "openclaw/*"],
});

const js = result.outputFiles.find((file) => file.path.endsWith(".js"));
const css = result.outputFiles.find((file) => file.path.endsWith(".css"));
if (!js) throw new Error("control-ui build produced no JavaScript entry");

const hash = createHash("sha256").update(js.contents).digest("hex").slice(0, 12);
const revisionDir = join(distDir, hash);
const entryRelative = `dist/control-ui/${hash}/index.js`;
const stylesRelative = css ? `dist/control-ui/${hash}/index.css` : undefined;

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const controlUi = {
  entry: entryRelative,
  ...(stylesRelative ? { styles: [stylesRelative] } : {}),
};
const current = manifest.controlUi;
const unchanged =
  current &&
  current.entry === controlUi.entry &&
  JSON.stringify(current.styles ?? []) === JSON.stringify(controlUi.styles ?? []) &&
  (await exists(join(rootDir, entryRelative)));

if (check && unchanged) {
  console.log(`control-ui up to date: ${entryRelative}`);
  process.exit(0);
}

if (!check) {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(revisionDir, { recursive: true });
  await writeFile(join(rootDir, entryRelative), js.contents);
  if (css && stylesRelative) await writeFile(join(rootDir, stylesRelative), css.contents);
  manifest.controlUi = controlUi;
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`control-ui bundled: ${entryRelative} (${js.contents.byteLength} bytes)`);
} else {
  console.log(`control-ui out of date: expected ${entryRelative}`);
  process.exit(1);
}

async function exists(path) {
  try {
    await readFile(path);
    return true;
  } catch {
    return false;
  }
}
