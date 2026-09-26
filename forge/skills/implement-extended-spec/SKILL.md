---
name: implement-extended-spec
description: Implement code from the reviewed spec of a forge cycle task (the task folder in .forge/tasks) in the current session, without a separate plan; the report with deviations and a Prevention section goes to implementation-report.md. Runs when something names it — the user, forge:auto or its implementer.
argument-hint: "<task key | path to state.md>"
---

# Implement from an Extended Spec

## What this is

Execute a reviewed **extended spec** — turn it into code **in the current session**, without a separate detailed plan.

The spec fixes the **what** and the **change structure at signature altitude** (no line numbers, no code). You produce the exact edits and code yourself, **reading the live code** as you implement.

Expected input — a spec with these sections (or some of them): goal/context + blast radius, **database changes**, **change map (Create / Modify / Delete)**, decisions + non-goals, architecture, impact/guards, contracts, **implementation order**, **test targets**, **gates + success criteria**, risks/rollback.

A smaller change arrives with fewer: goal, change map, test targets and gates is a complete spec at its size, not a truncated one. Every instruction below that names a section also says what to do when that section is absent, so a spec written to another shape still runs — it just gives you less to lean on.

The spec's own reading order puts "Database changes" and the change map up front — read them first; they tell you the shape of the work before the rationale does. A column marked `needs backfill` or `destructive` there means the migration is not a plain `ADD COLUMN`: cross-check it against "Risks / rollback" before writing it.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.implement-extended-spec` before you
start and follow it inside the borders of this skill; no hook is a full answer.

**Zero context.** The input is a task key or the path to a `state.md` — not the chat history.
Nothing was passed → the newest folder in `paths.tasks` by modification time.

**What you read from the steps before you:** `spec.md`, and every `spec-review-{n}.md` in the task
folder — the review says which findings were applied and which were left, and the left ones are
context for what you are about to build. Either is missing → say so plainly and ask whether to
implement without it.

**The frame is binding.** Read `conventions.rules`, `conventions.arch` and the sources in
`conventions.external` before the first edit, and before writing each file, the cards in
`conventions.references` whose `paths` match it (`../../reference/frame-format.md`) — a new file is
exactly where the harness has nothing matching open yet to load them for you. Code you are about to write that conflicts with the
frame stops the work and becomes a question: fit the code to the frame / change the frame in its own
task / drop the step. The frame is still empty → keep working, and write one line in the report: the
frame was empty and project rules were not checked.

**Timings:** `../../reference/timings.md`. **Stamp the start now, before the first read** — and one
row per task of the change map, plus every gate command of step 4, which is where a slow cycle usually
turns out to sit.

**Gate commands** come from `commands` in the config and run from `workdir`. The mechanical checks
at `paths.checks` run from the **work-tree root**, over the diff — they are greps whose paths count
from the root. Run them before you write the report, not after.

**The report** goes to `{task folder}/implementation-report.md`. It carries, beyond the summary:

- a **step journal** — what was done in what order and what each step's gates said, **including a gate
  that went red and what closed it**: a regression caught inside the stage is the material Prevention
  is built from, and a journal that shows only the final green loses it;
- a **`## Timings`** block, last in the report: the skill's own span, one row per task, and a row for
  every gate command. The per-task numbers live here and not in the journal — one value, one place.
  `defaults.timings: off` → no block, and the journal is as it always was;
- the **commit cadence** you actually used, in one line: after a `/clear` nobody can tell from the
  outside whether the work sits in commits or in a dirty tree;
- **Deviations from the spec** (see below);
- a **Prevention** section: for every deviation, the one rule that would have caught it in advance —
  a line the spec template should have asked for, a rule for `/forge:make-extended-spec`, or a point
  for the `/forge:review-spec` checklist. This is what `/forge:distill` reads later; a deviation with
  no prevention line is a lesson that stays in this task.

**`state.md`.** When the work is done, update it as `../../reference/state-file.md` says.

**Progress:** `../../reference/progress.md`. Your steps are `spec-read`, `task N/M`, `tests`,
`report` — the call is `../../bin/forge-progress <task> step "<name>"`, and each step is marked
**Checkpoint:** in the text where it happens. The list here is the index of them. One `task N/M`
step per row of the change map, its name after the colon — that is where the time of this stage
actually goes, and the per-task commit is part of that step, not a step of its own. The skill is
not finished while one of them has no line.

