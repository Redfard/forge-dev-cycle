---
name: fix
description: Fix round in the forge cycle: applies review findings or manual test defects, runs the tests of what was touched, commits through forge:commit --step and writes the fixes-{n}.md report. Does not review and does not push. Runs when something names it — the user, forge:auto or its implementer.
argument-hint: "<task key | path to state.md> [source: review-{i}.md | manual-test.md | text of findings] [which items: #1 #4 #7 — from a review; scenario number or start of an entry — from a test] [--decide]"
---

# Apply a list of findings

## What this is

Turn **a list somebody else wrote** into code — findings from `/forge:review`, or defects from
`/forge:manual-test`. One round of fixes, one report, one call to the commit skill at the end of it.

This is not the implementation skill with a different input. `/forge:implement-extended-spec` builds
its task list from the spec's "Implementation order" and walks the change map; here the task list
**is** the list, in the words of the report it came from, and the spec is the frame the fixes must
stay inside rather than the thing being built.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.fix` before you start and follow it
inside the borders below; no hook is a full answer.

**Zero context.** The input is a task key or the path to a `state.md`, plus the source. Nothing was
passed → the newest folder in `paths.tasks` by modification time.

**What you read before the first edit:** the source (below), `spec.md` — the fixes stay inside the
approved design — `implementation-report.md` when it exists, because its "Deviations from the spec"
often already answers a finding that reads like a bug, and **every `fixes-*.md` already in the
folder**: an item an earlier round records as applied is checked against the code rather than applied
a second time, and the report says which ones you found that way. A round that died between its
commit and the re-check looks exactly like a round that never ran. `spec.md` is missing → say so and
work from the source alone.

**The report is written in the config `language`**, like every other artifact of the set. The
frontmatter keys and the status words below are part of the contract and stay as they are.

**Timings:** `../../reference/timings.md`. **Stamp the start now, before you open the source**, and
stamp every command that runs the project's code. A round that took an hour and a round that took five
minutes read the same without it, and a start remembered at report time is a start invented.

**The frame is binding.** `conventions.rules`, `conventions.arch` and the sources in
`conventions.external`, read once at the start, plus the cards in `conventions.references` whose
`paths` match the files the round touches (`../../reference/frame-format.md`). A fix that can only be made by breaking the frame is
a question, not a fix. The frame is empty → one line in the report saying so.

**`state.md`.** A round of fixes is not a stage: **`stage` is left alone** — it keeps naming the loop
this round belongs to (`review` or `manual-test`), so a `/clear` resumes into that loop and not past
it. Add the report to **Artifacts**, one line to **Log**, and update `updated`.

**Progress:** `../../reference/progress.md`. The source you were given — a review report or a test
report — is named in the round's row by whoever opened it; when you open it yourself, name it there
too: a fix loop over findings and a fix loop over defects look identical without it. Your steps are `source`, `group`, `apply`, `tests`,
`report` — the call is `../../bin/forge-progress <task> step "<name>"`, and each step is marked
**Checkpoint:** in the text where it happens. The list here is the index of them. The commit that
closes the round is part of `report`: `/forge:commit --step` writes no steps of its own.

## Step 1 — The source, and what it commits you to

**Checkpoint:** `step "source"`.

| Source | Where it comes from | Where the items are inside it |
|---|---|---|
| `review-{i}.md` | `/forge:review` | numbered cards `#N`, each with a severity and a **verdict**; the last `## Re-check N` says which of them are still open |
| `manual-test.md` | `/forge:manual-test` | `## Problems found`, and every row marked `✗` or `◐` — `◐` names what stayed open, and that part is the item. Rows live in the original checklist **and in every appended round** — `## Verification round N`, `## Re-test N`, `## Plan round N` — so read the file to its end and take the latest state of each row |
| text next to the invocation | a person | whatever they wrote |

`passed` / `failed` / `blocked` in a manual test is the **status of the run**, not of a scenario:
there is no such thing as a "failed scenario" to look for. A `?` row is a scenario that never ran —
nothing to fix, and worth one line in the report.

Nothing was named → take the loop from `stage` in `state.md`: `review` → the newest `review-{i}.md`,
`manual-test` → `manual-test.md`. Say which you took before you start. `stage` says neither → ask.
Modification time answers nothing here: this skill touches its own source in step 5, so after one
round the newest file in the folder is the one the fixer wrote to.

