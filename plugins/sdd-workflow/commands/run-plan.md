---
description: "SDD step 3 — execute an implementation plan by dispatching implementer agents, respecting its dependency DAG."
argument-hint: "<path to plan> [task ids, e.g. T1,T2 — defaults to the whole plan]"
---

Step 3 of Spec-Driven Development: execute a plan that already exists.

Target: $ARGUMENTS

1. **Read the plan first.** Establish its `Execution mode`, the phases, each task's `Owned paths`, and
   the `Depends-on` DAG. If no plan path was given, ask for one — never improvise the work.
2. **Dispatch `implementer` agents** (from the `code-agents` plugin), one per task, passing each its
   own task block verbatim plus the owned paths of the tasks running alongside it.
   - **multi-agent mode:** dispatch each phase's independent tasks in a single message so they run
     concurrently. Never dispatch two concurrent tasks whose `Owned paths` overlap — if the plan
     contains such a pair, stop and report it as a plan defect rather than risking a clobber.
   - **single-agent mode:** work the tasks in order, one at a time.
3. **Respect the DAG.** A task starts only once everything in its `Depends-on` has finished green.
4. **Do not repair the plan silently.** If a task is unimplementable as written, stop that task,
   report why, and let the user decide — do not redesign the work mid-run.

When tasks needing test coverage are done, dispatch `test-writer` for those, per each task's
`Acceptance`.

Report a per-task table (task id → status → files changed → verification result), then the aggregate
verdict. Never report a task green without the agent's own verification output. The next steps are
`/verify` and then `/sdd-retro`.
