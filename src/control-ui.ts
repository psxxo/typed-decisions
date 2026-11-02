// Typed Decisions — native Control UI contribution.
//
// Contributes a session-header accessory that renders the「决策介入」switch and
// **relocates it by offset** into the chat composer row (bottom input area),
// keeping it visually on top of the message layer.
//
// Why offset instead of another registration surface: the Control UI offers
// exactly one accessory placement (`session-header`), so the control is mounted
// there and then positioned with `position: fixed` at coordinates derived from
// the composer, re-computed as the layout changes. A fixed element escapes
// ancestor clipping, and an explicit z-index keeps it above the app layers.
//
// Monitoring is built in: the component owns a probe that reports whether the
// switch is actually the topmost element at its own center
// (`document.elementFromPoint`), so an overlay stealing clicks is detected
// without repeated manual clicking. Tune the placement live with
// `window.__openclawTypedDecisions.nudge(dx, dy)`.
//
// Only the documented SDK subpath is imported; everything else is plain DOM.

import { defineControlUiPlugin, type ControlUiHost } from "openclaw/plugin-sdk/control-ui";

const PLUGIN_ID = "typed-decisions";
const NAMESPACE = "decision-intervention";
const SESSION_ACTION_ID = "decision-intervention.state";
const LABEL = "决策介入";
const Z_INDEX = 2147483000;
const PROBE_INTERVAL_MS = 3000;
const PROBE_WINDOW_MS = 60_000;

/** Distance from the composer box's left/bottom edges to the switch. */
const DEFAULT_OFFSET = { x: 61, y: 24 };

// Manual appearance for the switch: font size plus a free nudge, in 0.1px steps.
// Kept in localStorage so it survives reloads; the panel writes the same key.
const STYLE_KEY = "td-switch-style";
const DEFAULT_STYLE = { fontSize: 12, dx: 0, dy: 0, buttonDx: 0, buttonDy: 0, labelDx: 0, labelDy: 0 };
type SwitchStyle = typeof DEFAULT_STYLE;
const STYLE_KEYS = ["fontSize", "dx", "dy", "buttonDx", "buttonDy", "labelDx", "labelDy"] as const;

const round1 = (value: number): number => Math.round(value * 10) / 10;

/** Read the saved appearance, tolerating missing or malformed storage. */
function readStyle(): SwitchStyle {
  try {
    const raw = localStorage.getItem(STYLE_KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<SwitchStyle> | null) : null;
    const read = (key: keyof SwitchStyle) => {
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
      labelDy: read("labelDy"),
    };
  } catch {
    return { ...DEFAULT_STYLE };
  }
}

/** Persist an appearance; null restores the defaults. */
function writeStyle(style: SwitchStyle | null): void {
  try {
    if (style === null) localStorage.removeItem(STYLE_KEY);
    else localStorage.setItem(STYLE_KEY, JSON.stringify(style));
  } catch {
    // Storage may be unavailable; the in-memory value still applies.
  }
}
/** Gap between the admission control's right edge and the switch. */
const DEFAULT_GAP = 16;
/** Admission-control labels (the row control the switch sits after). */
const ADMISSION_LABEL = /完全访问|只读|保护|工作区|Full access|Read-only|Guarded|Workspace/;
/** The host stacks cached chat panes in one grid cell at `opacity: 0`. */
const PANE_SELECTOR = ".chat-pane-cache__pane";
const PANE_VISIBLE_CLASS = "chat-pane-cache__pane--visible";
/** The composer's own box; the anchor must never leave it. */
const COMPOSER_SHELL_SELECTOR = ".agent-chat__composer-shell";

type Offset = { x: number; y: number };

type Probe = {
  mounted: boolean;
  sessionKey: string | null;
  agentId: string | null;
  checked: boolean | null;
  pending: boolean;
  placement: {
    anchored: boolean;
    offset: Offset;
    left: number | null;
    top: number | null;
    anchor: string | null;
  };
  hitTest: { ok: boolean | null; x: number; y: number; blocking: string | null };
  lastError: string | null;
  errorKind: "read" | "write" | null;
  writes: number;
  updatedAt: number | null;
  /** Follow-loop diagnostics: is the animation-frame loop still running? */
  loopTicks: number;
  lastLoopAt: number | null;
  /** Placement diagnostics: what the last sync resolved to. */
  places: number;
  lastPlaceAt: number | null;
  reason: "none" | "after-admission" | "composer-offset";
  candidates: number;
  hiddenCandidates: number;
  anchorDetail: string | null;
  placementError: string | null;
};

