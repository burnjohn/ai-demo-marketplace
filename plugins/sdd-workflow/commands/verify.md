---
description: "SDD step 4 — check that every plan item / acceptance criterion is actually implemented, with evidence."
argument-hint: "<path to plan or spec to verify against>"
---

Step 4 of Spec-Driven Development: verify completeness against the agreed requirements.

Delegate to the `plan-verifier` agent, passing it: $ARGUMENTS

If no plan or spec path was given, ask for one — there is nothing to trace against otherwise.

This is a completeness and traceability gate, not a code review: the agent checks that each item
exists in the code with quoted evidence, and does not audit style, performance, or security. Do not
fix anything during this step, and do not let a "the build passed" claim substitute for evidence.

Report the traceability matrix, the counts (done / partial / missing / cannot-verify), and the gate
verdict. If the verdict is FAIL, list exactly which items to send back through `/run-plan`. The final
step is `/sdd-retro`.