**A `blocked` manual test splits in two, and the reason is in the report.** The stand, the auth or a
dependency never came up → there is nothing to apply: stop, say so, leave the tree untouched. An
**obligation left unproven** — a degenerate scenario, a criterion clause never reached, evidence that
did not support the verdict — is the other `blocked`, and that report can carry a full
`## Problems found`: apply what is in it, and say plainly in your report that the unproven obligation
is not closed by fixing them. Only a re-run closes that.

**The findings are not re-litigated here.** Apply what is written. A finding you believe is wrong is
a question to whoever wrote it — never a silent skip, and never a rewrite into what you would have
preferred it to say.

**A list can arrive already narrowed, and then the narrowing is the list.** The caller names the items
to apply and keeps back what it sorted out one step earlier, on a fact it holds and you do not: a
`must-fix` it **ruled out** against the code, a finding too large for this loop and deferred to a task
of its own. `/forge:auto` works exactly this way. Take the narrowed list as given, name in the report
which items were not in it, and **never narrow it yourself.**

How the caller points depends on the source, because only one of the two is numbered: out of a review
it is the card numbers — "`#1`, `#4`, `#7` out of `review-2.md`"; out of a manual test it is the
checklist number of the scenario (`✗` on row 3) or the opening words of the entry in
`## Problems found`, which carries no numbers of its own. Pointed at in words and you cannot tell which
entry is meant → ask, rather than fix the neighbouring one.

## Step 2 — Group the list

**Checkpoint:** `step "group"`.

**From a review — by verdict, not by severity:**

- `must-fix` → **all of them that reached you.** This is the whole reason the round exists.
- `optional` → by the mode (below).
- `rejected` → not touched, and it should not have reached you at all: `/forge:review` keeps those out
  of the findings and names them in "Not confirmed". One that did is a slip in the handover — say so
  rather than fix it.

**From a manual test:** every problem in `## Problems found`, plus every `✗` and `◐` row of the live
checklist. No optional tier here — a check that did not pass either passes afterwards or it does not.

**From free text:** treat every item as `must-fix` unless the text marks it otherwise, and say in the
report that you read it that way.

### The mode for `optional`

**Only the items that reached you are yours to settle.** An `optional` the caller already decided is
not reopened here: in `/forge:auto` the lead sorts the report before it hands anything over, so what
arrives is what it left to the round.

Default — **ask**, in one or two rounds of questions, not one question per item. Running as a subagent
you cannot reach the user, so the question goes to whoever invoked you — in `/forge:auto` as a
`QUESTION`. No answer to be had → those items stay untouched and are listed as open. A mode that says
to ask never applies anything on your own authority.

`--decide` — settle each one yourself, no questions. Apply when the fix is cheap, plainly improves
the code or removes a risk; **decline** when the benefit is arguable, the fix widens the scope, it
carries a regression risk, it conflicts with the frame or the spec, or it needs a product decision.
Every declined item carries its reason. The flag means "settle the optional items without asking" —
not "apply all of them".

**`declined` is this skill's word; `rejected` is the reviewer's.** A declined item is one nobody
disputed and the round chose not to do; a rejected finding is one that did not survive verification.
One word for both makes `fixes-{n}.md` unreadable to `/forge:distill`, which weighs the two
differently.

Inside `/forge:auto` the lead passes the flag by its `--autonomy` level: at `ask` the flag is absent,
at `mid` and above it is `--decide`. No new dial of its own. **An `optional` the lead handed over with
"apply this one" is not a candidate for declining** — it arrived decided; the flag settles the ones
that arrived undecided.

Outside `/forge:auto`, `defaults.decision_mode` in the config answers the same question the flag does:
`autonomous` reads as `--decide`, `recommend_and_ask` and `ask_each_time` as the default mode. A
project that said "decide without asking" already answered, and asking again ignores its own setting.
The flag beats the config, the config beats the default.

A subagent with no flag and no way to get an answer has one safe move and it is the one above: leave
those items, list them as open, and let the caller decide in the next round. Coming back with a
`QUESTION` mid-round only ends the round — the answer cannot reach the call that asked.

## Step 3 — Apply

**Checkpoint:** `step "apply"`.

- **One finding at a time**, in the report's order — the numbering `#N` is what the re-check will
  point at, so keep it.
- **Behaviour changed → the test comes with the fix**, in the same step, run pointwise right there.
  A finding that says "no test for X" is closed by the test, not by a note.
- **Fix the cause named in the finding**, not the symptom next to it, and nothing beyond it. "While I
  am here" belongs to another task.
- An item you could not fix stays on the list as **not fixed, with the reason** — the rest of the
  round is still finished.

