---
name: manual-test
description: Manual live test of a task's changes — API by requests, frontend in a browser; scenarios come from the change's claims, the plan is approved before the run, the report goes to manual-test.md with status passed / failed / blocked. Runs when something names it — the user, forge:auto or its tester.
argument-hint: "<task key | path to state.md> [r | ra | a] [helpers=N] [plan-only | plan=<path>] [scenario or environment]"
---

# Check the change by hand

Run the change, do not read it. What you are answering is not "are the tests green" but "does the
scenario work": the page opens, the action goes through, the endpoint answers, the errors look the
way they should. Then write the report.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`.

**Timings:** `../../reference/timings.md`. **Stamp the start now, before anything else.** The three
expensive things here — the plan helpers, raising the stand, walking the checklist — all happen long
before the report template asks for a number, and a start remembered afterwards is a start invented.

**The hook is where this project's specifics live.** Read `hooks.manual-test` before you start:
what to raise the browser with, which environment counts as the working one, which user to log in
as. That is why this skill knows nothing about build tools — an instruction naming one is true for
exactly one project, and it would make the skill unusable on the next.

**Zero context.** The input is a task key or the path to a `state.md`, plus any free text about the
scenario or the environment. Nothing was passed → the newest folder in `paths.tasks` by modification
time.

**What you read from the steps before you:** `spec.md` — the acceptance criteria and the DoD are
where the checklist comes from — and the diff. No `spec.md` → say so plainly and build the checklist
from the diff alone, then note that in the report.

**The frame.** `conventions.arch` tells you how the system is wired, which is what makes an unclear
failure readable. It does not judge anything here.

**Where the report goes.** `{task folder}/manual-test.md`. **`state.md`** is updated as
`../../reference/state-file.md` says.

**A blocking question** means `AskUserQuestion`: ask, stop, wait.

**Progress:** `../../reference/progress.md`. Your steps are `claims`, `plan-helpers`,
`plan-approval`, `environment`, `api`, `frontend`, `report`, `review-pass`, `cleanup` — the call
is `../../bin/forge-progress <task> step "<name>"`, and each step is marked **Checkpoint:** in the
text where it happens. The list here is the index of them. `plan-approval` waits for a person — an
open row there is the wait, not the work.

## Borders — the hook adds instructions, it does not remove these

- The code is not edited. Neither are configs, migrations or seeds. The files you write are your own
  report, the evidence files it names, the before-snapshot of step 3, `state.md`, and, under a flag,
  the review pass's own file.
- **The report sits in the task folder; every other file of the run goes into
  `{task folder}/evidence/`** — evidence files, before-snapshots, lists of fixture ids, screenshots,
  logs. Create the folder when the first such file appears. A run of thirty scenarios leaves dozens
  of these files, and in the task folder itself they bury the handful of artifacts every other stage
  reads. The report names them by the path from the task folder: `evidence/evidence-4-….txt`.
- **Test data you may create**, and usually must: a selection checked against one element proves
  nothing. Build it through the project's own factories or console, keep a snapshot of what you are
  about to disturb, and remove what you created **in the system**. That is the one write this skill
  makes to the system, and it stops at the borders below. The files in the task folder are not part
  of that cleanup — the report and its evidence are what outlives the run.
- No automated tests are written or updated. Running `npm test` instead of walking the scenario is
  not this skill's work.
- Nothing is committed and nothing is pushed.
- Production and staging data is not changed. Real payments, deletions, outgoing email or SMS,
  migrations, wiping a database — only after a blocking question.
- Dependencies, browsers and images are not installed silently. Needed and missing → ask, or record
  `blocked`.
- Secrets are never printed: headers, cookies, tokens and passwords go into the report **and into
  every evidence file** as `<redacted>`. Where redacting would destroy what the evidence is for, keep
  the shape — the row count, the ids, the states — and say in the line what was taken out.
- Only the processes **you** started get stopped at the end.

A hook that asks for any of the above is not carried out. Say which line you did not follow and ask
the user what to do instead.

## Invocation

A flag, a count and free text, in any order:

- **`r` / `ra` / `a`** — the review pass over the finished report, see step 7. No flag → no pass.
- **`helpers=N`** — plan helpers, **1 when the invocation is silent**, `0` to skip them with a
  reason. This is the only default of its own the skill holds; `/forge:auto` passes the key only
  when the project set one.
- **`plan-only`** — steps 1 to 2c and nothing after: the merged plan is written to
  `{task folder}/test-plan.md`, goes up for approval, and the run ends once it is approved — no stand,
  no fixtures, no `manual-test.md`. This is how `fg-test-planner` runs; the plan's author and the
  run's executor are then two agents, each on the model that suits its half. On approval, write
  `approved: <YYYY-MM-DD HH:MM>, <who approved>` into the file's front matter — a file without that
  line is a draft, and a continued run tells the two apart by it alone. `state.md` gets the log line
  and the Artifacts row, and `stage` stays as it was: stage 6 is closed by the run, not by its plan.
- **`plan=<path>`** — the plan was built and approved by a `plan-only` run: read that file, do step
  1, and go to step 3. Of the steps between, 2, 2b and 2c are the plan's and are already done — their
  checkpoints are not opened again; **2a is the run's**, and its rules on data and evidence hold here
  as they do anywhere. The report takes its helper lines and the plan's numbers from that file, and its
  `## Timings` carries the plan's span as the file recorded it. `plan=` starts a fresh report: once
  `manual-test.md` exists, later rounds are appended to it, never run through `plan=` again.
