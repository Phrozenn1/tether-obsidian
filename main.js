"use strict";

const { Plugin, Modal, Notice, MarkdownView } = require("obsidian");
const fs = require("fs");
const path = require("path");
const os = require("os");

const WRITER_NAME = "obsidian";

function getTetherStateDir() {
  const stateHome = process.env.XDG_STATE_HOME;
  if (stateHome && stateHome.trim()) {
    return path.join(stateHome.trim(), "tether");
  }
  return path.join(os.homedir(), ".local", "state", "tether");
}

function getTetherConfigDir() {
  const configHome = process.env.XDG_CONFIG_HOME;
  if (configHome && configHome.trim()) {
    return path.join(configHome.trim(), "tether");
  }
  return path.join(os.homedir(), ".config", "tether");
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (_) {
    return null;
  }
}

function writeJsonSafe(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function nowEpoch() {
  return Math.floor(Date.now() / 1000);
}

function formatDateTime(date, includeSeconds) {
  const pad = (n) => String(n).padStart(2, "0");
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  if (!includeSeconds) {
    return `${y}-${m}-${d} ${hh}:${mm}`;
  }
  const ss = pad(date.getSeconds());
  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

function formatDurationMMSS(totalSec) {
  const sec = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(sec / 60);
  const rem = sec % 60;
  return `${String(mins).padStart(2, "0")}:${String(rem).padStart(2, "0")}`;
}

function defaultFlowState() {
  return {
    state: "idle",
    start_epoch: 0,
    break_duration_sec: 0,
    elapsed_focus_sec: 0,
    remaining_break_sec: 0,
    banked_break_sec: 0,
    focus_ratio: 45,
    break_ratio: 15,
    writer: WRITER_NAME,
    seq: 0,
    timestamp: nowEpoch(),
  };
}

function loadFlowState() {
  const statePath = path.join(getTetherStateDir(), "flow_state.json");
  return Object.assign(defaultFlowState(), readJsonSafe(statePath) || {});
}

function saveFlowState(flow) {
  const statePath = path.join(getTetherStateDir(), "flow_state.json");
  writeJsonSafe(statePath, flow);
}

function computeLiveFlowDisplay(flow) {
  const now = nowEpoch();
  const state = flow.state || "idle";
  if (state === "focus") {
    const elapsed = flow.start_epoch > 0 ? Math.max(0, now - flow.start_epoch) : flow.elapsed_focus_sec || 0;
    return { state, text: `🔥 Focus ${formatDurationMMSS(elapsed)}`, cls: "tether-status-focus", elapsed };
  }
  if (state === "micro_start") {
    const elapsed = flow.start_epoch > 0 ? Math.max(0, now - flow.start_epoch) : 0;
    const rem = Math.max(0, 300 - elapsed);
    return { state, text: `🌱 Micro ${formatDurationMMSS(rem)}`, cls: "tether-status-micro", elapsed };
  }
  if (state === "break") {
    const totalBreak = Math.max(flow.break_duration_sec || 0, flow.remaining_break_sec || 0);
    const elapsed = flow.start_epoch > 0 ? Math.max(0, now - flow.start_epoch) : 0;
    const rem = Math.max(0, totalBreak - elapsed);
    return { state, text: `☕ Pause ${formatDurationMMSS(rem)}`, cls: "tether-status-break", elapsed };
  }
  return { state: "idle", text: "⚓ Tether: Klar", cls: "", elapsed: 0 };
}

function parseRamDumps(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf8");
  const blocks = content.split("--- PAUSE / SAVE-STATE").slice(1);
  const entries = [];

  for (const block of blocks) {
    if (!block.trim()) continue;
    let timestamp = "";
    let now = "";
    let status = "";
    let nextStep = "";

    for (const rawLine of block.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!timestamp && line.includes("(") && line.includes(")")) {
        const start = line.indexOf("(");
        const end = line.lastIndexOf(")");
        if (end > start) {
          timestamp = line.slice(start + 1, end).trim();
        }
      } else if (line.startsWith("[NÅ]:")) {
        now = line.slice("[NÅ]:".length).trim();
      } else if (line.startsWith("[STATUS]:")) {
        status = line.slice("[STATUS]:".length).trim();
      } else if (line.startsWith("[NESTE STEG]:")) {
        nextStep = line.slice("[NESTE STEG]:".length).trim();
      }
    }

    if (now || status || nextStep) {
      entries.push({
        timestamp: timestamp || formatDateTime(new Date(), true),
        now,
        status,
        next_step: nextStep,
      });
    }
  }
  return entries;
}

function serializeRamDumps(entries) {
  return entries
    .map((entry) => {
      const ts = entry.timestamp && entry.timestamp.trim()
        ? entry.timestamp.trim()
        : formatDateTime(new Date(), true);
      return [
        `--- PAUSE / SAVE-STATE (${ts}) ---`,
        `[NÅ]:         ${entry.now || ""}`,
        `[STATUS]:     ${entry.status || ""}`,
        `[NESTE STEG]: ${entry.next_step || ""}`,
        "--------------------------------------------\n",
      ].join("\n");
    })
    .join("\n");
}

function getRamDumpsPath() {
  return path.join(getTetherStateDir(), "ramdumps.md");
}

function appendRamDump(nowText, statusText, nextText) {
  const filePath = getRamDumpsPath();
  ensureDir(path.dirname(filePath));
  const entries = parseRamDumps(filePath);
  entries.push({
    timestamp: formatDateTime(new Date(), true),
    now: nowText,
    status: statusText,
    next_step: nextText,
  });
  fs.writeFileSync(filePath, serializeRamDumps(entries), "utf8");
}

function getImpulsesPath() {
  const settings = readJsonSafe(path.join(getTetherConfigDir(), "settings.json"));
  if (settings && typeof settings.side_quests_file === "string" && settings.side_quests_file.trim()) {
    const raw = settings.side_quests_file.trim();
    if (raw.startsWith("~/")) {
      return path.join(os.homedir(), raw.slice(2));
    }
    return raw;
  }
  return path.join(getTetherStateDir(), "impulses.md");
}

function appendImpulse(text) {
  const trimmed = text.trim();
  if (!trimmed) return;
  const filePath = getImpulsesPath();
  ensureDir(path.dirname(filePath));
  const stamp = formatDateTime(new Date(), false);

  if (filePath.endsWith(".json")) {
    const existing = readJsonSafe(filePath);
    const items = Array.isArray(existing) ? existing : [];
    items.push({
      timestamp: stamp,
      text: trimmed,
      done: false,
      completed_at: null,
    });
    writeJsonSafe(filePath, items);
    return;
  }

  fs.appendFileSync(filePath, `- [ ] [${stamp}] ${trimmed}\n`, "utf8");
}

function countOpenImpulses() {
  const filePath = getImpulsesPath();
  if (!fs.existsSync(filePath)) return 0;
  try {
    if (filePath.endsWith(".json")) {
      const items = JSON.parse(fs.readFileSync(filePath, "utf8"));
      return Array.isArray(items) ? items.filter((i) => !i.done).length : 0;
    }
    const lines = fs.readFileSync(filePath, "utf8").split(/\r?\n/);
    let open = 0;
    for (const raw of lines) {
      const l = raw.trim();
      if (!l.startsWith("- ")) continue;
      if (l.startsWith("- [x] ") || l.startsWith("- [X] ")) continue;
      open += 1;
    }
    return open;
  } catch (_) {
    return 0;
  }
}

class TetherHubModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    const flow = loadFlowState();
    const live = computeLiveFlowDisplay(flow);

    const header = contentEl.createDiv({ cls: "tether-modal-header" });
    header.createEl("h2", { text: "Tether" });
    header.createSpan({ text: live.text, cls: "tether-badge" });

    const grid = contentEl.createDiv({ cls: "tether-action-grid" });

    const toggleLabel = flow.state === "focus" ? "☕ Ta pause" : "🔥 Start fokus";
    const toggleBtn = grid.createEl("button", { text: toggleLabel, cls: "mod-cta" });
    toggleBtn.addEventListener("click", () => {
      this.plugin.toggleFlow();
      this.close();
    });

    const microBtn = grid.createEl("button", { text: "🌱 Mikrostart (5 min)" });
    microBtn.addEventListener("click", () => {
      this.plugin.startMicroStart();
      this.close();
    });

    const ramBtn = grid.createEl("button", { text: "🧠 RAM-dumps (Opprett / Rediger)" });
    ramBtn.addEventListener("click", () => {
      this.close();
      new TetherRamDumpModal(this.app, this.plugin).open();
    });

    const impBtn = grid.createEl("button", { text: "⚡ Parker impuls" });
    impBtn.addEventListener("click", () => {
      this.close();
      new TetherImpulseModal(this.app, this.plugin).open();
    });

    const shutdownBtn = grid.createEl("button", { text: "🌙 Avslutt dagen (Shutdown)" });
    shutdownBtn.addEventListener("click", () => {
      this.close();
      new TetherShutdownModal(this.app, this.plugin).open();
    });

    const resetBtn = grid.createEl("button", { text: "⏹️ Nullstill timer" });
    resetBtn.addEventListener("click", () => {
      this.plugin.resetFlow();
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TetherImpulseModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.createEl("h2", { text: "⚡ Parker impuls / avsporing" });
    contentEl.createEl("p", {
      text: "Skriv ned tanken raskt så du kan fortsette arbeidet uten å miste fokus.",
      cls: "tether-muted",
    });

    const field = contentEl.createDiv({ cls: "tether-modal-field" });
    const input = field.createEl("input", {
      type: "text",
      placeholder: "F.eks. Sjekke kilde til kapittel 3 senere...",
    });
    input.focus();

    const submit = () => {
      const val = input.value.trim();
      if (!val) return;
      appendImpulse(val);
      new Notice("Impuls parkert i Tether");
      this.close();
    };

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    });

    const row = contentEl.createDiv({ cls: "tether-btn-row" });
    const saveBtn = row.createEl("button", { text: "Parker impuls", cls: "mod-cta" });
    saveBtn.addEventListener("click", submit);
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TetherRamDumpModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
    this.editingIndex = null;
  }

  onOpen() {
    this.render();
  }

  render() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "🧠 Arbeidsminne / RAM-dumps" });

    const nowWrap = contentEl.createDiv({ cls: "tether-modal-field" });
    nowWrap.createEl("label", { text: "[NÅ] Hva jobber du med?" });
    this.nowInput = nowWrap.createEl("input", {
      type: "text",
      placeholder: "F.eks. Skriver sammendrag av kapittel 4 i Obsidian",
    });

    const statusWrap = contentEl.createDiv({ cls: "tether-modal-field" });
    statusWrap.createEl("label", { text: "[STATUS] Hvor langt har du kommet / hva gjenstår?" });
    this.statusInput = statusWrap.createEl("input", {
      type: "text",
      placeholder: "F.eks. Halvferdig med notater til teori-delen",
    });

    const nextWrap = contentEl.createDiv({ cls: "tether-modal-field" });
    nextWrap.createEl("label", { text: "[NESTE STEG] Det minste neste grepet:" });
    this.nextInput = nextWrap.createEl("input", {
      type: "text",
      placeholder: "F.eks. Skriv inn to setninger under overskriften Metode",
    });

    const btnRow = contentEl.createDiv({ cls: "tether-btn-row" });

    this.cancelBtn = btnRow.createEl("button", { text: "Avbryt redigering" });
    this.cancelBtn.toggleClass("tether-hidden", this.editingIndex === null);
    this.cancelBtn.addEventListener("click", () => {
      this.editingIndex = null;
      this.nowInput.value = "";
      this.statusInput.value = "";
      this.nextInput.value = "";
      this.updateFormButtons();
    });

    const autofillBtn = btnRow.createEl("button", { text: "✨ Fyll ut fra aktivt notat" });
    autofillBtn.addEventListener("click", () => {
      const sug = this.plugin.buildActiveNoteSuggestion();
      this.nowInput.value = sug.now;
      this.statusInput.value = sug.status;
      this.nextInput.value = sug.next;
      new Notice("Forslag fylt inn fra aktivt notat");
    });

    this.saveBtn = btnRow.createEl("button", {
      text: this.editingIndex === null ? "Lagre arbeidsminne" : "Oppdater RAM-dump",
      cls: "mod-cta",
    });
    this.saveBtn.addEventListener("click", () => this.handleSave());

    contentEl.createEl("h3", { text: "Lagrede RAM-dumps" });
    this.listEl = contentEl.createDiv({ cls: "tether-ramdump-list" });
    this.renderList();
  }

  updateFormButtons() {
    this.cancelBtn.toggleClass("tether-hidden", this.editingIndex === null);
    this.saveBtn.textContent = this.editingIndex === null ? "Lagre arbeidsminne" : "Oppdater RAM-dump";
  }

  handleSave() {
    const nowVal = this.nowInput.value.trim();
    const statusVal = this.statusInput.value.trim();
    const nextVal = this.nextInput.value.trim();
    if (!nowVal && !statusVal && !nextVal) {
      new Notice("Fyll ut minst ett felt før du lagrer.");
      return;
    }

    const filePath = getRamDumpsPath();
    ensureDir(path.dirname(filePath));
    const entries = parseRamDumps(filePath);

    if (this.editingIndex !== null && entries[this.editingIndex]) {
      entries[this.editingIndex].now = nowVal;
      entries[this.editingIndex].status = statusVal;
      entries[this.editingIndex].next_step = nextVal;
      fs.writeFileSync(filePath, serializeRamDumps(entries), "utf8");
      this.editingIndex = null;
      new Notice("RAM-dump oppdatert");
    } else {
      appendRamDump(nowVal, statusVal, nextVal);
      new Notice("RAM-dump lagret");
    }

    this.nowInput.value = "";
    this.statusInput.value = "";
    this.nextInput.value = "";
    this.updateFormButtons();
    this.renderList();
  }

  renderList() {
    this.listEl.empty();
    const filePath = getRamDumpsPath();
    const entries = parseRamDumps(filePath);

    if (!entries.length) {
      this.listEl.createEl("p", {
        text: "Ingen lagrede RAM-dumps ennå.",
        cls: "tether-muted",
      });
      return;
    }

    for (let idx = entries.length - 1; idx >= 0; idx--) {
      const entry = entries[idx];
      const itemEl = this.listEl.createDiv({ cls: "tether-ramdump-item" });

      const meta = itemEl.createDiv({ cls: "tether-ramdump-meta" });
      meta.createSpan({ text: entry.timestamp, cls: "tether-ramdump-time" });

      const actions = meta.createDiv({ cls: "tether-ramdump-actions" });
      const editBtn = actions.createEl("button", { text: "Rediger" });
      editBtn.addEventListener("click", () => {
        this.editingIndex = idx;
        this.nowInput.value = entry.now;
        this.statusInput.value = entry.status;
        this.nextInput.value = entry.next_step;
        this.updateFormButtons();
        this.nowInput.focus();
      });

      const delBtn = actions.createEl("button", { text: "Slett", cls: "mod-warning" });
      delBtn.addEventListener("click", () => {
        const latest = parseRamDumps(filePath);
        if (idx >= 0 && idx < latest.length) {
          latest.splice(idx, 1);
          fs.writeFileSync(filePath, serializeRamDumps(latest), "utf8");
          if (this.editingIndex === idx) {
            this.editingIndex = null;
            this.nowInput.value = "";
            this.statusInput.value = "";
            this.nextInput.value = "";
            this.updateFormButtons();
          } else if (this.editingIndex !== null && this.editingIndex > idx) {
            this.editingIndex -= 1;
          }
          new Notice("RAM-dump slettet");
          this.renderList();
        }
      });

      itemEl.createDiv({ text: `NÅ: ${entry.now}`, cls: "tether-ramdump-line" });
      itemEl.createDiv({ text: `STATUS: ${entry.status}`, cls: "tether-ramdump-line" });
      itemEl.createDiv({ text: `NESTE: ${entry.next_step}`, cls: "tether-ramdump-line" });
    }
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TetherShutdownModal extends Modal {
  constructor(app, plugin) {
    super(app);
    this.plugin = plugin;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl("h2", { text: "🌙 Avslutt dagen (Shutdown Ritual)" });
    contentEl.createEl("p", {
      text: "Parkér trådene fra dagens arbeid trygt så hjernen kan ta fri.",
      cls: "tether-muted",
    });

    const sug = this.plugin.buildActiveNoteSuggestion();

    const nowWrap = contentEl.createDiv({ cls: "tether-modal-field" });
    nowWrap.createEl("label", { text: "[OPPSUMMERING] Hva jobbet du med i dag?" });
    const nowInput = nowWrap.createEl("input", { type: "text", value: sug.now });

    const nextWrap = contentEl.createDiv({ cls: "tether-modal-field" });
    nextWrap.createEl("label", { text: "[I MORGEN] Det aller første lille steget:" });
    const nextInput = nextWrap.createEl("input", { type: "text", value: sug.next });

    const row = contentEl.createDiv({ cls: "tether-btn-row" });
    const finishBtn = row.createEl("button", {
      text: "Parkér arbeidsminnet og ta kvelden",
      cls: "mod-cta",
    });

    finishBtn.addEventListener("click", () => {
      const summaryNow = nowInput.value.trim();
      const tomorrowStep = nextInput.value.trim();

      this.plugin.resetFlow();

      if (summaryNow || tomorrowStep) {
        appendRamDump(summaryNow, "Dagsavslutning (parkert for kvelden)", tomorrowStep);
      }

      const openImpulses = countOpenImpulses();
      const now = new Date();
      const rec = {
        timestamp: nowEpoch(),
        date: formatDateTime(now, false).slice(0, 10),
        tomorrow_first_step: tomorrowStep,
        summary_now: summaryNow,
        remaining_impulses: openImpulses,
      };
      writeJsonSafe(path.join(getTetherStateDir(), "last_shutdown.json"), rec);

      new Notice("Arbeidsminnet er trygt parkert. God kveld!");
      this.close();
    });
  }

  onClose() {
    this.contentEl.empty();
  }
}

class TetherFlowPlugin extends Plugin {
  async onload() {
    this.lastAnchorWriteAt = 0;

    this.statusBarEl = this.addStatusBarItem();
    this.statusBarEl.addClass("tether-status-bar");
    this.statusBarEl.setAttribute("aria-label", "Tether Flowmodoro");
    this.registerDomEvent(this.statusBarEl, "click", () => {
      new TetherHubModal(this.app, this).open();
    });

    this.addRibbonIcon("anchor", "Open Tether hub", () => {
      new TetherHubModal(this.app, this).open();
    });

    this.addCommand({
      id: "open-hub",
      name: "Open Tether hub",
      callback: () => new TetherHubModal(this.app, this).open(),
    });

    this.addCommand({
      id: "toggle-flow",
      name: "Start or pause Flowmodoro",
      callback: () => this.toggleFlow(),
    });

    this.addCommand({
      id: "micro-start",
      name: "Start 5-minute micro-start",
      callback: () => this.startMicroStart(),
    });

    this.addCommand({
      id: "reset-flow",
      name: "Reset Flowmodoro",
      callback: () => this.resetFlow(),
    });

    this.addCommand({
      id: "capture-impulse",
      name: "Capture impulse",
      callback: () => new TetherImpulseModal(this.app, this).open(),
    });

    this.addCommand({
      id: "ramdump-manager",
      name: "Manage working memory",
      callback: () => new TetherRamDumpModal(this.app, this).open(),
    });

    this.addCommand({
      id: "shutdown-ritual",
      name: "Run evening shutdown ritual",
      callback: () => new TetherShutdownModal(this.app, this).open(),
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.syncContextAnchor(true);
      })
    );

    this.registerEvent(
      this.app.workspace.on("editor-change", () => {
        this.syncContextAnchor(false);
      })
    );

    this.registerDomEvent(window, "focus", () => {
      this.writeFocusState(true);
      this.syncContextAnchor(true);
    });

    this.registerDomEvent(window, "blur", () => {
      this.writeFocusState(false);
    });

    this.refreshStatusBar();
    this.writeFocusState(document.hasFocus());
    this.syncContextAnchor(true);

    this.registerInterval(
      window.setInterval(() => {
        this.refreshStatusBar();
        if (document.hasFocus()) {
          this.writeFocusState(true);
        }
      }, 1000)
    );
  }

  onunload() {
    this.writeFocusState(false);
  }

  refreshStatusBar() {
    if (!this.statusBarEl) return;
    const flow = loadFlowState();
    const live = computeLiveFlowDisplay(flow);
    this.statusBarEl.setText(live.text);
    this.statusBarEl.removeClass("tether-status-focus", "tether-status-break", "tether-status-micro");
    if (live.cls) {
      this.statusBarEl.addClass(live.cls);
    }
  }

  toggleFlow() {
    const flow = loadFlowState();
    const now = nowEpoch();
    flow.seq = (flow.seq || 0) + 1;
    flow.writer = WRITER_NAME;
    flow.timestamp = now;

    if (flow.state === "focus") {
      const elapsed = flow.start_epoch > 0 ? Math.max(0, now - flow.start_epoch) : flow.elapsed_focus_sec || 0;
      const focusRatio = Math.max(1, flow.focus_ratio || 45);
      const breakRatio = Math.max(1, flow.break_ratio || 15);
      const earnedBreak = Math.max(10, Math.round((elapsed * breakRatio) / focusRatio));
      flow.state = "break";
      flow.start_epoch = now;
      flow.elapsed_focus_sec = elapsed;
      flow.break_duration_sec = earnedBreak;
      flow.remaining_break_sec = earnedBreak;
      new Notice(`Pause startet (${Math.ceil(earnedBreak / 60)} min opptjent)`);
    } else {
      flow.state = "focus";
      flow.start_epoch = now;
      flow.elapsed_focus_sec = 0;
      flow.break_duration_sec = 0;
      flow.remaining_break_sec = 0;
      new Notice("Fokusøkt startet i Tether");
    }

    saveFlowState(flow);
    this.refreshStatusBar();
  }

  startMicroStart() {
    const flow = loadFlowState();
    const now = nowEpoch();
    flow.state = "micro_start";
    flow.start_epoch = now;
    flow.elapsed_focus_sec = 0;
    flow.break_duration_sec = 0;
    flow.remaining_break_sec = 0;
    flow.writer = WRITER_NAME;
    flow.seq = (flow.seq || 0) + 1;
    flow.timestamp = now;
    saveFlowState(flow);
    this.refreshStatusBar();
    new Notice("Mikrostart (5 min) startet!");
  }

  resetFlow() {
    const flow = loadFlowState();
    flow.state = "idle";
    flow.start_epoch = 0;
    flow.elapsed_focus_sec = 0;
    flow.break_duration_sec = 0;
    flow.remaining_break_sec = 0;
    flow.banked_break_sec = 0;
    flow.writer = WRITER_NAME;
    flow.seq = (flow.seq || 0) + 1;
    flow.timestamp = nowEpoch();
    saveFlowState(flow);
    this.refreshStatusBar();
  }

  writeFocusState(focused) {
    try {
      const focusPath = path.join(getTetherStateDir(), "editor_focus.json");
      writeJsonSafe(focusPath, {
        focused: Boolean(focused),
        editor: "obsidian",
        pid: process.pid,
        timestamp: nowEpoch(),
        server_name: "obsidian",
      });
    } catch (_) {}
  }

  getActiveContextInfo() {
    const vaultName = this.app.vault.getName() || "Obsidian";
    const adapter = this.app.vault.adapter;
    const vaultPath = adapter && typeof adapter.getBasePath === "function" ? adapter.getBasePath() : "";
    const file = this.app.workspace.getActiveFile();

    let relativePath = "";
    let absPath = vaultPath;
    let line = 1;
    let col = 1;
    let lastNote = "";
    let snippetLines = [];

    if (file) {
      relativePath = file.path || file.name;
      absPath = vaultPath ? path.join(vaultPath, relativePath) : relativePath;
      lastNote = file.basename;
    }

    const view = this.app.workspace.getActiveViewOfType(MarkdownView);
    if (view && view.editor) {
      const cursor = view.editor.getCursor();
      line = (cursor.line || 0) + 1;
      col = (cursor.ch || 0) + 1;

      const startIdx = Math.max(0, cursor.line - 3);
      const endIdx = Math.min(view.editor.lineCount() - 1, cursor.line + 1);
      for (let i = startIdx; i <= endIdx; i++) {
        const txt = (view.editor.getLine(i) || "").trim();
        if (txt) snippetLines.push(txt);
      }

      for (let i = cursor.line; i >= 0; i--) {
        const l = (view.editor.getLine(i) || "").trim();
        const m = /^#{1,6}\s+(.+)$/.exec(l);
        if (m && m[1]) {
          lastNote = m[1].trim();
          break;
        }
      }
    }

    return {
      vaultName,
      vaultPath,
      relativePath,
      absPath,
      line,
      col,
      lastNote,
      snippetLines,
    };
  }

  syncContextAnchor(force) {
    const nowMs = Date.now();
    if (!force && nowMs - this.lastAnchorWriteAt < 1000) {
      return;
    }
    this.lastAnchorWriteAt = nowMs;

    const info = this.getActiveContextInfo();
    if (!info.relativePath) return;

    try {
      const anchorPath = path.join(getTetherStateDir(), "context_anchor.json");
      writeJsonSafe(anchorPath, {
        timestamp: nowEpoch(),
        project_name: info.vaultName,
        project_path: info.vaultPath,
        branch: "",
        file_path: info.absPath,
        relative_path: info.relativePath,
        line: info.line,
        col: info.col,
        last_note: info.lastNote,
        server_name: "obsidian",
      });
    } catch (_) {}
  }

  buildActiveNoteSuggestion() {
    const info = this.getActiveContextInfo();
    if (!info.relativePath) {
      return {
        now: `Jobber i Obsidian-vault «${info.vaultName}»`,
        status: "Ingen åpen fil akkurat nå",
        next: `Åpne et notat i ${info.vaultName} og skriv første stikkord`,
      };
    }

    const section = info.lastNote && info.lastNote !== path.basename(info.relativePath, path.extname(info.relativePath))
      ? ` under «${info.lastNote}»`
      : "";
    const statusSnippet = info.snippetLines.length
      ? `Sist ved linje ${info.line}: "${info.snippetLines[info.snippetLines.length - 1].slice(0, 70)}"`
      : `Markør på linje ${info.line} i ${info.relativePath}`;

    return {
      now: `Skriver i «${info.relativePath}»${section} (${info.vaultName})`,
      status: statusSnippet,
      next: `Fortsett ved linje ${info.line} i ${info.relativePath}`,
    };
  }
}

module.exports = TetherFlowPlugin;