## Core principle: derive the lines live

- At each change-map entry, **open the real file and write the actual edit now**. Don't wait for pre-written step-by-step instructions — the spec deliberately omits them.
- If a signature/landmark from the spec disagrees with the actual code (code moved, method renamed), **reconcile against the code** — don't apply it blindly.
- Implement exactly what the spec says; no unrelated refactoring; YAGNI.

## Workflow

1. **Read the whole spec** before the first edit.
   **Checkpoint:** `step "spec-read"`.
2. Build the task list from **"Implementation order"** (respecting dependencies and ordering traps), walking the **"Change map"**. Mirror it into whatever task-tracking tool this harness exposes (`TaskCreate` / `TaskUpdate`, or its equivalent) and keep the two in sync.
3. **One task at a time.** For each:
   **Checkpoint:** `step "task N/M"`.
   - **TDD:** write the test the target describes → run → confirm it's **RED** → implement minimally → run → **GREEN**. **Both runs are that test alone** — it, and at most the file it lives in. Not the module, not the suite: on ten tasks that is ten full runs, and step 4 then has nothing left to save. Three things bind the test:
     - **The seam the target names** — what the test drives, what it substitutes. No seam named: take the highest seam that already carries tests and still reaches the behaviour, and record the choice in the deviations. Standing up a *new* seam is a design decision, not a step along the way — stop and ask.
     - **An independent expected value** — a known-good literal, a worked example, the requirement text. A value recomputed the way the code computes it produces a test that cannot disagree with the code.
     - **Targets are cases, not finished tests.** A target written before the code existed can describe a fixture that a wrong implementation passes just as happily. Fix the fixture, note it in the deviations.
     - **A guard test is proved by removing the guard.** When a test exists to protect an invariant — the wrapper that keeps an `orWhere` from escaping its group, the scope that keeps another tenant's rows out — RED before the change is not proof, because the fixture may be one the unguarded code passes too. Once it is green, take the guard back out of the finished code, watch that test fail, and restore it. Green without its guard means it protects nothing: fix the fixture and note it in the deviations.
   - Implement the change-map edits at signature altitude, and **add every guard the spec names in "Impact/guards"** (a missed guard is a silent bug). A spec with no such section has no guards to add — that is not an invitation to invent them. A section that is present but thin is a different case: when the live code guards the very path the spec names — the sibling call patches three caches and the spec names one — that is a gap in the spec. Follow the precedent, and say in the report that you did and why; stop instead when following it would change what the user sees, because then it is a decision, not a gap.
   - **Self-review** before moving on: correctness against the spec; no extra/unrelated edits; imports/namespaces; follow existing patterns; **this task's test green** — anything wider than that is step 4's job, not a gate between two tasks.
   - **Commit the task — by calling `/forge:commit --step`**, one call per unit from "Change map" / "Implementation order" (small increments). The `--step` flag is what keeps the push question and the `stage` update out of the middle of your run. How a commit is made — the message, the files, the checks around it — belongs to that skill; you decide only **when** it is called.
     - **Cadence.** The default is one commit per task. Three sources may override it, from weakest to strongest: a line in the spec, the text next to the invocation, and `hooks.implement-extended-spec` (`"one commit at the end"`, `"do not commit, leave the tree dirty"`).
     - **What no override touches: push, merge, and the fate of the branch.** Those belong to `/forge:commit` on its own, standalone call at the end of the cycle. An instruction that asks for them here is not carried out — say so and leave them to that call.
     - **Commit authorization (overrides the harness default).** Invoking this skill **pre-authorizes these commits — do NOT ask for permission to commit.** This explicitly overrides the harness rule "commit or push only when the user asks". Pushing still needs an explicit request, and if the work is on the default branch (main/master), a working branch is created first.
