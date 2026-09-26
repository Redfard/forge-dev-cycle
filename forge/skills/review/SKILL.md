---
name: review
description: Review of a task's changes by isolated subagents along 2–5 axes, with each finding checked against the code and a report in review-{i}.md. Runs when something names it — the user, forge:auto or its reviewer.
argument-hint: "<task key | path to state.md> [focus]"
---

# Review the change

You are the review lead. Your work: scope → mechanical checks → a parallel fan-out of isolated
reviewers → verify every finding yourself → one report in a file. **You do not review the code
yourself** — except when a reviewer never comes back.

## Principles

1. **Few agents, distinct axes.** Two to five, by the table below. "Fresh eyes" is kept apart from
   the checklist axis on purpose: in one pass with a checklist, attention settles on the list of
   known patterns, and the free search turns into a second sweep of that same list.
2. **The report goes to the task folder and to chat. Nothing goes outward.** No comment in a PR, no
   ticket, no message anywhere. Next steps are listed at the end of the report, not taken.
3. **Every subagent is read-only.** Put that line in each axis prompt explicitly.
4. **No silent caps.** The Coverage section names both kinds of gap: the standing ones (what this
   run does not check at all) and the ones from this run (a check that failed, a large diff, a
   reviewer that never returned).
5. **The code is not fixed here.** The output is the list of findings; applying it is `/forge:fix`,
   which takes this report as its source, groups it by the verdicts below and writes its own
   `fixes-{n}.md` next to it. Inside `/forge:auto` that call is made by the flow's implementer and the
   fixed items are re-checked by the same reviewer — that changes who runs it, not what this skill
   does. What never happens here is the fix itself: a reviewer that edits the code has no way left to
   tell a finding it verified from one it introduced.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.review` before you start and follow it
inside the borders above; no hook is a full answer.

**Zero context.** The input is a task key or the path to a `state.md`, plus optional free text that
becomes the focus of attention. Nothing was passed → the newest folder in `paths.tasks` by
modification time.

**What you read from the steps before you:** `spec.md` — it is the source of truth for the fourth
axis — and the diff. No `spec.md` → say so plainly, drop that axis, and note it in Coverage.

**Where the report goes.** `{task folder}/review-{i}.md`, where `i` is the next free number, so a
second run on the same task writes `review-2.md` and leaves the first one alone. Its prose is
written in the config `language`, like every other artifact of the set; headings stay as the
template has them.

**The file grows after you.** Two other hands append to it, each under a heading of its own: `## Fixes
{n}` from `/forge:fix`, pointing at the round that applied the findings, and `## Re-check N` from
whoever re-checks them. A report you open with sections already in it is being read mid-loop, not
re-reviewed — the last of those sections says what is still open.

**`state.md`.** When the report is written, update it as `../../reference/state-file.md` says.

**Timings:** `../../reference/timings.md`. **Stamp the start now**, before step 1 — the fan-out of step
3 is the expensive part of this run, and by the time the report template asks for the number there is
nothing left to stamp. The axis prompt asks each axis for its own span, so the fan-out row can name
which one held the rest up.

**Progress:** `../../reference/progress.md`. Your steps are `scope`, `checks`, `fan-out`,
`synthesis`, `report` — the call is `../../bin/forge-progress <task> step "<name>"`, and each step
is marked **Checkpoint:** in the text where it happens. The list here is the index of them. The
`fan-out` step names how many axes went out; it stays open until they are all back, which is the
part worth watching.

## What replaces project knowledge

This skill carries no knowledge about any particular project. Three classes of source, three
different homes:

| Class of source | Where `forge:review` takes it from |
|---|---|
| Architecture and project rules, in any shape | `conventions.arch` + `conventions.rules`, the cards in `conventions.references` whose `paths` match the diff, plus every source in `conventions.external` |
| A project's mechanical check | a line in `paths.checks` |
| The correctness checklist — 13 dimensions, project-neutral | `../../reference/correctness-checklist.md` |

