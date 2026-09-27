# Changelog

## 1.0.0

Initial release, targeting OpenClaw 2026.9.6.

- Registers the `typed-decisions` decision provider and the static model
  `typed-decisions/decision-model-preview`, so it appears in the Control UI
  **Decision** picker.
- Bridges OpenClaw's `choice` / `score` / `boolean` questions onto the System One
  API (`POST <endpoint>/compatible-mode/v1/systemone`), returning reported
  labels, probability distributions, confidence, and token usage.
- Adds the optional `typed_decide` tool for explicit agent-side evaluations.
- Reads its credential from a `0600` key file (default
  `~/.openclaw/.secrets/decision-model.key`); no build step and no runtime
  dependencies.
- Every downstream failure maps to a typed `unavailable` reason; caller
  cancellation rejects, per the decision-provider contract.
