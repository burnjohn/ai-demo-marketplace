---
description: "SDD step 1 — write a spec (WHAT/WHY) for a feature before any plan or code exists."
argument-hint: "<feature description, and/or paths to designs, Figma links, screenshots>"
---

Step 1 of Spec-Driven Development: produce a specification, not a plan and not code.

Delegate to the `spec-creator` agent. Pass it verbatim:

- The request: $ARGUMENTS
- Any design sources named above (Figma links, screenshots, generated design skeletons, existing
  docs). If a design is provided, remind the agent that the design is the source of truth.

Do not write the spec yourself, and do not start planning or implementing after it returns. When the
agent finishes, report the spec's file path, its `AC-N` count, and any `[NEEDS CLARIFICATION]` items
that still need the author's answer. Then stop and hand back — the next step is `/plan`, and the user
decides when to take it.
