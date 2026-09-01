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
LLM_BASE_URL=https://openrouter.ai/api/v1
LLM_API_KEY=sk-or-v1-...   # from https://openrouter.ai/keys
LLM_MODEL=openrouter/free
```

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

## Status

- **Phase 1 (done):** project scaffolding — Next.js, React Flow, Inngest, OpenAI SDK, and
  shadcn/ui installed and wired up.
- **Phase 2:** interactive flow editor (add/connect nodes, editable prompts, YES/NO edges).
- **Phase 3:** real workflow execution via Inngest, LLM-driven branching.
- **Phase 4:** polish (logs, save/load, export, etc.).
