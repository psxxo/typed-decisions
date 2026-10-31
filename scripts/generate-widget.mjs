// Generates the widget module the browser bundle imports.
//
// Two reasons the widget exists as compiled code instead of markup plus an
// injected script:
//   1. The Control UI page CSP is `script-src 'self'` with no
//      `'unsafe-inline'`, so an inline <script> inserted into the page is
//      blocked and the fragment's logic never runs.
//   2. `connect-src` does not include the metrics endpoint, so the fragment
//      cannot fetch it from the page; metrics arrive through the plugin host.
//
// Usage: node scripts/generate-widget.mjs

import { readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = join(dirname(fileURLToPath(import.meta.url)), "..");
const assetPath = join(rootDir, "assets", "sys-status-widget.html");
const outPath = join(rootDir, "src", "generated-sys-status-html.ts");

const html = await readFile(assetPath, "utf8");
const openTag = "<script>";
const closeTag = "</script>";
const open = html.indexOf(openTag);
const close = html.lastIndexOf(closeTag);
if (open < 0 || close < 0 || close < open) {
  throw new Error("assets/sys-status-widget.html: expected one <script> block");
}

const markup = html.slice(0, open).trimEnd();

let body = html.slice(open + openTag.length, close);
body = body.replace(/^\s*\(function\s*\(\)\s*\{/, "");
body = body.replace(/\}\)\(\)\s*;?\s*$/, "");
body = body.replace(/\bvar root\s*=\s*document\.getElementById\("oa-sys"\);\s*if\s*\(!root\)\s*return;/, "");
body = body.replace(
  /var rd=\(window\.openclaw&&openclaw\.data&&openclaw\.data\.read\)\?openclaw\.data\.read\.bind\(openclaw\.data\):null;/,
  "var rd=api.read;",
);
body = body.replace(
  /var res=await fetch\(HOST,\{cache:"no-store"\}\); if\(!res\.ok\) throw new Error\("http"\);\s*\n\s*var d=await res\.json\(\);/,
  "var d=await api.metrics();",
);
body = body.replace(/document\.getElementById\(/g, "byId(");

const failed = [
  ["iife wrapper", /^\s*\(function/.test(body)],
  ["root lookup", /getElementById\("oa-sys"\)/.test(body)],
  ["read bridge", !body.includes("var rd=api.read;")],
  ["metrics bridge", !body.includes("var d=await api.metrics();")],
  ["document.getElementById leftovers", body.includes("document.getElementById(")],
].filter(([, bad]) => bad).map(([name]) => name);
if (failed.length) throw new Error("widget script rewrite failed: " + failed.join("; "));

const helper = '  const byId = (id: string) => root.querySelector(\'[id="\' + id + \'"]\') as HTMLElement | null;';
const out = [
  "// @ts-nocheck — generated from assets/sys-status-widget.html: untyped ES5 authored for the sandboxed widget lane.",
  "// Generated from assets/sys-status-widget.html by scripts/generate-widget.mjs. Do not edit by hand.",
  "export const SYS_STATUS_MARKUP = " + JSON.stringify(markup) + ";",
  "export type SysStatusApi = {",
  "  read: (id: string, params?: Record<string, unknown>) => Promise<unknown>;",
  "  metrics: () => Promise<unknown>;",
  "};",
  "export function renderSysStatus(root: HTMLElement, api: SysStatusApi): void {",
  helper,
  body,
  "}",
  "",
].join("\n");

await writeFile(outPath, out);
console.log("widget module generated: " + outPath + " (" + out.length + " bytes)");
