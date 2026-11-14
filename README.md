# Tether for Obsidian ⚓

[![GitHub release](https://img.shields.io/github/v/release/Phrozenn1/tether-obsidian?style=flat-square&color=22d3ee)](https://github.com/Phrozenn1/tether-obsidian/releases)
[![Obsidian >= 1.0.0](https://img.shields.io/badge/Obsidian-%3E%3D1.0.0-7c3aed?style=flat-square)](https://obsidian.md)
[![License: GPL v2](https://img.shields.io/badge/License-GPL_v2-blue.svg?style=flat-square)](LICENSE)
[![GitHub](https://img.shields.io/badge/GitHub-Phrozenn1%2Ftether--obsidian-181717?style=flat-square&logo=github)](https://github.com/Phrozenn1/tether-obsidian)

> **Flowmodoro timer, automatic context save-states, RAM-dump working memory manager, and cognitive anchoring for deep work, neurodivergent minds, and focus.**  
> Seamlessly integrated with [Tether Desktop](https://github.com/Phrozenn1/tether-desktop), [tether.nvim](https://github.com/Phrozenn1/tether.nvim), and [tether-vscode](https://github.com/Phrozenn1/tether-vscode).

---

## 💡 Why Tether?

Traditional productivity timers frequently fail modern knowledge workers, students, researchers, and writers—especially neurodivergent minds (**ADHD**, **Autism/ASD**, **Dyslexia**, and **AuDHD**):

| Traditional Pomodoro | Flowmodoro in `tether-obsidian` |
| :--- | :--- |
| **Fixed timer (counts DOWN from 25m)** | **Open stopwatch (counts UP)** — ride your flow as long as it lasts |
| **Shatters hyperfocus mid-thought** | Stop when mental friction rises and earn **proportional break time (45:15)** |
| **Initiation paralysis** | **5-Minute Micro-Start** lowers the barrier to just five minutes |
| **Context-switch amnesia** | **RAM-dump save-states & Context Anchors** capture note, heading, and cursor line |

---

## ✨ Features

- **⏱️ Flowmodoro Status Bar & Bidirectional Desktop Sync:**
  - Displays live Focus count-up, 5-minute Micro-Start countdown, or earned Break countdown directly in Obsidian's status bar.
  - Synchronizes in real time with [Tether Desktop](https://github.com/Phrozenn1/tether-desktop) via `~/.local/state/tether/flow_state.json`.
- **⚓ Automatic Context Anchoring:**
  - Records active vault, note path, nearest Markdown heading, and cursor position to `~/.local/state/tether/context_anchor.json`.
  - Allows **Tether Desktop** (*"Where was I?"* & *"Auto-fill"*) to recognize what you are writing or studying in Obsidian and reopen the exact note via `obsidian://`.
- **🌱 5-Minute Micro-Start:**
  - Start a low-friction 5-minute commitment right from the Tether Hub or Command Palette.
- **🧠 RAM-Dump Working Memory Manager (Create / Edit / Delete):**
  - Rapidly capture **Now / Status / Next Step** save-states (with 1-click auto-fill from your active note and heading), edit existing dumps, or delete old entries directly inside Obsidian or Tether Desktop (`~/.local/state/tether/ramdumps.md`).
- **⚡ Impulse / Side-Quest Buffer:**
  - Capture stray thoughts (`- [ ] [YYYY-MM-DD HH:MM] ...`) to `~/.local/state/tether/impulses.md` without leaving your note.
- **🌙 Evening Shutdown Ritual:**
  - Cleanly stops active flow, parks a final summary and tomorrow's first micro-step, and writes `~/.local/state/tether/last_shutdown.json`.
- **👁️ Platform-Agnostic Focus Sync:**
  - Reports Obsidian focus state to `~/.local/state/tether/editor_focus.json` across Linux, macOS, and Windows.

---

## 📦 Installation

### Option 1: 1-Click from Tether Desktop (Recommended)
Open **Tether Desktop → Settings (`Innstillinger`) → Work Apps & Context Anchoring (`Arbeidsprogrammer og Kontekst-ankring`)**, select **Obsidian**, and click **Install Extension (`Installer utvidelse`)**. Then enable **Tether — Flowmodoro & Deep Work Companion** under Obsidian *Settings → Community plugins*.

### Option 2: GitHub Release (Manual or BRAT)
1. Download `tether-obsidian-v1.0.0.zip` (or `manifest.json`, `main.js`, `styles.css`) from [GitHub Releases](https://github.com/Phrozenn1/tether-obsidian/releases/latest).
2. Extract into `<your-vault>/.obsidian/plugins/tether-obsidian/`.
3. Restart Obsidian or reload Community Plugins and toggle **Tether — Flowmodoro & Deep Work Companion** on.

*For [BRAT](https://github.com/TfTHacker/obsidian42-brat), note that this repository follows the `v*` release tag scheme shared across Tether (`v1.0.0`, etc.).*

---

## ⌨️ Commands

| Command | Meaning | Description |
| :--- | :--- | :--- |
| `Tether: Åpne Tether Hub` | Open Tether Hub | Open quick control modal (also via Ribbon anchor icon or status bar) |
| `Tether: Start / Pause Flowmodoro` | Toggle Flowmodoro | Toggle between Focus and earned proportional Break |
| `Tether: Start 5-min Mikrostart` | 5m Micro-Start | Begin a 5-minute low-barrier Micro-Start session |
| `Tether: Nullstill Flowmodoro` | Reset Flowmodoro | Reset timer to Idle |
| `Tether: Parker impuls / avsporing` | Park Impulse | Capture a distracting thought to `impulses.md` |
| `Tether: Arbeidsminne / RAM-dumps (Opprett / Rediger / Slett)` | RAM-Dump Manager | Create, auto-fill, edit, or delete RAM-dumps |
| `Tether: Avslutt dagen (Shutdown Ritual)` | Shutdown Ritual | Run evening shutdown and park tomorrow's first step |
| `Tether: Åpne Tether Desktop` | Open Tether Desktop | Launch or focus Tether Desktop |

---

## 🔬 Scientific Foundation

Tether's Flowmodoro timing, Micro-Start initiation scaffolding, RAM-dump working memory capture, and interruption buffering are grounded in peer-reviewed research on ADHD, Autism, Dyslexia, and Universal Cognitive Ergonomics:
- 👉 [**`RESEARCH.md` — Scientific Rationale & Neurodivergent Research Foundation**](https://github.com/Phrozenn1/tether-desktop/blob/main/RESEARCH.md)

---

## 🇳🇴 Norsk sammendrag

Tether for Obsidian gir deg ADHD-vennlig arbeidsflyt rett i notatene dine:
- **Flowmodoro i statuslinjen**: Tell oppover så lenge du har flyt og opptjen pause automatisk, fullt synkronisert med Tether Desktop.
- **Kontekst-ankring & RAM-dumps**: Lagre, rediger og slett `[NÅ]` / `[STATUS]` / `[NESTE STEG]` direkte fra aktivt notat og overskrift.
- **Mikrostart, Impuls-buffer & Kvelds-avslutning**: Bryt dørstokkmila på 5 minutter, parkér avsporinger til `impulses.md` og avslutt dagen trygt.

---

## 📄 License

[GPL-2.0](LICENSE) © [Phrozenn1](https://github.com/Phrozenn1)
