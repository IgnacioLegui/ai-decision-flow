# AI Decision Flow

A visual AI workflow builder: each node is an AI decision step that asks an LLM a yes/no
question, and the answer routes execution along a YES or NO edge to the next node. Built with
[React Flow](https://reactflow.dev/) for the canvas and [Inngest](https://www.inngest.com/) to
run each node as a durable step, calling an LLM through [OpenRouter](https://openrouter.ai/)
(OpenAI-compatible API).

FlyRank AI Backend Engineering Internship — Assignment BE-09.

## Stack

- Next.js (App Router, TypeScript, Tailwind CSS)
- `@xyflow/react` — the flow canvas
- `inngest` — orchestrates workflow execution, served from `/api/inngest`
- `openai` SDK, pointed at OpenRouter's OpenAI-compatible endpoint
- `shadcn/ui` — UI components

## Setup

```bash
npm install
```

Copy the env template and fill in your OpenRouter key:

```bash
cp .env.local.example .env.local
```

```
INNGEST_DEV=1
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-v1-...   # from https://openrouter.ai/keys
LLM_MODEL=openrouter/free
```

`INNGEST_DEV=1` tells the Inngest SDK it's running against the local Dev Server rather than
production — without it, requests to `/api/inngest` return a 500.

To get a key: sign up free at [openrouter.ai](https://openrouter.ai), then at
[openrouter.ai/settings/privacy](https://openrouter.ai/settings/privacy) turn ON both "Free
endpoints that may train on request data" and "Free endpoints that may publish prompts" (without
this, free-model calls fail with a 404). Then create a key at
[openrouter.ai/keys](https://openrouter.ai/keys).

## Running locally

This project needs **two** processes running side by side:

```bash
npm run dev
```

```bash
npx inngest-cli@latest dev
```

- App: [http://localhost:3000](http://localhost:3000)
- Inngest Dev Server dashboard: [http://localhost:8288](http://localhost:8288) — it should show
  this app synced under "Apps".

## Usage

- **+ Add node** adds a decision node. Drag from its green (YES) or red (NO) handle to another
  node to wire a path; edit the prompt directly in the node.
- **▶ Run flow** starts execution at the node with no incoming edge, calling the LLM for each
  node's prompt and following the matching YES/NO edge until it reaches a node with no outgoing
  edge for the given answer. The active node and taken edges highlight live.
- **File ▾** — save/load the current graph to this browser's local storage, or export/import it
  as a `.json` file.
- **Logs** — view the steps and outcome of the current run plus your last several runs.
- If a node's LLM call fails (including after Inngest's automatic retries), that node turns red
  with a **Retry from here** button to resume execution from that point.

## Status

All four phases are complete:

- **Phase 1:** project scaffolding — Next.js, React Flow, Inngest, OpenAI SDK, and shadcn/ui
  installed and wired up.
- **Phase 2:** interactive flow editor (add/connect nodes, editable prompts, typed YES/NO edges).
- **Phase 3:** real workflow execution via Inngest, calling OpenRouter per node and branching on
  the YES/NO answer.
- **Phase 4:** polish — execution logs & history panel, save/load to browser storage, JSON
  export/import, refreshed node styling with terminal-node detection, and manual retry for failed
  nodes.
