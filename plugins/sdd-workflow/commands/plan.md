---
description: "SDD step 2 — turn an agreed spec or set of requirements into a phased implementation plan (HOW)."
argument-hint: "<path to spec, or the requirements themselves>"
---

Step 2 of Spec-Driven Development: produce an implementation plan from requirements that already exist.

Delegate to the `implementation-planner` agent, passing it: $ARGUMENTS

If no spec path or requirement set was given, ask for one before delegating — this step plans against
requirements, it does not invent them. The agent will verify the requirements, ask its own clarifying
questions, and ask you to choose an execution mode (multi-agent parallel vs single-agent). Relay those
questions to the user rather than answering on their behalf.

Do not implement anything. When the agent finishes, report the plan's file path, the task count and
phases, the chosen execution mode, and any open questions or recommendations it raised. The next step
is `/run-plan`.
