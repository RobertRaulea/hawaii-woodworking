# Prompting and Instruction-Writing Guide

Use this for writing task prompts for agents and for editing `AGENTS.md` and the files it links. Sources: OpenAI GPT-5 prompting guide and Codex docs (https://developers.openai.com/cookbook/examples/gpt-5/gpt-5_prompting_guide, https://agents.md/), Anthropic prompting best practices and Claude Code memory docs (https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices, https://code.claude.com/docs/en/best-practices, https://code.claude.com/docs/en/memory).

## Writing agent instructions (AGENTS.md and linked docs)

- Keep the root file short. Claude Code recommends under about 200 lines; Codex truncates combined instruction files at 32 KiB. Every line costs attention on every task.
- Include only what the agent cannot infer from code: exact commands, non-obvious invariants, decisions already made, mistakes the agent already made twice.
- Be specific and testable. A colleague with no context should be able to follow each rule. Replace "write clean code" with a concrete rule or delete it.
- Give the reason behind a non-obvious rule. It produces better judgment at the edges.
- Avoid contradictions between files. GPT-5 follows instructions strictly, so conflicting rules degrade results. Report a conflict instead of choosing silently.
- Avoid emphatic wording (ALL CAPS, "NEVER EVER") except for real hard stops. Over-emphasis makes agents over-execute.
- State done as commands and evidence ("run `npm run lint` and both `tsc` configs"), not as prose.
- Instructions are guidance, not enforcement. For hard blocks (production deploys, destructive scripts), use approval gates or hooks, not only text.
- Add a rule when the agent repeats a mistake or the same review comment appears twice. Remove rules that are stale. Put progressive detail in linked files.
- Use `@AGENTS.md` as the only content of `CLAUDE.md`, so Claude Code and Codex read one source.

## Task prompt template

Robert's best results came from bounded, structured prompts. Use this shape:

```text
OBIECTIV: [one sentence, visible outcome]
CONTEXT: what is broken or missing, where (file paths), expected behavior
REGULI: what to reuse, what not to touch, what not to invent ("Nu reconstrui", "Nu modifica producția")
TESTE: tests to add or run, exact commands
LIVRABIL: what to deliver, then "oprește-te"
Files to read first: docs/decisions.md, [task files]
```

## Agent behavior to ask for

- **Ask when blocked by missing context, act when the answer is in the repo.** Search the code first. Ask only for business values, UX choices, or approvals.
- **Control scope.** Do what was asked. No extra features, refactors, or abstractions. Mention a nice-to-have in one line instead of building it.
- **Parallelize independent reads and checks.** Do not parallelize edits on the same files.
- **Persist until done.** Do not stop at a plan if the plan is approved; do not stop at "it compiles" if the symptom is not verified.
- **Be honest about uncertainty.** Say what was not tested. Do not claim a result without evidence.
- Use Context7 MCP for unfamiliar library APIs, and the Convex MCP for Convex questions, before guessing.

## Anti-patterns

- Long auto-generated instruction files that restate the code.
- Vague rules ("follow best practices").
- Rules that only say what not to do, with no description of the wanted behavior.
- Brittle if/then decision trees where a clear principle works.
- Historical pass counts or deployment claims written as current facts.
