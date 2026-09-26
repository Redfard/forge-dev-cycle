---
name: make-extended-spec
description: Write the extended spec of a forge cycle task into its spec.md (the task folder in .forge/tasks) — so that code is implemented straight from it, without a separate step-by-step plan. Runs when something names it — the user or forge:auto.
argument-hint: "<task key | path to state.md> [r|ra|a] [N]"
---

# Extended Design Spec

A design spec rich enough to **implement the code straight from it, with no separate
line-by-line plan**. Flow: **requirements (or `/forge:brainstorming`) → extended spec → review →
implement directly**, most often in the same session, with the code gates — test suite,
type/lint, security, smoke run — as the safety net a plan would otherwise be.

**Core principle: pin WHAT and the change STRUCTURE at signature altitude; never line numbers
or code bodies.** The spec carries everything a full plan would except those two, and they are
derived live against the real code at implementation time. That is what avoids the stale-line
and false-edit errors a pre-written line-by-line plan introduces.

**Good design still governs the spec:** small, well-bounded units with one responsibility and
clear interfaces; follow existing codebase patterns; only targeted improvements to code you
touch — no unrelated refactoring; YAGNI. If you came from `/forge:brainstorming`, its fuller design
guidance already applies — this is the compact reminder so it also holds standalone.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.make-extended-spec` before you start
and follow it inside the borders of this skill; no hook is a full answer.

**Zero context.** The input is a task key or the path to a `state.md` — not the chat history.
Nothing was passed → the newest folder in `paths.tasks` by modification time.

**What you read from the steps before you:** `decisions.md` — the decisions of the brainstorm — and
`context.md` when it is there. No `decisions.md` → say so plainly and ask whether to write the spec
without it. `context.md` is optional by definition; its absence needs no question.

**Decision mode.** `defaults.decision_mode` says how to close forks: `autonomous` — pick yourself and
write down why, `recommend_and_ask` — recommend and ask on the forks that matter, `ask_each_time` —
ask on each one. It does not overrule "When the spec cannot be written yet" below: an undecided
question is still handed back, not answered for the user.

**Every factual claim carries its source.** `app/Models/User.php:42`, a URL, a command and its
output. A claim with no source is a hypothesis, and a hypothesis cannot be the ground for a decision
in the spec — mark it as one or go and check it. A package version is taken from the official
source of that package, and `latest` never stands in for a version number.

**`state.md`.** When the spec is saved, update it as `../../reference/state-file.md` says.

**Progress:** `../../reference/progress.md`. Your steps are `frame`, `draft`, `change-map`,
`pre-mortem`, `review-pass`, `handover` — the call is `../../bin/forge-progress <task> step
"<name>"`, and each step is marked **Checkpoint:** in the text where it happens. The list here is
the index of them. A second review pass is a second `review-pass` step with its number after the
colon. The skill is not finished while one of them has no line.

## Before you write

**Checkpoint:** `step "frame"`.

Two things must already be settled when you start. Neither is settled *here*: arriving without
them means stopping and saying so, not improvising a way forward.

- **Acceptance criteria — agreed upstream, not agreed here.** The criteria this work will be judged by — the story DoD, the acceptance criteria, the ticket's own list — must be settled before the first section, and settling them is not spec work. Arriving without them is the same as arriving with an undecided design: stop. Every agreed item ends up closed by the DoD in section 12, and an item the spec deliberately breaks becomes a decision in section 4 — argued there, not footnoted at the end where the reader meets it after the design is already built on it.

    What counts as settled: any list the result will be judged against, however it is written. A ticket's bullet list of requirements qualifies — restate it as criteria and carry on. A description of the change with no statement of when it is done does not: ask for the bar. The bar you invent yourself is the one the DoD will then declare met.

    **Criteria you had in context go into the spec, worded as you got them.** They arrive from a ticket, a requirements page, or the request itself — places the spec's later readers may not have. A reviewer with a clean context cannot check that the DoD closes them while they live only in your head, and a year on the ticket is closed while the spec is still here. Quote the items this change is judged by, not the whole requirements document.
- **Where the file goes.** `spec.md` in the task folder — the one named by `state.md`, or
  `paths.tasks/{TASK}`. There is no task folder at all → ask whoever invoked you, which in a
  delegated run is the agent that spawned you, not a human. A spec saved where nobody looks for it
  costs more than the question would have.
- **The frame is binding.** Read `conventions.rules`, `conventions.arch` and every source in
  `conventions.external` before the first section. `arch.md` is what tells you where the change
  belongs; `rules.md` is what it must obey. Once the change map names its files, read the cards in
  `conventions.references` whose `paths` match them (`../../reference/frame-format.md`): the new
  classes in the spec take the shape the card shows. A design step that conflicts with the frame stops the
  work and becomes a question: fit the spec to the frame / change the frame in its own task / drop
  the step. Section 10 reports the mechanical checks that came out of the frame. The frame is still
  empty → keep working, and write one line in the spec: the frame was empty and project rules were
  not checked.

## When the spec cannot be written yet

Hitting an undecided question while writing is not a cue to pick an answer and carry on. Stop
and hand back a list: what is unsettled, what you would choose for each, and what it blocks.
Then write once it is settled.

This costs a message. Guessing costs an architecture built on the guess, tests that encode
it, and a review that has to find it — the spec reads as decided either way, which is exactly
why nobody catches it.

The same applies to a fact you cannot support: if the code does not back a claim the spec needs,
it is an open question, not a softer sentence — and when the request treated that claim as
settled ("the endpoint already exists"), say what the work turns out to be instead, because a
frontend change whose endpoint does not exist is a full-stack one and whoever asked was
budgeting for the first. Absence is a claim too: search by the name and by what the thing would
plausibly be called instead, across the repository rather than the module you expected it in.

## Spec template

**Checkpoint:** `step "draft"`.

Write the spec in the language from `language`. Sections are mandatory unless marked *(if applicable)*:

**Sections 1–3 are the reader's entry point** — someone who reads only those must already know what this change does to the database and to the code. Everything after them is depth, not orientation.

1. **Goal + context / key facts** — close it with a one-line **blast radius**: `3 files · 1 table (+2 columns) · 1 migration · 0 endpoints`. Counts only; the detail is the next two sections.
2. **Database changes** *(if applicable — skip it in specs with no schema work)* — flat and skimmable: one line per column, then relations, indexes, and what you deliberately leave alone. See the example below. Migration mechanics (`down()`, backfill order, batching) belong to "Risks / rollback" — keep them out of here.
3. **Change map — Create / Modify / Delete** — an **exhaustive** file list; for each file, the changes it needs at **signature altitude** (methods / columns / guards / component props) **plus one phrase of why**. **Several changes per file are fine — list each one** as a terse sub-bullet. Keep them signatures/intent only: **no line numbers, no code.**
   **Checkpoint:** `step "change-map"`.
4. **Decisions** (from the brainstorm or your requirements) + **Non-goals / YAGNI**
5. **Architecture** — layers/classes (backend) or components + data flow (frontend)
6. **Impact / ripple sites + guards** *(if applicable)* — what changes implicitly, which call-sites must be guarded. A missed guard is a silent bug. May merge into the change map. Two questions have mechanical answers and belong here whenever they apply:
    - **A duplicated value the change reads as a key** (a denormalized column, a cached count, a mirrored flag): name who writes it and what leaves it stale. The writer that skipped the old rows and the writer that is missing on a path which moves the row are the same question asked once — a spec that finds only the first has found half the column.
    - **A new branch selected by an input:** its reachability is what the boundary admits, not what today's client sends — read the endpoint's validation, not the frontend. And if the branch means "narrowed to one entity", that definition lives in exactly one place: say where. Two places deciding it separately drift, and the gate ends up on the wrong side of the drift.
7. **Contracts** *(if applicable)* — API endpoints / types; i18n keys (all locales).
8. **Implementation order + dependencies** — short build/commit order and **why** (ordering traps).
9. **Test targets** — specific test files + key assertions/literals (the TDD targets). List the cases at the seams already agreed, naming for each what the test drives and what it substitutes. No agreed seams means an unsettled decision: stop and ask, rather than picking one here and discovering the harness cost while writing tests.
10. **Gates + success criteria** — concrete, runnable commands: static analysis / type check, security checks, live/smoke run + expected result. **The test run is not pinned here** — the implementation assembles it from the diff, so a literal full-suite command written into this section only widens it back to everything. The commands themselves come from `commands` in the config and run from `workdir`. Treat data snapshots as **orientation, not assertions**. Close it with the convention checks you actually ran, each with its answer. Only checks whose answer is a grep or a table lookup belong here: every call in the change map against the project's layering rules, every new class against the base it must inherit. A rule sitting in the context window is not a rule the finished document obeys — a layering matrix loaded on every single turn still did not stop a change map from prescribing a call it forbids. No mechanical checks apply to this change: no lines. Anything needing judgement stays with the reviewer. The runnable list above also names the project's standing checks over the **finished** code — the file at `paths.checks`, referenced by path, never copied in, plus any check this change alone needs. No such file: no such line, and nothing to ask about.
11. **Risks / rollback / prod-safety** *(if applicable — migrations, data, production)*.
12. **DoD** — short checklist. It opens with the acceptance criteria **quoted as you received them**, one line each, and continues with the spec's own items (tests green, gates passed). Quoting rather than paraphrasing is the point: a criterion retold in your own words is where the bar moves without anyone deciding to move it. A criterion this spec deliberately breaks stays on the list and says which decision in section 4 breaks it — dropping it from the list is how a broken criterion later reads as a met one.

### Database changes — the right shape (example)

One line per column, four fields, in this order: **what · type/nullability · why · safety flag**. The safety flag is one of `safe` / `needs backfill` / `destructive` — it is the first thing a reader wants when the system is live. A brand-new table gets a `New table: <name> — what one row means` line with its columns listed under it, same four fields.

```
Columns:
- comments.deleted_at     timestamp NULL      soft-delete of a comment            safe
- comments.deleted_by_id  bigint NULL FK      who deleted it (admin UI)           safe
- projects.status         enum → varchar(32)  new statuses without enum churn     needs backfill
Relations: comments.deleted_by_id → users.id, ON DELETE SET NULL
Indexes:   + (comments.project_id, deleted_at) — fetching the live comments of a phase
Not touching: documents.phase_id — denormalized helper, not a relation; do NOT drop
```

"Not touching" is worth a line whenever a reader might reasonably expect a column to be dropped or repurposed. Naming it kills the question before it is asked.

### Change map — the right altitude (example)

Every entry carries a **why** — one phrase, after the change itself. The signature says what the file becomes; the why is what makes the map readable top-to-bottom without jumping to the architecture section.

```
Create:
- actions/NormalizeAliases     — normalization only: the provider must not backfill on boot
- tests/NormalizeAliases.test  — per-table counters (TDD target)
Modify:
- repositories/DocumentRepo:                     # several edits in one file — ok
    - + normalize(): per-table counts — the command reports what it touched
    - + findByAlias(alias): Document[] — the listener resolves media by alias