type ProbeRegistry = {
  readonly state: Probe;
  probe: () => Probe;
  elements: () => HTMLElement[];
  add: (element: HTMLElement) => void;
  drop: (element: HTMLElement) => void;
  nudge: (dx: number, dy: number) => Offset;
};

declare global {
  interface Window {
    __openclawTypedDecisions?: ProbeRegistry;
  }
}

const STYLE = `
:host { display: inline-flex; align-items: center; }
.td-switch {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 3px 6px; border: 0; outline: none;
  background: transparent; color: inherit;
  font: inherit; font-size: 12px; line-height: 1.4;
  cursor: pointer; user-select: none; pointer-events: auto;
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
  z-index: 2147483001; pointer-events: auto;
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

function registry(): ProbeRegistry {
  const existing = window.__openclawTypedDecisions;
  if (existing) return existing;
  const state: Probe = {
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
    placementError: null,
  };
  const elements: HTMLElement[] = [];
  const entry: ProbeRegistry = {
    state,
    probe: () => ({
      ...state,
      placement: { ...state.placement, offset: { ...state.placement.offset } },
      hitTest: { ...state.hitTest },
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
    },
  };
  window.__openclawTypedDecisions = entry;
  return entry;
}

function describe(element: Element | null): string | null {
  if (!element) return null;
  const tag = element.tagName.toLowerCase();
  const id = element.id ? `#${element.id}` : "";
  const cls =
    typeof (element as HTMLElement).className === "string" && (element as HTMLElement).className
      ? `.${(element as HTMLElement).className.trim().split(/\s+/).slice(0, 2).join(".")}`
      : "";
  return `${tag}${id}${cls}`;
}

function isReallyVisible(element: Element): boolean {
  const probe = element as Element & {
    checkVisibility?: (options?: { checkOpacity?: boolean }) => boolean;
  };
  if (typeof probe.checkVisibility === "function") {
    try {
      return probe.checkVisibility({ checkOpacity: true });
    } catch {
      // Older engines reject the options bag; fall through to the manual walk.
    }
  }
  let node: Element | null = element;
  for (let depth = 0; node && depth < 40; depth += 1) {
    const style = window.getComputedStyle(node);
    if (style.display === "none" || style.visibility === "hidden" || style.opacity === "0") {
      return false;
    }
    node = node.parentElement;
  }
  return true;
}

/**
 * The nearest ancestor whose width tracks the pane/Сside panel (the composer
 * shell itself is capped by `max-width`, so a sidebar drag moves it without
 * resizing it).
 */
function widerAncestor(element: HTMLElement): HTMLElement | null {
  const width = element.getBoundingClientRect().width;
  let node: HTMLElement | null = element.parentElement;
  for (let depth = 0; node && depth < 4; depth += 1) {
    if (node.getBoundingClientRect().width > width + 1) return node;
    node = node.parentElement;
  }
  return node;
}

