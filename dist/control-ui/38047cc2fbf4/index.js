// ../../../../../usr/local/lib/node_modules/openclaw/dist/plugin-sdk/control-ui.js
function defineControlUiPlugin(plugin) {
  return plugin;
}

// src/generated-sys-status-html.ts
var SYS_STATUS_MARKUP = '<div id="oa-sys" class="oa-sys">\n<style>\n#oa-sys{position:relative;display:flex;flex-direction:column;gap:12px;padding:14px;font-family:var(--font-body,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"PingFang SC","Microsoft YaHei",sans-serif);font-size:12px;line-height:1.45;color:var(--text)}\n#oa-sys .hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}\n#oa-sys .dot{width:9px;height:9px;border-radius:50%;background:var(--muted);flex:none;box-shadow:0 0 0 3px color-mix(in srgb,var(--muted) 18%,transparent)}\n#oa-sys .dot.ok{background:var(--ok);box-shadow:0 0 0 3px color-mix(in srgb,var(--ok) 18%,transparent)}\n#oa-sys .dot.danger{background:var(--danger);box-shadow:0 0 0 3px color-mix(in srgb,var(--danger) 18%,transparent)}\n#oa-sys .ttl{font-weight:600;letter-spacing:.02em}\n#oa-sys .sp1{flex:1}\n#oa-sys .upd{color:var(--muted);font-size:11px;font-family:var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace)}\n#oa-sys .grid{display:grid;gap:10px;grid-template-columns:1fr}\n#oa-sys .t{position:relative;display:flex;flex-direction:column;gap:3px;padding:11px 12px 0;border:1px solid var(--border);border-radius:13px;background:var(--card);min-width:0;overflow:hidden;transition:border-color .15s,box-shadow .15s}\n#oa-sys .t:hover,#oa-sys .m:hover{border-color:var(--border-strong);box-shadow:0 4px 16px rgba(0,0,0,.18)}\n#oa-sys .l{color:var(--muted);font-size:10.5px;letter-spacing:.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#oa-sys .v{font-family:var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace);font-size:20px;font-weight:600;line-height:1.1;letter-spacing:-.02em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#oa-sys .s{color:var(--muted);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}\n#oa-sys .chart{position:relative;height:38px;margin:7px -12px 0}\n#oa-sys .chart svg{display:block;width:100%;height:100%}\n#oa-sys .chart .dot-end,#oa-sys .cchart .dot-end{position:absolute;right:auto;left:calc(100% - 3px);width:5px;height:5px;border-radius:50%;background:#2f9e8f;box-shadow:0 0 6px color-mix(in srgb,#2f9e8f 55%,transparent);transform:translate(-50%,-50%);pointer-events:none}\n#oa-sys .chart .hairline,#oa-sys .cchart .hairline{position:absolute;top:0;bottom:0;width:1px;background:color-mix(in srgb,#2f9e8f 40%,transparent);pointer-events:none;display:none}\n#oa-sys .chart .hover-label,#oa-sys .cchart .hover-label{position:absolute;right:2px;top:0;padding:0 4px;font-size:10px;font-family:var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace);color:var(--text);background:var(--elevated,var(--card));border:1px solid var(--border);border-radius:5px;white-space:nowrap;pointer-events:none;display:none}\n#oa-sys .corebox{display:flex;flex-direction:column;gap:7px;margin:11px 0 0}\n#oa-sys .corebox .crow{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:0 12px;font-size:10.5px}\n#oa-sys .corebox .crow .cl{color:var(--muted)}\n#oa-sys .corebox .crow b{font-family:var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace);font-weight:600}\n#oa-sys .corebox .core{display:block;width:100%}\n#oa-sys .corebox .cchart{position:relative;height:24px;margin:0 -12px;width:auto}\n#oa-sys .corebox .core:last-child .cchart{border-radius:0 0 12px 12px}\n#oa-sys .corebox .cchart svg{display:block;width:100%;height:100%}\n#oa-sys .m{position:relative;display:flex;flex-direction:column;gap:2px;padding:9px 11px;border:1px solid var(--border);border-radius:11px;min-width:0;transition:border-color .15s,box-shadow .15s}\n#oa-sys .m .v{font-size:16px}\n#oa-sys .tip{position:absolute;z-index:9;display:none;max-width:min(250px,calc(100% - 8px));box-sizing:border-box;padding:9px 11px;border:1px solid var(--border-strong);border-radius:10px;background:var(--elevated,var(--card));box-shadow:0 8px 24px rgba(0,0,0,.28);font-size:11px;line-height:1.55}\n#oa-sys .tip b{display:block;margin-bottom:3px}\n#oa-sys .tip .r{display:flex;justify-content:space-between;gap:14px}\n#oa-sys .tip .r span:first-child{color:var(--muted)}\n#oa-sys .sec{display:flex;align-items:center;gap:8px;color:var(--muted);font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-top:2px}\n#oa-sys .sec:after{content:"";flex:1;height:1px;background:var(--border)}\n</style>\n<div class="hd"><span class="dot" id="gwdot"></span><span class="ttl">\u7CFB\u7EDF\u72B6\u6001</span><span class="badge" id="gwbadge">\u8BFB\u53D6\u4E2D\u2026</span><span class="sp1"></span><span class="upd" id="upd">\u2014</span></div>\n<div class="grid" id="gmain">\n  <div class="t" data-tip="cpu"><span class="l">CPU \u5BBF\u4E3B \xB7 \u5B9E\u65F6</span><span class="v" id="vcpu">\u2014</span><span class="s" id="scpu">\u2014</span><div class="chart" id="ccpu"></div></div>\n  <div class="t" data-tip="cores"><span class="l">CPU \u5404\u6838 \xB7 \u5B9E\u65F6</span><div class="corebox" id="corebox"></div></div>\n  <div class="t" data-tip="mem"><span class="l">\u5185\u5B58 \u5BBF\u4E3B \xB7 \u5B9E\u65F6</span><span class="v" id="vmem">\u2014</span><span class="s" id="smem">\u2014</span><div class="chart" id="cmem"></div></div>\n  <div class="t" data-tip="net"><span class="l">\u7F51\u7EDC\u541E\u5410 \xB7 \u5B9E\u65F6</span><span class="v" id="vnet">\u2014</span><span class="s" id="snet">\u2014</span><div class="chart" id="cnet"></div></div>\n  <div class="t" data-tip="disk"><span class="l">\u78C1\u76D8 / \xB7 \u5B9E\u65F6</span><span class="v" id="vdisk">\u2014</span><span class="s" id="sdisk">\u2014</span><div class="chart" id="cdisk"></div></div>\n  <div class="t" data-tip="p99"><span class="l">\u5EF6\u8FDF P99 \xB7 \u5B9E\u65F6</span><span class="v" id="vp99">\u2014</span><span class="s" id="sp99">\u2014</span><div class="chart" id="cp99"></div></div>\n</div>\n<div class="sec">\u5B9E\u65F6\u6D3B\u52A8</div>\n<div class="grid" id="gact">\n  <div class="m" data-tip="sess"><span class="l">\u4F1A\u8BDD</span><span class="v" id="vsess">\u2014</span></div>\n  <div class="m" data-tip="cron"><span class="l">\u81EA\u52A8\u5316</span><span class="v" id="vcron">\u2014</span></div>\n  <div class="m" data-tip="agent"><span class="l">\u667A\u80FD\u4F53</span><span class="v" id="vagent">\u2014</span></div>\n  <div class="m" data-tip="chan"><span class="l">\u901A\u9053</span><span class="v" id="vchan">\u2014</span></div>\n</div>\n<div class="tip" id="tip"></div>\n</div>';
function renderSysStatus(root, api) {
  const byId = (id) => root.querySelector('[id="' + id + '"]');
  var TEAL = "#2f9e8f", WHITE = "#ffffff", MB = 1048576, HOST = "https://47.93.209.162:18575/metrics.json", CAP = 80;
  var MODE = { ccpu: "pct", cmem: "pct", cdisk: "pct", cnet: "abs", cp99: "abs" };
  var ABS = { cnet: { warn: 5 * MB, red: 15 * MB, unit: "MB/s" }, cp99: { warn: 200, red: 700, unit: "ms" } };
  function cssv(n, fb) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(n);
      v = (v || "").trim();
      return v || fb;
    } catch (e) {
      return fb;
    }
  }
  var DANGER = hex(cssv("--danger", "#f87171"));
  function hex(c) {
    c = (c || "").trim();
    if (c.charAt(0) === "#") {
      if (c.length === 4) return "#" + c[1] + c[1] + c[2] + c[2] + c[3] + c[3];
      return c.slice(0, 7);
    }
    return "#f87171";
  }
  function rgb(c) {
    c = hex(c);
    return [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];
  }
  function mix(a, b, t) {
    var A = rgb(a), B = rgb(b);
    t = Math.max(0, Math.min(1, t));
    return "rgb(" + Math.round(A[0] + (B[0] - A[0]) * t) + "," + Math.round(A[1] + (B[1] - A[1]) * t) + "," + Math.round(A[2] + (B[2] - A[2]) * t) + ")";
  }
  function hexToHsl(c) {
    c = hex(c);
    var r = parseInt(c.slice(1, 3), 16) / 255, g = parseInt(c.slice(3, 5), 16) / 255, b = parseInt(c.slice(5, 7), 16) / 255;
    var mx = Math.max(r, g, b), mn = Math.min(r, g, b), h = 0, s = 0, l = (mx + mn) / 2, d = mx - mn;
    if (d > 0) {
      s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
      if (mx === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (mx === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return [h, s, l];
  }
  function hslCss(a) {
    return "hsl(" + a[0].toFixed(1) + "," + (a[1] * 100).toFixed(1) + "%," + (a[2] * 100).toFixed(1) + "%)";
  }
  function colorAt(v, warn, red, pct) {
    var A = hexToHsl(TEAL), B = hexToHsl(DANGER);
    if (v <= warn) return hslCss(A);
    if (v >= red) return hslCss(B);
    var t = (v - warn) / (red - warn), h = A[0] + (B[0] - A[0]) * t;
    if (pct) {
      var AN = [0, 0.2, 0.4, 0.6, 0.8, 1], AH = [A[0], 120, 86, 57, 17, B[0]];
      for (var i = 1; i < AN.length; i++) {
        if (t <= AN[i]) {
          h = AH[i - 1] + (AH[i] - AH[i - 1]) * ((t - AN[i - 1]) / (AN[i] - AN[i - 1]));
          break;
        }
      }
    }
    return hslCss([h, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t]);
  }
  function scaleOf(id) {
    if (MODE[id] === "pct") return { warn: 45, red: 100 };
    return ABS[id] || { warn: 45, red: 100 };
  }
  var hist = { cpu: [], mem: [], disk: [], net: [], p99: [] };
  var coreHist = [];
  var st = { busy: null, load: "", cores: 2, cpu: null, perCore: [], mem: null, swap: null, disk: null, diskAvail: null, rx: null, tx: null, hostOk: null };
  var maxP99 = 0;
  var tips = {
    cpu: { t: "CPU \u5BBF\u4E3B", r: [["\u503C", "\u6574\u673A CPU \u4F7F\u7528\u7387"], ["\u6765\u6E90", "/proc/stat\uFF083s\uFF09"], ["\u6BD4\u4F8B\u5C3A", "\u56FA\u5B9A 0-100%"], ["\u914D\u8272", "\u9884\u8B66\u9608\u503C\u4E0B\u9752\u7EFF\uFF0C\u8D8A\u9650\u7ECF\u9EC4\u6A59\u6E10\u53D8\u5230\u7EA2"]] },
    cores: { t: "CPU \u5404\u6838", r: [["\u503C", "\u6BCF\u6838\u4F7F\u7528\u7387\u4E0E\u66F2\u7EBF"], ["\u6765\u6E90", "/proc/stat \u6BCF\u6838\uFF083s\uFF09"], ["\u6BD4\u4F8B\u5C3A", "\u56FA\u5B9A 0-100%"], ["\u914D\u8272", "\u9884\u8B66\u9608\u503C\u4E0B\u9752\u7EFF\uFF0C\u8D8A\u9650\u7ECF\u9EC4\u6A59\u6E10\u53D8\u5230\u7EA2"]] },
    mem: { t: "\u5185\u5B58\uFF08\u5BBF\u4E3B\uFF09", r: [["\u5DF2\u7528 / \u603B\u8BA1", "/proc/meminfo"], ["Swap", "\u5B9E\u65F6"], ["\u6BD4\u4F8B\u5C3A", "\u56FA\u5B9A 0-100%"], ["\u914D\u8272", "\u9884\u8B66\u9608\u503C\u4E0B\u9752\u7EFF\uFF0C\u8D8A\u9650\u7ECF\u9EC4\u6A59\u6E10\u53D8\u5230\u7EA2"]] },
    net: { t: "\u7F51\u7EDC\u541E\u5410", r: [["\u5408\u8BA1", "rx + tx \u6BCF\u79D2\u901F\u7387"], ["\u6765\u6E90", "/proc/net/dev\uFF08\u4E0D\u542B lo\uFF09"], ["\u6BD4\u4F8B\u5C3A", "\u7A97\u53E3\u81EA\u9002\u5E94\uFF08\u4EC5\u51E0\u4F55\uFF09"], ["\u914D\u8272", "\u9884\u8B66\u9608\u503C\u4E0B\u9752\u7EFF\uFF0C\u8D8A\u9650\u7ECF\u9EC4\u6A59\u6E10\u53D8\u5230\u7EA2"]] },
    disk: { t: "\u78C1\u76D8 /", r: [["\u5DF2\u7528 / \u603B\u8BA1", "statfs"], ["\u53EF\u7528", "\u5B9E\u65F6"], ["\u6BD4\u4F8B\u5C3A", "\u56FA\u5B9A 0-100%"], ["\u914D\u8272", "\u9884\u8B66\u9608\u503C\u4E0B\u9752\u7EFF\uFF0C\u8D8A\u9650\u7ECF\u9EC4\u6A59\u6E10\u53D8\u5230\u7EA2"]] },
    p99: { t: "\u4E8B\u4EF6\u5FAA\u73AF\u5EF6\u8FDF", r: [["\u5F53\u524D P99", "health.eventLoop"], ["\u89C2\u6D4B\u6700\u5927", "\u6EDA\u52A8\u7A97\u53E3"], ["\u6BD4\u4F8B\u5C3A", "\u7A97\u53E3\u81EA\u9002\u5E94\uFF08\u4EC5\u51E0\u4F55\uFF09"], ["\u914D\u8272", "\u9884\u8B66\u9608\u503C\u4E0B\u9752\u7EFF\uFF0C\u8D8A\u9650\u7ECF\u9EC4\u6A59\u6E10\u53D8\u5230\u7EA2"]] },
    sess: { t: "\u4F1A\u8BDD", r: [["\u6765\u6E90", "sessions.list"], ["\u8282\u594F", "3s"]] },
    cron: { t: "\u81EA\u52A8\u5316\u4EFB\u52A1", r: [["\u6765\u6E90", "cron.list"], ["\u8282\u594F", "3s"]] },
    agent: { t: "\u667A\u80FD\u4F53", r: [["\u6765\u6E90", "agents.list"], ["\u8282\u594F", "3s"]] },
    chan: { t: "\u901A\u9053", r: [["\u542B\u4E49", "\u5DF2\u8FDE\u63A5 / \u603B\u6570"], ["\u6765\u6E90", "health.channels"], ["\u8282\u594F", "3s"]] }
  };
  function set(id, v) {
    var e = byId(id);
    if (e && v != null) e.textContent = String(v);
  }
  function hhmm() {
    var d = /* @__PURE__ */ new Date(), p = function(n) {
      return String(n).padStart(2, "0");
    };
    return p(d.getHours()) + ":" + p(d.getMinutes()) + ":" + p(d.getSeconds());
  }
  function arr(x, k) {
    if (Array.isArray(x)) return x;
    if (x && typeof x === "object") {
      for (var i = 0; i < k.length; i++) if (Array.isArray(x[k[i]])) return x[k[i]];
    }
    return null;
  }
  function gb(b) {
    return (b / 1073741824).toFixed(1) + " GB";
  }
  function rate(b) {
    if (b == null) return "\u2014";
    if (b < 1024) return b + " B/s";
    if (b < MB) return (b / 1024).toFixed(1) + " KB/s";
    return (b / MB).toFixed(2) + " MB/s";
  }
  function domain(vals, mode) {
    var mn = Math.min.apply(null, vals), mx = Math.max.apply(null, vals);
    if (mode === "pct") return { lo: 0, hi: 100 };
    var span = mx - mn, minSpan = Math.max(1, mx * 0.25);
    if (span < minSpan) {
      var c = (mn + mx) / 2;
      mn = c - minSpan / 2;
      mx = c + minSpan / 2;
      if (mn < 0) {
        mx -= mn;
        mn = 0;
      }
    }
    if (mx - mn < 1e-6) mx = mn + 1;
    return { lo: mn, hi: mx };
  }
  function defs(id, lo, hi, ht) {
    var sc = scaleOf(id), warn = sc.warn, red = sc.red, pct = (MODE[id] || "pct") === "pct";
    var f = function(v) {
      return Math.max(0, Math.min(1, (hi - v) / (hi - lo)));
    };
    var vals = [lo];
    var fr = pct ? [0, 0.2, 0.4, 0.6, 0.8, 1] : [0, 0.2, 0.4, 0.6, 0.8, 1];
    for (var i = 0; i < fr.length; i++) {
      var vv = warn + (red - warn) * fr[i];
      if (vv > lo && vv < hi) vals.push(vv);
    }
    vals.push(hi);
    vals.sort(function(a, b) {
      return a - b;
    });
    var fs = "", ls = "";
    for (var k = vals.length - 1; k >= 0; k--) {
      var v2 = vals[k], off = f(v2), col = colorAt(v2, warn, red, pct);
      fs += '<stop offset="' + off.toFixed(4) + '" style="stop-color:' + col + ";stop-opacity:" + (0.45 * ((v2 - lo) / (hi - lo))).toFixed(3) + '"/>';
      ls += '<stop offset="' + off.toFixed(4) + '" style="stop-color:' + col + ';stop-opacity:1"/>';
    }
    return '<linearGradient id="lg' + id + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + ht + '">' + fs + '</linearGradient><linearGradient id="ls' + id + '" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="' + ht + '">' + ls + "</linearGradient>";
  }
  function sparkSvg(id, vals, ht) {
    if (!vals || !vals.length) return "";
    var mode = MODE[id] || "pct";
    var w = 100, d = domain(vals, mode), lo = d.lo, hi = d.hi;
    var n = vals.length, pts = [];
    for (var i = 0; i < n; i++) {
      var x = n === 1 ? XMAX : i / (n - 1) * XMAX, y = ht - 1.5 - (vals[i] - lo) / (hi - lo) * (ht - 4);
      pts.push([x, y]);
    }
    var line = pts.map(function(p, i2) {
      return (i2 ? "L" : "M") + p[0].toFixed(1) + " " + p[1].toFixed(1);
    }).join(" ");
    var area = line + " L" + w + " " + pts[n - 1][1].toFixed(1) + " L" + w + " " + ht + " L0 " + ht + " Z", lp = pts[pts.length - 1];
    var sc = scaleOf(id), gid = "lg" + id;
    return '<svg viewBox="0 0 ' + w + " " + ht + '" preserveAspectRatio="none"><defs>' + defs(id, lo, hi, ht) + '</defs><path d="' + area + '" fill="url(#' + gid + ')"/><path d="' + line + '" fill="none" stroke="url(#ls' + id + ')" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';
  }
  var XMAX = 100;
  var CFG = { ccpu: { fmt: function(v) {
    return Math.round(v) + "%";
  }, swap: true }, cmem: { fmt: function(v) {
    return Math.round(v) + "%";
  }, swap: true }, cnet: { fmt: function(v) {
    return rate(v);
  }, swap: true }, cdisk: { fmt: function(v) {
    return Math.round(v) + "%";
  }, swap: true }, cp99: { fmt: function(v) {
    return Math.round(v) + " ms";
  }, swap: true } };
  var CSTATE = {};
  function cfgFor(id) {
    if (CFG[id]) return CFG[id];
    if (id.indexOf("cc") === 0) return { fmt: function(v) {
      return Math.round(v) + "%";
    }, swap: true };
    return {};
  }
  function readoutEl(el) {
    var c = el.closest(".core");
    if (c) return c.querySelector("b");
    var t = el.closest(".t");
    return t ? t.querySelector(".v") : null;
  }
  function yFor(st2, v) {
    var dm = domain(st2.vals, st2.mode);
    return st2.h - 1.5 - (v - dm.lo) / (dm.hi - dm.lo) * (st2.h - 4);
  }
  function nowDot(el) {
    var st2 = CSTATE[el.id];
    if (!st2) return;
    var v = st2.vals[st2.vals.length - 1];
    var dot = el.querySelector(".dot-end");
    if (dot) {
      dot.style.left = XMAX + "%";
      dot.style.right = "auto";
      dot.style.top = (yFor(st2, v) / st2.h * 100).toFixed(2) + "%";
    }
    var hair = el.querySelector(".hairline");
    if (hair) hair.style.display = "none";
    var lab = el.querySelector(".hover-label");
    if (lab) lab.style.display = "none";
    var ro = readoutEl(el);
    if (ro && ro.__orig !== void 0) {
      ro.textContent = ro.__orig;
      ro.__orig = void 0;
    }
  }
  function ageText(sec) {
    if (sec < 60) return "\u2212" + sec + "\u79D2";
    var m = Math.floor(sec / 60), s = sec % 60;
    return "\u2212" + m + "\u5206\u949F" + (s ? " " + s + "\u79D2" : "");
  }
  function onHover(ev) {
    var el = ev.currentTarget;
    var st2 = CSTATE[el.id];
    if (!st2 || st2.vals.length < 2) return;
    var r = el.getBoundingClientRect();
    if (!r.width) return;
    var xp = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
    var pos = Math.max(0, Math.min(xp * (100 / XMAX) * (st2.vals.length - 1), st2.vals.length - 1)), i0 = Math.floor(pos), i1 = Math.min(i0 + 1, st2.vals.length - 1), f = pos - i0;
    var vi = st2.vals[i0] + (st2.vals[i1] - st2.vals[i0]) * f;
    var idx = Math.max(0, Math.min(Math.round(pos), st2.vals.length - 1));
    var y = yFor(st2, vi), pct = pos / (st2.vals.length - 1) * XMAX;
    var dot = el.querySelector(".dot-end");
    if (dot) {
      dot.style.right = "auto";
      dot.style.left = pct + "%";
      dot.style.top = (y / st2.h * 100).toFixed(2) + "%";
    }
    var hair = el.querySelector(".hairline");
    if (hair) {
      hair.style.display = "block";
      hair.style.left = pct + "%";
    }
    var cfg = cfgFor(el.id), fmt = cfg.fmt || function(x) {
      return String(Math.round(x));
    };
    var age = Math.round((st2.vals.length - 1 - idx) * 3);
    var lab = el.querySelector(".hover-label"), ro = readoutEl(el);
    if (cfg.swap && ro) {
      if (ro.__orig === void 0) ro.__orig = ro.textContent;
      ro.textContent = fmt(st2.vals[idx]) + (age > 0 ? " " + ageText(age) : "");
      if (lab) lab.style.display = "none";
    } else if (lab) {
      lab.style.display = "block";
      lab.textContent = fmt(st2.vals[idx]);
    }
  }
  function onLeave(ev) {
    nowDot(ev.currentTarget);
  }
  function spark(el, vals, ht) {
    if (!el) return;
    var h = ht || 38;
    el.innerHTML = sparkSvg(el.id, vals, h);
    var dot = el.querySelector(".dot-end");
    if (!dot) {
      dot = document.createElement("i");
      dot.className = "dot-end";
      el.appendChild(dot);
    }
    var hair = el.querySelector(".hairline");
    if (!hair) {
      hair = document.createElement("i");
      hair.className = "hairline";
      el.appendChild(hair);
    }
    var lab = el.querySelector(".hover-label");
    if (!lab) {
      lab = document.createElement("span");
      lab.className = "hover-label";
      el.appendChild(lab);
    }
    CSTATE[el.id] = { vals: vals.slice(), h, mode: (MODE[el.id] || "pct") === "pct" ? "pct" : "auto" };
    if (!el.__wired) {
      el.__wired = 1;
      el.addEventListener("pointermove", onHover);
      el.addEventListener("pointerleave", onLeave);
    }
    nowDot(el);
  }
  function push(a, v, cap) {
    a.push(v);
    if (a.length > cap) a.shift();
  }
  function renderCores(vals) {
    var el = byId("corebox");
    if (!el) return;
    if (!vals || !vals.length) {
      el.innerHTML = "";
      return;
    }
    while (coreHist.length < vals.length) coreHist.push([]);
    for (var i = 0; i < vals.length; i++) {
      if (typeof vals[i] === "number") push(coreHist[i], vals[i], CAP);
    }
    el.innerHTML = vals.map(function(v, i2) {
      return '<div class="core"><div class="crow"><span class="cl">\u6838 ' + i2 + "</span><b>" + (typeof v === "number" ? v + "%" : "\u2014") + '</b></div><div class="cchart" id="cc' + i2 + '"></div></div>';
    }).join("");
    for (var j = 0; j < vals.length; j++) {
      spark(byId("cc" + j), coreHist[j] || [], 24);
    }
  }
  var rd = api.read;
  function render() {
    set("upd", "\u5B9E\u65F6 \xB7 " + hhmm());
    set("scpu", (st.load ? st.load : "\u2014") + " \xB7 " + st.cores + " vCPU" + (st.busy != null ? " \xB7 \u7F51\u5173 " + st.busy + "%" : ""));
    set("smem", st.mem != null ? "\u5DF2\u7528 " + st.mem + "% \xB7 swap " + (st.swap || "\u2014") : "\u2014");
    set("snet", st.rx != null ? "\u2193 " + rate(st.rx) + " \xB7 \u2191 " + rate(st.tx) : "\u2014");
    set("sdisk", st.disk != null ? "\u5DF2\u7528 " + st.disk + "% \xB7 \u53EF\u7528 " + gb(st.diskAvail) : "\u2014");
    if (st.hostOk === false) {
      set("sdisk", "\u6307\u6807\u7AEF\u70B9\u672A\u8FDE\u901A \xB7 \u68C0\u67E5 18575");
    }
  }
  async function hostTick() {
    try {
      var d = await api.metrics();
      st.hostOk = true;
      st.cores = d.cpu.cores;
      if (typeof d.cpu.busyPct === "number") {
        st.cpu = d.cpu.busyPct;
        push(hist.cpu, d.cpu.busyPct, CAP);
        set("vcpu", d.cpu.busyPct + "%");
        spark(byId("ccpu"), hist.cpu);
      }
      st.perCore = d.cpu.perCore || [];
      renderCores(st.perCore);
      st.load = d.cpu.load1.toFixed(2) + " / " + d.cpu.load5.toFixed(2) + " / " + d.cpu.load15.toFixed(2);
      st.mem = d.mem.usedPct;
      push(hist.mem, d.mem.usedPct, CAP);
      set("vmem", gb(d.mem.usedBytes) + "/" + gb(d.mem.totalBytes));
      spark(byId("cmem"), hist.mem);
      st.swap = gb(d.swap.usedBytes);
      if (d.net) {
        st.rx = d.net.rxBps;
        st.tx = d.net.txBps;
        var tot = (d.net.rxBps || 0) + (d.net.txBps || 0);
        push(hist.net, tot, CAP);
        set("vnet", rate(tot));
        spark(byId("cnet"), hist.net);
      }
      if (d.disk) {
        st.disk = d.disk.usedPct;
        st.diskAvail = d.disk.availableBytes;
        push(hist.disk, d.disk.usedPct, CAP);
        set("vdisk", gb(d.disk.totalBytes));
        spark(byId("cdisk"), hist.disk);
      }
    } catch (e) {
      st.hostOk = false;
    }
  }
  async function fastTick() {
    if (!rd) {
      set("gwbadge", "\u672A\u6388\u6743");
    } else try {
      var H = await rd("health");
      var ok = H && H.running !== false && H.connected !== false;
      set("gwbadge", ok ? "\u6B63\u5E38" : H && (H.lifecycle || H.status) || "\u672A\u77E5");
      var dd = byId("gwdot");
      if (dd) dd.className = "dot " + (ok ? "ok" : "danger");
      var el = H && H.eventLoop || {};
      var u = el.eventLoopUtilization;
      if (typeof u !== "number") u = el.utilization;
      if (typeof u === "number") {
        if (u > 0 && u <= 1) u = u * 100;
        st.busy = Math.round(u);
      }
      var q = el.p99Ms;
      if (typeof q !== "number") q = el.delayP99Ms;
      if (typeof q === "number") {
        maxP99 = Math.max(maxP99, q);
        push(hist.p99, Math.round(q), CAP);
        set("vp99", Math.round(q) + " ms");
        set("sp99", "\u6700\u5927 " + Math.round(maxP99) + " ms");
        spark(byId("cp99"), hist.p99);
      }
      var ch = H && H.channels;
      if (ch && typeof ch === "object") {
        var ids = Object.keys(ch), on = ids.filter(function(k) {
          var c = ch[k] || {};
          return c.running !== false && c.connected !== false;
        }).length;
        set("vchan", on + "/" + ids.length);
      } else set("vchan", "\u2014");
    } catch (e) {
      set("gwbadge", "\u8BFB\u53D6\u5931\u8D25");
    }
    render();
  }
  async function slowTick() {
    if (!rd) return;
    try {
      var s = await rd("sessions.list");
      var a = arr(s, ["sessions", "items", "rows"]);
      set("vsess", a ? a.length : "\u2014");
    } catch (e) {
    }
    try {
      var c = await rd("cron.list");
      var j = arr(c, ["jobs", "items", "rows"]);
      set("vcron", j ? j.length : "\u2014");
    } catch (e) {
    }
    try {
      var g = await rd("agents.list");
      var ag = arr(g, ["agents", "items"]);
      set("vagent", ag ? ag.length : "\u2014");
    } catch (e) {
    }
  }
  function fit(grid, min) {
    if (!grid) return;
    var w = grid.clientWidth;
    if (!w) return;
    var n = grid.children.length;
    if (!n) return;
    var gap = 10, best = 1;
    for (var d = 1; d <= n; d++) {
      if (n % d) continue;
      if ((w - gap * (d - 1)) / d >= min) best = d;
    }
    var v = "repeat(" + best + ",minmax(0,1fr))";
    if (grid.__cols !== v) {
      grid.__cols = v;
      grid.style.gridTemplateColumns = v;
    }
  }
  function relayout() {
    fit(byId("gmain"), 200);
    fit(byId("gact"), 120);
  }
  var raf = 0;
  function schedule() {
    if (raf) return;
    raf = requestAnimationFrame(function() {
      raf = 0;
      relayout();
    });
  }
  try {
    if (window.ResizeObserver) new ResizeObserver(schedule).observe(root);
  } catch (e) {
  }
  window.addEventListener("resize", schedule);
  var tip = byId("tip");
  root.addEventListener("mouseover", function(ev) {
    var t = ev.target.closest ? ev.target.closest("[data-tip]") : null;
    if (!t) return;
    var d = tips[t.getAttribute("data-tip")];
    if (!d) return;
    tip.innerHTML = "<b>" + d.t + "</b>" + d.r.map(function(r) {
      return '<div class="r"><span>' + r[0] + "</span><span>" + r[1] + "</span></div>";
    }).join("");
    var rb = root.getBoundingClientRect(), tb = t.getBoundingClientRect();
    tip.style.display = "block";
    var tw = tip.offsetWidth, th = tip.offsetHeight;
    var tl = Math.max(4, Math.min(tb.left - rb.left, rb.width - tw - 4));
    var below = tb.bottom - rb.top + 6, above = tb.top - rb.top - th - 6;
    var tt = below + th <= rb.height ? below : above >= 4 ? above : Math.max(4, Math.min(below, rb.height - th - 4));
    tip.style.left = tl + "px";
    tip.style.top = tt + "px";
  });
  root.addEventListener("mouseout", function(ev) {
    var t = ev.target.closest ? ev.target.closest("[data-tip]") : null;
    if (t) tip.style.display = "none";
  });
  relayout();
  hostTick();
  fastTick();
  slowTick();
  render();
  setInterval(hostTick, 3e3);
  setInterval(fastTick, 3e3);
  setInterval(slowTick, 3e3);
  setTimeout(relayout, 250);
}

// src/control-ui.ts
var PLUGIN_ID = "typed-decisions";
var NAMESPACE = "decision-intervention";
var SESSION_ACTION_ID = "decision-intervention.state";
var LABEL = "\u51B3\u7B56\u4ECB\u5165";
var Z_INDEX = 2147483e3;
var PROBE_INTERVAL_MS = 3e3;
var PROBE_WINDOW_MS = 6e4;
var DEFAULT_OFFSET = { x: 61, y: 24 };
var STYLE_KEY = "td-switch-style";
var DEFAULT_STYLE = { fontSize: 12, dx: 0, dy: 0, buttonDx: 0, buttonDy: 0, labelDx: 0, labelDy: 0 };
var STYLE_KEYS = ["fontSize", "dx", "dy", "buttonDx", "buttonDy", "labelDx", "labelDy"];
var round1 = (value) => Math.round(value * 10) / 10;
function readStyle() {
  try {
    const raw = localStorage.getItem(STYLE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    const read = (key) => {
      const value = Number(parsed?.[key]);
      return Number.isFinite(value) ? round1(value) : DEFAULT_STYLE[key];
    };
    const fontSize = read("fontSize");
    return {
      fontSize: fontSize > 0 ? fontSize : DEFAULT_STYLE.fontSize,
      dx: read("dx"),
      dy: read("dy"),
      buttonDx: read("buttonDx"),
      buttonDy: read("buttonDy"),
      labelDx: read("labelDx"),
      labelDy: read("labelDy")
    };
  } catch {
    return { ...DEFAULT_STYLE };
  }
}
function writeStyle(style) {
  try {
    if (style === null) localStorage.removeItem(STYLE_KEY);
    else localStorage.setItem(STYLE_KEY, JSON.stringify(style));
  } catch {
  }
}
var DEFAULT_GAP = 16;
var ADMISSION_LABEL = /完全访问|只读|保护|工作区|Full access|Read-only|Guarded|Workspace/;
var PANE_SELECTOR = ".chat-pane-cache__pane";
var PANE_VISIBLE_CLASS = "chat-pane-cache__pane--visible";
var COMPOSER_SHELL_SELECTOR = ".agent-chat__composer-shell";
var STYLE = `
:host { display: inline-flex; align-items: center; }
.td-switch {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 3px 6px; border: 0; outline: none;
  background: transparent; color: inherit;
  font: inherit; font-size: 12px; line-height: 1.4;
  cursor: pointer; user-select: none;
}
.td-switch:disabled { cursor: progress; opacity: .7; }
.td-switch:focus-visible { outline: 2px solid #4c8dff; outline-offset: 1px; border-radius: 999px; }
.td-track {
  position: relative; width: 26px; height: 15px; border-radius: 999px;
  background: rgba(127,127,127,.45); transition: background .15s ease;
}
.td-knob {
  position: absolute; top: 1.5px; left: 1.5px; width: 12px; height: 12px;
  border-radius: 50%; background: #fff; transition: transform .15s ease;
}
.td-switch[aria-checked="true"] .td-track { background: var(--accent, #2f7cf6); }
.td-switch[aria-checked="true"] .td-knob { transform: translateX(11px); }
.td-label { white-space: nowrap; }
.td-switch[data-state="error"] .td-label { color: #d9534f; }
.td-setup {
  position: fixed; width: 268px; padding: 12px;
  border-radius: 12px; background: Canvas; color: CanvasText;
  border: 1px solid rgba(127,127,127,.28);
  box-shadow: 0 12px 32px rgba(0,0,0,.28);
  font: 12px/1.5 var(--font-body, system-ui, sans-serif);
  z-index: 2147483001;
}
.td-setup[hidden] { display: none; }
.td-setup-title { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.td-setup-title span { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; opacity: .55; }
.td-setup-close { border: 0; background: transparent; color: inherit; cursor: pointer; opacity: .6; font-size: 14px; }
.td-row { display: grid; grid-template-columns: 48px 22px 1fr 22px; gap: 6px; align-items: center; margin-bottom: 6px; }
.td-group { margin: 8px 0 4px; font-size: 10px; letter-spacing: .08em; opacity: .55; }
.td-step { width: 22px; height: 22px; border-radius: 6px; border: 1px solid rgba(127,127,127,.4); background: transparent; color: inherit; cursor: pointer; line-height: 1; }
.td-val { text-align: center; font-variant-numeric: tabular-nums; opacity: .85; }
input.td-val {
  width: 100%; height: 22px; text-align: center; font: inherit;
  font-variant-numeric: tabular-nums; color: inherit;
  background: transparent; border: 1px solid rgba(127,127,127,.35);
  border-radius: 6px; padding: 0 2px;
}
input.td-val:focus { outline: 2px solid #4c8dff; outline-offset: 1px; opacity: 1; }
.td-actions { display: flex; gap: 6px; margin-top: 10px; }
.td-btn { flex: 1; height: 26px; border-radius: 8px; border: 1px solid rgba(127,127,127,.4); background: transparent; color: inherit; cursor: pointer; }
.td-btn.primary { background: #4c8dff; border-color: transparent; color: #fff; }
`;
function registry() {
  const existing = window.__openclawTypedDecisions;
  if (existing) return existing;
  const state = {
    mounted: false,
    sessionKey: null,
    agentId: null,
    checked: null,
    pending: false,
    placement: { anchored: false, offset: { ...DEFAULT_OFFSET }, left: null, top: null, anchor: null },
    hitTest: { ok: null, x: 0, y: 0, blocking: null },
    lastError: null,
    errorKind: null,
    writes: 0,
    updatedAt: null,
    loopTicks: 0,
    lastLoopAt: null,
    places: 0,
    lastPlaceAt: null,
    reason: "none",
    candidates: 0,
    hiddenCandidates: 0,
    anchorDetail: null,
    placementError: null
  };
  const elements = [];
  const entry = {
    state,
    probe: () => ({
      ...state,
      placement: { ...state.placement, offset: { ...state.placement.offset } },
      hitTest: { ...state.hitTest }
    }),
    elements: () => [...elements],
    add: (element) => {
      if (elements.indexOf(element) < 0) elements.push(element);
    },
    drop: (element) => {
      const index = elements.indexOf(element);
      if (index >= 0) elements.splice(index, 1);
    },
    nudge: (dx, dy) => {
      state.placement.offset.x += dx;
      state.placement.offset.y += dy;
      for (const element of elements) element.dispatchEvent(new Event("td:reposition"));
      return { ...state.placement.offset };
    }
  };
  window.__openclawTypedDecisions = entry;
  return entry;
}
function describe(element) {
  if (!element) return null;
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const cls = typeof element.className === "string" && element.className ? `.${element.className.trim().split(/\s+/).slice(0, 2).join(".")}` : "";
  return `${tag}${id}${cls}`;
}
function isReallyVisible(element) {
  const probe = element;
  if (typeof probe.checkVisibility === "function") {
    try {
      return probe.checkVisibility({ checkOpacity: true });
    } catch {
    }
  }
  let node = element;
  for (let depth = 0; node && depth < 40; depth += 1) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    node = node.parentElement;
  }
  return true;
}
function widerAncestor(element) {
  const width = element.getBoundingClientRect().width;
  let node = element.parentElement;
  for (let depth = 0; node && depth < 4; depth += 1) {
    if (node.getBoundingClientRect().width > width + 1) return node;
    node = node.parentElement;
  }
  return node;
}
function findPlacement(container, button, offset, cached) {
  const areas = Array.from(document.querySelectorAll("textarea")).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 120 && rect.height > 0 && element.offsetParent !== null;
  });
  if (areas.length === 0) return null;
  const ownPane = container.closest(PANE_SELECTOR);
  const ranked = areas.length === 1 ? [{ element: areas[0], width: 0, visible: true, samePane: true }] : areas.map((element) => ({
    element,
    width: element.getBoundingClientRect().width,
    visible: isReallyVisible(element),
    samePane: ownPane !== null && element.closest(PANE_SELECTOR) === ownPane
  })).sort((a, b) => {
    if (a.samePane !== b.samePane) return a.samePane ? -1 : 1;
    if (a.visible !== b.visible) return a.visible ? -1 : 1;
    return b.width - a.width;
  });
  const textarea = ranked[0].element;
  const candidates = ranked.length;
  const hiddenCandidates = ranked.filter((candidate) => !candidate.visible).length;
  const shell = textarea.closest(COMPOSER_SHELL_SELECTOR);
  let box = (shell ?? textarea).getBoundingClientRect();
  let node = shell ?? textarea;
  if (!shell) {
    const limit = Math.min(window.innerHeight * 0.5, 480);
    for (let depth = 0; depth < 8 && node.parentElement; depth += 1) {
      const parent = node.parentElement;
      const rect = parent.getBoundingClientRect();
      if (rect.width + 4 < box.width) break;
      if (rect.height > limit) break;
      box = rect;
      node = parent;
    }
  }
  const isVisible = (element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };
  const rowBand = textarea.getBoundingClientRect();
  const inRow = (element) => {
    const rect = element.getBoundingClientRect();
    const centre = rect.top + rect.height / 2;
    return centre >= rowBand.top - 16 && centre <= rowBand.bottom + 16;
  };
  const buttons = Array.from(node.querySelectorAll("button")).filter(isVisible).filter(inRow);
  const trailing = buttons[buttons.length - 1];
  const trailingRect = trailing?.getBoundingClientRect();
  const own = button.getBoundingClientRect();
  const top = trailingRect && trailingRect.height > 0 ? Math.round(trailingRect.top + (trailingRect.height - own.height) / 2) : Math.round(box.bottom - offset.y - own.height);
  let admission = cached.admission;
  if (!admission || !admission.isConnected || !isVisible(admission)) {
    admission = null;
    if (Date.now() - cached.at > 2e3) {
      cached.at = Date.now();
      const matches = Array.from(node.querySelectorAll("*")).filter((element) => {
        const text = (element.textContent ?? "").trim();
        return text.length > 0 && ADMISSION_LABEL.test(text);
      }).filter(inRow);
      const tightest = matches.filter(
        (element) => !matches.some((other) => other !== element && element.contains(other))
      );
      tightest.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width);
      for (const candidate of tightest) {
        const control = candidate.closest("button, [role='button']") ?? candidate;
        const anchor = node.contains(control) ? control : candidate;
        if (isVisible(anchor)) {
          admission = anchor;
          break;
        }
      }
      cached.admission = admission;
    }
  }
  const frame = (shell ?? node).getBoundingClientRect();
  const clamp = (value, min, max) => Math.round(Math.min(Math.max(value, min), Math.max(min, max)));
  const rawLeft = admission ? Math.round(admission.getBoundingClientRect().right + DEFAULT_GAP) : Math.round(box.left + offset.x);
  const left = clamp(rawLeft, frame.left + 4, frame.right - own.width - 4);
  const placementTop = clamp(top, frame.top, frame.bottom - own.height);
  const anchorDetail = admission ? `${describe(admission)} right=${Math.round(admission.getBoundingClientRect().right)}` : null;
  if (admission) {
    return {
      left,
      top: placementTop,
      label: "after-admission",
      box: node,
      anchor: admission,
      candidates,
      hiddenCandidates,
      anchorDetail
    };
  }
  return {
    left,
    top: placementTop,
    label: "composer-offset",
    box: node,
    anchor: null,
    candidates,
    hiddenCandidates,
    anchorDetail
  };
}
var METRICS_METHOD = "typed-decisions.metrics";
var control_ui_default = defineControlUiPlugin({
  id: PLUGIN_ID,
  activate(host) {
    const probe = registry();
    const state = probe.state;
    try {
      host.ui.registerWidget({
        id: "sys-status",
        label: "\u7CFB\u7EDF\u76D1\u63A7",
        mount(container) {
          const root = container.attachShadow ? container.attachShadow({ mode: "open" }) : container;
          root.innerHTML = SYS_STATUS_MARKUP;
          const widget = root.querySelector('[id="oa-sys"]');
          if (!widget) {
            container.textContent = "\u7CFB\u7EDF\u76D1\u63A7\u7EC4\u4EF6\u6302\u8F7D\u5931\u8D25\uFF1A\u627E\u4E0D\u5230\u6839\u8282\u70B9\u3002";
            return;
          }
          renderSysStatus(widget, {
            read: (id, params) => host.request(id, params ?? {}),
            metrics: () => host.request(METRICS_METHOD)
          });
          return { dispose() {
            root.innerHTML = "";
          } };
        }
      });
    } catch (error) {
      console.warn("[typed-decisions] sys-status board widget unavailable", error);
    }
    host.ui.registerAccessory({
      id: "decision-intervention",
      placement: "session-header",
      mount(container, context) {
        const props = context.props ?? {};
        const readKey = () => typeof props.sessionKey === "string" && props.sessionKey || typeof props.key === "string" && props.key || host.sessions.selectedKey || null;
        const readAgent = () => typeof props.agentId === "string" && props.agentId || null;
        let sessionKey = readKey();
        let agentId = readAgent();
        let checked = false;
        let pending = false;
        let disposed = false;
        let presented = context.presented !== false;
        let probeTimer;
        let probeDeadline = 0;
        let frame = 0;
        const root = container.attachShadow ? container.attachShadow({ mode: "open" }) : container;
        const style = document.createElement("style");
        style.textContent = STYLE;
        const button = document.createElement("button");
        button.type = "button";
        button.className = "td-switch";
        button.setAttribute("role", "switch");
        button.setAttribute("aria-checked", "false");
        button.setAttribute("aria-label", LABEL);
        const track = document.createElement("span");
        track.className = "td-track";
        const knob = document.createElement("span");
        knob.className = "td-knob";
        track.append(knob);
        const label = document.createElement("span");
        label.className = "td-label";
        label.textContent = LABEL;
        button.append(track, label);
        root.append(style, button);
        let liveStyle = readStyle();
        const setup = document.createElement("div");
        setup.className = "td-setup";
        setup.hidden = true;
        const row = (label2, key) => `
          <div class="td-row"><label>${label2}</label><button class="td-step" type="button" data-k="${key}" data-d="-0.1">\u2212</button><input class="td-val" type="number" step="0.1" inputmode="decimal" data-v="${key}" /><button class="td-step" type="button" data-k="${key}" data-d="0.1">+</button></div>`;
        setup.innerHTML = `
          <div class="td-setup-title"><span>\u51B3\u7B56\u4ECB\u5165 \xB7 \u5916\u89C2</span><button class="td-setup-close" type="button" data-act="close" aria-label="\u5173\u95ED">\xD7</button></div>
          ${row("\u5B57\u53F7", "fontSize")}
          <div class="td-group">\u6309\u94AE</div>
          ${row("\u5DE6\u53F3", "buttonDx")}
          ${row("\u4E0A\u4E0B", "buttonDy")}
          <div class="td-group">\u6587\u5B57</div>
          ${row("\u5DE6\u53F3", "labelDx")}
          ${row("\u4E0A\u4E0B", "labelDy")}
          <div class="td-group">\u6574\u4F53</div>
          ${row("\u5DE6\u53F3", "dx")}
          ${row("\u4E0A\u4E0B", "dy")}
          <div class="td-actions"><button class="td-btn" type="button" data-act="reset">\u6062\u590D\u9ED8\u8BA4</button><button class="td-btn primary" type="button" data-act="save">\u4FDD\u5B58</button></div>
        `;
        root.append(setup);
        const syncSetup = () => {
          for (const key of STYLE_KEYS) {
            const field = setup.querySelector(`[data-v="${key}"]`);
            if (field) field.value = liveStyle[key].toFixed(1);
          }
        };
        const commitField = (key, raw) => {
          const parsed = Number(raw);
          if (!Number.isFinite(parsed)) {
            syncSetup();
            return;
          }
          const value = key === "fontSize" ? Math.max(1, round1(parsed)) : round1(parsed);
          liveStyle = { ...liveStyle, [key]: value };
          syncSetup();
          applyStyle();
        };
        setup.addEventListener("change", (event) => {
          const field = event.target;
          const key = field?.dataset?.v;
          if (!field || !key || !STYLE_KEYS.includes(key)) return;
          commitField(key, field.value);
        });
        setup.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          const field = event.target;
          const key = field?.dataset?.v;
          if (!field || !key) return;
          event.preventDefault();
          commitField(key, field.value);
          field.blur();
        });
        const paintStyle = () => {
          button.style.fontSize = `${liveStyle.fontSize}px`;
          track.style.transform = `translate(${liveStyle.buttonDx}px, ${liveStyle.buttonDy}px)`;
          label.style.transform = `translate(${liveStyle.labelDx}px, ${liveStyle.labelDy}px)`;
        };
        const applyStyle = () => {
          paintStyle();
          applied.left = Number.NaN;
          applied.top = Number.NaN;
          safePlace();
        };
        paintStyle();
        const positionSetup = () => {
          if (setup.hidden) return;
          const rect = container.getBoundingClientRect();
          setup.style.left = `${Math.round(Math.max(8, Math.min(rect.left, window.innerWidth - 284)))}px`;
          setup.style.bottom = `${Math.round(window.innerHeight - rect.top + 8)}px`;
        };
        const toggleSetup = (show) => {
          setup.hidden = !show;
          if (show) {
            syncSetup();
            positionSetup();
          }
        };
        setup.addEventListener("click", (event) => {
          const target = event.target?.closest?.("button");
          if (!target) return;
          event.preventDefault();
          event.stopPropagation();
          const act = target.dataset.act;
          if (act === "close") {
            toggleSetup(false);
            return;
          }
          if (act === "save") {
            writeStyle(liveStyle);
            target.textContent = "\u5DF2\u4FDD\u5B58";
            setTimeout(() => {
              target.textContent = "\u4FDD\u5B58";
            }, 900);
            return;
          }
          if (act === "reset") {
            liveStyle = { ...DEFAULT_STYLE };
            writeStyle(null);
            syncSetup();
            applyStyle();
            return;
          }
          const key = target.dataset.k;
          const step = Number(target.dataset.d);
          if (!key || !Number.isFinite(step)) return;
          if (!STYLE_KEYS.includes(key)) return;
          const next = round1(liveStyle[key] + step);
          liveStyle = { ...liveStyle, [key]: key === "fontSize" ? Math.max(1, next) : next };
          syncSetup();
          applyStyle();
        });
        const onShortcut = (event) => {
          if (!event.ctrlKey || !event.altKey) return;
          if (event.key !== "d" && event.key !== "D") return;
          event.preventDefault();
          toggleSetup(setup.hidden === true);
        };
        document.addEventListener("keydown", onShortcut, true);
        const openable = probe;
        openable.openSettings = (show = true) => toggleSetup(show);
        const admissionCache = { admission: null, at: 0 };
        const applied = { left: Number.NaN, top: Number.NaN };
        let observedBox = null;
        let observedAnchor = null;
        let observedContainer = null;
        const place = () => {
          if (disposed) return;
          if (!presented) {
            container.style.display = "none";
            return;
          }
          const ownPane = container.closest(PANE_SELECTOR);
          if (ownPane && !ownPane.classList.contains(PANE_VISIBLE_CLASS)) {
            container.style.display = "none";
            return;
          }
          container.style.display = "";
          const target = findPlacement(container, button, state.placement.offset, admissionCache);
          if (!target) {
            applied.left = Number.NaN;
            applied.top = Number.NaN;
            state.reason = "none";
            state.candidates = 0;
            state.hiddenCandidates = 0;
            state.anchorDetail = null;
            state.placement = {
              anchored: false,
              offset: { ...state.placement.offset },
              left: null,
              top: null,
              anchor: null
            };
            container.style.position = "";
            container.style.left = "";
            container.style.top = "";
            container.style.zIndex = "";
            return;
          }
          if (target.box !== observedBox) {
            if (observedBox) observer?.unobserve(observedBox);
            observedBox = target.box;
            observer?.observe(target.box);
          }
          if (target.anchor !== observedAnchor) {
            if (observedAnchor) observer?.unobserve(observedAnchor);
            observedAnchor = target.anchor;
            if (target.anchor) observer?.observe(target.anchor);
          }
          const paneObserverTarget = widerAncestor(target.box);
          if (paneObserverTarget !== observedContainer) {
            if (observedContainer) observer?.unobserve(observedContainer);
            observedContainer = paneObserverTarget;
            if (paneObserverTarget) observer?.observe(paneObserverTarget);
          }
          state.placement = {
            anchored: true,
            offset: { ...state.placement.offset },
            left: round1(target.left + liveStyle.dx),
            top: round1(target.top + liveStyle.dy),
            anchor: target.label
          };
          state.reason = target.label;
          state.candidates = target.candidates;
          state.hiddenCandidates = target.hiddenCandidates;
          state.anchorDetail = target.anchorDetail;
          positionSetup();
          const left = state.placement.left;
          const top = state.placement.top;
          if (applied.left === left && applied.top === top && container.style.position === "fixed") {
            return;
          }
          state.places += 1;
          state.lastPlaceAt = Date.now();
          applied.left = left;
          applied.top = top;
          container.style.position = "fixed";
          container.style.left = `${left}px`;
          container.style.top = `${top}px`;
          container.style.zIndex = String(Z_INDEX);
        };
        const safePlace = () => {
          try {
            place();
          } catch (error) {
            state.placementError = error instanceof Error ? error.message : String(error);
            console.warn(`[${PLUGIN_ID}] \u5B9A\u4F4D\u5931\u8D25\uFF1A${state.placementError}`);
          }
        };
        const POLL_MS = 250;
        let lastSync = 0;
        let lastSignature = "";
        const trackedSignature = () => {
          if (!observedBox) return "";
          const box = observedBox.getBoundingClientRect();
          const anchor = observedAnchor?.getBoundingClientRect();
          const anchorKey = anchor ? `${Math.round(anchor.left)},${Math.round(anchor.top)}` : "";
          return `${Math.round(box.left)},${Math.round(box.top)},${Math.round(box.width)},${Math.round(box.height)}|${anchorKey}`;
        };
        const syncNow = () => {
          lastSync = Date.now();
          safePlace();
          lastSignature = trackedSignature();
        };
        const follow = () => {
          lastSignature = "";
        };
        const loop = () => {
          if (disposed) return;
          frame = requestAnimationFrame(loop);
          state.loopTicks += 1;
          state.lastLoopAt = Date.now();
          if (trackedSignature() !== lastSignature || Date.now() - lastSync >= POLL_MS) {
            syncNow();
          }
        };
        const render = () => {
          button.setAttribute("aria-checked", checked ? "true" : "false");
          button.disabled = pending;
          button.dataset.state = state.errorKind === "write" ? "error" : "ok";
          button.title = state.lastError ? `${LABEL}\uFF1A${state.lastError}` : `${LABEL}\uFF1A${checked ? "\u5F00" : "\u5173"}\uFF08\u672C\u4F1A\u8BDD\uFF09`;
          state.mounted = true;
          state.sessionKey = sessionKey;
          state.agentId = agentId;
          state.checked = checked;
          state.pending = pending;
          state.updatedAt = Date.now();
          probe.add(button);
          follow();
        };
        const hitTest = () => {
          const rect = button.getBoundingClientRect();
          const x = Math.round(rect.left + rect.width / 2);
          const y = Math.round(rect.top + rect.height / 2);
          if (rect.width === 0 || rect.height === 0) {
            state.hitTest = { ok: false, x, y, blocking: "not-rendered" };
            return;
          }
          const top = document.elementFromPoint(x, y);
          const hits = Boolean(top && (top === container || container.contains(top) || top === button));
          state.hitTest = { ok: hits, x, y, blocking: hits ? null : describe(top) };
          if (!hits && top) {
            console.warn(
              `[${PLUGIN_ID}] \u51B3\u7B56\u4ECB\u5165\u5F00\u5173\u88AB\u9875\u9762\u5143\u7D20\u906E\u6321\uFF1A(${x},${y}) \u547D\u4E2D ${describe(top)}`
            );
          }
        };
        const tick = () => {
          if (disposed) return;
          if (Date.now() > probeDeadline) {
            if (probeTimer) clearInterval(probeTimer);
            probeTimer = void 0;
            return;
          }
          safePlace();
          hitTest();
        };
        const startProbe = () => {
          probeDeadline = Date.now() + PROBE_WINDOW_MS;
          if (probeTimer) clearInterval(probeTimer);
          probeTimer = setInterval(tick, PROBE_INTERVAL_MS);
          requestAnimationFrame(tick);
        };
        const reposition = () => {
          safePlace();
          follow();
        };
        const readState = async () => {
          if (!sessionKey) return;
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const response = await host.request("plugins.sessionAction", {
                pluginId: PLUGIN_ID,
                actionId: SESSION_ACTION_ID,
                sessionKey,
                agentId: agentId ?? void 0,
                payload: {}
              });
              if (disposed) return;
              if (response && response.ok === false) throw new Error(response.error ?? "read-failed");
              checked = response?.result?.enabled === true;
              if (response?.result?.showSetup === true) toggleSetup(true);
              state.lastError = null;
              state.errorKind = null;
              render();
              return;
            } catch (error) {
              if (disposed) return;
              state.lastError = error instanceof Error ? error.message : String(error);
              state.errorKind = "read";
              console.warn(`[${PLUGIN_ID}] \u8BFB\u53D6\u51B3\u7B56\u4ECB\u5165\u72B6\u6001\u5931\u8D25\uFF1A${state.lastError}`);
              if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
          render();
        };
        const writeState = async (next) => {
          if (!sessionKey) return;
          pending = true;
          render();
          try {
            await host.request("sessions.pluginPatch", {
              key: sessionKey,
              agentId: agentId ?? void 0,
              pluginId: PLUGIN_ID,
              namespace: NAMESPACE,
              value: { enabled: next }
            });
            checked = next;
            state.lastError = null;
            state.errorKind = null;
            state.writes += 1;
          } catch (error) {
            state.lastError = error instanceof Error ? error.message : String(error);
            state.errorKind = "write";
            console.warn(`[${PLUGIN_ID}] \u5199\u5165\u51B3\u7B56\u4ECB\u5165\u72B6\u6001\u5931\u8D25\uFF1A${state.lastError}`);
          }
          pending = false;
          render();
          hitTest();
        };
        button.addEventListener("click", () => {
          if (pending) return;
          void writeState(!checked);
        });
        button.addEventListener("td:reposition", reposition);
        const onLayout = () => follow();
        const onScroll = () => syncNow();
        window.addEventListener("resize", onLayout);
        window.addEventListener("scroll", onScroll, { passive: true, capture: true });
        document.addEventListener("fullscreenchange", onLayout);
        window.visualViewport?.addEventListener("resize", onLayout);
        window.visualViewport?.addEventListener("scroll", onScroll);
        const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => syncNow()) : void 0;
        observer?.observe(document.documentElement);
        const WATCHDOG_MS = 400;
        const watchdog = setInterval(() => {
          if (disposed) return;
          safePlace();
          lastSignature = trackedSignature();
        }, WATCHDOG_MS);
        document.addEventListener("visibilitychange", onLayout);
        window.addEventListener("pageshow", onLayout);
        render();
        startProbe();
        const setupPoll = setInterval(() => {
          if (disposed || !setup.hidden) return;
          void readState();
        }, 15e3);
        void readState();
        frame = requestAnimationFrame(loop);
        return {
          update(next) {
            const nextProps = next.props ?? {};
            const nextKey = typeof nextProps.sessionKey === "string" && nextProps.sessionKey || typeof nextProps.key === "string" && nextProps.key || null;
            const nextAgent = typeof nextProps.agentId === "string" && nextProps.agentId || null;
            presented = next.presented !== false;
            if (nextKey !== sessionKey || nextAgent !== agentId) {
              sessionKey = nextKey ?? sessionKey;
              agentId = nextAgent;
              checked = false;
              state.lastError = null;
              state.errorKind = null;
              render();
              void readState();
            } else {
              follow();
            }
            if (next.presented) startProbe();
          },
          focus() {
            button.focus();
          },
          dispose() {
            disposed = true;
            if (probeTimer) clearInterval(probeTimer);
            clearInterval(watchdog);
            clearInterval(setupPoll);
            document.removeEventListener("keydown", onShortcut, true);
            delete openable.openSettings;
            setup.remove();
            if (frame) cancelAnimationFrame(frame);
            observer?.disconnect();
            document.removeEventListener("visibilitychange", onLayout);
            window.removeEventListener("pageshow", onLayout);
            window.removeEventListener("resize", onLayout);
            window.removeEventListener("scroll", onScroll, { capture: true });
            document.removeEventListener("fullscreenchange", onLayout);
            window.visualViewport?.removeEventListener("resize", onLayout);
            window.visualViewport?.removeEventListener("scroll", onScroll);
            probe.drop(button);
            state.mounted = probe.elements().length > 0;
            button.remove();
          }
        };
      }
    });
  }
});
export {
  control_ui_default as default
};