The frame is empty → the axes still run on the code, and Coverage says the project rules were not
checked because there are none written yet.

## Step 1 — Scope

**Checkpoint:** `step "scope"`.

**One diff, always: the parent against the work tree.**

```
BASE=$(git merge-base <parent> HEAD)
git diff $BASE
```

That is the whole scope rule, and it holds in every state: the branch's commits and the
uncommitted tail — staged and unstaged — arrive in one diff. The clean tree is the same command
with an empty tail, which is exactly `git diff <parent>...HEAD`.

**Two commands, not one.** Written as `git diff $(git merge-base <parent> HEAD)`, a parent that does
not resolve — a fresh clone or a worktree where only `origin/<parent>` exists locally — makes the
substitution collapse to nothing, and a bare `git diff` shows the unstaged tail alone: a small,
plausible diff that reviews cleanly while every commit of the task stays invisible. That is this
rule's own failure arriving through the shell. `BASE` came back empty → stop and ask, exactly as the
parent question below is asked.

The merge base is what keeps the parent's own new commits out: `git diff <parent>` against a parent
that moved forward after the branching shows that parent's work reversed, as if this task deleted it.

**Why it is not a table.** The implementation step commits one unit at a time, so the normal state
at the door of a review is *several commits plus a dirty tail*, not one or the other. A rule that
branches on "the tree is dirty" and answers `git diff HEAD` reads that state as "review the tail",
loses every committed task of the change, and reports nothing about it — the pass has no way to know
what it never saw. Reviewing the tail alone happens only when the user asks for it in so many words.

**Where `<parent>` comes from.** `base` in `state.md` is the exact answer — the SHA the branch was
cut from, which needs no resolving and survives the parent branch moving on or being deleted. Use it
whenever it is there.

No `base` — a task opened before that field existed: take the parent branch from `state.md`, and use
its **remote-tracking ref**, `origin/<parent>`, whenever that ref exists. The branch was cut from the
remote, so the local branch of the same name is usually behind; a merge base against it sits earlier
than the branching point and drags the parent's own commits into the review as if this task had
written them. No `state.md` at all → `branch.parents` by the key prefix. Neither answers → **ask the
user**; do not guess, and do not hardwire any project's prefixes here.

**Untracked files.** `git diff` does not show them. Collect them separately (`git status
--porcelain` → the `??` lines, expand directories to files, drop dependency and build folders) and
hand them to the reviewers as "new files, read them whole — there is no diff for them". Never touch
the index. Tracked changes absent but untracked files present is a valid scope: run on them.

**Empty diff** → one short message, no agents spawned. **A large diff** (~25 files and up) is not
sharded: run it in one pass and write in Coverage that the diff was large and attention was spread
thin.

## Step 2 — Mechanical checks: a gate, not an observation

**Checkpoint:** `step "checks"`.

Run the set from `paths.checks` **over the same diff as the axes — the one from Step 1** — from the
**work-tree root**: these are greps whose paths count from the root, while `commands` from the
config run from `workdir`. Mixing the two produces "nothing found" where the truth is "the command never ran".

Three kinds of check, and the third is the one that gets forgotten:

- over the **added lines** of the diff;
- **file-level** rules over the **new** files;
- conditions over the **list of changed files** — "this file changed and its paired file did not".
  A grep over lines cannot express that, and projects do have such rules.

A check that fires is a finding in the report, with the same severity scale as everything else. No
file at `paths.checks`, or the file holds no working checks: one line in Coverage, and nothing to
ask about.

## Step 3 — Fan-out

**Checkpoint:** `step "fan-out"`.

Spawn every selected reviewer through the harness's subagent tool (`Agent`, or its equivalent, as
`general-purpose`) **in one message** — that is what makes them run in parallel. Spawned one per
message, they run one after another and the pass takes as long as all of them together.

**An axis is a one-shot agent** — `../../reference/subagents.md`: spawned with no `name` and no
`isolation`, told in its prompt that it works alone, and addressed, if it has to be, by the
identifier its spawn returned. A named axis is the failure that costs most here: its report is a
message it has to send rather than the result of your call, and a report never sent never arrives.

