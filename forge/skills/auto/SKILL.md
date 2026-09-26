---
name: auto
description: Take a task through the whole forge cycle — branch, brainstorm, spec, implementation, review, manual test, commit — with a team of three roles (four with the manual-test planner), continuing from the stage where the cycle stands. Run it when a task must be carried all the way to a commit, or when a task already opened in .forge/tasks must be continued. The --inline flag does everything alone, without teammates; --autonomy sets which decisions after the brainstorm the lead makes without asking, up to the night level — an unattended run with an evening pre-approval survey; --review-test turns on an independent review of the manual test report.
argument-hint: "<key | link | description | path to state.md> [--inline] [--gate] [--autonomy [level]] [--review-test [level]] [--full-opus] [--from <stage>] [VAR=value ...]"
---

# Run the whole cycle

You are the **lead**. The team is three roles: `forge:fg-implementer` (spawned before the code is
written, alive to the end), `forge:fg-reviewer` (fresh for every review run, alive while its report has
open items), `forge:fg-tester` (from the manual test onward). A project that sets `spawn.test_planner_model` adds a
fourth, `forge:fg-test-planner`, alive only from the start of stage 6 until its plan is approved.

**You orchestrate; the skills of the set do the work.** What happens inside a stage belongs to that
stage's skill — you decide only *when* it is called and what to do with what comes back. A stage
"performed" by describing what the skill would have done is a stage that did not run.

Config lookup: `../../reference/config-lookup.md`. Read `hooks.auto` before you start and follow it
inside the borders below; no hook is a full answer.

## The route

Each row is one real invocation of the named skill. The nested calls are made by the skill itself,
not by you.

| # | Stage | Who runs it | Produces |
|---|---|---|---|
| 1 | `/forge:task` | lead | task folder, `state.md`, branch |
| 2 | `/forge:brainstorming` | lead, **in dialogue with the user** | `decisions.md` |
| 3 | `/forge:make-extended-spec ra [N]` | lead (it calls `/forge:review-spec` inside) | `spec.md`, `spec-review-{n}.md` |
| 4 | `/forge:implement-extended-spec` | `fg-implementer` (it calls `/forge:commit --step` inside) | `implementation-report.md`, commits |
| 5 | `/forge:review` | fresh `fg-reviewer` per run (it spawns its own axes inside) | `review-{i}.md` |
| 5f | fix rounds — `/forge:fix <task> <review-{i}.md>` | lead filters → `fg-implementer` runs the skill → **the same** `fg-reviewer` re-checks | `fixes-{n}.md`, commits, "Fixes {n}" and "Re-check N" inside the same `review-{i}.md` |
| 6 | `/forge:manual-test [ra \| r] [helpers=N]` — the letter only when the review pass was asked for, nothing at all otherwise | `fg-tester` — it stops at its plan for your word (with a test planner, `fg-test-planner` runs `plan-only` and stops instead, and the tester runs `plan=` over the approved plan), and with the letter calls `/forge:review-test` inside before the stand comes down; you close the stage by reading the report against the plan | `manual-test.md` and its evidence files, `test-plan.md` with a test planner, `test-review-{n}.md` when the pass ran, the reading in `auto.md` |
| 6f | fix rounds — `/forge:fix <task> <manual-test.md>` | lead sorts by size → `fg-implementer` runs the skill → `fg-tester` re-tests | `fixes-{n}.md`, commits, "Fixes {n}" and "Re-test N" inside the same `manual-test.md` |
| 7 | `/forge:commit` | lead | commits, artifacts, the push/merge question |

**A seam is not a decision point, and the test for it is mechanical.** A stage that closed with
nothing open is followed by the next one **in the same turn**: the next stage's call — the spawn, or
the skill invocation — is the **last thing that turn does**. No confirmation asked, no announcement
standing in for the call.

`--gate` is what adds confirmations; without it the only thing that stops the route is a STOP
criterion, and a STOP is a question you write out and wait on, not a status you post.

**Apply this to your own turn before you end it.** A stage just closed, nothing is being waited for
→ the turn contains the next call. Ending it with prose instead — however complete and however
accurate that prose — is the run stopping, and nobody asked it to. Reporting a stage is not
finishing it: the report and the next call belong to the same turn, in that order.

**Both tenses fail, and the present tense is the one that fools the author.** These are the same
stop wearing two costumes:

- "spawning the implementer next", "stage 4 is next" — plainly a plan, easy to catch;
- **"switching to the implementation", "moving on to stage 4 now", "starting the implementation"** — reads
  as an action being taken, and is not one. **A sentence is not a tool call.** Writing it and ending
  the turn stops the run exactly as hard as the first form, with a better disguise — and it is the
  form that actually happens, because it feels like doing the thing.

The cost is not abstract: an unattended run that idles at a seam is found hours later exactly where
it was, and every hour the user was asleep is gone. That is the whole reason `--gate` is a flag and
not the default.

**There is exactly one thing that lets a stage-closing turn end without the next call:** a STOP
criterion fired, and the turn ends on the question that STOP asks. Nothing else qualifies. Not "the
report got long", not "the user may want to look first", not "it feels like a natural pause". No
STOP → make the call now, in this turn.

**Every call names the task** — the key, or the path to `state.md`. Each of these skills falls back to
"the newest folder in `paths.tasks`" when it is given nothing, and the newest folder is the right one
until the day two tasks are open at once.

Stage 3 is called with the `ra` flag — the spec review runs and applies without stopping. `N` is
passed **only** when `spec_review_passes` was set (config or argument); unset, the bare `ra` goes out
and the number is the spec skill's own default. Naming a default of your own here would put one
meaning in two files.

`/forge:init`, `/forge:frame-new`, `/forge:frame-existing` and `/forge:distill` live outside a task and are never called
from here. The frame is empty → that is not a blocker: every stage says so in its own report, and you
name it once in the final summary.

## Entry: a new run and a continued one are the same command

`/forge:auto` on a task that is half-done continues it. Work out where it stands **before** anything
is spawned:

**Step 1 decides which half runs.** A new task goes from step 1 straight to stage 1 — there is no
folder to read, no branch to switch to, and `/forge:task` asks the work-tree question itself. Steps
2–9 are the continued run.

1. **Find the task folder, by what the argument is.** A key or a path to `state.md` → that task; no
   folder for it → a new task. **Free-text description → always a new task**, and no folder is looked
   up: "the newest folder" is never the task the user just described, and it exists in every project
   that has ever run this cycle. Empty argument → the newest folder in `paths.tasks`.
2. **Read `state.md` for what it actually records.** A stage skill writes `stage` **after its own work
   is done** (`../../reference/state-file.md`), so `stage` names the last stage that **finished**, and
   the entry point is the next one on the route. Nothing in the set ever writes `in progress`: a stage
   that started and died looks exactly like one that never began, and no status tells them apart.

   Three values are not route rows: `task` has no artifact of its own — the rows it writes name the
   files of *later* stages, so the branch and `state.md` existing is what closes it; `review-spec`
   means the spec review ran, and the entry point is stage 4; `done` means step 5.