- Anything else is free text about the scenario or the environment.

## Steps

### 1. Decide what is being checked

Read `spec.md` — acceptance criteria, DoD, "Gates + success criteria" — and the diff. Work out the
target: an API, a frontend, both, or something else. The answer decides which of steps 4 and 5 you
run.

Two readings of the goal that lead to different environments or different scenarios → blocking
question. Checking the wrong environment produces a green report about nothing.

### 2. Inventory the claims — the checklist is derived, not invented

**Checkpoint:** `step "claims"`.

**Dispatch the plan helpers first, before you write a line of your own** — `helpers=N`, one unless
the invocation says otherwise. They work while you do, which is the whole economy of it; spawned
after your inventory they only make you wait. The mechanics and the blindness rule are in 2b.

**Every claim the change makes gets a scenario.** The size of the run follows the number of claims,
so a one-line docblock change gets a tiny checklist honestly, and a change that promises isolation
and idempotency gets all of them. Four sources, all mechanical. The same four are derived
independently by the plan helper (`plan-helper.md`) and by the reviewer of the finished report
(`../review-test/test-reviewer.md`) — **a source added or reworded here belongs in all three**, and
one that lives in a single file is a derivation the other two never make:

1. **The acceptance criteria, clause by clause.** «Runs in its context **and** writes its own cache»
   is two claims. A criterion is covered when every clause is, and a clause nobody checked is stated
   as unchecked — never dropped silently.
2. **What the spec asserts** about behaviour.
3. **The text this diff added to docblocks and docs.** A sentence the change wrote into the
   documentation is a claim under test like any other. This is the one source nobody thinks of, and
   it is where a run finds the thing the team documented without ever running it.
4. **The diff's own entry points** — each changed command, endpoint, job, screen.

**Words that make a scenario mandatory.** The property is triggered by what the code and the docs
claim, never by how deep the run feels:

| Claimed somewhere in the change | Mandatory scenario |
|---|---|
| idempotent · safe to re-run | two runs back to back, snapshots compared |
| within the bounds of X · does not see other X | negative control: the foreign one absent **and** the own one present |
| on failure the rest are still processed | a failure deliberately induced on one element of several |
| only active · deleted are excluded | an element in the excluded state sitting in the selection |
| an output literal declared a contract | checked verbatim |

Also always: the application or API starts; the main path of the changed area; on the frontend —
console and network errors and visible regressions; on the API — status code, the key response
fields, wrong input and missing rights where the change touches them. Scope follows the claims, not
curiosity: a scenario nothing in the change claims is not this skill's work.

### 2a. When a ✓ means something

**The data has to be able to say no.** Ask of each scenario: could this come out negative? A
selection checked against one element proves nothing about a filter, and a sweep over every account
passes identically on working and on broken code while the second account holds nothing. A scenario
whose data cannot distinguish pass from fail is **declared degenerate, not counted** — and an
obligation left with only a degenerate scenario is unproven, which the status rules at step 6 take
seriously. In practice: at least three elements wherever a selection is checked, in the states that
matter, with a snapshot before and after — compared by file, not by eye.