**Every path in a prompt is one the subagent can open.** A reviewer has no idea where this skill file
lives, so a path written relative to it — `../../reference/correctness-checklist.md` — resolves to
nothing on its side. Resolve it yourself against your own location and put the resolved path in the
prompt, and do the same for any other reference file an axis has to read. A reviewer that cannot open
its checklist does not report a broken path; it reviews from memory, which is exactly what the "load
your sources with real tool calls" line exists to prevent.

| Axis | When it runs | Source of truth |
|---|---|---|
| Correctness + architectural minimum | always | code + `conventions.rules`, `conventions.arch`, the matching cards |
| Fresh eyes | always | code |
| Frontend | the diff touches frontend files **and** the frame carries frontend rules | code + the frontend part of the frame |
| Spec check | `spec.md` exists in the task folder | `spec.md` |
| Style: consistency with the code around it | `defaults.style_review` is `on` | code — the neighbouring files it names |

Two axes at the minimum, five at the most. Frontend files are in the diff but the frame says nothing
about the frontend → do not spawn that axis; those files stay with the first two, and Coverage says
frontend conventions were not applied because the frame has none. `defaults.style_review` is absent
or `off` → no style axis, and Coverage says that in one line.

### 3.1 The shared skeleton of an axis prompt

```
You are an isolated reviewer on the "{AXIS}" axis of a code review.
You are read-only: read and analyse, and edit no files at all. You also work alone: spawn
no subagents of your own — the answer has to be your own reading.

[CONTEXT]
Work-tree root: {ROOT}
Diff (parent {parent} vs work tree — the branch's commits and the uncommitted tail together):
{the diff text; when it does not fit — one already-resolved command, `git diff <BASE-SHA>`,
with the SHA you resolved and saw come back non-empty, plus the directory to run it from.
Never a form that resolves a ref on the axis's side: a `git merge-base` that comes back empty
leaves a bare `git diff`, and the axis reviews the uncommitted tail alone and reports it clean}
Changed files (your scope): {the list, filtered for this axis}
New files with no diff — read them whole: {the untracked list, filtered for this axis;
omit this line when there are none}
Intent of the change: {one or two lines from spec.md, or from git log when there is no spec}
User focus: {the free text, if there was any and if it belongs to your axis}

[HOW TO WORK]
1. Load your axis's sources with real tool calls (Read) — see [SOURCES]. Applying rules
   from memory is not allowed; list what you loaded in your answer.
2. Read the changed files AND the code around them: the model, the caller, the definitions
   of the relations. Most false positives are born from reviewing a hunk in isolation.
3. Apply the rules of your axis. Stay out of the other axes — see [DO NOT FLAG].

[ANSWER FORMAT]
Findings only. No per-file "this part is fine" notes.
One card per finding:

[{Severity}] {file}:{line} — {short title}
What: {the problem, concretely}
Cost: {what it leads to}
Fix: {the concrete change}
{"not confirmed, check: X" — only when you could not confirm it against the code}

After the findings — a coverage manifest: which files and topics you applied, what you
skipped and why, which sources you loaded. No findings → one line "No findings" plus the
manifest.

Your final message IS the answer to the caller: the whole report — findings and manifest —
goes in it as text. An empty message, or "done, see the file", is not an answer; "No
findings" plus the manifest is. Do not ask the caller anything either — nobody is there to
answer: an uncertainty is closed by an assumption written into the finding itself, and a
source that would not open is one line in the manifest, after which the axis is carried to
its end anyway.

Close with one line: `span: <start>–<end>`, both taken with `date -Is` — the first as your
very first action, the second when this answer is written. You all start together and come
back together, so this line is the only way the caller can tell which axis held up the rest.
```

### 3.2 Insert — "correctness + architectural minimum"

