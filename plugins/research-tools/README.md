# research-tools

A dependency plugin providing one **read-only research agent**, `researcher` — a focused investigator that finds information (in your codebase or on the public web) and reports it back in a strict, structured, cited format. It never edits, creates, or deletes anything.

Reusable on its own, and a declared dependency of `sdd-workflow` (used during discovery/planning).

## What it provides

| Component | Type | Tools |
| --- | --- | --- |
| `researcher` | agent | Read, Glob, Grep, Bash, WebSearch, WebFetch (no Edit/Write) |

## Install

```
/plugin marketplace add burnjohn/ai-demo-marketplace
/plugin install research-tools@ai-demo-marketplace
```

## Use

Delegate any locate / gather / fact-check task to the agent — Claude routes to it automatically, or call it explicitly as `research-tools:researcher`.

- Read-only: no write tools, never modifies files.
- Two modes: project research (code/docs/config) and internet research (bounded `WebSearch` + `WebFetch`).
- Clarifies first when the request is ambiguous; cites everything (`path:line` or source URL).