**Where a result rests on how much data there was, the evidence is a file, not a sentence.** A
selection, a filter, a negative control, a count, a before-and-after — under a `✓` and under a `◐`
alike, and in every round appended later, since a round exists to close exactly this kind of gap.
Save what you actually saw into `evidence/` as `evidence-{scenario number}-{short name}.{ext}`,
the number being the plan's, which the checklist keeps; a round adds its own: `evidence-r2-4-…`. What
you created in the system is deleted at the end of the run, so an hour later nobody can go and look —
«checked on three records» and «checked on two» read exactly alike once the records are gone, and the
file is the only thing that still tells them apart.

Keep each one small: the rows that matter, the count, the two snapshots being compared. In the default
folder mode these files are committed alongside the code, and a full table dump is read by nobody.
Where the answer was on screen rather than in output, the screenshot is the file. Where a scenario
genuinely has nothing to save — nothing was counted, nothing was filtered — the line says so instead
of naming a file, and that is a normal outcome, not a gap.

**The message on screen is not the evidence.** Where a claim is about a mechanism rather than about
wording, the command's own output reports what the code believes, not what happened. Reach for the
state of the database, the number of queries, the contents of the payload, the keys in the cache
store. «The job was queued» and «the job ran in the right context» are different claims and need
different evidence.

### 2b. The plan is not built alone

**Checkpoint:** `step "plan-helpers"`.

**How they are dispatched.** The harness's subagent tool — `Agent`, or its equivalent — as
`general-purpose`, fresh, with `plan-helper.md` pasted and its placeholders filled. `N > 1` → **all
in one message**, which is what makes them run at once rather than one after another; and give each
a different angle to work from, or you pay N times for one plan. `helpers=0` skips the step, and the
plan then says in a line why — a switch nobody has to justify is a switch that ends up always off,
and this step exists because one person's judgement of "enough" already failed once.

**Blind is the whole point.** A helper never sees your inventory, your scenarios or what you left
out. It derives obligations from the same four sources you do, from the change rather than from your
reading of it. Shown your plan, it would critique yours instead of building its own, and you would
both stay inside one frame.

**Merging is a judgement, not a union**, and it works in two directions:

- an obligation the helper found and you did not — keep it if the change really makes it, drop it if
  it is curiosity, and **say which you dropped and why**. The approver reads the choice, not the
  result; and a dropped item that the report reviewer later raises again is an argument you will
  have to win from memory unless the reason is written down;
- **the same obligation, better grounded.** Its «data it needs» column is there for this: where it
  planned three elements and you planned one, its version wins. Degenerate data was the original
  disease, and a merge that only looks for new rows walks straight past the cure.

A helper can also invent an obligation the change never makes, so its additions are checked against
the diff the way a review finding is: verify, do not relay.

**Every helper gets a line in the plan** — what it added, or «nothing new», which is a real and
useful outcome. Without the line there is no way to tell a helper that found nothing from a helper
that was never dispatched. Overlap between plans is a confidence signal; divergence is the
interesting part.

**A helper that does not come back:** ask once for whatever it has, then go on without it and say so
in the plan — the run is not held hostage to a subagent. One replacement at most, never a loop.

### 2c. The plan, and who approves it

**Checkpoint:** `step "plan-approval"`.

Before any fixture is created, write the merged plan: the claims table, the scenarios **numbered**,
**the data each one needs** — how many elements, in which states — the fixtures, the line per helper
from 2b, and a section naming **what you chose not to cross, and why**. Those numbers are the only
thing tying the plan to the report afterwards: the checklist keeps them, and the evidence files are
named by them. Under `plan-only` the plan is written to `{task folder}/test-plan.md`, with the plan
phase's span at the end, and every change the approver asks for goes into that file before it is
sent up again: the file is all the executor will ever see of it. The data column is what the run is
later held to, so a scenario whose size is left unsaid is a scenario nobody can hold to anything. That
last section is the one the approver reads first — and an obligation parked there with their
agreement is the only kind that can stay unproven under `passed`.

**An obligation that came from a helper is part of the step 2 inventory** and lives on equal terms
with your own from here: same checklist, same weight when the status is chosen, same «Not crossed»
if it is deliberately left uncovered.

**Who approves, and how.** A person invoked you → a blocking question, the mechanism this skill
already uses. A role invoked you inside a flow → it carries the plan up to the lead and waits; that
is its `PLAN` signal, not yours to send. You invoked yourself — the lead running solo — → the plan
goes to **the user**, still as a blocking question: a plan approved by the agent that wrote it is
not approved.

