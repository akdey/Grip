---
name: readme-updater
description: Instructs the agent to check and synchronize README.md whenever a feature, architecture, model, API, data schema, or configuration is added, modified, or removed in Grip.
---

# README Updater & Documentation Sync Rule

Whenever any feature, capability, architecture, machine learning model, API endpoint, or environment configuration is introduced, modified, or deprecated in the Grip codebase, you **MUST** update `README.md` to reflect those changes before concluding the task.

---

## 1. Trigger Conditions

Run this documentation check whenever:
- **New Feature Added**: A new user-facing or backend capability (e.g. Settle Up, Timing Alpha, Anomaly Radar, Passkey auth, etc.).
- **Model / AI Pipeline Changed**: Any update to the local LLMs (Gemma, etc.), quantization, context windows, or extraction workflows.
- **Architecture / Flow Changed**: Modifications to ingestion flows, webhooks, schedulers, or data processing pipelines.
- **Config / Environment Variables Changed**: Any new or updated setting in `Backend/app/core/config.py` or `.env`.
- **Tech Stack / Dependencies Changed**: Added/removed dependencies in `Backend/requirements.txt`, `Backend/Dockerfile`, or `Frontend/package.json`.

---

## 2. Sections in `README.md` to Check & Update

When updating `README.md`, audit and synchronize the relevant sections:

### A. Key USPs & Feature Highlights (`## 🌟 What Makes Grip Different` / `## ✨ Key Features`)
- Update feature descriptions, bullet points, and real-world examples.
- Clearly describe *what* it does, *why* it matters, and *how* it preserves user privacy.

### B. Pipeline Diagrams (`## 🚀 How It Works`)
- If the flow of data or AI changes (e.g. ingestion, extraction, deduplication, double-entry accounting), update the pipeline diagram so it reflects the actual execution order.

### C. Technology Stack (`## 🛠️ Technology Stack`)
- Ensure backend frameworks, ML models, analytics libraries, data providers, and schedulers accurately match current imports and runtime usage.

### D. Environment Configuration (`## ⚡ Quick Start` -> `Backend/.env`)
- Include any new environment variables with clear comments explaining their default values and purpose.

---

## 3. Strict Rules & Anti-Patterns

1. **Verify Against Source Code**: Never guess or write speculative features. Always inspect the actual source code (`app/core/config.py`, service files, schemas) before updating docs.
2. **Preserve High-Value Copy**: Do not wipe out existing well-crafted sections. Make surgical, additive, or targeted updates.
3. **Markdown Formatting**: Maintain consistent header hierarchy, table formatting, and code block tags.