3. **Open the artifacts and read the outcome, not the status.** `ready` in the `Artifacts` table means
   the file was written; the stage skill sets it whatever the verdict was.
   - `spec.md` is there and no `spec-review-{n}.md` is → the spec was never reviewed. Entry point is
     the review of that spec, not the implementation.
   - `implementation-report.md` — its "Deviations from the spec" is read before anything else happens,
     exactly as stage 4 requires; a continued run owes that reading as much as a live one.
   - `test-plan.md` with no `manual-test.md` → the entry point is stage 6, split by the file's
     `approved:` line: there → spawn the tester with `plan=` that path; missing → the file is an
     unanswered `PLAN`, so read it as one and answer it, and axes you add go to a fresh test planner
     told to update that file, not to build another.
   - `review-{i}.md` — the `Verdict` line plus the last "Re-check N". `must-fix` items still open **and
     not settled in `auto.md`** → the entry point is that review's fix loop, not the next stage; a
     finding an earlier run rejected on a fact from the code, or deferred to a task of its own, is
     settled and does not reopen a loop. Read the last `## Fixes {n}` there and the `fixes-*.md` it
     points at before you hand anything over: a round that died between its commit and the re-check
     reads exactly like a round that never ran, and the entry point is then the re-check, not the fix.
   - `manual-test.md` — `status:` in the front matter. `failed` or `blocked` → the entry point is stage
     6 and its loop, not the commit — but read the last `## Fixes {n}` there first, exactly as on the
     review side: `/forge:fix` never touches `status:`, so a round that fixed the defects and died
     before the re-test looks from the front matter alone like a round that never happened. A
     `## Fixes {n}` with no `## Re-test N` after it means the entry point is the re-test. `passed` with no reading of it against the approved plan recorded
     in `auto.md` → the entry point is that reading, which is what closes stage 6. A reading that is
     there and names a mismatch whose round never came back → the entry point is that round. Unless
     step 5 says the cycle already ended: a task that reached its final commit is finished, and the
     reading is not applied to it after the fact.
   - `test-review-{n}.md` — its must-close bucket. Items still open **and not settled in `auto.md`** →
     the entry point is stage 6, whatever `status:` in the report says: the pass that found them runs
     before the status is rewritten, so a run that died in between leaves a green report over open
     findings. The report itself is never edited to close them — that file belongs to the pass — so
     `auto.md` is where a run or a rejection on a fact is recorded, and where the next run reads it.

   A run that re-enters on `ready` alone walks past unfixed `must-fix` findings, commits, and reports a
   clean cycle — the one failure that reads exactly like success.
4. **Read `auto.md`** when it is there: review run number, fix round, test round, exchanges spent, the
   limits in force and the flags of the previous run. **Where it disagrees with `state.md`, the
   sub-step in `auto.md` wins** — `state.md` knows stages, `auto.md` knows where inside one the work
   stopped. Without it a continued run restarts every counter from zero, and a limit stops being a
   limit. **The flags of this invocation govern**; the previous run's flags are read to understand what
   already happened, not to inherit `--inline`, `--autonomy`, `--review-test` or `--full-opus` into a
   call that did not ask for them. `--review-test` and `--autonomy` are the ones that bite: a task whose
   earlier run recorded `TEST_REVIEW: ra` or `AUTONOMY: night` keeps neither — this call and the project
   config decide, in that order, and what `auto.md` holds is history. The `## Pre-authorizations` block
   of an earlier night run is read the same way: answers to the forks that came up then, not permission
   for a run that did not ask for the level. **A `## Night decisions` section already in the file is
   named in your first message of this run, unlanded entries first, before any stage starts** — at every
   level, since the run that wrote them is over and the code they shaped is on the branch. A night
   nobody reports back reads exactly like a night nobody had to decide anything in.
5. **The cycle is over when the final commit is done and `auto.md` carries the run summary.** Then say
   so and stop — do not re-run stage 7. `state.md` cannot answer this: `stage: done` is in the contract
   but no skill in the set writes it, so a finished cycle and a commit that closed some other stage
   both read `stage: commit`. `stage: commit` with no `auto.md` at all is a task someone drove by hand
   — say that and stop rather than replaying stage 7 and asking about push a second time.
6. **Reconstruct what a dead run left behind** before re-entering a stage: `git log <base>..HEAD` and
   the files on disk. Half an implementation may already be committed, and a freshly spawned
   implementer has no way to know that — what is already built goes into its prompt.
7. **Get onto the task's branch, and check the tree before you move.** `git status --porcelain`,
   ignoring everything under the `.forge/` folder the lookup returned.
   - Already on the task's branch → nothing to do; a dirty tail here is normal and asks nothing.
   - On another branch and the tree is clean → `git checkout <branch>` from `state.md`.
   - On another branch and the tree is dirty → STOP question first (commit, stash, or leave the
     continuation for later), and the checkout happens only after the answer.

   `/forge:task` guards this on a new run and says why: the checkout succeeds and quietly carries
   someone else's edits onto the task branch, where the review takes them for part of the task and the
   commit writes them in. A continued run never calls `/forge:task`, so both the guard and the checkout
   live here — and everything after this step, from `git log <base>..HEAD` to the teammates' edits,
   assumes the branch is the task's.
8. **Check the branching point is an ancestor of HEAD** — `git merge-base --is-ancestor <base> HEAD`,
   where `base` is the SHA in `state.md`. No `base` → `origin/<parent>`; no remote ref → the local
   `<parent>`. Take the SHA first because the branch was cut from the remote and a local branch of that
   name often does not exist at all: the command then dies with `fatal: Not a valid object name`, and a
   non-zero exit read as "not an ancestor" turns into a STOP question on every single continuation. A
   command that failed to resolve its ref is a question about which ref to use, not an answer about
   ancestry. Genuinely not an ancestor → STOP question; picking a branch point yourself silently
   changes what the task is diffed against.
9. **Spawn only the roles the remaining route needs** — the implementer when edits are still ahead,
   the tester at stage 6 (and the test planner before it, by the `test-plan.md` rule of step 3),
   **a reviewer when the entry point is a re-check**: the one that wrote the
   report is gone with its session, so the fresh one is told it is re-checking named items against the
   diff of the fixes and **not** running `/forge:review`, which would spend a run number on points that
   already have one. They have no history: every spawn prompt carries the paths, never a retelling.

`--from <stage>` — a stage name as `state.md` spells it — names **the stage the work starts at**, not
the one before it; "the next one on the route" is not added to it. It overrides steps 2, 3 and 5, so a
finished cycle can be re-entered deliberately. Everything else holds: the folder, `auto.md`, the work
tree and the branch are handled exactly as above — a forced entry point is not a reason to lose the
counters, and `--from review` is not a way to get a fresh set of fix rounds.

**The "task already open" question belongs to `/forge:task`**, which asks it with two ways out
(continue from the stage, or archive the folder and start over). Do not ask it here as well: asked
twice in a row, the second one reads as though the first answer was lost.

## Arguments, flags and limits

| Flag | What it does |
|---|---|
| `--inline` | Solo: no teammates, the lead does their work. See "Solo mode" |
| `--gate` | Confirm every stage transition with the user. See "Step gate" |
| `--autonomy [level]` | How much of the STOP list you settle yourself, from stage 3 on. `ask` \| `mid` \| `high` \| `night`; bare flag means `mid`, and the project value is `defaults.autonomy`. `night` is the unattended run — a flag only, never a config value; it opens with a pre-flight question round, is entered at stage 4 or later, and closes everything a decision can close. See "Escalation and autonomy" |
| `--review-test [level]` | Turn on the independent review pass over the test report at stage 6 — off unless this flag or the project config asks for it. Bare flag means `ra`. The levels it takes are `ra`, `a`, `r`, `off` — `a` is `ra`, as it is everywhere in the set. It is the same setting as `TEST_REVIEW` in the limits table, spelled shorter — spelled both ways in one call with two different values, it is a question, not a guess at which one was meant |
| `--full-opus` | Every teammate spawns with `model: "opus"`. With `--inline` there are no teammates: say so in one line and carry on |
| `--from <stage>` | Start at the named stage instead of the one the state points at |

**Parsing.** The task is everything before the first `--flag` or `NAME=value` — a key, a link, or a
sentence describing the work, which is why it cannot be "the first word". `--from` takes the next token
as its value, unless that token is itself a flag — then it is a question, because no stage is named
`--review-test`. Every other flag stands alone. `--autonomy` and `--review-test` take the next token
only when it is one of their own levels — another flag or a `NAME=value` leaves them bare, and any other
word is a question, not a guess in either direction. `--autonomy night` together with `--gate` or with
`--inline` is a question as well: one asks for six confirmations and the other for one, and a level that
means "nobody is watching" cannot be reconciled with either by guessing which was meant.

