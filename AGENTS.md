<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Builder workflow for Chia / Mastermind

Use gated micro-tasks for project work. Do not bundle implementation, validation, commit, and deploy into one long hidden run unless explicitly asked.

Default gates:
1. Inspect/plan — no code changes; report plan and risks.
2. Implement — make only the scoped code changes; report changed files/diff summary.
3. Validate/fix — run lint/build/tests; fix only validation issues; report result.
4. Commit/push — commit validated changes and push; report commit hash.
5. Deploy/verify — deploy and verify live URL; report final status.

Each gate must end with a clear `DONE` or `BLOCKED` summary. If Telegram updates are available, send only milestone updates: start, validation, commit, deployment, blocker. Avoid spam.