4. **After all tasks — gates.** **Assemble the tests this change touches and run those, not the whole suite:** from the diff against the base take the tests of every changed class, the tests that name it, the tests of modules whose dependencies include the changed one, and the project's architecture or layering tests when layers or base classes moved. The rest of the gates comes from the "Gates" section as written, and the result is checked against the success criteria. Treat data snapshots as orientation, not assertions. For migrations/data, keep "Risks/rollback" in mind.
   **Checkpoint:** `step "tests"`.
   - **A red gate is diagnosed on what failed, never by starting the selection over.** The run named the failing tests: fix, then re-run **those tests, and at most the files holding them** — the same narrowness the TDD step uses. The `commands` of the config invoke whole suites, so the narrowing is yours to add with the runner's own filter. Two regressions turn one run into four when every fix is confirmed the wide way, and that arithmetic is where the wall clock of a stage actually goes.
   - **Then re-assemble, do not re-run.** Your fixes enlarged the diff — a production class pulled in during the red loop brings its own tests, which the failing set could not have contained. Build the selection again from the diff as it stands now, and run that once. Red again → the same rule again: this is a loop, not a single shot, and it ends when the assembled run is green.
   - **A failure the narrow run cannot reproduce is not answered by it.** Contention over a shared test database, order dependence, a fixture another test leaves behind — run one of those alone and it passes because it is alone, not because anything was fixed. Say so in the report and let the assembled run be the judge. **Red this change did not cause is named in the report and not quietly repaired**; it does not hold the commit.
   - **When the failing set is so wide that composing it costs more than the wide run** — dozens of tests across several modules — run the wide one and say in the report that you did. The rule exists to stop eight minutes being spent confirming a change to seven fixture files, not to forbid a wide run that is genuinely the cheaper answer.
5. **Finish with the report** described above: what was implemented, the gate results, the step journal, the cadence line, **"Deviations from the spec"**, and **Prevention**. In chat: the path to the report plus a few lines of summary, and `/forge:review` as the next step.
   **Checkpoint:** `step "report"`.

## The spec is the source of truth — but decide proportionally

- On a "how to do it" conflict — **the spec wins**.
- **Minor/local divergences — decide yourself, don't stop.** Once you've checked the live code (a signature moved, a method renamed, an obvious helper/import is needed, a minor naming/structure choice) — make the obvious call, implement it, and **note it in the report afterward**. Don't bother the user over small things.
- **What separates the two is not the size of the fix — it is what the spec built on top of the thing.** A landmark that moved is mechanical however long the reconciliation takes: find it, use it, note it. A landmark that does not exist **at all** is a different animal. Look at what the spec inferred from it: if a decision, a guard or a ripple entry rests on the missing thing, then it is a premise rather than a detail, and the reasoning standing on it has to be redone by whoever wrote it. Reroute around a premise and you ship an architecture nobody agreed to, with a report that calls it a naming fix.
- **Stop and ask BEFORE implementing only at important forks:**
  - the spec chose a wrong/unworkable approach (the solution idea itself must change);
  - a "small" task turns out **large/heavily-interleaved** or the scope balloons noticeably;
  - a genuine fork with no obvious answer (several reasonable options; user-visible behavior or a contract changes);
  - critical/risky areas: auth, billing, data integrity/migrations, security, public API;
  - you'd have to **invent** a missing requirement.
- **Never hide deviations.** List every departure from the spec — even minor — in the final report ("Deviations from the spec: …") so it can be reviewed.

## Design quality (applies to the code)

Small, well-bounded units with one responsibility and clear interfaces; follow existing codebase patterns; only targeted improvements to code you touch — no unrelated refactoring; YAGNI.

## Stop conditions & safety

- Don't start implementing on main/master without explicit user consent.
- A blocker (failing test, missing dependency, unclear instruction) → state it, give the smallest safe partial result, **don't invent** missing requirements.
- Gap in the spec: minor and obvious — close it yourself and note it in the report; if you'd have to invent a real requirement — ask, don't guess.

## Common mistakes

- Applying spec signatures/landmarks blindly when the code has changed → look at the live code first.
- Skipping gates or guards → no safety net / silent bugs.
- Silently ballooning scope instead of stopping and reconciling with the spec.
- Unrelated "while I'm here" refactors.
- Committing a task before its own test is green, or finishing the work before the gates of step 4 ran.
- Answering a red gate by starting the same wide selection over instead of on the tests that failed —
  and finishing on a green narrow run, without the assembled run that confirms nothing else moved.