| Override | Config key | What it bounds | Default |
|---|---|---|---|
| `--autonomy` | `defaults.autonomy` | which forks of the STOP list you settle yourself. Spelled as a flag rather than a `NAME=value`, and it takes the priority of this table like everything else in it. The config key holds `ask`, `mid` or `high`; `night` is asked for per run, since it carries a question round of its own and would otherwise open every daytime call with one. `night` found in the config → treat it as `high` and say so in one line | `ask` |
| `X` | — | exchanges **per stage that has a conversation in it** — 4, 5f, 6 and 6f — counted separately for each, and 5f counts from zero again on every review run. Stage 6 has one because the tester (or the test planner) stops at `PLAN` and waits, and may be sent a round once its report is read | 15 |
| `SPEC_REVIEW_PASSES` | `defaults.spec_review_passes` | passes of the spec review inside stage 3 | the default of `/forge:make-extended-spec` |
| `REVIEW_COUNT` | `defaults.code_review_runs` | review runs at stage 5 | 2 |
| `REVIEW_FIX_ROUNDS` | `defaults.review_fix_rounds` | fix → re-check rounds within one review run | 3 |
| `TEST_FIX_ROUNDS` | `defaults.test_fix_rounds` | defect → fix → re-test rounds at stage 6. The round a mismatch with the approved plan sends back is not one of them and is bounded on its own — see stage 6 | 3 |
| `TEST_REVIEW` | `defaults.test_review` | the review pass over the test report, also spelled `--review-test`: `ra` closes its must-close set by running it, `r` only offers, `off` is no pass at all. Your own reading of the report against the approved plan is not part of it and closes stage 6 at all three | `off` |
| `TEST_PLAN_HELPERS` | `defaults.test_plan_helpers` | subagents that build a test plan blind, in parallel with the tester's own, and are merged into it. Passed on **only** when the key or the argument was set; `0` skips them and the reason goes into `auto.md` | the default inside `/forge:manual-test` |

**Priority: the argument beats the config, the config beats the default here.** A missing config key
is a full answer — take the default and ask nothing.

An **exchange** is a pair of messages (you → teammate, and the answer); the first assignment of a
stage does not count.

Any limit reached → STOP, at `ask` through `high`; at `night` the autonomy table governs it and the
extension is bounded there.

## `auto.md` — your own state file

`{task folder}/auto.md`, written **on every event that moves a counter** — not only at stage seams:
each review run, each fix round, each re-check, each test round, each STOP, each night decision that
took the place of one, each stage transition. A
file written on seams alone says "stage 5, round 0" after a death inside round 2, and the continued run
starts the rounds over — which is the exact failure this file exists to prevent.

Keep in it: the mode and flags of this run; the stage and the sub-step; the limit values in force and
where each came from; exchanges spent per stage; review run number, fix round, test round, and whether
the plan round of stage 6 was sent and whether it came back; teammates
(role → alive/killed); decisions taken without escalation, in the shape the autonomy section asks for;
**the test plan as it was approved, what each helper contributed to it, what the merge dropped, and
the axes the approval added** — that exchange has no artifact of its own, in solo no less than with a
tester; with a test planner it has one, `test-plan.md`, and `auto.md` then holds the approval, the
axes it added and the path rather than a second copy of the plan; what the reading of the report against that plan came to at the end of stage 6; a one-line
log per event; **the timings**, below; at `night` the two sections that level names —
`## Pre-authorizations` and `## Night decisions`; and, at the end, the summary of the run.

Structure is yours, prose is written in the config `language`.

### `## Timings` — where the run spent its wall clock

Kept as `../../reference/timings.md` defines it, under that heading, in English: **one row per stage
and one per round**, measured from the spawn or the call to the signal that closed it. You are the only
one standing at both ends of a stage, so nobody else can write these. `defaults.timings: off` → no
section at all.

**The row is opened when the stage is, not when it ends.** Before the spawn or the call: `date -Is`,
then the row with `Start` filled, `End` as `— running` and `Elapsed` empty. The signal closes it. A stage
written up only after it finishes is a stage whose start lived in your head for an hour and a half, and
a row that was never opened is invisible — the table simply ends, which is how a run loses every row
after stage 4 while its log keeps going.

An open row is also what makes the table answer "what is happening right now": a brainstorm an hour
into a question shows as one line with no end, instead of as nothing at all.

**A `date -Is` call goes immediately before every spawn and immediately after every signal**, and its
raw output into the note. It is a Bash call of its own — it does not ride along with writing this file,
and "it costs nothing" is not a reason to skip it. A stage continued from an earlier session has no
start of its own: `—` in Start, `(—)` in Elapsed, and the note says which it is.

**Mark the waiting.** Stage 2 is a dialogue, stage 6 stops at `PLAN` for your word, every STOP waits
for the user — and a row that silently includes their lunch break is the row that tops the table.
Subtract the wait where you can, mark the row `includes waiting` where you cannot, and leave such rows
out of the summary below.

The rows are coarse on purpose. What happened **inside** a stage is broken down in that skill's own
report, which carries a `## Timings` block of its own; your table says which one to open. Your row is
wider than that block by the skill's tail — its commit call, the sections it appends, `state.md` — and
by any queueing: name in the note which of the two it was, or say it was not established. Under
`--inline` there is no queue and no spawn: the row is your own call to the skill, and the skill's block
is the same work seen from inside.

The run summary closes with **the three longest measured rows**, named, plus how many rows are `—` and
why. That is the whole point of the table: a cycle nobody can point a finger at gets optimised by
guess, and a table half of whose rows are missing invites exactly that guess unless it says so.

### The live rows — `bin/forge-progress`

`../../reference/progress.md`. The same stamps as the table above, written where something outside
this session can read them **while the run is still going**: `## Timings` answers where the time went
after the fact, and answers nothing at all to the person watching a stage that has been open for
forty minutes.

Three kinds of row are yours, and no others:

| Row | Opened | Closed |
|---|---|---|
| `run` | your first action of the invocation | when the run summary is written |
| `stage` | immediately before the spawn or the call | on the signal that closed the stage |
| `round` | at each fix round and each re-check or re-test | when that one comes back |

**The same two moments as your row in `## Timings`**, and the helper stamps its own line — but it does
not replace the `date -Is` call that section asks for: the raw string still goes into the Note, and
that is what makes the number checkable.

**Names are fixed, because the viewer pairs `end` with `start` by name.** A `stage` row is the number
and the skill as the route spells them — `5 review`. A `round` row is the loop and its number, and
**nothing else**: `fix 2`, `re-check 2`, `re-test 1`. One row each, exactly as `## Timings` counts
them, so the table and the live view can be read side by side.

**Everything else about the round goes into `extra`, never into the name** — the run number, "over the
limit", what the round is about, the source it came from and the report it wrote:
`source=review-3.md · candidate filter by membership · fixes-9.md`. Where the round came from is the
one thing the row cannot show by itself: a fix loop over a review report and a fix loop over a test
report look identical, and the source artifact is what tells them apart.

A name that drifts by one word — `fix 4 (run 2, over the limit)` closed as `fix 4 (run 2)` — is a
row that never closes and an `end` that matches nothing. Both then lie: the first runs to "now"
forever, the second lands as a span with no start.

**One `start` per round.** A row that is already open is not opened again — the subject changed is an
`extra` on its `end`, not a second `start`. A second `start` under the same name leaves the first one
open for good, and the round's number becomes the tail of itself.

**The steps inside a stage are not yours.** The stage skill writes them: it knows which of its own
steps it has reached, and you do not. Under `--inline` that does not change hands — you are running
that skill, so you write its steps as it would.

