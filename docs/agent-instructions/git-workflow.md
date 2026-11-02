# Git Workflow

## Scope and Permissions

- Inspect the worktree before editing; preserve existing user changes and untracked files.
- Keep changes focused and prefer incremental refactors over rewrites.
- Do not commit, push, publish TEST, deploy production, or activate payments unless requested/approved. A successful local build is not release authorization.
- Frontend/backend contract changes may require a coordinated release; flag compatibility risks instead of deploying one side silently. Follow [the environment runbook](../environments.md).

## Commit Messages

Use conventional commits matching the change:

- `feat:` — features
- `fix:` — bug fixes
- `style:` — visual/styling changes
- `refactor:` — behavior-preserving code improvements
- `test:` — tests
- `docs:` — documentation/instructions

## PR / Review Guidance

- Keep PRs small and focused.
- Explain what changed, why, and how it was verified.
- Call out auth/fair-scope, stock, payment, migration, and environment risks where relevant.
- Report actual checks and remaining manual verification; dated audit notes are not evidence that the current revision was tested or deployed.
- Do not include secrets, local environment files, or unrelated generated/build output.