```
[SOURCES]
- {correctness checklist path} — the whole 13-dimension checklist and both deep dives,
  including its "What NOT to flag" section.
- {conventions.arch} and {conventions.rules} — the project frame.
- {matching cards} — the cards from {conventions.references} whose `paths` match the diff:
  a new or rewritten file of that kind takes the card's shape, or one of the variants the
  card allows. A shape the card does not allow is a finding; quote the card line it breaks.
- {conventions.external} — the frame documents owned by someone else, read-only.

[SCOPE]
The whole diff, frontend files included: correctness questions do not depend on the stack —
query waterfalls, logic, tests are yours too.

[TASK]
You are the checklist axis: the two points below are your whole scope, and both are walked to
the end. The free search for "what else is broken here" is another axis's job.

1) CORRECTNESS — all 13 dimensions of the checklist you loaded from [SOURCES]. Yours alone: transactions and
   atomicity, N+1 and query waterfalls, duplication and reuse, migrations. Plus three the
   checklist does not carry:
   - raw SQL injection: raw queries built by concatenating user data;
   - secrets and sensitive data in code, logs, API responses;
   - cache invalidation: the data changes and the related cache is not dropped.

2) THE ARCHITECTURAL MINIMUM, over the files the frame's rules apply to — mechanical checks
   with a binary answer, taken from the frame itself: does each call and import obey the
   layering the frame describes, and does each new class inherit the base its pattern
   requires. Whatever else the frame states as a mechanical rule belongs here too. What the
   frame does not state is not your finding.

{If a user focus was given: "Attention priority, verbatim: «{focus}». Start points 1–2 with
the files and dimensions it touches."}

[DO NOT FLAG]
- Style rules and pattern-level detail the frame does not name, the checklist's own dimension
  «consistency with existing code» included — the style axis owns that ground.
- Frontend conventions — the frontend axis owns those.

[SEVERITY]
Critical / High / Medium / Low. A broken architectural rule is High; Critical only when it
breaks data or security.
```

### 3.3 Insert — "fresh eyes"

```
[SOURCES]
- {conventions.arch} — the project frame, for orientation.
Do not load the review checklists: another axis walks them, and a list of known patterns
pulls attention to itself — the free search then degenerates into a second sweep of the
same list.

[SCOPE]
The whole diff.

[TASK]
You have no checklist. Find what is broken here BESIDES the known patterns: logic, mismatches
with the intent of the change, scenarios nobody thought about, oddities that "formally pass".

Order of work: reconstruct from the code what this change is supposed to do, and compare it
with what it does — on the paths that are not in the diff as well: the caller, other readers
of the changed data, a second call, empty or partial input, a failure halfway through, rows
created before this change.

For EVERY changed file, name in the manifest at least one scenario you walked through the
code, even one that turned out fine. A file with no scenario named counts as unchecked — say
so in those words.

{If a user focus was given: "Attention priority, verbatim: «{focus}». Start there, and look
beyond the diff at the code around it."}

[DO NOT FLAG]
- Style rules the frame does not name.
- Frontend conventions — the frontend axis owns those.

Overlap with the checklist axis (transactions, N+1, duplication, layering) is not a problem:
the lead collapses duplicates. Holding a finding back because "the other axis will surely
find it" is not allowed — write it down.

[SEVERITY]
Critical / High / Medium / Low. Critical — broken data or a security hole; High — a real bug
on a reachable path; Medium — a bug on a rare path, or a mismatch with the intent; Low —
a small thing.
```

### 3.4 Insert — "frontend"

```
[SOURCES]
- the frontend part of the frame: {conventions.rules}, {conventions.arch} and the frontend
  documents named in {conventions.external}. Read every one of them that the changed files
  touch, and read the security part always, whatever the diff holds.

[SCOPE]
Frontend files only.

[DO NOT FLAG]
Backend files.

[SEVERITY]
Critical / High / Medium / Low (Critical — XSS, a data leak, a broken user scenario; High —
a real bug or a broken error path; Medium — a convention broken with consequences; Low —
style, naming, test ids).

[MANIFEST — REQUIRED]
The topics you applied, and why the rest did not apply.
```