A row nobody closed is how a stage that died shows up, which is the one thing the artifacts cannot
say by themselves. Leave it open and let the continued run tell the story — and when the run stops at
a STOP instead of finishing, the open `run` row is the truth about it, not an omission to tidy up.
**Write a `note` when the run stands still** — a question the user has not answered, a stand that
would not come up: the timeline shows that nothing is happening, and the note is the only thing that
can say why.

**You never edit `state.md`.** The stage skills update it themselves, each after its own work — that
is the contract in `../../reference/state-file.md`, and it holds `stage`, `Artifacts` and `Log` and
nothing else. A section of your own inside it splits the recovery point in two, and the next skill
reads whichever half it finds first. Your counters live here, next to it.

## Stage 4 — implementation

The implementer starts by walking the change map against the live code and answers **`SPEC_APPROVED`**
with the divergences as one list — that is the first signal the spawn prompt asks for. A landmark the
spec built a decision, a guard or a ripple entry on, and which does not exist at all, comes back as
`QUESTION` instead: it is a premise, and the reasoning on it has to be redone by whoever wrote the spec.

**`SPEC_APPROVED` needs your answer — the implementer waits for it and edits nothing until it comes.**
Sort the divergence list by the same two buckets as the deviations below: mechanical → one line in
`auto.md` and a go-ahead; a landmark whose absence moves the architecture → a broken premise, handled
exactly as just below. The list arrives in
the message and lands in no artifact of its own, so `auto.md` is where it is written down; without that
line a continued run cannot tell a spec that was walked against the code from one that never was.

**A broken premise is a STOP**, with two options: re-run stage 3 over the whole spec — `spec.md` is
rewritten wholesale, everything after it is re-derived — or the user edits `spec.md` by hand and the
implementer carries on from the corrected text. At `--autonomy high` and `night` it is yours, and then only the
first option is: the second one needs the user by definition. You do not patch the spec yourself; a
spec quietly edited by the orchestrator stops being the document the review checked.

**On `DONE`, read "Deviations from the spec" in `implementation-report.md` before moving on.** The
implementation skill settles small divergences on its own and writes them down, so nobody has looked
at them with the spec's architecture in mind. Sort them: mechanical → carry on, with a line in
`auto.md`; a changed approach or anything the user would see → that is the STOP criterion "a departure
from the architectural decision of the spec", and it triggers here, not in the final summary where the
work is already done.

## Stage 5 — review and the fix loop

For each run up to `REVIEW_COUNT`:

1. Spawn a **fresh** `fg-reviewer`; it runs `/forge:review` and comes back with the path of the report
   it wrote. **The file numbers itself** — `/forge:review` takes the next free `review-{i}.md` — so on
   a task that was already reviewed by hand the first run of this cycle is not `review-1.md`. Work
   from the path it reports, not from the number you expected.

   **No report and no diff is a STOP, never a pass.** `/forge:review` on an empty diff writes nothing
   and spawns nobody, so the reviewer comes back with no path. At this point in the route that means
   the implementation produced nothing, the wrong branch is checked out, or the change is already
   merged — name those three as the options. Reading it as "clean" sends an empty task through testing
   and commit with a green report.
2. **Sort the findings yourself.** Every `must-fix` is fixed, or rejected on a fact from the code that
   goes into `auto.md`. An `optional` is your call — fix it, or leave it with the reason written down.
   Two rules bind the sorting:
   - **A rejection has to be checkable.** Not "I disagree", but the fact from the code: where the
     guard sits, why the branch is unreachable, which test pins the current behaviour. No such fact →
     the finding is fixed. The report already verified every finding against the code before it got in,
     so an unexplained rejection overturns a check that was actually run.
   - **A large finding is not fixed inside the loop.** Large means any of: it changes approved
     behaviour or a public contract; it needs a migration; it breaks the architectural decision of the
     spec; the fix spreads past ~5 files or several modules. Order: finish everything else first, then
     one STOP question about it — a task of its own, opened **after** this cycle's final commit / fixed
     here and now with the user watching, where there is one / rejected with a reason. At `mid` and above the choice
     between those three is yours when the finding is large by its spread alone — the other three
     marks are rows of their own in that table; the options and their order do not change either way.

     The order in the first option is the whole option: `/forge:task` cuts and checks out a new branch
     from the parent, so opening it mid-cycle moves HEAD out from under the run — the teammates keep
     pointing at the old branch and `base` stops describing what is being reviewed.

     There is no third option where a mini-spec is written into this task's folder:
     `/forge:make-extended-spec` writes `spec.md` and only `spec.md`, so a "small spec for the fix"
     overwrites the spec this task was built from.
3. Hand the list to `fg-implementer` **in the report's own words**, not in your retelling, together
   with the path to the report it came from **and the numbers your sorting left in** — "`#1`, `#4`,
   `#7` out of `review-2.md`". It runs `/forge:fix` over that file, and that skill applies what it was
   handed and never narrows the list itself: a `must-fix` you rejected on a fact from the code and a
   finding you deferred to a task of its own stay out **only because the numbers say so**. Hand over
   the bare path and you hand over the whole report, rejections included. `--decide` goes into the
   message when `--autonomy` is `mid` or above, and only then — it settles the `optional` items you
   left in the numbers instead of coming back to you; the ones you decided yourself are simply not
   among them. What you check is the answer: `FIXED` carries the path to `fixes-{n}.md` and what the
   checks said, and a round that comes back without one goes back.
4. **The same `fg-reviewer` re-checks only the fixed items** and appends "Re-check N" to that same
   report. A full `/forge:review` again would spend a fan-out on points that are already named — its
   place is a new run, not a re-check.
   **Every round opens its own row in `## Timings`** — the fix and the re-check are two rows, opened
   when they start like any stage. This is where the table is lost in practice: the stages get their
   rows and then the rounds, which are most of the wall clock, get none.
5. `FAILED` items go into the next round. Past `REVIEW_FIX_ROUNDS` → STOP **with the reviewer still
   alive** — at `night` the autonomy table governs the limit and the reviewer stays alive just the same: its report has open items, and whatever the user decides, closing them needs the agent that
   wrote them.
6. No open items left → kill it (see "Killing"). The next run, if there is one, gets a new one;
   freshness is the whole reason there are runs.

## Stage 6 — manual test and its fix loop

The tester runs `/forge:manual-test`, which ends with `passed`, `failed` or `blocked`.

**It stops first at `PLAN`, before a single fixture exists, and waits for you.** That plan is a merge:
the tester builds one and the plan helpers build theirs blind, from the change rather than from the
tester's reading of it, and the plan carries a line per helper — what it added, or that it added
nothing, or that there were none and why.

**With `spawn.test_planner_model` set, the plan and the run are two teammates.** Spawn
`fg-test-planner-N` first; it runs `/forge:manual-test <task> plan-only [helpers=N]` and sends `PLAN`
with `{task folder}/test-plan.md`. Approve it exactly as below — added axes go back to the planner,
which updates the file and sends `PLAN` again. Once approved and its `DONE` is in, shut the planner
down, then spawn `fg-tester-N` with that path in the prompt: it runs `plan=<path>` and sends no `PLAN`,
so the letter for the review pass, if you want one, goes into this spawn prompt. The file is the plan
for every later entry into stage 6 as well, and the planner is not raised again while the change
stands; `--from manual-test` over a change that moved after the approval — new commits beyond this
stage's fixes, an edited spec — raises it again to rewrite the file. The exchanges with the planner
count toward stage 6's `X`, and its span is part of stage 6's row in `## Timings`, with the wait for
your approval marked as waiting.

Read it for what it still does **not** cover: a claim of the change with no scenario against it, an
axis crossed in one direction only, data that cannot come out negative — a sweep over every account
proves nothing while the second account is empty. Widening costs one message here and a whole round
after the fixtures are built. Answer with the axes you want added, not with "be thorough".

