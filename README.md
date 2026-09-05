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
LLM_MODEL=nvidia/nemotron-3-super-120b-a12b:free
```

`INNGEST_DEV=1` tells the Inngest SDK it's running against the local Dev Server rather than
production — without it, requests to `/api/inngest` return a 500.

To get a key: sign up free at [openrouter.ai](https://openrouter.ai), then at
[openrouter.ai/settings/privacy](https://openrouter.ai/settings/privacy) turn ON both "Free
endpoints that may train on request data" and "Free endpoints that may publish prompts" (without
this, free-model calls fail with a 404). Then create a key at
[openrouter.ai/keys](https://openrouter.ai/keys).

**Why a specific model instead of `openrouter/free`:** that alias routes every request to a
random free model on OpenRouter, which can give different answers to the exact same input from
one run to the next. Pinning one specific `:free` model gives repeatable answers on clear-cut
scenarios (verified: 5/5 identical results in testing). Free models come and go, so if this one
stops working, check `https://openrouter.ai/api/v1/models` for current `:free`-suffixed ids and
swap in a new one. Note that even a pinned free model can still show some variance on genuinely
ambiguous/borderline scenarios — that's inherent to free-tier shared inference, not a bug.

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

- **Scenario input** (top-left) is the thing being evaluated — e.g. a customer message like
  "I can't log into my account." Decision nodes ask their yes/no question *about* this input.
  Leaving it blank falls back to asking each node's question on its own.
- **+ Add node** adds a node. A node with at least one outgoing edge is a **decision node** — its
  prompt is asked as a yes/no question about the scenario input. A node with no outgoing edges is
  a **terminal node** (e.g. "Support" / "Sales") — it's a final destination label, not a question,
  so it's never sent to the LLM; execution just lands there and stops.
- Drag from a node's green (YES) or red (NO) handle to another node to wire a path; edit the
  prompt/label directly in the node.
- **▶ Run flow** starts execution at the node with no incoming edge, calling the LLM for each
  decision node's question (with the scenario input as context) and following the matching
  YES/NO edge, until it reaches a terminal node. The active node and taken edges highlight live.
- **File ▾** — save/load the current graph (including the scenario input) to this browser's local
  storage, or export/import it as a `.json` file.
- **Logs** — view the steps and outcome of the current run plus your last several runs, including
  a distinct "REACHED" entry for the terminal node execution landed on.
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
