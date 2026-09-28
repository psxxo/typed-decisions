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
import { existsSync, readdirSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = join(rootDir, "src", "control-ui.ts");
const manifestPath = join(rootDir, "openclaw.plugin.json");
const distDir = join(rootDir, "dist", "control-ui");
const check = process.argv.includes("--check");

// The browser bundle must be self-contained: this host serves user-installed
// plugin UI without an import map, so a bare `openclaw/plugin-sdk/...` import
// fails at module resolution and the plugin never activates (observed:
// 'Failed to resolve module specifier "openclaw/plugin-sdk/control-ui"').
// Inline the host's own SDK modules instead of marking them external.
const sdkDir = resolveSdkDir();
const alias = {};
if (sdkDir) {
  for (const name of readdirSync(sdkDir)) {
    if (name.endsWith(".js")) alias[`openclaw/plugin-sdk/${name.slice(0, -3)}`] = join(sdkDir, name);
  }
}

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
  alias,
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

function resolveSdkDir() {
  const require = createRequire(import.meta.url);
  const candidates = [];
  try {
    candidates.push(join(dirname(require.resolve("openclaw/package.json")), "dist", "plugin-sdk"));
  } catch {
    // not resolvable from the checkout; fall through to known locations
  }
  candidates.push(join(dirname(process.execPath), "..", "lib", "node_modules", "openclaw", "dist", "plugin-sdk"));
  candidates.push("/usr/local/lib/node_modules/openclaw/dist/plugin-sdk");
  const found = candidates.find((path) => existsSync(path));
  if (!found) {
    throw new Error(
      `cannot locate the host SDK modules (looked in ${candidates.join(", ")}); ` +
        "the browser bundle must inline them because this host serves plugin UI without an import map",
    );
  }
  return found;
}