**Stage 6 runs without the review pass unless it is asked for** — `--review-test` on this call, or
`defaults.test_review` in the project config, by the priority the limits table already sets. Asked for,
`/forge:review-test` derives from the spec and the diff what the run was obliged to prove,
independently of what it chose to check, reproduces a sample while the stand is still up, and its
must-close set is closed by running it — that is the bare flag; `r` has the findings only offered.
The value in force goes into `auto.md` whichever it is: a run that went without the pass and a run
where nobody considered it read the same afterwards.

What carries the independent work by default is earlier and cheaper. The plan helpers derive the
obligations blind, from the change rather than from the tester's reading of it, before a fixture
exists; your reading of the report then closes the stage. Neither replaces a pass that sees the
finished report and can reproduce what it claims — so `helpers=0` **and** no pass together leave stage
6 with no independent derivation at all. That combination is nobody's default: turn one of the two
back on, or write in `auto.md` why this change does not need either.

**The pass can be asked for mid-run, and the window is one message wide.** It is your answer to
`PLAN` — the only point where the tester is listening rather than running, and still early enough that
the stand the pass needs has not been raised yet, let alone torn down. Say it there and the tester
runs `/forge:review-test` itself before the cleanup; the role file holds how. With a test planner the
`PLAN` is the planner's and the tester never listens at all, so the window is the tester's spawn
prompt instead. Record the change in `auto.md` like any other.

Asked for after that, the answer is **`/forge:review-test <task key> r` by slash, over the report as
it stands** — the skill takes an older report deliberately, raises what it can and says in its own
file what it could not reproduce. The letter is `r` because its findings come to you as a list to
sort, the way a review finding is sorted: the fixtures that would close them by running are gone.
What it is not is `--from manual-test`: that re-enters stage 6, the tester calls
`/forge:manual-test` again, and the skill writes its report from the template — the checklist, the
uncrossed axes and every round already appended are gone, which is the opposite of what someone
asking for a second opinion on that report wanted.

- **`failed`** → sort each defect by size, by the same line as stage 5: a small fix goes straight to
  the implementer, with `manual-test.md` named as the source it runs `/forge:fix` over and the defects
  it is to take pointed at the way that file allows — the checklist number of the scenario, or the
  opening words of the entry in `## Problems found`, which is not numbered; a large one is not fixed
  inside the loop — finish the rest, then one STOP question
  with the same three options, under the level exactly as at stage 5. After `FIXED` the tester
  re-tests the failed cases plus a short smoke, appending "Re-test N" to `manual-test.md`. Past
  `TEST_FIX_ROUNDS` → STOP, and at `night` the autonomy table governs it.
- **`blocked`** → read the reason before you touch anything: an obligation left unproven is not the
  same failure as a stand that would not come up, and only the second one is cleared from here. The
  environment case: read `hooks.manual-test` for how this project raises it, start what is missing,
  check the port and the credentials, and send the tester back in. Still blocked → STOP with the
  concrete reason. The **unproven obligation** case is not a STOP and not an environment problem: the
  stand did what it was asked, and what is missing is a scenario. Send the tester back to run it and
  append a `## Plan round N` — and where the report also carries defects in `## Problems found`, that
  round runs alongside the ordinary fix round, not instead of it. `blocked` means the check never ran, and a run
  that ends "green" on a check that never ran is the one outcome that cannot be told from a good one.

A stage 6 that is entered again — after `blocked`, or after fixes — does not rebuild the plan from
scratch: the change has not moved, so the helpers are not dispatched a second time and the approved
plan stands. Tell the tester that in the prompt, or it will run the whole step again. With a
`manual-test.md` already there, that holds under a test planner too: the tester appends its round to
the report rather than running `plan=` again, which would write the report from the template.

**The last thing in stage 6 is yours: the report is read against the plan you approved.** It happens
to whatever report is about to send the run to stage 7 — a first run, a re-test that turned the status
green, a fresh run after you cleared a `blocked` — and it happens with the review pass and, which is
the default, without it. Read the file whole, appended rounds included: a re-test runs the failed
cases and a smoke, never the plan again, so the results are spread across its sections.

The two sides come from two places. The plan and the axes the approval added are in `auto.md`, where
the `PLAN` exchange was written down — or in `test-plan.md` when a test planner wrote it; the criteria are in the DoD of `spec.md`, quoted there as they
were received. One of them missing — a run continued from a session that never recorded the plan, a
task with no spec — → read the side you have and say in the line which side was not there. What could
not be read here does not quietly become what was checked.

Four questions, every one of them answered by reading:

- every scenario of the plan, and every axis the approval added, came back with a result — and where
  the plan sized the data, **the evidence file says so, not the report's sentence about it**. Open
  the files the Evidence column names and read them against the sizes in the plan. A file named and
  not there, or there and showing something else, is the same finding as a scenario that never ran;
  a line that owed one and says instead why there was nothing to save is a normal answer. Those files
  are the last thing a claim about the data can be checked against once the stand is down: "checked
  on three records" and "checked on two" are the same sentence after the records are gone.
- every clause of every acceptance criterion is answered — or named unchecked, or named as a clause
  the spec breaks by a decision of its own.
- nothing the report itself leaves unproven is standing under `passed`: a clause named unchecked, a
  `◐` carrying what stayed open, a scenario the report calls degenerate. The exception is the one
  `/forge:manual-test` allows — an obligation the plan you approved parked. Unparked, that report is
  `blocked` by the skill's own rule, and this is the last place anyone checks it.
- `test-review-{n}.md`, where the pass ran at all — including a run of this task that had it on while
  this one does not, so read its buckets by the value **it** was written under, not by the value in
  force now. Closed by running (`ra`) means the result is in the report, not an edit to the report's
  text. Offered (`r`), or left open by a run that died, means nobody owns them: sort them here the way
  you sort a review finding — run it, or reject it on a fact, into `auto.md` either way.

The reading goes into `auto.md` under `## Plan conformance` — that heading, in English, whatever
`language` the prose under it is written in. One line when the two documents line up, the mismatch
named when they do not, and the round it produced with its outcome. `/forge:distill` reads this as raw
material and finds it by that heading; a stray line in the right language is a line nobody distils.

**A gap in the text is one message; a gap in the run is one round.** The text case is narrow — the
evidence file exists and the line never named it, a result the report recorded and the section never
picked up. Anything that needs the data back is the round: the stand came down with the report, so
the message names the scenarios, the data each needs, that the stand has to come back up, and that
this is not a re-test after fixes — there are no failed cases to repeat and no fix to check, which is
the only round the role knows by itself. Results land under "Plan round N" — its own heading, so the fix
rounds stay countable — and the round ends the way any run does, with the stand down and `## Cleanup`
covering what it created.

**That round is its own, and there is one of it.** It does not spend `TEST_FIX_ROUNDS` — no defect was
found and no fix is being checked, and the cheapest round in the stage should not be queueing behind
the dearest. A second mismatch after it is a STOP: twice is no longer an oversight in the report. At
`night` it is closed the way that level's own section spells out — parked in writing, never under a
`passed`.
Until the round comes back the run does not move to stage 7, whatever `status:` still says — that
field is the tester's to rewrite.

**Then, separately, a note on where the coverage still looks thin** — not a finding and not a round.
You approved this plan, so where it fell short is the thing you are worst placed to see, and naming
it is a hand-off rather than a check. It goes into `auto.md` and into the run summary, next to what
is already there as worth looking at by eye. Without `--review-test` — the default — it is the only
note of its kind anyone writes, which is what running without the pass costs rather than a reason to
lean on this one.

That asymmetry is why the four questions are mechanical. Deriving the obligations of the change a
second time is not work you can do — you read the plan and agreed with it, so asking yourself where
it fell short is asking yourself to catch your own miss; that derivation is `/forge:review-test`'s,
from a context that never saw the plan. "Approved → run" needs no fresh eyes at all and costs
minutes.

## Escalation and autonomy

