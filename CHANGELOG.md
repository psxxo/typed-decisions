# Changelog

## 1.0.0

Initial release, targeting OpenClaw 2026.9.6.

- Registers the `bailian-decisions` decision provider and the static model
  `bailian-decisions/decision-model-preview`, so the model appears in the
  Control UI **Decision** picker.
- Bridges OpenClaw's `choice` / `score` / `boolean` questions onto the Aliyun
  Bailian (Model Studio) System One API (`POST /compatible-mode/v1/systemone`),
  returning reported labels, probability distributions, confidence, and token
  usage.
- Adds the optional `bailian_decide` tool for explicit agent-side evaluations.
- Credentials are read from a `0600` key file (default
  `~/.openclaw/.secrets/dashscope-decision.key`); no build step and no runtime
  dependencies.
- Every downstream failure maps to a typed `unavailable` reason; caller
  cancellation rejects, per the decision-provider contract.