function findPlacement(
  container: HTMLElement,
  button: HTMLElement,
  offset: Offset,
  cached: { admission: Element | null; at: number },
): { left: number; top: number; label: "after-admission" | "composer-offset"; box: HTMLElement; anchor: Element | null; candidates: number; hiddenCandidates: number; anchorDetail: string | null } | null {
  const areas = Array.from(document.querySelectorAll("textarea")).filter((element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 120 && rect.height > 0 && element.offsetParent !== null;
  });
  if (areas.length === 0) return null;

  // A cached pane's composer keeps a real box (the pane is only translucent), so
  // the geometry filter above cannot tell it apart from the composer on screen.
  // Picking the widest textarea outright therefore latched onto a hidden pane's
  // composer, which never moves while the composer the owner is looking at does:
  // the switch looked correctly placed and then froze. Rank the pane that owns
  // this accessory first, then genuinely visible composers, then width.
  const ownPane = container.closest(PANE_SELECTOR);
  // The common case is exactly one composer on screen; skip the visibility
  // probes then — each one costs a style walk, and running them per candidate on
  // every placement showed up as lag while dragging the window.
  const ranked =
    areas.length === 1
      ? [{ element: areas[0], width: 0, visible: true, samePane: true }]
      : areas
          .map((element) => ({
            element,
            width: element.getBoundingClientRect().width,
            visible: isReallyVisible(element),
            samePane: ownPane !== null && element.closest(PANE_SELECTOR) === ownPane,
          }))
          .sort((a, b) => {
            if (a.samePane !== b.samePane) return a.samePane ? -1 : 1;
            if (a.visible !== b.visible) return a.visible ? -1 : 1;
            return b.width - a.width;
          });
  const textarea = ranked[0].element;
  const candidates = ranked.length;
  const hiddenCandidates = ranked.filter((candidate) => !candidate.visible).length;

  // Root everything in the composer's own shell. Walking up from the textarea
  // works on a settled chat pane, but on a freshly opened page the shell's
  // ancestor (a draft/launcher column) measures as wide as the shell, so the
  // walk kept climbing into a page container — and the control lookup then
  // latched onto an element outside the composer, pushing the switch past the
  // composer's right edge until the next reload. Scoping the box and the
  // control lookups to the shell keeps the switch inside the composer whatever
  // the surrounding layout is doing.
  const shell = textarea.closest(COMPOSER_SHELL_SELECTOR) as HTMLElement | null;
  let box = (shell ?? textarea).getBoundingClientRect();
  let node: HTMLElement = shell ?? textarea;
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

  const isVisible = (element: Element) => {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  };

  // Anything inside the composer shell but outside the input's own row — a task
  // progress card, a queued-message banner — donates its own buttons (collapse,
  // delete) and its own text as candidates, which moved the switch up onto the
  // card and right onto the model picker. Scope every candidate to the row band.
  const rowBand = textarea.getBoundingClientRect();
  const inRow = (element: Element) => {
    const rect = element.getBoundingClientRect();
    const centre = rect.top + rect.height / 2;
    return centre >= rowBand.top - 16 && centre <= rowBand.bottom + 16;
  };

  // Vertical: centre on the row's own trailing control (send/mic), which is a
  // stable structural anchor regardless of how the box's height is composed.
  const buttons = Array.from(node.querySelectorAll("button")).filter(isVisible).filter(inRow);
  const trailing = buttons[buttons.length - 1];
  const trailingRect = trailing?.getBoundingClientRect();
  const own = button.getBoundingClientRect();
  const top = trailingRect && trailingRect.height > 0
    ? Math.round(trailingRect.top + (trailingRect.height - own.height) / 2)
    : Math.round(box.bottom - offset.y - own.height);

  // Horizontal: after the admission control when we can find it, else a plain
  // offset from the composer box's left edge. The lookup is cached briefly.
  let admission = cached.admission;
  if (!admission || !admission.isConnected || !isVisible(admission)) {
    admission = null;
    if (Date.now() - cached.at > 2000) {
      cached.at = Date.now();
      // The Control UI renders some chips through custom elements, so match on
      // every element and keep only the tightest matches: a container that
      // merely wraps the chip must never capture the anchor, or the switch
      // lands at the container's right edge — outside the composer.
      const matches = Array.from(node.querySelectorAll("*")).filter((element) => {
        const text = (element.textContent ?? "").trim();
        return text.length > 0 && ADMISSION_LABEL.test(text);
      }).filter(inRow);
      const tightest = matches.filter(
        (element) => !matches.some((other) => other !== element && element.contains(other)),
      );
      tightest.sort((a, b) => a.getBoundingClientRect().width - b.getBoundingClientRect().width);
      for (const candidate of tightest) {
        const control = (candidate.closest("button, [role='button']") ?? candidate) as Element;
        const anchor = node.contains(control) ? control : candidate;
        if (isVisible(anchor)) {
          admission = anchor;
          break;
        }
      }
      cached.admission = admission;
    }
  }

  // Whatever the anchor resolved to, the control belongs inside the composer:
  // clamp it, so a wrapper that slips through can never park the switch outside
  // the box the owner is looking at.
  const frame = (shell ?? node).getBoundingClientRect();
  const clamp = (value: number, min: number, max: number) =>
    Math.round(Math.min(Math.max(value, min), Math.max(min, max)));
  const rawLeft = admission
    ? Math.round(admission.getBoundingClientRect().right + DEFAULT_GAP)
    : Math.round(box.left + offset.x);
  const left = clamp(rawLeft, frame.left + 4, frame.right - own.width - 4);
  const placementTop = clamp(top, frame.top, frame.bottom - own.height);
  const anchorDetail = admission
    ? `${describe(admission)} right=${Math.round(admission.getBoundingClientRect().right)}`
    : null;

  if (admission) {
    return {
      left,
      top: placementTop,
      label: "after-admission",
      box: node,
      anchor: admission,
      candidates,
      hiddenCandidates,
      anchorDetail,
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
    anchorDetail,
  };
}

import { SYS_STATUS_MARKUP, renderSysStatus } from "./generated-sys-status-html.js";

/** Same-origin plugin method the widget reads host metrics through. */
const METRICS_METHOD = "typed-decisions.metrics";

export default defineControlUiPlugin({
  id: PLUGIN_ID,
  activate(host: ControlUiHost) {
    const probe = registry();
    const state = probe.state;

    // Board widget for this plugin's board kind (typed-decisions:sys-status).
    // Guarded: a rejected registration must never abort activate() and take the
    // accessory below with it (that regression happened once).
    try {
      host.ui.registerWidget({
        id: "sys-status",
        label: "系统监控",
        mount(container) {
          // Shadow DOM isolates the fragment from the Control UI page's own
          // stylesheet. In the light DOM the host's design-system rules (it
          // ships classes such as `.badge` and `.metric` with their own font
          // family and sizes) land on this widget's inner elements, which the
          // sandboxed HTML lane never risked. Theme custom properties still
          // inherit through the shadow boundary, so `var(--text)` /
          // `var(--font-body)` keep resolving. The logic ships in this bundle
          // because the page CSP is `script-src 'self'`, and data comes from
          // the plugin host because `connect-src` excludes the metrics origin.
          const root: HTMLElement | ShadowRoot = container.attachShadow
            ? container.attachShadow({ mode: "open" })
            : container;
          root.innerHTML = SYS_STATUS_MARKUP;
          const widget = root.querySelector('[id="oa-sys"]') as HTMLElement | null;
          if (!widget) {
            container.textContent = "系统监控组件挂载失败：找不到根节点。";
            return;
          }
          renderSysStatus(widget, {
            read: (id, params) => host.request(id, params ?? {}),
            metrics: () => host.request(METRICS_METHOD),
          });
          return { dispose() { root.innerHTML = ""; } };
        },
      });
    } catch (error) {
      console.warn("[typed-decisions] sys-status board widget unavailable", error);
    }

    host.ui.registerAccessory({
      id: "decision-intervention",
      placement: "session-header",
      mount(container, context) {
        const props = (context.props ?? {}) as Record<string, unknown>;
        const readKey = () =>
          (typeof props.sessionKey === "string" && props.sessionKey) ||
          (typeof props.key === "string" && props.key) ||
          host.sessions.selectedKey ||
          null;
        const readAgent = () => (typeof props.agentId === "string" && props.agentId) || null;

        let sessionKey = readKey();
        let agentId = readAgent();
        let checked = false;
        let pending = false;
        let disposed = false;
        let presented = context.presented !== false;
        let probeTimer: ReturnType<typeof setInterval> | undefined;
        let probeDeadline = 0;
        let frame = 0;

        const root = container.attachShadow ? container.attachShadow({ mode: "open" }) : container;
        // The host accessory is a full-row box; once fixed-positioned, its
        // invisible width would stretch to the composer's right controls and
        // swallow clicks meant for send/mic. Pin the box to its content and
        // let only the switch and the setup panel receive pointer events.
        container.style.setProperty("width", "max-content", "important");
        container.style.setProperty("height", "max-content", "important");
        container.style.setProperty("pointer-events", "none", "important");
        container.style.setProperty("right", "auto", "important");
        container.style.setProperty("bottom", "auto", "important");
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

        // Appearance panel: font size and a free 0.1px nudge, saved to
        // localStorage and applied to this switch only. The panel never moves
        // the control's hit area: the offset shifts the placed box itself, and
        // the font size only changes the type.
        let liveStyle = readStyle();

        const setup = document.createElement("div");
        setup.className = "td-setup";
        setup.hidden = true;
        const row = (label: string, key: keyof SwitchStyle) => `
          <div class="td-row"><label>${label}</label><button class="td-step" type="button" data-k="${key}" data-d="-0.1">−</button><input class="td-val" type="number" step="0.1" inputmode="decimal" data-v="${key}" /><button class="td-step" type="button" data-k="${key}" data-d="0.1">+</button></div>`;
        setup.innerHTML = `
          <div class="td-setup-title"><span>决策介入 · 外观</span><button class="td-setup-close" type="button" data-act="close" aria-label="关闭">×</button></div>
          ${row("字号", "fontSize")}
          <div class="td-group">按钮</div>
          ${row("左右", "buttonDx")}
          ${row("上下", "buttonDy")}
          <div class="td-group">文字</div>
          ${row("左右", "labelDx")}
          ${row("上下", "labelDy")}
          <div class="td-group">整体</div>
          ${row("左右", "dx")}
          ${row("上下", "dy")}
          <div class="td-actions"><button class="td-btn" type="button" data-act="reset">恢复默认</button><button class="td-btn primary" type="button" data-act="save">保存</button></div>
        `;
        root.append(setup);

        const syncSetup = () => {
          for (const key of STYLE_KEYS) {
            const field = setup.querySelector(`[data-v="${key}"]`) as HTMLInputElement | null;
            if (field) field.value = liveStyle[key].toFixed(1);
          }
        };

        /** Apply a value typed straight into the field. */
        const commitField = (key: keyof SwitchStyle, raw: string) => {
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
          const field = event.target as HTMLInputElement | null;
          const key = field?.dataset?.v as keyof SwitchStyle | undefined;
          if (!field || !key || !(STYLE_KEYS as readonly string[]).includes(key)) return;
          commitField(key, field.value);
        });
        setup.addEventListener("keydown", (event) => {
          if (event.key !== "Enter") return;
          const field = event.target as HTMLInputElement | null;
          const key = field?.dataset?.v as keyof SwitchStyle | undefined;
          if (!field || !key) return;
          event.preventDefault();
          commitField(key, field.value);
          field.blur();
        });

        /** Paint the saved values onto the switch's own parts. */
        const paintStyle = () => {
          button.style.fontSize = `${liveStyle.fontSize}px`;
          // The button offset is folded into the placed BOX (see `place`), not
          // applied as a transform. Nudging only the painted track moved the
          // pixels while the real box — the click target and the native title
          // tooltip anchor — stayed at the old coordinate: empty space near
          // the send button toggled the switch and the hint popped up there.
          // Moving the box keeps paint, hit area and tooltip on one pixel.
          button.style.transform = "";
          // The label rides with the box, so only the part of its offset that
          // differs from the button's remains, measured from the same origin.
          label.style.transform = `translate(${liveStyle.labelDx - liveStyle.buttonDx}px, ${liveStyle.labelDy - liveStyle.buttonDy}px)`;
        };

        /** Push the in-memory appearance onto the control and re-place it. */
        const applyStyle = () => {
          paintStyle();
          applied.left = Number.NaN;
          applied.top = Number.NaN;
          safePlace();
        };
        // Paint only: `applied`/`safePlace` are declared further down, and the
        // first placement happens on its own during mount.
        paintStyle();

        /** Anchor the panel above the switch so it never covers the control. */
        const positionSetup = () => {
          if (setup.hidden) return;
          // Anchor to the switch the owner can see, not to the accessory slot:
          // the button carries the nudge, so the container box may sit elsewhere.
          const rect = button.getBoundingClientRect();
          setup.style.left = `${Math.round(Math.max(8, Math.min(rect.left, window.innerWidth - 284)))}px`;
          setup.style.bottom = `${Math.round(window.innerHeight - rect.top + 8)}px`;
        };

        const toggleSetup = (show: boolean) => {
          setup.hidden = !show;
          if (show) {
            syncSetup();
            positionSetup();
          }
        };

        setup.addEventListener("click", (event) => {
          const target = (event.target as Element | null)?.closest?.("button") as HTMLButtonElement | null;
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
            target.textContent = "已保存";
            setTimeout(() => {
              target.textContent = "保存";
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
          const key = target.dataset.k as keyof SwitchStyle | undefined;
          const step = Number(target.dataset.d);
          if (!key || !Number.isFinite(step)) return;
          if (!(STYLE_KEYS as readonly string[]).includes(key)) return;
          const next = round1(liveStyle[key] + step);
          liveStyle = { ...liveStyle, [key]: key === "fontSize" ? Math.max(1, next) : next };
          syncSetup();
          applyStyle();
        });

        // Ctrl+Alt+D toggles the panel; the registry hook lets an agent summon it.
        const onShortcut = (event: KeyboardEvent) => {
          if (!event.ctrlKey || !event.altKey) return;
          if (event.key !== "d" && event.key !== "D") return;
          event.preventDefault();
          toggleSetup(setup.hidden === true);
        };
        document.addEventListener("keydown", onShortcut, true);
        const openable = probe as typeof probe & { openSettings?: (show?: boolean) => void };
        openable.openSettings = (show = true) => toggleSetup(show);

        // Places the control in the composer toolbar row; falls back to the
        // session header when no composer is on screen. The control is re-synced
        // continuously (see the follow loop) and only writes styles when the
        // target actually moved, so the switch stays static relative to the
        // toolbar through window resizes, fullscreen, and pane reflows.
        const admissionCache: { admission: Element | null; at: number } = { admission: null, at: 0 };
        const applied = { left: Number.NaN, top: Number.NaN };
        let observedBox: HTMLElement | null = null;
        let observedAnchor: Element | null = null;
        let observedContainer: HTMLElement | null = null;
        const place = () => {
          if (disposed) return;
          if (!presented) {
            container.style.display = "none";
            return;
          }
          // A cached pane keeps its DOM (and its accessory) mounted at opacity 0:
          // its switch would sit invisible behind the active pane, so skip it
          // instead of painting a control nobody can see or click.
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
              anchor: null,
            };
            container.style.position = "";
            container.style.left = "";
            container.style.top = "";
            container.style.zIndex = "";
            return;
          }

          // Watch the geometry we actually depend on: the composer box and the
          // admission control. A pane move that leaves their size unchanged is
          // caught by the follow loop's poll instead.
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
          // Watch the element whose width actually tracks a sidebar drag. The
          // resize observer runs after layout and before paint, so placing from
          // its callback puts the switch in the same frame as the composer's new
          // position — frame-loop placement is a frame behind, because an
          // animation-frame callback measures the layout of the frame before.
          const paneObserverTarget = widerAncestor(target.box);
          if (paneObserverTarget !== observedContainer) {
            if (observedContainer) observer?.unobserve(observedContainer);
            observedContainer = paneObserverTarget;
            if (paneObserverTarget) observer?.observe(paneObserverTarget);
          }

          state.placement = {
            anchored: true,
            offset: { ...state.placement.offset },
            // The per-part button nudge is part of the box position, so the
            // hit area and the tooltip travel with the switch.
            left: round1(target.left + liveStyle.dx + liveStyle.buttonDx),
            top: round1(target.top + liveStyle.dy + liveStyle.buttonDy),
            anchor: target.label,
          };
          state.reason = target.label;
          state.candidates = target.candidates;
          state.hiddenCandidates = target.hiddenCandidates;
          state.anchorDetail = target.anchorDetail;
          positionSetup();
          const left = state.placement.left as number;
          const top = state.placement.top as number;
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

        // A placement must never be able to kill the follow loop: a throw here
        // would otherwise escape every animation frame and leave the switch
        // frozen at whatever coordinate it last wrote.
        const safePlace = () => {
          try {
            place();
          } catch (error) {
            state.placementError = error instanceof Error ? error.message : String(error);
            console.warn(`[${PLUGIN_ID}] 定位失败：${state.placementError}`);
          }
        };

        // Continuous alignment, at frame rate but writing only when the tracked
        // geometry actually moved: the composer shell and the control the switch
        // hangs off are measured every frame, and a full placement runs only when
        // that geometry changed (plus a slow poll as a backstop). Signals no
        // longer place synchronously — a window drag fires resize every frame, and
        // placing inside the event both forced layout mid-event and stacked a
        // second placement on top of the frame loop, which read as lag.
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
        // A layout signal only marks the geometry stale; the frame loop below does
        // the work, so a burst of signals cannot stack up placements.
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
          button.title = state.lastError
            ? `${LABEL}：${state.lastError}`
            : `${LABEL}：${checked ? "开" : "关"}（本会话）`;
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
              `[${PLUGIN_ID}] 决策介入开关被页面元素遮挡：(${x},${y}) 命中 ${describe(top)}`,
            );
          }
        };

        const tick = () => {
          if (disposed) return;
          if (Date.now() > probeDeadline) {
            if (probeTimer) clearInterval(probeTimer);
            probeTimer = undefined;
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
          // The action's input schema is an empty object, so the payload must be
          // present: omitting it fails host validation with
          // "plugin session action payload does not match schema: <root>: must be object".
          for (let attempt = 0; attempt < 2; attempt += 1) {
            try {
              const response = await host.request<{
                ok?: boolean;
                result?: { enabled?: boolean; showSetup?: boolean };
                error?: string;
              }>("plugins.sessionAction", {
                pluginId: PLUGIN_ID,
                actionId: SESSION_ACTION_ID,
                sessionKey,
                agentId: agentId ?? undefined,
                payload: {},
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
              console.warn(`[${PLUGIN_ID}] 读取决策介入状态失败：${state.lastError}`);
              if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 800));
            }
          }
          render();
        };

        const writeState = async (next: boolean) => {
          if (!sessionKey) return;
          pending = true;
          render();
          try {
            await host.request("sessions.pluginPatch", {
              key: sessionKey,
              agentId: agentId ?? undefined,
              pluginId: PLUGIN_ID,
              namespace: NAMESPACE,
              value: { enabled: next },
            });
            checked = next;
            state.lastError = null;
            state.errorKind = null;
            state.writes += 1;
          } catch (error) {
            state.lastError = error instanceof Error ? error.message : String(error);
            state.errorKind = "write";
            console.warn(`[${PLUGIN_ID}] 写入决策介入状态失败：${state.lastError}`);
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
        // Scrolling moves the composer without resizing anything and the scroll
        // offset is already applied when the event fires, so place straight
        // away; it costs no forced layout and keeps scrolling in sync.
        const onScroll = () => syncNow();
        window.addEventListener("resize", onLayout);
        window.addEventListener("scroll", onScroll, { passive: true, capture: true });
        document.addEventListener("fullscreenchange", onLayout);
        window.visualViewport?.addEventListener("resize", onLayout);
        window.visualViewport?.addEventListener("scroll", onScroll);
        // Post-layout hook: a resize observer callback is the one place that runs
        // after the browser has laid the frame out and before it paints it.
        const observer =
          typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => syncNow()) : undefined;
        observer?.observe(document.documentElement);

        // Belt and braces for the follow loop: a plain timer keeps re-placing
        // even when no animation frame arrives (throttled/backgrounded rAF, a
        // frame budget stall), so the switch can never sit frozen while its
        // composer has moved.
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
        // The appearance panel is summoned by a fresh flag file, read by the
        // plugin host on this call; poll while it is closed and cheap.
        const setupPoll = setInterval(() => {
          if (disposed || !setup.hidden) return;
          void readState();
        }, 15000);
        void readState();
        frame = requestAnimationFrame(loop);

        return {
          update(next) {
            const nextProps = (next.props ?? {}) as Record<string, unknown>;
            const nextKey =
              (typeof nextProps.sessionKey === "string" && nextProps.sessionKey) ||
              (typeof nextProps.key === "string" && nextProps.key) ||
              null;
            const nextAgent = (typeof nextProps.agentId === "string" && nextProps.agentId) || null;
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
            window.removeEventListener("scroll", onScroll, { capture: true } as EventListenerOptions);
            document.removeEventListener("fullscreenchange", onLayout);
            window.visualViewport?.removeEventListener("resize", onLayout);
            window.visualViewport?.removeEventListener("scroll", onScroll);
            probe.drop(button);
            state.mounted = probe.elements().length > 0;
            button.remove();
          },
        };
      },
    });
  },
});