### 3.5 Insert — "spec check"

```
[SOURCES]
- {task folder}/spec.md — read it whole before you look at the diff.

[SCOPE]
The whole diff, against the spec.

[TASK]
You compare intent with result. Three questions, and only these three:
1. What the spec asks for and the diff does NOT do at all.
2. What the diff does PARTIALLY — the change map entry is half applied, a guard from
   "Impact/guards" is missing, a test target has no test.
3. Where the diff deviates from the spec WITHOUT a stated reason. A deviation the
   implementation report explains is not your finding; a silent one is.

Walk the change map entry by entry and the test targets one by one — a section you did not
walk is a section you say you did not walk, in the manifest.

Do not judge whether the spec itself was right: that was settled at review time. Your axis is
the distance between the document and the code.

[SEVERITY]
Critical / High / Medium / Low. Something the spec requires and the code does not do at all —
High as a rule, Critical when it breaks data or security. A partial implementation whose half
is reachable — High. Cosmetic drift — Low.
```

### 3.6 Insert — "style: consistency with the code around it"

Spawned only when `defaults.style_review` is `on`. Its subject is the distance between this change
and the code it lands among — the one thing no other axis carries: the checklist axis is held to what
the frame states, fresh eyes is kept off that ground on purpose, and both say so in their
`[DO NOT FLAG]`.

```
[SOURCES]
- {conventions.arch}, {conventions.rules} and the sources in {conventions.external} — read
  them first: a rule the frame already states belongs to another axis, and repeating it here
  spends the report twice.
- The code itself. This axis has no checklist: its source of truth is the files that were
  already in the project before this change.

[SCOPE]
The files the diff creates, and the parts it rewrites substantially — frontend included: the
frontend axis is bound by what the frame says, and this is the comparison with the sisters. An
edit in place inside an existing file is out of scope; it has no sibling to be unlike.

[TASK]
For each of them: find the nearest existing analogue in this project — same layer, same kind of thing, same module — read it, and
name where the change departs from it. Base class and inheritance, where a call is allowed to
go, naming, the shape of what is returned and how failure is expressed, validation, file
placement, how the tests around it are built, localization.

Two rules make a departure a finding rather than a preference, and both are hard:

1. **A finding names the sibling** — the path of the existing file, and what it does
   differently. No path in the finding, no finding: drop it.
2. **A pattern of the project appears in at least two existing files.** One file is that
   file's own habit, and departing from a habit is departing from nothing. Where you found
   only one, say so and drop it.

The counter-question is part of the work, and it has two shapes. The older files predate a
decision this one follows. Or the frame states a standard most of the code does not follow — and
then code that follows the standard is not a departure, however many neighbours depart from it.
Say that instead of flagging it.

For every file in your scope the manifest carries a line: the sibling you compared it to and
what came of the comparison, or why there was no sibling — nothing of its kind exists in the
project yet, or the one candidate you found is not a pattern. A file with no line is a file
nobody looked at, and it is named as one.

[DO NOT FLAG]
- What the frame states as a rule — the checklist axis owns it.
- Bugs, correctness, performance, security. A departure that is also a bug belongs to another
  axis; report the departure alone.
- Code the change did not touch. Old code diverging from itself is not this change's finding.

[SEVERITY]
Medium at the most. Medium — a departure with a cost you can name: the next reader looks in the
wrong place, an existing helper stays unused, the test cannot be run the way its neighbours
are. Low — everything else. No Critical and no High on this axis: a finding of ours ranked
level with a real bug would move the caller's must-fix line onto taste.
```

## Step 4 — Synthesis

**Checkpoint:** `step "synthesis"`.

