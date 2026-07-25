/**
 * Synthetic "full" fixture — every optional field populated, several plugins,
 * artifacts of multiple kinds, dependencies both catalog-internal and
 * external, and changelog entries both dated and undated.
 *
 * Id scheme (must match what the index generator produces verbatim, and what
 * the router expects in `#/plugin/<id>` / `#/artifact/<id>`): lowercase
 * kebab-case, no slashes, no encoding needed.
 *   - Plugin id   = the plugin's kebab-case `name` verbatim.
 *   - Artifact id = `${pluginId}--${kind}--${artifactName}` (double-dash
 *     separators keep it unique across the whole catalog and still URL-safe).
 */
import type { CatalogIndex } from "../types";

export const fullFixture: CatalogIndex = {
  marketplaceName: "ai-demo-marketplace",
  marketplaceDescription:
    "A Claude Code plugin catalog for the AI Agentic Engineering workshop.",
  repositoryUrl: "https://github.com/burnjohn/ai-demo-marketplace",
  buildTimestamp: "2026-07-25T09:00:00.000Z",
  sourceCommitRef: "abc123def456",
  plugins: [
    {
      id: "frontend-skills",
      name: "frontend-skills",
      displayName: "Frontend Skills",
      description:
        "Frontend skill pack for React 19 + Next.js 15: architecture, patterns, testing, TypeScript.",
      version: "1.2.0",
      authorName: "Ivan Lapa",
      keywords: ["react", "nextjs", "typescript", "testing"],
      category: "development",
      compatibility: "Claude Code >= 1.0",
      lastUpdated: "2026-07-20T00:00:00.000Z",
      installCommand: {
        text: "/plugin install frontend-skills@ai-demo-marketplace",
        scope: "plugin-installation",
      },
      sourceUrl:
        "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/frontend-skills",
      readme: "# Frontend Skills\n\nA pack of frontend-focused skills.",
      changelogEntries: [
        {
          version: "1.2.0",
          date: "2026-07-20T00:00:00.000Z",
          summary: "Added React Testing Library skill.",
          owningPluginId: "frontend-skills",
        },
        {
          version: "1.1.0",
          summary: "Added TypeScript expert skill (undated entry).",
          owningPluginId: "frontend-skills",
        },
        {
          version: "1.0.0",
          date: "2026-06-01T00:00:00.000Z",
          summary: "Initial release.",
          owningPluginId: "frontend-skills",
        },
      ],
      dependencies: [
        {
          name: "research-tools",
          versionRange: "^1.0.0",
          resolvesWithinCatalog: true,
        },
        {
          name: "some-external-toolkit",
          versionRange: "^2.3.0",
          resolvesWithinCatalog: false,
        },
      ],
      artifacts: [
        {
          id: "frontend-skills--skill--react-best-practices",
          kind: "skill",
          name: "react-best-practices",
          displayName: "React Best Practices",
          description: "Modern React conventions and anti-patterns.",
          owningPluginId: "frontend-skills",
          tools: ["Read", "Grep"],
          documentationExcerpt:
            "Component design, hooks rules, memoization, key props...",
          sourceUrl:
            "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/frontend-skills/skills/react-best-practices",
          searchText:
            "react best practices component design hooks memoization key props",
        },
        {
          id: "frontend-skills--agent--react-analyzer",
          kind: "agent",
          name: "react-analyzer",
          displayName: "React Analyzer",
          description: "Skeptical React architecture analyst.",
          owningPluginId: "frontend-skills",
          invocationToken: "@react-analyzer",
          tools: ["Read", "Glob", "Grep"],
          model: "sonnet",
          documentationExcerpt: "Analyzes changed React files against best practices.",
          sourceUrl:
            "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/frontend-skills/agents/react-analyzer.md",
          searchText: "react analyzer architecture agent sonnet",
        },
      ],
      searchText:
        "frontend skills react nextjs typescript testing architecture patterns",
    },
    {
      id: "research-tools",
      name: "research-tools",
      displayName: "Research Tools",
      description:
        "Read-only research agent that gathers and fact-checks information.",
      version: "1.0.3",
      authorName: "Ivan Lapa",
      keywords: ["research", "search"],
      category: "development",
      installCommand: {
        text: "/plugin install research-tools@ai-demo-marketplace",
        scope: "plugin-installation",
      },
      sourceUrl:
        "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/research-tools",
      readme: "# Research Tools\n\nA read-only researcher agent.",
      changelogEntries: [
        {
          version: "1.0.3",
          date: "2026-07-10T00:00:00.000Z",
          summary: "Fixed web search fallback.",
          owningPluginId: "research-tools",
        },
      ],
      artifacts: [
        {
          id: "research-tools--agent--researcher",
          kind: "agent",
          name: "researcher",
          displayName: "Researcher",
          description: "Read-only research agent.",
          owningPluginId: "research-tools",
          invocationToken: "@researcher",
          tools: ["Read", "WebSearch", "WebFetch"],
          model: "haiku",
          documentationExcerpt: "Finds information inside the project or on the web.",
          sourceUrl:
            "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/research-tools/agents/researcher.md",
          searchText: "researcher research read only web search fetch",
        },
      ],
      searchText: "research tools researcher search fact check",
    },
    {
      id: "sdd-workflow",
      name: "sdd-workflow",
      displayName: "SDD Workflow",
      description:
        "Spec-Driven Development workflow: spec -> plan -> implement -> test -> verify.",
      version: "2.0.0",
      authorName: "Ivan Lapa",
      keywords: ["workflow", "spec", "planning"],
      category: "workflow",
      lastUpdated: "2026-07-22T00:00:00.000Z",
      installCommand: {
        text: "/plugin install sdd-workflow@ai-demo-marketplace",
        scope: "plugin-installation",
      },
      sourceUrl:
        "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/sdd-workflow",
      readme: "# SDD Workflow\n\nSpec-driven development, end to end.",
      changelogEntries: [
        {
          version: "2.0.0",
          date: "2026-07-22T00:00:00.000Z",
          summary: "Added workflow-retro skill.",
          owningPluginId: "sdd-workflow",
        },
      ],
      dependencies: [
        {
          name: "research-tools",
          resolvesWithinCatalog: true,
        },
        {
          name: "frontend-skills",
          versionRange: "^1.0.0",
          resolvesWithinCatalog: true,
        },
      ],
      artifacts: [
        {
          id: "sdd-workflow--command--build",
          kind: "command",
          name: "build",
          displayName: "Build",
          description: "Runs the build step of the workflow.",
          owningPluginId: "sdd-workflow",
          invocationToken: "/build",
          sourceUrl:
            "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/sdd-workflow/commands/build.md",
          searchText: "build command workflow",
        },
        {
          id: "sdd-workflow--hook--pre-commit",
          kind: "hook",
          name: "pre-commit",
          displayName: "Pre Commit",
          description: "Runs checks before a commit is created.",
          owningPluginId: "sdd-workflow",
          sourceUrl:
            "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/sdd-workflow/hooks/hooks.json",
          searchText: "pre commit hook checks",
        },
        {
          id: "sdd-workflow--mcp--workflow-server",
          kind: "mcp",
          name: "workflow-server",
          displayName: "Workflow Server",
          description: "MCP server exposing workflow state.",
          owningPluginId: "sdd-workflow",
          tools: ["workflow.status", "workflow.advance"],
          documentationExcerpt: "Exposes the current workflow phase over MCP.",
          sourceUrl:
            "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/sdd-workflow/mcp/workflow-server.json",
          searchText: "workflow server mcp status advance",
        },
        {
          id: "sdd-workflow--skill--workflow-retro",
          kind: "skill",
          name: "workflow-retro",
          displayName: "Workflow Retro",
          description: "Runs a retrospective at the end of a workflow.",
          owningPluginId: "sdd-workflow",
          documentationExcerpt: "Captures engineering insights at the end of a session.",
          sourceUrl:
            "https://github.com/burnjohn/ai-demo-marketplace/tree/main/plugins/sdd-workflow/skills/workflow-retro",
          searchText: "workflow retro retrospective insights",
        },
      ],
      searchText: "sdd workflow spec plan implement test verify retro",
    },
  ],
};