**STOP** — you stop and wait for the user: any limit reached · approved behaviour or a public contract
changes · migrations, security, data integrity · a departure from the architectural decision of the
spec · a large finding or defect (stages 5 and 6) · a second mismatch between the test report and the
plan you approved · a `blocked` manual test you could not clear · an
ambiguity you cannot resolve from the artifacts · a failure that needs a different approach · an error
on the final commit.

**Format:** stage → what happened → 2–3 options → your recommendation.

"Stop" as the answer to any STOP → kill the teammates, leave `auto.md` and `state.md` as they are; the
next `/forge:auto` continues from there.

**Everything else you decide yourself, and every such decision goes into `auto.md`.** Inside this flow
these criteria are the agreed border of autonomy — they are what a rule about not deciding on your own
means here.

### `--autonomy` moves that border

`ask` — the level when neither the flag nor `defaults.autonomy` names one; the list above holds as
written. `mid` — bare `--autonomy`. `high` and `night` — spelled out.

| Criterion | `mid` | `high` | `night` |
|---|---|---|---|
| a large finding or defect (5 and 6), large by its spread alone · an ambiguity · a failure that needs another approach | yours | yours | yours |
| approved behaviour or a public contract changes · a departure from the spec's architecture · a broken premise | STOP | yours | yours |
| any limit reached · migrations, security, data integrity · a second mismatch with the approved plan | STOP | STOP | yours |
| a `blocked` test you could not clear · an error on the final commit · the push/merge question · no report and no diff at stage 5 · a role that went silent twice | STOP | STOP | STOP |

**A fork that fits more than one row takes the strictest of them** — a large finding that needs a
migration is the third row, not the first. Two things sit outside the table altogether: the entry
checks of steps 1–9, whose STOP questions stand at every level, and the forks *inside* a stage skill,
which keep closing by `defaults.decision_mode` as they always did. The level governs your STOP list,
not theirs — and it does not turn the brainstorm into a monologue.

**A decision is earned, not declared.** Settle it on something checkable and go and check: the ticket,
the project docs, the design in Figma, the code itself, the artifacts of this task. Nothing to land it
on → it is a STOP after all, at `mid` and `high` alike; at `night` see the round below. A broken
premise at `high` and `night` is resolved by re-running stage 3 over the whole spec, never by editing
`spec.md` yourself — that border does not move.

Each such fork is written into `auto.md` **as it is taken**: the fork and where it came up, the options,
the choice, what was checked and what it said. The same list goes into the run summary and into its
short version in chat, so the user reviews afterwards what they were not asked at the time. At `night`
that record is `## Night decisions`, in the shape that level asks for.

### `night` — the run nobody is watching

The level for a cycle started in the evening and read in the morning. What stays a STOP is the last row
of the table — what no decision of yours can move. Everything else is yours, and what makes that safe
to leave alone is the push/merge question sitting in that row: nothing is pushed and nothing is merged,
so a night's decisions live on a local branch and a local stand, and every one of them is reviewable in
the morning.

**The level is entered at stage 4 or later.** Stages 1 to 3 need the user, and not because of your STOP
list: `/forge:task` asks about the work tree and the parent, `/forge:brainstorming` may not write a
design nobody approved, and `/forge:make-extended-spec` hands an undecided question back rather than
answering it for the user — that one holds whatever `decision_mode` says, and Borders below is why it is
not yours to answer instead. So a night run is launched on a task whose `spec.md` is written and
reviewed. The entry point works out lower than stage 4 → say so and ask before the round: the evening
still has time for a spec, the night does not.

**Two more things the level does not move.** `defaults.decision_mode` keeps governing the forks inside
the stage skills, so read the key before the round and, where it is not `autonomous`, name in the round
which of stages 4–6 can still come back to the user and ask whether to run anyway. And the plan gate of
`--inline` stays a question to the user, because a plan approved by whoever wrote it is not approved —
`night` with `--inline` or with `--gate` is a question of its own, as Parsing says, not a guess at
which of the two was meant.

#### The pre-flight round

`night` opens with **a blocking question round after entry step 4 and before the spawns of step 9** —
the last question of the ordinary route, and the thing every night decision is landed on afterwards.
Every fork of the last row stays a question after it. It may take several calls in a row, with
nothing of the route running between them, and the block below is written before the first stage
starts. It cannot sit after step 9: the answers reach the roles through their spawn prompts, and
`TEST_REVIEW` and `helpers=N` are asked for here.

Read `spec.md` and its DoD, `decisions.md`, and the commits already on the branch, and work out which
forks of the rows above this task can actually reach — the claim is made from the artifacts, not from
optimism: a change map that touches a table can reach the migration fork. **Every item of rows 2 and 3
is either answered or named as one this task cannot reach, item by item**; row 1 is answered as a
standing order, an ambiguity being the one thing that cannot be foreseen by name.

Ask at least about: a migration — whether one may be created and applied to the local stand, and the
restore point it needs · a change in the access or permission model, and anything else touching data
integrity or security · a change of approved behaviour or of a public contract · a departure from the
architecture of the spec, and a broken premise, whose night resolution is the whole of stage 3 re-run ·
a limit reached — the one extension below, or the open items carried into the summary · the standing
order for a large finding or defect, among "fixed here", "a task of its own" and "rejected" · the width
of the test plan and what counts as data that could have come out negative · the `TEST_REVIEW` value
and the helper count where the config sets neither · the tests at the final commit, which
`/forge:commit` asks about when it cannot tell they were run · and, in the user's own words, what they
want the run to stop and wait for anyway.

**What counts as an answer.** A pre-authorization names something concrete — a table, a file, a limit,
a bar, a command. "Act as you see fit" is recorded as **no** pre-authorization for that fork, and the
unlanded branch below is what then applies: an answer that authorizes everything authorizes nothing
checkable, and it is the one answer that would quietly empty this whole section.

The questions and the answers go into `auto.md` under `## Pre-authorizations` — that heading, in
English, prose in the config `language`, one entry per fork with the answer or the reason it cannot be
reached. **A continued night run reads that block instead of asking again**, and asks only about the
forks it added; a run continued at a different level leaves it alone as history.

**No answer at all** — the round went out and the user had already gone → the run does not start. Say
that in one line and leave the round in `auto.md`; the next `/forge:auto` continues from there. Running
on anyway is how a night of unlanded decisions happens on purpose.

#### The forks that need more than a decision

- **A migration is applied by you, before the tester is spawned** — the roles cannot do it:
  `/forge:manual-test` keeps migrations behind a blocking question and carries out no hook that asks
  otherwise, and an implementer only runs the tests of its own target. This is the same environment
  work the `blocked` case of stage 6 already has you do, and it happens only when the pre-authorization
  named **a restore point**: the dump command and its path. That dump is what the entry's "way back"
  holds — prose is not a restore point — and without one the fork is unauthorized and the obligation is
  parked. The tester's prompt says what was already done to the stand, so it does not ask again.
- **A broken premise re-runs stage 3, and that rewrites `spec.md` whole.** Recoverable only from the
  commit holding the old text: name that commit in the entry, together with the commits already made
  against it. No commit holds it yet — the premise broke at `SPEC_APPROVED`, before the first
  `--step` — → copy it to `spec-superseded-{n}.md` in the task folder first. That copy is the one file
  besides `auto.md` this level lets you write, and Borders names it.
- **A limit extends once**, and once only: past that the open items go into the summary and the route
  moves on. The rounds were what kept the run finite, and a night with no ceiling spends itself inside
  one fix loop.
- **A second mismatch with the approved plan** is closed by parking the obligation in writing: the
  status of the report and the summary both name it unproven. No `passed` stands over it — you approved
  that plan and you read the report, so at night there is nobody left to catch it.

A large finding or defect takes the standing order of the round. Where that order is "a task of its
own", the task is opened only after the user answers the tail — see Finish.

#### `## Night decisions`

