---
name: distill
disable-model-invocation: true
description: Go through task artifacts and turn repeated findings into proposals: keeps the proposals.md register and, once confirmed, writes a line to checks.md. Applies nothing by itself.
argument-hint: "[--verify] [task range]"
---

# Turn the history of tasks into proposals

Read the artifacts the cycle left behind, group what repeats, and propose what would catch it next
time. The first thing to reach for is a **command** — a grep, a linter rule, a test, a setting in a
tool that is already installed. Prose in a skill is the weakest rung of the ladder: it fires only
when the model happens to remember it.

**You implement nothing.** The register is yours; every move out of it needs the user's word.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.distill` before you start; no hook is
a full answer.

**No task, no `state.md`.** This skill reads all tasks at once and belongs to none of them.

**A blocking question** means `AskUserQuestion`.

**Progress:** `../../reference/progress.md`. Your steps are `collect`, `check`, `draft`,
`register` — the call is `../../bin/forge-progress <task> step "<name>"`, and each step is marked
**Checkpoint:** in the text where it happens. The list here is the index of them. The task
argument is `-`: this skill works across all tasks at once.

## Input — incremental, and only this set's own tasks

The corpus is `paths.tasks`. The cursor is `distill-cursor.json`, and it lives in the folder the
config lookup returned — beside the config itself, resolved the same way every other path in the set
is. A path written from the current directory would part company with the rest in exactly the two
cases the lookup exists for: a call made from a subfolder of the repository, and `--separate` in a
worktree, where the folder sits in the main clone.

Read it for the last position: take the files newer than the cursor, plus a small overlap window
backwards, so a file written while the previous run was working is not lost. Write the new position
when the run ends.

**The corpus is the reports, not the evidence.** The `evidence/` subfolders — the raw output a
manual test saved to back its own lines — are skipped, and so are `evidence-*` files that older runs
left in the task folder itself: they are what a report's
findings were checked against, and nothing in them is a lesson about how the set works.

**No cursor yet is the normal first run**, not a reason to stop: read the whole corpus and write the
position at the end. The file is created by this skill and by nobody else, so it is absent exactly
once — on the run that the whole mechanism was built for.

**An empty corpus is a reason to stop**: say so and stop. A run over nothing produces proposals from
imagination.

**An explicit range** in the invocation — a few task folders, a period — replaces the cursor for that
run and **does not move it**. A one-off narrow look must not make everything outside its borders
invisible for good; the cursor moves only on a run that actually walked everything up to it.

Nothing else is read. Other corpora of artifacts — an older flow, another tool's folder — stay out:
the register's threshold counts sources inside one corpus, and mixing two of them makes every count
meaningless.

## Two classes of raw material

| Class | What it means | Where it comes from | Where it can lead |
|---|---|---|---|
| **A** | a defect in finished code | `review-{i}.md`, `manual-test.md`, and `fixes-{n}.md` as their qualifier (below) | a command in `checks.md`, or a rule in the frame |
| **B** | **the spec was incomplete** | the "Deviations from the spec" section and **Prevention** in `implementation-report.md`, `spec-review-{n}.md` | the spec template, `/forge:make-extended-spec`, or the `/forge:review-spec` checklist |
| **C** | **the check was incomplete** | `test-review-{n}.md` — the obligations a run left unproven, the scenarios that could not have failed — and `## Plan conformance` in `auto.md`, where the lead recorded what the report and the approved plan did not have in common | the `/forge:manual-test` claim sources and trigger words, the `/forge:review-test` checklist, or how the plan is built and approved |

Class B is a different signal, and it is the one that gets lost: not "the code is bad" but "the
document never asked about this". No grep can catch it — the code was written correctly for a
document that did not mention the case.

Class C is the same shape one step further out: not "the code is bad", not "the spec was silent",
but "the run said it checked and could not have". It repeats across tasks the way B does, and it is
invisible in the code entirely — the only trace it leaves is a report that reads green.

**One source is missing from the table on purpose, because nobody writes it yet.** A report of an
**automated** test run: the set has no skill that runs the suite and writes down what it found —
`/forge:manual-test` covers the hand check and is already in class A — so that source joins its class
on the day something starts writing it. A file name in a read list that nothing produces reads as a
step someone forgot, and it sends the run looking for a folder that will never be there.

**`fixes-{n}.md` is read as a qualifier on class A, not as a class of its own.** `/forge:fix` writes
one per round, and it says what became of each finding: applied, **declined** as `optional` with a
reason, left open, or never handed over. A candidate built on a finding the round declined is a check
for a defect the team decided was not one. A finding that came back in a later task **after** being
declined is the stronger signal of the two — the decision is then part of the evidence, not an
argument against raising it.

Mind which word the report uses. `declined` is the round's own decision on an `optional`; `rejected`
is the reviewer's verdict that a finding did not survive verification, and it never appears as an item
of a fix report. A third state sits in `## Not on the list` — findings the caller kept back, ruled out
against the code or deferred to a task of its own. Those are neither evidence for a check nor evidence
against one: the reason lives in `auto.md` or in the caller's head, not in the fix report, so weigh
them only when you can find that reason.

## The register — `paths.proposals`

One home for the whole kitchen: candidates, rejected with reasons, counts, sources. `checks.md`
holds only checks that work.

Sections, and their names are fixed in English so that two skills read the same file the same way:

- **Working proposals** — the table below, statuses `candidate` / `accepted` / `rejected`;
- **Rejected — do not bring back without a new reason** — with the reason, each;
- **Dropped on age**;
- **Candidates for the team file** — written by `/forge:frame-existing` and `/forge:frame-new`. You do
  not touch that section.