## Step 4 — Tests, scoped to this round

**Checkpoint:** `step "tests"`.

**Assemble them from what this round touched, and run those — not the whole suite.** From the diff of
this round take the tests of every changed class, the tests that name it, and the project's
architecture or layering tests when a layer or a base class moved. The whole suite that `commands` in
the config describes belongs to CI; running it here buys one green line and costs the round its speed.

A fix after a review is exactly where a green test turns red, so this run is not optional — and it
comes **at the end of the round**, not after each item.

**Red is diagnosed on what failed.** The run named the failing tests: fix, then re-run **those, and at
most the files holding them** — `commands` invokes whole suites, so the narrowing is yours to add with
the runner's filter. Then **re-assemble** and run once: your fixes enlarged the diff of the round, and
tests pulled in by that growth were never in the failing set. Red again → the same rule again, until
the assembled run is green. It is a loop, and the wide run is its judge, never its diagnostic tool.

**A failure the narrow run cannot reproduce is not answered by it** — contention over a shared test
database, order dependence, a fixture another test leaves behind. Run one of those alone and it passes
because it is alone. Say so in the report and let the assembled run decide. Red this round did not
cause is named in the report, not quietly repaired, and does not hold the commit: a round cannot be
finished only by repairing something it did not break.

The rest of the gates from `commands` — static analysis, lint — run as they are written, **from
`workdir`**.

The mechanical checks at `paths.checks` run from the **work-tree root** over the diff — they are greps
whose paths count from the root. Like the tests, they belong **before the commit**, not after it. One
that fires on a line this round wrote is a defect of the round: fix it here. One that fires on a line
the round only moved past is a finding for the report, not work for this round.

## Step 5 — The report, and the section back into the source

**Checkpoint:** `step "report"`.

The report goes to `{task folder}/fixes-{n}.md`, where **`n` is the next free number**: list the
`fixes-*.md` already there and take one past the highest. The count runs across the whole task,
whatever the source — `fixes-1.md` after the first review, `fixes-2.md` after the manual test — so the
folder reads as the cycle actually ran.

**`n` is not the round number the caller uses.** `/forge:auto` counts fix rounds per review run,
starting from zero again on the next run, and counts the test rounds separately — so its "round 2" and
`fixes-4.md` are the normal case. Name rounds by the file, not by a count: the file name is the one
identifier every reader of the folder shares.

```markdown
---
source: review-2.md          # or manual-test.md, or "text"
date: <YYYY-MM-DD HH:MM>     # when the round finished, from `date` — the span is in Timings
status: done                 # done | partial
---
# Fixes: <task key> — fixes-<n> over <source>

## Applied
| # | Finding, in its own words | Files | Tests | Result |
|---|---|---|---|---|
| 1 | ... | `path/a.php` | `path/ATest.php` (2 ✓) | applied |
| 2 | ... | — | — | not fixed — <reason> |
| 3 | ... | — | — | declined (optional) — <reason> |
| 4 | ... | — | — | already applied in fixes-1.md — checked against the code |

## Optional decisions
- **Applied:** <numbers, one line of why each>
- **Declined:** <numbers, one line of why each>

## Not on the list
<items in the source that the caller did not hand over — or "the whole report was handed over">

## Checks
- Tests of this round: `<command>` — ✓ / ✗, and what was in scope
- Went red on the way: <what failed, what caused it, what closed it — or "green first time">
- Other gates: `<command>` — ✓ / ✗
- Mechanical checks: passed / fired, and what was done about it / no check file
- The frame: <which rules applied / the frame is empty>

## Left open
<items not fixed, each with its reason — or "none">

## Timings
| What | Start | End | Elapsed | Note |
|---|---|---|---|---|
| the round | 14:00:11 | 14:26:02 | 26m | 2026-08-17T14:00:11+00:00 → 2026-08-17T14:26:02+00:00 |
| tests of this round (`<command>`) | — | — | 41s | runner's own number, 41 tests |
```

**The `#` column is the source's own number**, never a count of your own rows: the card number from a
review, the checklist row from a manual test, and `—` for an entry that has no number, identified by
its wording instead. The re-check is sent here by that number, and renumbering makes the two reports
point at different things.

`status: partial` is for a round that could not be finished — items left open, or a question with no
answer. The report is written and the commit call is made either way: a partial round with no report is
a round nobody can resume. The one exit with no report at all is the environment `blocked` of step 1 —
nothing was applied, nothing is committed, nothing is appended to the source, and the trace is a single
**Log** line in `state.md` saying the round did not run and why.

