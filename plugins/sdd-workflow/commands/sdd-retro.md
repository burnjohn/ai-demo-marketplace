---
description: "SDD step 5 — retrospective on the multi-agent run that just finished: cost, friction, waste, and what to change."
argument-hint: "[what to focus on, e.g. 'why was phase 2 slow' — optional]"
disable-model-invocation: true
---

Step 5 of Spec-Driven Development, and the only step that is **always** invoked by hand.

Invoke the `workflow-retro` skill and follow it, focusing on: $ARGUMENTS

Scope note — this command exists so the retro can be a first-class step of the SDD chain **without**
becoming automatic. The skill's rule stands: no hook, no `Stop`/`SubagentStop` wiring, no chaining
onto the end of `/run-plan`. The user decides a run is worth reviewing and types this command. If you
ever find yourself about to trigger a retro on your own, don't — suggest this command instead.

Analyse the run that just finished; do not re-run the workflow, and do not edit agent or skill
definitions. Recommendations are output, not actions: if the user accepts one, applying it is a
separate follow-up step.