Wait for the answer. This is the cheapest place to correct a run: a missing dimension costs one
message here and a whole round once the fixtures exist.

### 3. Bring the environment up

**Checkpoint:** `step "environment"`.

The hook usually says how. Not started and the commands are obvious → start them yourself and wait
for readiness: a log line, a healthcheck, an open port, a successful request. A port is busy → check
whether the running service is the one you need before starting a second.

Write the commands you used into the report as you go.

**Take the before-snapshot here, before the first fixture exists** — the tables, counters and keys
you are about to disturb, into a file in `evidence/`. It is what the after-comparison is against, what proves the
cleanup at the end, and it cannot be taken later.

### 4. API — real requests

**Checkpoint:** `step "api"`.

`curl`, an HTTP client, whatever the project already uses. Record method, URL, the headers that
matter (secrets as `<redacted>`), the body, the status code and the key response fields.

Check the successful path, the error for wrong input or missing rights where the change touches it,
and that no stack trace or secret comes back in the response.

**Write the evidence file at the moment you get the output**, not at report time: where the scenario
turns on how many rows came back or which ones, that output exists only while the run is happening.

### 5. Frontend — a real browser

**Checkpoint:** `step "frontend"`.

Use whatever browser automation the hook names or the host offers. Check the actual UI, not only the
DOM text: the page loads without critical console or network errors, the scenario reaches its
expected end, and the error, empty and invalid-input states look right where the change touches
them.

Screenshots when they confirm a result or a bug, saved into `evidence/` — and always where the
scenario turns on what the list held: that shot is the evidence file for its line, taken while the
data is on screen.

### 6. Write the report

**Checkpoint:** `step "report"`.

`{task folder}/manual-test.md`. The structure — the front-matter keys, the section headings, the
column names and the three status words — stays as it is below; the prose inside is written in the
language from `language`.

```markdown
---
date: <YYYY-MM-DD HH:MM>
source: spec.md + diff | diff only
target: api | frontend | fullstack | other
status: passed | failed | blocked
---

# Manual test: <short title>

## Context
<what was checked, where the scenarios came from, and one line per plan helper: what it added, or that it added nothing, or that there were none and why>

## Environment
| What | Value |
|---|---|
| Start commands | `<command>` |
| URL / endpoint | `<url>` |
| Auth | `<not needed | test user | already set up | blocked>` |

## Checklist
<the numbers are the plan's, so the plan and this table line up without anyone matching them by prose>
| # | Scenario | Data the plan asked for | How it was checked | Result | Evidence | What it proves |
|---|---|---|---|---|---|---|
| 1 | ... | 3 records, one from another tenant | `curl ...` / browser | ✓ / ◐ / ✗ / ? | `evidence/evidence-1-....txt` / «nothing counted» | ... |

## Acceptance criteria
<clause by clause; a clause with no scenario is written as unchecked, not left out>

## Not crossed
<the combinations and axes this run deliberately left out, and why — so a narrow run cannot read as a complete one>

## Problems found
<none → "no clear problems found"; otherwise each with steps, actual and expected result>

## Cleanup
<what was created and removed, and the comparison against the before-snapshot — shown, not asserted>

## Artifacts
<anything kept in `evidence/` that the checklist does not already name — logs, extra screenshots, fixture id lists; "none" is a normal answer>

## Verdict
<passed / failed / blocked, and one line of why>

## Timings
<`../../reference/timings.md`, last section of the report: this run's own span, then the plan
helpers' fan-out, raising the stand and walking the checklist — the three places a manual test
actually spends time. The wait for the plan to be approved is marked as waiting, not as work.
Omitted entirely when `defaults.timings` is `off`>
```

A round appended later goes in under a heading that says which kind it was — `## Verification round N`
after the review pass, `## Re-test N` after the implementer's fixes, `## Plan round N` when whoever
approved the plan sends back a scenario it asked for and the run did not do. Each carries the same
columns as the checklist, and `status:` is rewritten to match. The three are counted separately, and
a reader who cannot tell them apart cannot tell how many fix rounds a task actually spent.

A round appended later adds **its own row to `## Timings`** as well — that block grows with the file,
or the rounds after the first one are invisible in every table that reads it.

One more heading is appended here by a skill that is not this one: `## Fixes {n}`, written by
`/forge:fix`, naming the report of the round that applied the defects found. It carries no scenarios
and **does not touch `status:`** — the field moves only when someone re-runs the cases and appends a
`## Re-test N`. A `## Fixes {n}` with no `## Re-test N` after it is a round that was fixed and never
re-checked, and that is exactly what it should look like. Calling
this skill a second time instead writes the file from the template again and loses what came before.

