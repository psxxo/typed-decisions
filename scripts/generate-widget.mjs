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
// 资产可能是一整页，且带重复的桥接壳副本。只认唯一一份：
// 取最后一层文档、剥掉全部脚本得到标记，单独取渲染 #oa-sys 的看板脚本。
const pageStart = html.toLowerCase().lastIndexOf("<!doctype html>");
const page = pageStart >= 0 ? html.slice(pageStart) : html;
const scriptBlocks = [...page.matchAll(/<script>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
const widgetScript = scriptBlocks.find((s) => s.includes('getElementById("oa-sys")'));
if (!widgetScript) {
  throw new Error("assets/sys-status-widget.html: no script block renders #oa-sys");
}

// 标记只取看板本体：body 内、去掉全部脚本。
// 页面级样式（:root / * / html,body / 滚动条）会污染 Control UI 外壳，必须排除，
// 因此不从 <head> 取任何内容；看板自己的样式本来就内联在 #oa-sys 容器里。
const bodyStart = page.toLowerCase().lastIndexOf("<body");
const pageBody = bodyStart >= 0 ? page.slice(bodyStart) : page;
const markup = pageBody
  .replace(/^<body[^>]*>/i, "")
  .replace(/<\/body>[\s\S]*$/i, "")
  .replace(/<script>[\s\S]*?<\/script>/gi, "")
  .trim();

let body = widgetScript;
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
  "export function renderSysStatus(root: HTMLElement, api: SysStatusApi): () => void {",
  helper,
  body,
  "}",
  "",
].join("\n");

await writeFile(outPath, out);
console.log("widget module generated: " + outPath + " (" + out.length + " bytes)");
