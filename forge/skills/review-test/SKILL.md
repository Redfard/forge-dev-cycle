---
name: review-test
description: Review of the manual test report in the forge cycle: a clean subagent works out from the spec and the diff what the run had to prove, reproduces a sample of what was claimed and looks for gaps; the author checks each finding, the report goes to test-review-{n}.md. Called from forge:manual-test with the flags r / ra / a.
argument-hint: "<task key | path to state.md | path to manual-test.md> [r | ra | a] [N]"
---

# Review the test report

A test report is the one artifact of the cycle that **certifies itself**: it says what was checked
and it is also the only record that it was. Nobody else was standing there. So the failure mode is
not a wrong answer — it is a green report about a check that could not have come out red.

This skill dispatches a clean reviewer to work out, from the spec and the diff alone, what the
change was obliged to prove — **independently of what the run chose to check** — then verifies every
finding yourself before acting. Both halves are required: the clean context finds what the runner did
not think of, your verification removes what the reviewer only imagined.

## When to use

- Right after a manual-test run, **while the environment and the fixtures are still up** — that is
  what `/forge:manual-test r` and `ra` do, and the only moment the data the report describes is still
  there to look at. Inside `/forge:auto` that run is asked for by `--review-test`; on a direct call,
  by the letter.
- On an older report, when the run has to be trusted and nobody remembers how thorough it was. Then
  say in your report that reproduction was impossible, rather than letting a read-through pass for
  one.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.review-test` before you start and
follow it inside the borders below; no hook is a full answer.

**Zero context.** The input is a task key, a path to `state.md`, or a path to the report itself.
Nothing was passed → the newest folder in `paths.tasks` by modification time.

**What you read:** `manual-test.md` — the report under review — plus `spec.md` and the diff, which
are what the obligations are derived from. No report → say so and stop; there is nothing to review,
and running the check instead is `/forge:manual-test`'s work. No `spec.md` → obligations come from
the diff and whatever acceptance criteria you can find, and the pass says in one line that half its
source was missing.

**The frame.** `conventions.rules` and `conventions.arch` say what the project holds true; they are
part of what a finding is checked against and they go to the reviewer as absolute paths.

**The environment.** How this project raises it lives in `hooks.manual-test`, not in your own hook —
read that key too and pass what it says on. Reproduction is the half of this pass that reading the
text cannot replace.

**Where the report goes.** `{task folder}/test-review-{n}.md`, one file per pass, `n` the next free
number. **You are a step, not a stage:** leave `stage` in `state.md` alone, add your file to the
`Artifacts` table, write one log line — `../../reference/state-file.md` says why.

**Progress:** `../../reference/progress.md`. Your steps are `reviewer`, `verification` — the call
is `../../bin/forge-progress <task> step "<name>"`, and each step is marked **Checkpoint:** in the
text where it happens. The list here is the index of them.

## Borders

- **The product is not touched** — no code, no config, no migration, no seed.
- **The report under review is not edited.** Your findings go into your own file. Gaps are closed by
  running them, and the run belongs to whoever called you.
- **Reproducing a sample is expected, and it may create test data** to do it — under the same borders
  as the run itself: nothing on production or staging, no silent installs, no secrets printed, and
  what you create **in the system** you remove. The report's evidence files are not yours to delete —
  they outlive the run on purpose.
- Nothing goes outward: no PR comment, no ticket.

## Invocation — flags and pass count

A flag and an integer, in any order (`ra`, `r 2`, `a`, bare `2`):

- **`r`, or no flag** — review and **offer** the buckets; nothing is run to close them.
- **`ra`, or a bare `a`** — review, and the must-close set goes back to the caller as scenarios **to
  be run**. That is the only way to close a gap in a test report: editing the text closes nothing.
- **Integer N** (default `1`) — passes, each with a fresh reviewer against the current state of the
  report. Stop early when a pass finds nothing to close.

## Workflow

1. **Resolve the target** and read the report, the spec and the diff yourself. You need your own
   picture before a reviewer's findings land on it.

2. **Dispatch one clean reviewer subagent** (the harness's subagent tool, as `general-purpose`; one
   **Checkpoint:** `step "reviewer"`.
   fresh agent per pass, spawned the way `../../reference/subagents.md` says — no `name`, no
   `isolation`, and told it works alone). Paste the whole of `test-reviewer.md` and fill its five placeholders: the
   report, the spec, the **diff command**, the frame paths, and how to reach the environment — all as
   **absolute paths you resolved yourself**, never the relative values a config holds.

   **Never pass the runner's reasoning** — not why a scenario was chosen, not what the run decided
   was out of scope, not your own read of the report. That contamination is the whole point: the
   reviewer must derive the obligations from the spec and the diff, and a hint about what the run
   considered enough is exactly what stops it doing that.

3. **Reconcile — verify, do not relay.** Re-open the report and the system and check **every**
   **Checkpoint:** `step "verification"`.
   finding. Then bucket:
   - **Must close** — verified, and leaving it means the report claims more than it proved: a claim
     with no scenario, a scenario counted whose data could not have failed, a criterion clause
     quietly dropped, a ✓ whose evidence does not support it.
   - **Worth closing** — a real gap that does not make the report untrue: a thin axis, a boundary
     nobody tried. Tag each endorsed or advisory.
   - **Rejected** — with a fact from the report, the code, or a reproduction you ran.

   **You are usually the one whose run is under review, and every accepted finding costs you another
   round of fixtures.** That pressure is stronger than in a spec review and it comes out as "the data
   was fine, I saw it". A rejection resting on what you remember rather than on what you can show is
   the bias, not a judgement.

4. **Report** into `test-review-{n}.md`, grouped by bucket, findings sharing a root cause merged into
   one. Close with what the pass can and cannot claim: one reviewer guards precision, not recall.

5. **Hand back, by flag.** `r` — the buckets, and stop. `ra` — the must-close set as the scenarios of
   a verification round, for the caller to run **while the environment is still up**. You do not run
   them, and you do not call `/forge:manual-test` yourself: it writes its report from the template,
   and a second invocation would overwrite the round you are trying to complete.

6. **The status may move, and the caller moves it.** A must-close finding that turns out to be a real
   defect makes the run `failed`; an obligation left unproven makes it `blocked`. Say which, plainly,
   in your own report — `status:` in the other file is the caller's to rewrite, and `passed` left
   standing next to a finding that contradicts it is the failure this pass exists to prevent.

## When the reviewer does not come back

The ladder in `../review-spec/SKILL.md` applies here unchanged: ask once for whatever it has, say in
the open that the pass did not deliver, dispatch one replacement, and if that fails too, run the pass
yourself against the same checklist — labelled as having had no clean context.

## Done when

- Every finding was checked against the report and the system by you, not relayed.
- The buckets are in `test-review-{n}.md`, each rejection carrying its fact.
- `ra`: the must-close set went back as scenarios to run, and nothing was marked closed by editing
  text.
- The final message names the file, the counts by bucket, and whether the run's status has to move.

See `test-reviewer.md` for the checklist to hand the subagent.
- The steps of this skill are in the live log — `../../reference/progress.md` — or `defaults.progress` is `off`.