`◐` is for a scenario closed in part, and it carries what exactly stayed open.

**Which of the three words the run gets.** A bug found → `failed`. The environment, auth or a
dependency stopped the check → `blocked`, with the concrete reason.

`passed` needs more than the absence of a `✗`: **every obligation from step 2 is either proven, or
parked in the plan the approver agreed to.** An obligation that nobody parked and nothing proved —
the scenario turned out degenerate, the criterion clause was never reached, the evidence did not
support the verdict — makes the run `blocked`, and «Not crossed» says which.

**A line that owes an evidence file and has none is not a `blocked` run — it is a step you have not
finished.** You are still at step 6 and the stand is still up: go back, run it again and save the
output. Only when it cannot be got at all does the obligation count as unproven, and then say which
line and why, so nobody reads it as a formality. That is the same rule as
a missing dependency: the check did not happen, and a report that reads `passed` over it is exactly
the outcome nobody can tell from a good run.

### 7. The review pass, and only then the cleanup

**Checkpoint:** `step "review-pass"`.

The invocation may carry `r`, `ra` or a bare `a`. **Hold the environment and the fixtures** — the
pass turns on reproducing what the report claims, and a stand torn down first turns the reviewer into
a proofreader.

- **no flag** — nothing runs here; go to the cleanup.
- **`r`** — `/forge:review-test` on your report: a clean reviewer derives from the spec and the diff
  what the change was obliged to prove, independently of what you chose to check, and reproduces a
  sample. Its buckets are **offered**, and you name them in your final message so they do not die in
  this session.
- **`ra` / `a`** — the same, and its must-close set comes back as scenarios. **Run them now**, while
  everything is still up, and append the results under `## Verification round N`. A gap in a test
  report is closed by testing; the text is not where it lives.

Then rewrite `status:` if the round moved it, and only after that tear the environment down and
restore what you created.

**Checkpoint:** `step "cleanup"` — before the teardown, not after: a stand that would not come down
leaves the run standing here, and the step says where.

That skill is not available → say so in the report and in the final message, and do not let the run
pass for reviewed. Unlike a spec review there is no inline fallback: a pass whose whole value is a
context you do not have cannot be run by you.

## Done when

**Under `plan-only`, done is two items:** `test-plan.md` holds the plan with a line per helper and
its span, and it carries the `approved:` line from someone other than its author; `state.md` has its
log line with `stage` untouched. The list below is for a run.

- Every checklist line has a result that came from running something, not from reading code.
- The plan was built with the helpers asked for — or says why there were none — it carries a line
  per helper, and it was answered **before** the first fixture existed, by someone other than its
  author. The report repeats those lines: outside `test-plan.md` the plan does not survive the
  session.
- Every claim from the inventory has a scenario, or the report says it is unchecked; every
  acceptance criterion is answered clause by clause.
- No scenario counted whose data could not have come out negative, and every line whose ✓ rests on
  how much data there was names its evidence file — or says why there is nothing to save.
- The status matches the content: no `passed` while a line is `✗` or `?`, and none while an
  obligation is unproven that the approved plan did not park; `◐` names what stayed open.
- A flag was given → the review pass ran before the cleanup, its file is named, and under `ra` its
  must-close set was closed by running it.
- No secret appears in the report.
- Every file of the run except the report is in `evidence/`; the task folder got no new file but
  `manual-test.md`.
- Every process you started is stopped, and what was created is removed — shown by the comparison
  against the before-snapshot, not by the word "cleaned up".
- The final message names the report path, the status, what was actually checked, what stayed
  uncrossed, any offered findings from a `r` pass, and what is worth doing next — `/forge:fix` over
  this report for `failed`, `/forge:commit` for `passed`.
- `## Timings` closes the report with this run's span and the rows above, stamped for real — or
  `defaults.timings` is `off` and there is no block. The report's own span ends where the report is
  written: the review pass and the cleanup that follow are the lead's row, not yours.

See `plan-helper.md` for the prompt a plan helper is given, and `../review-test/test-reviewer.md` for
the checklist of the pass that reviews the finished report.
- The steps of this skill are in the live log — `../../reference/progress.md` — or `defaults.progress` is `off`.