- providers/ModuleProvider     — register 3 morph aliases: media rows still store FQCN
- listeners/CreateInvoice      — guard by alias (else invoices silently skip)
Delete:
- commands/LegacyBackfill      — superseded by NormalizeAliases
```

No line numbers, no code bodies — the implementer fills those reading live code.

## The litmus rule

If a change description contains a **line number** or a **code body**, it belongs to implementation (derived live), not the spec.

- **Exception — a snippet whose exact shape must be copied** (a regex, a precise SQL condition, a boundary `>=` vs `>`, a nesting that changes semantics): pin it. Declare that **once**, as a single line at the top of the change map — *"the code blocks below are normative: copy them verbatim unless a block says otherwise"* — and then never re-justify normativity block by block.
- **This skill's vocabulary is for you, not for the document.** `altitude`, `form is the decision`, `litmus`, `gravity well`, `blast radius` (the label excepted) are how the instruction is phrased to the author; copying them into the spec produces meta-labels where the reader needs facts. Write what is true about the code.
- **Gravity-well warning:** the change map tends to creep into a full line-by-line plan. Stop at "what each file must become."

## Prose the reader decodes in one pass

A spec is read once, under time pressure, by someone about to change code. A sentence that must be decoded twice costs more than a sentence that is longer. These rules mostly *remove* words.

- **Open with the action or the fact** — never with an abstract label as the subject. "The shape is part of the decision", "Correctness boundary:", "The row contract requires" → say what to do, or what is true.
- **Parentheses hold only what may be skipped.** A parenthesis containing the reason, the consequence, or what breaks belongs in the sentence itself.
- **One paragraph, one claim.** Do not fuse *what to do* + *why* + *what breaks* into one sentence with dashes and brackets. Order: what to do → the mechanism → what breaks without it.
- **A term arrives no earlier than its anchor in the code.** "OR group" / "AND filters" before the snippet is a riddle; next to `where(closure)` it is obvious.
- **No jargon verbs in the working language.** Transliterated English (an English verb like `pin` or `gate` given the working language's endings) adds a decode step for nothing. Impersonal phrasing is fine; opaque phrasing is not.
- **One fact, one home.** State a fact in one section and cross-reference it elsewhere. The same mechanism re-explained in the change map, the impact section and the build order reads as three separate constraints.

Before → after — same length, one decode less:

```
Before: The shape is part of the solution (correctness boundary: the OR group must
not mix with the AND filters type/status/period). The exact frame is pinned —
applyIlikeSearch opens its own where(closure), so the wrapper is mandatory:

After:  Copy the frame below verbatim. The `where(closure)` wrapper is mandatory:
`applyIlikeSearch` opens its own `where`, and without the outer wrapper the search
`orWhere` surfaces to the top level — the type/status/period filters get OR-ed with
the search and stop narrowing the result.
```

## The pre-mortem pass

**Checkpoint:** `step "pre-mortem"`.

Before the spec goes anywhere, spend one pass on a single question: **this shipped, and it
broke — what broke?** Not "what is wrong with the document" — that is the reviewer's job, and it
reads the text for defects. This pass assumes every sentence is right and asks what the built
change does to the running system anyway. Different angle, different catch.

Keep it to a paragraph of thinking, not a section: what it surfaces goes where it belongs — a
guard in the impact section, a case in the test targets, a line in the risks — and the paragraph
is then discarded.

## Handing the spec back

**Checkpoint:** `step "handover"`.

Two things, whatever else you say: **the path** the spec was saved to, and **what the pre-mortem
produced** — one line naming what surfaced and which section took it, or "nothing new" when it
came back empty. Without that line a pass that ran and a pass that was skipped look identical
from outside, and the one nobody can check is the one that stops happening.

Then name the next step: `/forge:review-spec`, or `/forge:implement-extended-spec` once the spec has
been reviewed.

## Auto-review flags (`r`, `ra`) + pass count

**Checkpoint:** `step "review-pass"`.

The invocation may carry a flag and/or an integer, in any order (`ra`, `r 2`, `ra3`, bare `2`). What runs after the spec is written and saved:

- **No flag, no integer** — stop; the user decides what's next.
- **`r`** — run the review, then **offer** the fixes (apply only on the user's go-ahead).
- **`ra`, or a bare `a`** (the `a`/apply flag) — run the review and **apply immediately, no separate prompt**: `a` *is* the user's standing approval to apply the must-fix items + the optional fixes you agree with (endorsed), at your discretion. Advisory and rejected items are not applied. Afterward, report what was applied and what was left.
- **Integer N** (default `1`) — how many review **passes** to run. With `N > 1`, repeat the review N times; each pass reviews the **updated** spec (fixes from earlier passes already applied). A bare integer with no flag still runs N passes in **offer** mode. In apply mode (`a`), every pass applies must-fix + endorsed automatically. **Stop early** if a pass finds nothing to apply.

Running the review (any flag/count):

- **Invoke `/forge:review-spec` on the saved spec file, forwarding the same flag and the same pass
  count N.** It runs the N-pass loop itself and saves each pass to `spec-review-{n}.md`. For `a`, the
  forwarded flag carries the standing approval to apply must-fix + endorsed every pass, with no
  per-pass go-ahead.
- **If that skill is not available** → don't fail. Fall back to an inline loop: for each of N passes,
  dispatch a clean-context subagent, check against the "Review checklist" below, verify its findings
  against the document yourself, then apply (`a`) or offer the must-fix + endorsed fixes, and
  re-review the updated spec on the next pass. Say in the report that the review ran inline, without
  the reviewer checklist and without a `spec-review-{n}.md` file.

## Review checklist (optional, non-exhaustive)

If the spec gets reviewed — by whoever, however — these format-specific points are worth checking. They are **among the things to verify, not all of them, and not a limit** — also review correctness, completeness, scope, and anything else as needed.

Every point below is also a row in the reviewer's checklist — `spec-reviewer.md`, the file
`/forge:review-spec` pastes into its subagent. That is the list the main review path actually runs,
so a point added or reworded here belongs in both, and a point that lives in only one of them is a
check the main path does not perform.

- **Entry point (sections 1–3)** — do the blast radius, the DB section, and the change map agree with each other, and with the rest of the spec?
- **Acceptance criteria** — are they quoted in the DoD rather than summarised, and is each one either closed there or pointed at the decision that breaks it?
- **Convention checks** — are the mechanical ones answered with what was found, rather than with "complies"?
- **Database changes** — every column carries a type, a why, and a safety flag; relations/indexes named; migration mechanics not leaking in from "Risks".
- **File-list completeness** — no missed call-site or ripple.
- **Altitude** — no premature code or line numbers (litmus holds).
- **Impact + guards** — present and concrete.
- **Gates** — concrete runnable commands with expected results, not "run the tests".
- **Test targets** — specific, not "add tests".
- **One-pass decodability** — does any sentence that carries an instruction or a constraint need a second read: a meta-label opener, a load-bearing parenthesis, a jargon verb, or one fact re-explained in three sections?
