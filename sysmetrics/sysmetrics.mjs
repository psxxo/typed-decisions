import https from "node:https";
import fs from "node:fs";
import os from "node:os";

const PORT = 18575;
const HOSTNAME = os.hostname();
const CERT_DIR = process.env.SYSMETRICS_CERT_DIR || process.env.HOME + "/.config/sysmetrics";
// 缓存文件：常驻服务每轮采样落盘，HTTP 端点只读文件对外提供数值。
const CACHE_DIR = process.env.SYSMETRICS_CACHE_DIR || process.env.HOME + "/.cache/sysmetrics";
const CACHE_FILE = CACHE_DIR + "/metrics.json";

function readCpu() {
  return os.cpus().map((c) => {
    const t = c.times;
    const idle = t.idle + (t.irq || 0);
    const total = Object.values(t).reduce((a, b) => a + b, 0);
    return { idle, total };
  });
}
function cpuBusy(prev, cur) {
  let busy = 0, total = 0;
  const perCore = [];
  for (let i = 0; i < cur.length; i++) {
    const dIdle = cur[i].idle - prev[i].idle;
    const dTotal = cur[i].total - prev[i].total;
    const b = dTotal > 0 ? Math.max(0, Math.round(((dTotal - dIdle) / dTotal) * 100)) : 0;
    perCore.push(b);
    busy += dTotal - dIdle; total += dTotal;
  }
  return { busyPct: total > 0 ? Math.round((busy / total) * 100) : 0, perCore };
}
function readNet() {
  const txt = fs.readFileSync("/proc/net/dev", "utf8");
  let rx = 0, tx = 0;
  for (const line of txt.split("\n")) {
    const i = line.indexOf(":");
    if (i < 0) continue;
    if (line.slice(0, i).trim() === "lo") continue;
    const cols = line.slice(i + 1).trim().split(/\s+/).map(Number);
    rx += cols[0] || 0; tx += cols[8] || 0;
  }
  return { rx, tx };
}
function meminfo() {
  const txt = fs.readFileSync("/proc/meminfo", "utf8");
  const m = {};
  for (const line of txt.split("\n")) {
    const kv = line.split(":");
    if (kv.length === 2) m[kv[0].trim()] = parseInt(kv[1], 10) * 1024;
  }
  const total = m["MemTotal"] || 0, avail = m["MemAvailable"] || 0, used = total - avail;
  const swTotal = m["SwapTotal"] || 0, swFree = m["SwapFree"] || 0, swUsed = swTotal - swFree;
  return {
    mem: { totalBytes: total, usedBytes: used, availableBytes: avail, usedPct: total ? Math.round((used / total) * 100) : 0 },
    swap: { totalBytes: swTotal, usedBytes: swUsed, usedPct: swTotal ? Math.round((swUsed / swTotal) * 100) : 0 },
  };
}
function disk() {
  const s = fs.statfsSync("/");
  const total = s.blocks * s.bsize, avail = s.bavail * s.bsize, used = total - avail;
  return { mount: "/", totalBytes: total, usedBytes: used, availableBytes: avail, usedPct: total ? Math.round((used / total) * 100) : 0 };
}
function loadavg() {
  const [l1, l5, l15] = fs.readFileSync("/proc/loadavg", "utf8").trim().split(/\s+/).slice(0, 3).map(Number);
  return { load1: l1, load5: l5, load15: l15 };
}

let prevCpu = readCpu();
let prevNet = readNet();
let prevNetAt = Date.now();
let snapshot = null;
function sample() {
  const curCpu = readCpu();
  const { busyPct, perCore } = cpuBusy(prevCpu, curCpu);
  prevCpu = curCpu;
  const curNet = readNet();
  const now = Date.now();
  const dt = Math.max(1, (now - prevNetAt) / 1000);
  const rxBps = Math.round((curNet.rx - prevNet.rx) / dt);
  const txBps = Math.round((curNet.tx - prevNet.tx) / dt);
  prevNet = curNet; prevNetAt = now;
  const { mem, swap } = meminfo();
  snapshot = {
    ts: now, host: HOSTNAME, uptimeSec: Math.round(os.uptime()),
    cpu: { cores: os.cpus().length, busyPct, perCore, ...loadavg() },
    mem, swap,
    net: { rxBps, txBps, rxTotalBytes: curNet.rx, txTotalBytes: curNet.tx },
    disk: disk(),
    pid: process.pid,
  };
}
fs.mkdirSync(CACHE_DIR, { recursive: true });
function publish() {
  try {
    const tmp = CACHE_FILE + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(snapshot));
    fs.renameSync(tmp, CACHE_FILE);
  } catch (e) { console.error("cache write failed: " + e.message); }
}
sample();
publish();
setInterval(() => { sample(); publish(); }, 3000);

const server = https.createServer({
  key: fs.readFileSync(CERT_DIR + "/key.pem"),
  cert: fs.readFileSync(CERT_DIR + "/cert.pem"),
}, (req, res) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("access-control-allow-origin", "*");
  res.setHeader("cache-control", "no-store");
  try { res.end(fs.readFileSync(CACHE_FILE)); } catch { res.end(JSON.stringify(snapshot)); }
});
server.listen(PORT, "0.0.0.0", () => console.log("sysmetrics on " + PORT));