Every fork closed at `night` that would be a STOP at `ask` gets an entry in `auto.md` under that
heading — in English, prose in the config `language` — **written as it is taken**, holding: the fork
and the stage it came up in · the options · the choice · the fact from the code or the artifacts it
rests on · the pre-authorization it used, quoted, or that there was none · and the way back where the
choice is not a line of code: the dump for a migration, the commit to revert, the superseded file.
**This is the record the autonomy section asks for, not a second copy of it** — a night fork is written
here and nowhere else.

A divergence or deviation you sorted as mechanical — at `SPEC_APPROVED`, or among the deviations of the
implementation report — carries one line here as well, saying why it is mechanical. Sorting downward is
the cheap way to reach morning with nothing to report, and that line is what makes the sorting
checkable.

Nothing to land a decision on and no pre-authorization covering it → **take the reversible option**:
one that is restorable without the user's data and without a push. No such option exists → it is a STOP
after all, at `night` too. Take one, and the entry says it is unlanded — those open the section, the run
summary and its short version in chat, because an unlanded decision is what the morning reads before
anything else.

A night run that closed no such fork says so in the section, rather than leaving the section out: a run
where nothing came up and a run where nobody wrote it down read the same afterwards.

## Solo mode (`--inline`)

The route, the artifacts, the limits and the STOP criteria — at whatever level `--autonomy` set them —
are unchanged; only the performer is. The
lead runs stages 4, 5 and 6 personally: `/forge:implement-extended-spec`, then `/forge:review` and
`/forge:fix` over its report, then `/forge:manual-test` and `/forge:fix` over that one.

**Both halves of a fix round are the lead's, the second one included.** A round is fix → re-check, and
the re-check belongs to a role that is not spawned here, so the lead does it: read the diff of the
fixes and append "Re-check N" to that same `review-{i}.md`; re-run the failed cases plus a short smoke
and append "Re-test N" to `manual-test.md`, rewriting `status:` to `passed` when it is green. Calling
`/forge:manual-test` again instead rewrites the report and loses the history, and a `status:` left at
`failed` reads as a failed cycle forever after — entry step 3 believes that field. This is the one
exception to Borders below: under `--inline` the lead appends those sections to the two reports.

**Teammates are exactly three: `fg-implementer`, `fg-reviewer`, `fg-tester`**, plus `fg-test-planner`
where the project turned it on. Solo there is no planner either: the lead writes the plan itself. The
subagents that the
skills raise on their own — the clean reviewer inside `/forge:review-spec`, the axes inside
`/forge:review`, the plan helpers inside `/forge:manual-test` — are not teammates. They keep working
exactly as they do outside this mode, and they are what remains of an outside view on the lead's own
code. In solo the helpers matter most: the lead is otherwise both the author of the test plan and
its approver. Reading `--inline` as "no subagents at all"
leaves the spec and the code with no external check while the flow formally completes.

`X` does not apply in solo mode — there is nobody to exchange messages with; those stages run to
completion. The round limits stay in force. Signals are not used. In `auto.md` the teammate block
reads `inline`.

**One gate does not collapse into the lead: the test plan.** With a tester it goes up as `PLAN`;
solo, the lead is both author and approver, so it goes **to the user** as a blocking question
instead. A plan approved by whoever wrote it is not approved, and this is the one place in the flow
where that shortcut would erase the check rather than merely speed it up. Asked for, the review pass
runs here exactly as it does with a tester — its reviewer is a subagent, and subagents keep working in
solo. So does the reading that closes the stage: the plan the user answered goes into `auto.md` the
way a tester's does, and it is read against the report the same way. What that catches solo is drift
between the approved plan and the run that happened; a plan that was too narrow it cannot catch, which
is why `--review-test` buys more here than it does with a tester, not less. The letter, if it is asked
for at all, is asked for in that same blocking question — after it the stand is up and then gone, and
solo has no `PLAN` to reopen.

A mismatch is the lead's own round, run the way the role file spells it out: raise the stand, take the
before-snapshot, run the scenarios the plan asked for, save their evidence, append "Plan round N" to
`manual-test.md`, then tear down and extend `## Cleanup`. Writing that section — and completing a
checklist line out of evidence that already exists — is part of the same Borders exception as
"Re-check N" and "Re-test N": in solo the lead writes what the absent role would have written, and
nothing beyond it.

**The user may ask for a role mid-flow** ("spawn a reviewer", "let the tester run it") — then spawn
exactly that role for exactly that stage; the rest of the run stays solo.

## Step gate (`--gate`)

Before every transition, stop and ask, in the config `language`: the stage just finished (what was
done, the artifact path) → the next stage (what will happen) → whether to move on. "Yes" moves on;
"no" waits; a correction is applied inside the current stage and the gate is shown again.

**The seams are the six between the numbered stages** — 1→2, 2→3, 3→4, 4→5, 5→6, 6→7. Entering the
route on a continued run is not one of them, and neither is the boundary between two review runs: both
are places where the work simply carries on.

It stacks with STOP — those criteria hold with or without the flag — and it composes with `--inline`.
Deciding *inside* a stage is unchanged — rounds run as usual and the `--autonomy` level applies as it
does everywhere else; the gate sits on the seam.

## Spawning teammates

`subagent_type`: `forge:fg-implementer`, `forge:fg-reviewer`, `forge:fg-tester`,
`forge:fg-test-planner`. The exact identifier
differs after an install → take it from the available agent list rather than guessing.

**Pass a `name`** — the role plus its run number (`fg-reviewer-2`). These roles are re-addressed for
rounds and re-checks, and the name is also what gives the user a window of their own to watch them
in. The one-shot agents the stage skills raise inside themselves stay nameless
(`../../reference/subagents.md`).

**Spawn without a `model` argument**, unless the project config asks otherwise. The implementer and
the tester carry a pin in their own agent file, and so does the test planner (`opus`); the reviewer
deliberately carries none and takes the harness default. Two things override that, in this order:

- `--full-opus` — every teammate spawns with `model: "opus"`, re-spawns included, whatever the config
  says.
- `spawn.<role>_model` in the project config — `spawn.implementer_model`, `spawn.reviewer_model`,
  `spawn.tester_model`, `spawn.test_planner_model`. The last one is also what turns the planner on at
  all: without it there is no planner, and the tester writes its own plan. The role spawns with `model:` set to that value, re-spawns included. The
  agent files are global, so this key is the only way to move one role's model in one project
  without moving it in every project that runs forge. A missing key is a full answer: spawn that
  role with no `model` argument — or, for the planner, do not spawn it.

  The value is an **alias** — `opus`, `sonnet`, `haiku`, `fable` — and nothing else: the spawn
  parameter is an enum, and a full model id (`claude-opus-4-8[1m]`) is rejected before the agent
  starts. A specific model version therefore cannot be pinned for one role this way. A key holding
  anything but an alias → say so and spawn with no `model` argument rather than failing the spawn. For
  `spawn.test_planner_model` the role stays on: the key is there, only its value is wrong, and the
  planner then runs on its own pin.

**A spawn prompt has to carry** (the teammate has no history): the role and the work of this stage;
the task key; the **absolute** path to the task folder and to the artifacts it must read; the branch
and the parent; the limits that apply; the current stage and round **as `auto.md` records them**; the
expected first signal. **The implementer needs no gate commands in its prompt**: both skills it runs
— `/forge:implement-extended-spec` and `/forge:fix` — read `commands` from the config themselves, and
each assembles its own test run out of the diff rather than out of a command you resolved for it.
Restating either flow in the prompt is how a resolved full-suite command gets back in.
For the tester, add the **`TEST_REVIEW` value as the flag it passes on whenever it asks for the pass
— `a` goes out as the `ra` it means — and `TEST_PLAN_HELPERS` as `helpers=N` when the project set
it**. The role forwards what the prompt carried and nothing else: a flag asked for and left out of the
prompt is a review pass that never happens, and `TEST_PLAN_HELPERS` left out silently discards the
project's number in favour of the skill's own. With a test planner, `helpers=N` goes to the planner
instead, and the tester's prompt carries the approved `test-plan.md` path. `off` sends no flag — that is what the skill does with
no flag anyway. At `night`, the prompt also carries **the pre-authorizations that bear on that role's
work, quoted** — the width the plan was approved to, the standing order for a large defect, what was
already done to the stand — because a role that never saw them asks the user instead, and at night that
question waits till morning. With a test planner, the plan's width and the reading of the goal go into
its prompt, the rest into the tester's.