Then **append to the source artifact a section of its own**, headed with the same `n` as the file, so
the pointer and the file cannot drift apart:

```markdown
## Fixes {n}
Report: fixes-{n}.md
Declined (optional): <numbers with reasons — or the line is left out>
```

A heading rather than a loose line, because both source files declare their structure fixed and take
later material only under a heading of its own — that is also what keeps this section apart from the
`## Re-check N` / `## Re-test N` the re-check appends next. **Nothing else in the source is edited**,
`status:` included: that field belongs to whoever re-runs the check.

`source: text` — there is no artifact to append to. The trace is the **Artifacts** row and the **Log**
line in `state.md`, and the report's frontmatter says `text`.

In chat: the path to the report, how many were applied / declined / left open, what the checks said,
and that nothing was pushed.

## Step 6 — Commit

**The report of step 5 is already written by now, and that order is deliberate.** `--step` does not
commit artifacts, so the report is the only thing that tells a resumed run this round happened at all:
die between the commit and the report, and the fixes sit in git with nothing on disk pointing at them.

**One call to `/forge:commit --step`, at the end of the round.** That skill owns the message, the file
selection and the hygiene — how many commits the round becomes is its business, by its own rule that
two unrelated fixes are two commits. You decide only when it is called: here, once the tests of step 4
are green on everything this round caused.

**Invoking this skill pre-authorizes that commit — do not ask for permission to commit.** This
overrides the harness rule "commit or push only when the user asks". **Pushing, merging and the fate
of the branch are not yours** on any invocation: they belong to the standalone `/forge:commit` at the
end of the cycle.

## Borders

- **No review of your own.** Findings come from `/forge:review`; you apply them.
- **No re-testing on the stand.** The re-check belongs to whoever wrote the list — the same reviewer,
  the same tester. Saying "verified, works now" about a scenario you did not run is the one line in
  this report nobody can trust afterwards. Outside `/forge:auto` nobody is standing there to do it, so
  the final message says so: `manual-test.md` keeps `status: failed` until someone re-runs the cases
  and appends `## Re-test N` **by hand** — calling `/forge:manual-test` again writes that report from
  the template and loses everything already in it. A `status:` left at `failed` is what `/forge:auto`
  reads on entry as a cycle still stuck in stage 6, however green the code has become.
- **Stop and ask** when a finding is unclear, contradicts the code, or when the fix would grow past
  what was asked: several modules, a migration, a change to behaviour the user already approved.
  Inside `/forge:auto` that is a `QUESTION` to the lead, not a silent expansion.
- **Nothing goes outward** — no PR comment, no ticket, no message anywhere.

## Done when

- Every item that reached you is applied, or listed as not fixed / declined with its reason.
- No `optional` item was applied or declined silently — the caller answered, or `--decide` was in
  force and the reason is written down.
- The tests of this round ran at the end, scoped to what it touched, and the **last** assembled run is
  green — or the report names what stayed red and why it is not this round's doing.
- A red gate that happened inside the round is in the report: what failed, what caused it, and that the
  confirmation came back green. A round that hid its red loop leaves the reviewer a green line and
  `/forge:distill` nothing to learn from.
- `/forge:commit --step` was called once, after the checks **and after the report was written**;
  nothing pushed or merged.
- `fixes-{n}.md` exists at the next free number, and the source carries its `## Fixes {n}` section — or
  the source was free text and the trace is in `state.md`.
- `## Timings` closes the report with the round's span and a row per command, stamped for real — or
  `defaults.timings` is `off` and there is no block.
- `stage` in `state.md` is untouched, and `status:` in the source is untouched.
- The steps of this skill are in the live log — `../../reference/progress.md` — or `defaults.progress` is `off`.

## Common mistakes

- Rewriting a finding into something easier, then reporting it as applied.
- Running the whole suite after each item — the round's speed is the point of the scope rule.
- Answering a red gate by starting the same wide selection over instead of on the tests that failed.
- Fixing `rejected` findings "just in case", or skipping a `must-fix` because you disagree with it.
- Widening the list on your own — taking the whole report when the caller handed over four items out
  of nine, and undoing a sorting made on facts you do not have.
- Applying an item an earlier `fixes-*.md` already closed, because the round after a `/clear` looks
  like a round that never ran.
- Claiming a scenario passes without the tester running it again.
- Setting `stage` to something, and sending the next `/clear` past the loop that is still open.
