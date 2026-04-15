---
name: Never use polling
description: Never use polling (setInterval/setTimeout loops) for async operations — use SSE, webhooks, or await
type: feedback
---

Never use polling (setInterval checking status every Ns). It's wasteful and creates infinite loops when things fail.

**Why:** User explicitly forbids it. Polling masked a broken prediction endpoint (model missing) by looping forever with "processing" status.

**How to apply:** For fire-and-forget async operations, either:
1. Await the result directly (if fast enough)
2. Use SSE (already exists in the project for monitor events)
3. Return the result in the same request if possible
4. If truly async, use a WebSocket/SSE push notification when done — never client-side polling
