# 🧩 Archify

Build **software architecture diagrams by chatting** in plain language. Describe your
system — "a React frontend talking to a Node API with a Postgres database and a Redis
cache" — and Archify draws it, live.

Inspired by the chat-to-diagram idea from [archify](https://tt-a1i.github.io/archify/).

## Features

- **Chat-driven** — describe your system in natural language and watch the diagram build up.
- **Works offline** — a built-in natural-language parser understands components and
  connections with **no API key required**.
- **Optional Claude AI** — plug in an Anthropic API key (Settings) for smarter, free-form
  generation. The key is stored only in your browser and sent directly to Anthropic.
- **Smart component recognition** — knows the difference between a frontend, backend,
  database, cache, queue, gateway, auth service, storage, and external service, and styles
  each accordingly.
- **Editing commands** — `connect X to Y`, `remove the cache`, `rename A to B`,
  `layout left to right`, `title My System`, `clear`.
- **Export** — download as **SVG** or **PNG**, or copy the underlying **Mermaid** source.
- **Persistent** — your diagram and conversation are saved in local storage.

## Example prompts

```
A web app with a React frontend, Node backend and Postgres database
Add a Redis cache and a Kafka queue
Microservices: API gateway, auth service, orders service, payments service
Connect frontend to backend
Make the layout left to right
```

## Tech stack

React 18 · TypeScript · Vite · [Mermaid](https://mermaid.js.org/) for rendering.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run preview  # preview the production build
```

## Deployment (GitHub Pages)

The app is configured with `base: '/archify/'` for a project page at
`https://<user>.github.io/archify/`. The included workflow
(`.github/workflows/deploy.yml`) builds and deploys on every push to `main`.
Enable **Settings → Pages → Source → GitHub Actions** in the repository.

Deploying elsewhere? Override the base path:

```bash
VITE_BASE=/ npm run build
```

## How it works

1. Your message goes to either the local parser (`src/lib/parser.ts`) or the Claude API
   (`src/lib/llm.ts`).
2. Both produce an updated diagram model (`src/types.ts`).
3. The model is compiled to a Mermaid flowchart (`src/lib/diagram.ts`) and rendered
   (`src/components/DiagramView.tsx`).
