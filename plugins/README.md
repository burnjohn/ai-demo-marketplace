# plugins/

Each plugin lives in its own subdirectory here: `plugins/<name>/`.

The baseline catalog is **empty** on purpose — plugins are added during the workshop. When you add one:

1. Create `plugins/<name>/` following the anatomy in [`../docs/PLUGIN-GUIDELINES.md`](../docs/PLUGIN-GUIDELINES.md).
2. Register it in [`../.claude-plugin/marketplace.json`](../.claude-plugin/marketplace.json).
3. Add an owner line in [`../CODEOWNERS`](../CODEOWNERS).

Minimum a plugin needs:

```
plugins/<name>/
└── .claude-plugin/plugin.json      # name, version, description (+ author, repository)
```

See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for the full checklist.