- **Planned checks — accepted up front, waiting for their tool** — written by `/forge:frame-new`, rows
  removed by the task that installs each check. You do not touch it either; a pattern it already
  covers is not proposed again.

```markdown
| # | Pattern | Class | Status | Seen in | Verified | Value | Leads to |
|---|---------|-------|--------|---------|----------|-------|----------|
| 7 | outer layer calls the repository directly | A | candidate | ABC-123 review-1, ABC-124 review-2 | code ✓, broken code — | high | grep in checks.md |
```

The free text inside cells — the pattern, the reason — is written in the language from `language`.
The column names, the class letters and the status words are not translated: they are what the next
run matches on.

## The life of a row

1. A finding enters the register — from a run of this skill, or by hand from whoever hit it during a
   task.
2. A repeat **from a different source** raises the count. The threshold is two different sources.
   Two mentions inside one review are one source.
3. Threshold reached **and** the row is verified (see `--verify`) → status `accepted`, and the row is
   proposed for the move.
4. **The move happens only after the user confirms it**, and where it goes is the ladder:
   - class A, catchable by a command → `checks.md`, and you write it there yourself;
   - class A, not catchable → the text of the rule is written by `/forge:frame-existing`, into
     `rules.md` or `arch.md`. You never write those two files.
   - class B → the spec template, the `/forge:make-extended-spec` skill, or the
     `/forge:review-spec` checklist. Name which one, and hand over the draft.
5. A candidate that has not repeated within `defaults.candidate_ttl_tasks` **tasks** moves to
   "Dropped on age". Counted in tasks, not in runs of this skill: runs happen whenever someone
   remembers, and "three runs" can mean a week or half a year.
6. **Before proposing anything, read the "Rejected" section.** A row from there comes back only with
   a new argument, and the argument is written next to it.

## Steps

### 1. Collect

**Checkpoint:** `step "collect"`.

Read the artifacts in range. Group findings **by their substance, not by their wording**: two
reviewers describing the same defect in different words are one pattern with two sources.

For each pattern collect: where it was seen (source links), how many times, in which files — and,
from the `fixes-{n}.md` of the same task, what became of it: applied, declined with a reason, or left
open. A pattern whose every occurrence was declined is not a candidate for a check; the same pattern
declined once and hit again later is.

### 2. Check what the project already has

**Checkpoint:** `step "check"`.

Which linters, static analysers, type checks, tests and CI steps are installed and working. Which
rules the frame already fixes, and which checks are already planned. A proposal that duplicates a working tool of the same class is noise,
and it makes the rest of the list cheaper to skip.

### 3. Draft, for every proposal

**Checkpoint:** `step "draft"`.

Not "something should be done" but a concrete fragment: the linter rule, the grep, the test scenario,
the ready text of a rule, the line for the spec template. With it: the 2–3 sources, and a value of
`low` / `medium` / `high` by how often the pattern shows up and how much it costs when missed.

### 4. Update the register and report

**Checkpoint:** `step "register"`.

Write the rows, move what the life cycle says to move, and show the top in chat, sorted by
**value × frequency**. Value is a judgement and frequency is a count; the product is an order for a
human to decide by, not a metric — say that in the same breath if you print it.

There is no report file for a run. The register already holds statuses, counts, sources and reasons,
and a second history of the same facts would drift from the first.

## The `--verify` flag

**Without the flag** the run is cheap: collect, group, count, update the register, show the top. Rows
stay `unverified`, and an unverified row **cannot** move into `checks.md` or into the frame. That
lock is the only thing between a cheap run and rubbish in the gates: a check that goes red on healthy
code discredits the whole set, and after the second false alarm people start skipping all of it.

**With the flag**, two things more:

- **Verify the finding against the code.** It does not reproduce → it goes no further, and the reason
  is written into the register.
- **Run the proposed check on knowingly broken code.** The base is found mechanically: the finding
  came from a task, and the task's `state.md` records `base` — the SHA the branch was cut from, which
  is the code from before the fix. Run the check there. A task old enough to have no `base` falls
  back to its branch and parent; those are names, and once the branch is merged and deleted they
  resolve to nothing — say so in the register instead of quietly skipping the run.

  A run on healthy code returns "nothing found", and without the broken-code run you cannot tell
  "nothing found" from "the command does not work".

## Borders

- Nothing is implemented. No linter is installed, no tool is configured, no skill is edited by you.
- `checks.md` is written only after the user confirms a specific row.
- `rules.md` and `arch.md` are never written here — that is `/forge:frame-existing`, and the traffic is
  one-way.
- A single finding is not automated. The threshold exists because the alternative is a file that
  grows and stops being read.
- An agent-level check is not proposed where a command would do the same work. The command runs every
  time; the prose runs when it is remembered.

## Done when

- The cursor moved and the new position is written — unless the run had an explicit range, which
  leaves it where it was.
- Every pattern in the report carries its sources, its count and a draft — no entry that only names a
  worry.
- No row moved out of the register without the user's confirmation, and no `unverified` row reached
  `checks.md`.
- The "Rejected" section was read before proposing, and anything returning from it carries a new
  argument.
- Candidates past `candidate_ttl_tasks` are in "Dropped on age", not silently deleted.
- Without `--verify`, the report says plainly that nothing was verified and nothing may move yet.
- The steps of this skill are in the live log — `../../reference/progress.md` — or `defaults.progress` is `off`.