1. **Collect.** While the axes work you **may** bring point 2 forward — pre-read the code the
   changed files lean on, and verify the findings of the axes that have already answered. That is
   the verification you owe anyway, not the axes' own search done twice, and what you happen to spot
   in it enters the report only through the label of the last bullet below. Two things never happen
   while an axis is out: running that axis, and supplying what it would have found. And the waiting
   is owed to the axes, not to whoever called you — a request for status is answered.

   A verdict reached while an axis is still out is provisional. When the last one is in, re-read
   "Not confirmed" against what arrived after it: a finding refuted for a missing piece is reopened
   when a later axis names that piece.

   An axis that does not deliver goes up the ladder in `../review-spec/SKILL.md` ("When the reviewer
   does not come back"): ask once for whatever it has, say in the open that this axis did not
   deliver, spawn one replacement, and run the axis yourself if the replacement fails too. What a
   fan-out adds to it:
   - **When it opens.** A signal about the axis, never your own idleness: the call comes back with
     no report in it, the spawn errors, or the harness reports the axis finished with nothing to
     show. Your own work running out measures you, not the axis — the axes are still out, so end the
     turn and let their arrival wake you.
   - **Several axes at once.** The rungs then run for all of them together — one ask, one message
     carrying every replacement (Step 3's rule holds here too), one line naming them all. Every
     replacement failing is the spawn mechanism failing rather than the axes: say that, run yourself
     the axes that are missing, and where that is more than one pass can hold, the two always-on
     axes are the floor and the rest go into Coverage as never run.
   - **What counts as delivered.** An axis that produced findings delivered: it leaves the ladder at
     the first rung, and so does one that asked a question instead — answered from what you already
     know, in the same message. What its manifest does not name is not checked, and a manifest whose
     files sit outside the scope you handed that axis is an axis that reviewed something else: that
     one did not deliver.
   - **Running an axis yourself.** You take its prompt's `[SOURCES]`, `[SCOPE]`, `[TASK]` and
     `[DO NOT FLAG]`, and you owe its manifest too — the per-file coverage it was required to name.
     Only the delivery lines belong to a subagent: "your final message IS the answer", the span, and
     read-only, which binds you anyway. The result goes into your own report, labelled in Coverage,
     and so is an axis that was replaced or never ran — under `/forge:auto` this skill is run by a
     role and not by a person, so the chat where you said it aloud may have no reader at all.
2. **Verify every finding yourself, before it enters the report.** Read the file and the code around
   it and answer one question: does this reproduce on this code? A finding you confirmed is valid; a
   doubt ("looks like a problem, but there may be a guard higher up the stack") is not. Findings
   from the mechanical checks are deterministic — they are valid without a re-check.
3. **Name what you threw out.** A finding that did not survive verification does not enter the
   findings list, but it gets a line in the report's "Not confirmed" section, with the reason
   ("refuted: the check exists in middleware", "could not confirm against the code"). Dropping a
   finding silently is what makes the next reader trust the report less than it deserves.
4. **Dedup**, once and over the full set. Two axes read the same code, so some findings arrive in
   pairs — that is expected. Same `file:line`, or one root cause → one card. Keep the sharper
   wording; when one axis named the cause and another the symptom, merge them (cause in "What",
   symptom in "Cost"). Which axis found it does not go in the card.
5. **Sort.** Critical → High → Medium → Low; inside a level, by file. Low and Nit go in one compact
   group at the end.

### The two scales, and why they may not be merged

**Severity** — the reviewer's judgement of how bad it is: `Critical | High | Medium | Low | Nit`.

**Verdict** — the caller's decision about what to do with it, after verification: `must-fix`
(committing before this is fixed is too early) / `optional` / `rejected` (did not survive
verification — not in the findings, one line in "Not confirmed").

One link between them, and it is rigid: `Critical` and `High` are `must-fix` by default, and
lowering one requires a written reason; `Low` and `Nit` are never `must-fix`. One card stands
outside the link whatever its level: one whose whole content is a departure from the code around
it — nothing broken, only unlike its neighbours — is `optional`, and raising it takes a written
reason like lowering a `High` does. Merged with a card that names a real defect, it follows the
defect. This is a rule of the scale and not of an axis on purpose: after the dedup of point 4
nobody can tell which axis found what. Without that rule the
two scales collapse into one, and severity starts to mean "how strongly I insist" — the weight of a
finding then follows the reviewer's tone instead of the consequence.

**No 0–100 score**, not as content and not as a stopping condition. A score from a language model
drifts between runs, and a threshold gets reached by inflating it rather than by fixing anything.
Readiness is stated through findings: no must-fix left that survived verification.

## Step 5 — The report

**Checkpoint:** `step "report"`.

Written to `{task folder}/review-{i}.md`, and summarised in chat.

**One counter through the whole report.** Findings are numbered `#1, #2, …` in report order — the
cards by descending severity first, then the Low / Nit group — so the user can point at one by
number. No findings, no numbering.

```
## Review: branch {X} vs parent {P}{, plus the uncommitted tail} — task {KEY}

Verdict: {N must-fix — too early to commit / no must-fix findings left}{; degraded: which axes
did not deliver and what stood in for them — this line is what the caller reads, Coverage may
have no reader at all}.

{finding cards, descending severity; each title starts with `#N`, and each card carries its
severity and its verdict}

### Low / Nit
{compact list, one line per finding, each starting with `#N`}

### Coverage
- Checked: {what, and over which files}
- Axes: {which ran as subagents; which did not deliver and was replaced; which you ran yourself —
  that one had no clean context, its precision holds because every finding was checked against
  the code, its recall is lower; which never ran at all, and why; and a late report from a
  replaced axis, if one arrived and was set aside}
- Mechanical checks: {passed / the findings above / no check file}
- The frame: {which rules applied / the frame is empty}
- Not checked at all: {the standing gaps of this run}
- Skipped: {what and why — "no frontend axis: the frame has no frontend rules", "large diff,
  attention spread thin", "no spec.md: intent taken from git log", "no style axis:
  defaults.style_review is off"}
- Not confirmed: {the findings that did not survive verification, each with its reason}

### Timings
{`../../reference/timings.md`: this run's own span, then the fan-out row — the longest axis named —
and the mechanical checks if they took anything. An axis that never returned has no span: the row
stays the longest of those that did, and the note names the missing one. A replacement's span is
that axis's span; an axis you ran yourself is not part of the fan-out and gets a row of its own.
Omitted entirely when `defaults.timings` is `off`}

Next: /forge:fix over this report applies the must-fix list — the implementer runs it when this run
is part of /forge:auto — and the fixed items are then re-checked here; /forge:manual-test once
nothing must-fix is left. Nothing is sent anywhere from here.
```

The Coverage section is printed **always**, findings or none. Without it an empty report reads as
"everything was checked and everything is clean", when it may mean the pass barely ran.

The report holds problems only. No list of what was done well, no praise.

## Done when

- Every axis that the table says should run, ran — or Coverage says why it did not.
- Every axis that went up the ladder is named in the `Axes` line of Coverage — replaced, run by you
  without a clean context, or never run at all with the reason — and the degradation is in the
  `Verdict` line as well, which is the part the caller reads.
- Every finding in the report was verified by you against the code, and every finding that was not
  is in "Not confirmed" with a reason.
- Every finding carries both a severity and a verdict, and no `Low`/`Nit` is `must-fix`, no card
  that is a departure from the surrounding code alone is `must-fix` without a written reason, and
  no `Critical`/`High` was lowered without one.
- The diff that the axes and the mechanical checks worked on is the one from Step 1 — the parent
  against the work tree — and not the tail alone.
- The mechanical checks ran from the work-tree root over that diff, and their result is in Coverage.
- The report exists at `review-{i}.md` with `{i}` not overwriting an earlier one, and Coverage is in
  it.
- `Timings` carries this run's span and the fan-out row, both from real `date` calls with the raw
  strings in the note — or `defaults.timings` is `off` and there is no block.
- Nothing was sent anywhere, and no file outside the task folder changed.
- The steps of this skill are in the live log — `../../reference/progress.md` — or `defaults.progress` is `off`.