A relative path — a config value, a path from this file — opens nothing on their side: resolve it
yourself first (`../../reference/config-lookup.md`, "a path that goes into a subagent prompt"); a
subagent that cannot open what it was pointed at works from memory and says nothing about it.

For the implementer, the prompt also states that before the first edit it walks the change map against
the live code and reports the divergences as one list — its role file holds what that means and what
counts as a premise rather than a detail.

**Messages between you are signals**: `READY | SPEC_APPROVED | PLAN | DONE | FIXED | FAILED | QUESTION`, in
the shape `<SIGNAL>: <one line>; file: <path>`. The content lives in files; the two exceptions have no
artifact of their own and are written into `auto.md` by you — the divergence list at `SPEC_APPROVED`,
and the test plan at `PLAN`, together with what you told the tester to add to it — with a test planner,
the approval and the added axes next to the path of `test-plan.md`, which holds the plan itself. A teammate may open
with `READY` to acknowledge the spawn — it costs no exchange and needs no answer.

**Re-address a live teammate by its name** — that is what "the same reviewer"
means in stage 5, and a second spawn of the same role is a different agent with none of the context.
Killing is stopping that agent's task through the harness, not a message asking it to stop.

**A teammate that does not answer one request for a status report is dead** → re-spawn the same role
once, and disregard the first one if it later speaks. Before that spawn, redo entry step 6 — `git log
<base>..HEAD` and the files on disk — and put what is already built into the prompt, together with the
stage and round from `auto.md`. `state.md` cannot supply them: it names the last **finished** stage, so
a teammate that died mid-stage would be sent back to the stage before its own work. **A role that goes
silent a second time is a STOP at every level**, `night` included: the work of that stage belongs to it
by Borders, and a lead doing it instead is the failure the roles exist to prevent.

**Killing:** a reviewer lives exactly as long as its report has open items, and is killed the moment
none are left — a clean re-check, the user's answer at a STOP that closes them, or, at a level where
that fork is yours, your own decision closing them. That applies to
every reviewer, the last one included; none is kept "in case". The implementer and the tester stay
alive after stage 7 — the user may still want to talk to them — and are killed only on "stop" at a
STOP, or when asked.

## Finish

1. Write the summary into `auto.md` **first**: what was built; deviations from the spec (from the
   implementation report); what the review found, fixed and rejected, with reasons; the test result;
   the rounds spent; decisions taken without escalation; **the three longest measured rows of
   `## Timings`, by name, which report breaks each of them down, and how many rows went unmeasured**;
   what is left and worth looking at by eye.
   Standalone `/forge:commit` commits the artifacts of `.forge/` along with the code, so a summary
   written after it is the one part of the run that never reaches the commit — and the next
   `/forge:task` will not notice the leftover either, since it excludes `.forge/` from its clean check.
2. `/forge:commit` standalone. The push and merge question is that skill's own, asked of the user — do
   not answer it for them and do not pre-empt it.
3. **Open the tasks that were deferred.** Every large finding sent to "a task of its own" — by the
   user, or by you under `--autonomy` — is opened now, after the commit, with one `/forge:task` per
   finding, its text taken from the report it came from. That is what makes the deferral a decision
   rather than a line in a summary nobody acts on. The deferred list is in the summary as well.
   **At `night` this step waits for the user's answer to the push/merge question** — `/forge:task` cuts
   and checks out a branch, so opening one while the tail is unanswered moves HEAD out from under a run
   that is not finished. Until then the deferred list stands in the summary as the work it is.
4. A short version of the summary in chat, with the paths, the forks you settled without asking, and
   one line naming which teammates are still alive and that they can be killed on request.

## Done when

A run has two honest endings, and only the first one is "done": **the route is finished**, or **the run
is standing at a named STOP**. A stage that did not happen makes the second one, never the first.

- Stages 4, 5 and 6 each ran as a real invocation of their skill. None of them is yours to skip — a
  cheaper reading of this list is what turns a cycle into a report about a cycle.
- Every seam the route crossed was crossed **inside one turn**: no turn ended in prose while the
  next stage was ready to start. A run found idling at a seam, with no STOP question standing, did
  not pause — it stopped, and nobody asked it to.
- The route was entered where the artifacts actually pointed: the last stage's outcome was read, not
  just its `ready`.
- Every `must-fix` finding of every review run is fixed, or rejected with a fact from the code written
  down in `auto.md`.
- Every fork the autonomy level let you settle instead of asking is in `auto.md` and in the summary,
  with the choice and the fact it rests on. A run under `--autonomy` that reports no forks at all is
  claiming none came up — say that, rather than leaving the section out.
- Under `night`: the run was entered at stage 4 or later; `## Pre-authorizations` in `auto.md` answers
  every item of rows 2 and 3 of the table or names it unreachable, with row 1 as a standing order; and
  `## Night decisions` carries an entry per fork actually closed — the fact it rests on, the
  pre-authorization it used, quoted, or that it had none, and the way back where the choice is not a line
  of code. That section is the whole record of those forks, not a copy of one kept elsewhere, and
  unlanded decisions open it and the summary.
- The manual test ended `passed`. `failed` or `blocked` means the run is at a STOP, not finished.
- That green report was read against the approved plan before stage 7, and the reading is in
  `auto.md`: the plan's scenarios and axes came back with results, the evidence files back the sizes
  the plan asked for, every clause of every criterion is answered, and nothing the report leaves
  unproven stands under `passed`. Either side of the comparison missing is written down, not passed
  over in silence.
- `auto.md` names the `TEST_REVIEW` value this run went with, and — when it went without the pass
  **and** without plan helpers — why this change needed neither. A run that skipped both and said
  nothing reads afterwards exactly like a run where nobody thought about it.
- `auto.md` holds the counters, the limits with their sources, and one log line per counter-moving
  event — review run, fix round, re-check, test round, STOP, night decision, stage transition — so a run
  continued after `/clear` reads its rounds from there and does not restart them.
- The live log has a `run` row for this invocation, a `stage` row per stage and a `round` row per
  round that ran. Closed, each of them — except where the run stopped at a STOP or a stage died, and
  then the open row is deliberate. Or `defaults.progress` is `off`.
- `## Timings` has a row for every stage and every round that ran in this session, each stamped by a
  real `date -Is` call at both ends with the raw strings in the note, rows that waited for the user
  marked as such, and the summary names the three longest measured ones — or `defaults.timings` is
  `off` and there is no section.
- The run summary is in `auto.md`, written **before** the final commit: it is what tells the next
  `/forge:auto` that this cycle is finished.
- `state.md` was written only by the stage skills; nothing else was added to it.
- Nothing was pushed or merged outside the question `/forge:commit` asks.

## Borders

This skill calls skills, spawns the roles, and writes one file: `auto.md` — plus the `run`,
`stage` and `round` rows of the live log, which is a view and not an artifact. It writes no spec, no
review and no report of its own — those belong to the stage skills, and a document edited here stops
being the one that was reviewed. With teammates it writes no code either; under `--inline` it runs
stages 4–6 itself through the same skills, and appends the "Re-check N" / "Re-test N" / "Plan round N"
sections that the
absent roles would have written. At `night` two more things are the lead's, both named in that section:
bringing the stand to the state the test needs, and copying a spec about to be rewritten to
`spec-superseded-{n}.md` when no commit holds it yet. Anything a stage skill refuses to do is not done
here instead.
