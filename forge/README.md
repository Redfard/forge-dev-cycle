# `forge` — development cycle

A set of skills that takes a task from a branch to a commit: design, spec, code, review, live test.
Call them as `/forge:<skill>`. Each skill also works on its own, by slash command; `/forge:auto` runs
the whole chain.

**This file is a map of the set.** What exists, who calls whom, what comes out. Rules, order of
actions and criteria live in the skills themselves; a line of the map that starts to explain *how*
to do something has drifted and must be cut — in a month it will contradict the skill, and nobody
will know which one is right.

## Install

```
/plugin marketplace add Redfard/forge-dev-cycle
/plugin install forge@forge-dev-cycle
```

Then, once per project, run `/forge:init`. Paths in this file are from the plugin folder `forge/`.

## The chain

```
   /forge:init            once per project: .forge/, config, frame
   /forge:frame-new       frame of a new project, before there is code — from an architecture document  → /forge:review-frame
   /forge:frame-existing  frame of a project with code: rules.md + arch.md + cards; and updates to it  → /forge:review-frame
           ↓
┌── stages 1–7 are run by /forge:auto (with a flag — by a team of three roles) ──────
│  roles:  [lead] the lead itself · [imp] fg-implementer · [rev] fg-reviewer · [tst] fg-tester · [pln] fg-test-planner (by config key)
│
│ [lead] 1  /forge:task                     branch + task folder + state.md
│ [lead] 2  /forge:brainstorming            dialogue → decisions.md
│ [lead] 3  /forge:make-extended-spec ra N  spec → /forge:review-spec  → spec.md, spec-review-{n}.md
│ [imp]  4  /forge:implement-extended-spec  code from the spec → /forge:commit --step per task
│ [rev]  5  /forge:review                   2–5 axes by subagents → review-{i}.md (default 2 review runs, up to 3 fix rounds in each)
│ [tst]  6  /forge:manual-test              plan → run → manual-test.md + evidence; with a flag /forge:review-test
│ [lead] 7  /forge:commit                   commit, artifacts, question about push/merge
│
│  fix rounds (5f, 6f):  [rev]/[tst] find → [imp] fixes through /forge:fix → fixes-{n}.md
│                        → the same [rev]/[tst] re-checks
└───────────────────────────────────────────────────────────────────────────────────
           ↓
   /forge:distill         task artifacts → proposals.md → checks.md
```

There is no step-by-step plan between the spec and the code, and this is on purpose: the spec fixes
"what" and the structure of the change at the level of signatures, and the lines are worked out from
the live code at implementation time — a plan made of lines goes out of date before anyone finishes
reading it.

Details of the chain are in `/forge:auto`: the route table, the entry point when continuing, the
round limits and the stop criteria.

## Skills

**Review letters mean the same thing everywhere:** `r` — findings are shown, the caller decides;
`ra` or `a` — what is found is applied at once; a number, default one — how many passes in a row,
each on the updated result. Order does not matter: `ra 2`, `2 ra`, `r2` are the same.

### Project frame — set up by a person, once

| Skill | What it does | Flags | Who calls it |
|---|---|---|---|
| `init` | Sets up `.forge/`: config, frame, checks file, proposals register, tasks folder | `--separate` — the folder is not tracked by the project repository but gets its own: cycle artifacts do not go into code commits | slash command, once per project |
| `frame-new` | Lays down the frame before there is code: splits the architecture document (and, with a flag, feature documents) into `rules.md`, `arch.md`, reference cards and planned checks; offers to import the frame into `CLAUDE.md`. Once, into an empty frame | `--domain <files>` — map of the product's modules on the layers<br>`r` / `ra` / `a` + number — frame review by the `review-frame` skill | slash command, once per project |
| `frame-existing` | Writes and updates the frame of a project with code: `rules.md` — what it must do, `arch.md` — how the system is built, reference cards — what a component looks like | `--with-context` — adds a context document for a specific area<br>`r` / `ra` / `a` + number — frame review by the `review-frame` skill | slash command |
| `review-frame` | Frame review by a clean subagent: checks `rules.md`, `arch.md`, the cards and the config against the code, and while there is no code — against the source document. Report in `reviews/frame-{n}.md` | `r` / `ra` / `a` + number<br>`--source <documents>` — what the `decided` lines were taken from | `frame-existing` and `frame-new` by flags, or by slash command |

### Task stages 1–7 — from `auto` or one by one by slash command

| Skill | What it does | Flags | Who calls it |
|---|---|---|---|
| `task` | Opens a task: folder, `state.md`, branch from the parent branch | — | slash command, `auto` |
| `brainstorming` | Idea → agreed design: a dialogue one question at a time, reading the code before and after the direction is chosen, a pass over the topic list. Output — `decisions.md` | — | slash command, `auto` |
| `make-extended-spec` | Extended spec in `spec.md` from a template of 12 sections | `r` / `ra` / `a` + number — spec review by the `review-spec` skill, N passes in a row | slash command, `auto` |
| `review-spec` | Spec review by clean subagents (the second one checks against the project style, by the key `defaults.style_review`), the caller weighs the findings. Report in `spec-review-{n}.md` | `r` / `ra` / `a` + number | the spec skill by flags, or by slash command |
| `implement-extended-spec` | Implementation from the spec: TDD, a commit per task, a report with deviations and a Prevention section | — | slash command, `auto` |
| `review` | Code review along 2–5 isolated axes, one of them checks against the spec, another one, by the key `defaults.style_review`, checks against the project style. Report in `review-{i}.md` | — free text can set a focus | slash command, `auto` |
| `manual-test` | Live test: scenarios come from the change's claims, the plan is built together with helpers and approved before the run (helpers can be turned off), report `manual-test.md` with a status | `helpers=N`, default 1 — subagents that build their own plan blind, in parallel; `0` turns them off, the reason is written into the plan<br>`plan-only` — only the plan, in `test-plan.md`, until approval; `plan=<path>` — run by an already approved plan<br>`r` — report review by the `review-test` skill, findings are shown<br>`ra` / `a` — the same, and what is found is closed **by running the missing scenarios** while the test environment is still up: a gap in a test report cannot be closed by editing text | slash command, `auto` |
| `review-test` | Review of the test report itself: a clean subagent works out from the spec and the diff what the run had to prove, and reproduces a sample of what was claimed. Report in `test-review-{n}.md` | `r` / `ra` / `a` + number | `manual-test` by flags, or by slash command |
| `fix` | A fix round over a ready list: review findings (by verdict) or manual test defects. The caller already narrows the list; the skill does not narrow it itself. Tests — only for what was touched, at the end of the round; a gate that turned red is fixed by running the failed tests, then the suite is rebuilt and runs again until green; commit through `commit --step`; report `fixes-{n}.md` and a `## Fixes {n}` section in the source | `--decide` — the skill closes `optional` items itself, rejected ones with a reason; without the flag it asks. In `auto` the flag comes from `--autonomy` (`mid` and higher) | slash command, `auto` through the implementer |
| `commit` | Commit in the project style, artifacts by folder mode, a tail with a question about push and merge | `--step` — a commit inside a running stage: no question about push and no change to `stage` | slash command; with `--step` — from implementation and fix rounds |

### Orchestration and learning lessons

| Skill | What it does | Flags | Who calls it |
|---|---|---|---|
| `auto` | A full run of the cycle by a team of three roles, continuing from the point where the cycle stands | `--inline` — no teammates, the lead does everything itself through the same skills<br>`--gate` — confirmation at every move between stages<br>`--autonomy [ask\|mid\|high\|night]`, without the flag `ask`, a bare flag is `mid`, the project value is `defaults.autonomy` (`night` only by flag) — which decisions the lead makes itself. On `mid` and `high`, limits, migrations, security and data integrity are still asked as questions; `night` — an unattended run: it starts at stage 4 (the spec is written and reviewed), opens with a pre-approval survey, and after that only these are still questions: a test environment that did not start, a commit error, push/merge, an empty diff at review, and a role that went silent twice; every night decision is written to `auto.md` under `## Night decisions`. Decisions inside the stage skills are still closed by `defaults.decision_mode` — without `autonomous` a night run gets stuck on them<br>`--review-test [ra\|a\|r\|off]`, without the flag there is no pass, a bare flag is `ra` — an independent review of the test report by the `review-test` skill; also turned on by the project's `defaults.test_review`; it can also be asked for along the way — in reply to the tester's plan, and with a planner — in the tester's prompt<br>`--full-opus` — all teammates on opus<br>`--from <stage>` — start from the named stage, not from where the artifacts point<br>`VARIABLE=value` — override a limit for the run: `X`, `SPEC_REVIEW_PASSES`, `REVIEW_COUNT`, `REVIEW_FIX_ROUNDS`, `TEST_FIX_ROUNDS`, `TEST_REVIEW`, `TEST_PLAN_HELPERS` | slash command; the model — when a task must be carried all the way to a commit or an opened task must be continued |
| `distill` | Task artifacts → `proposals.md` register; once confirmed — a line in `checks.md` | `--verify` — the candidate is checked on the code "before the fix": would the proposed check have fired or not | slash command |

Project values of the limits live in `defaults.*` of the config. A call argument beats the config, the
config beats the skill's default.

**Auto-invocation is off** for the skills only a person calls: `init`, `frame-new`, `frame-existing`,
`distill`. The others are called by name — from other skills and from `auto`; the calling boundary is
written in each one's description.

## Roles

`auto` works with a team of three teammates, a fourth one by a project key; the files are in `agents/`:

| Role | When it lives | What it does |
|---|---|---|
| `fg-implementer` | from implementation to the end of the run | checks the change map against the live code, implements, makes fixes after review and tests |
| `fg-reviewer` | fresh for each review run, while the report has open items | calls `review`, re-checks what was fixed in a "Re-check N" section |
| `fg-tester` | from the manual test | calls `manual-test`, stops at the plan (with a planner — follows the approved `test-plan.md` without stopping), re-tests in a "Re-test N" section |
| `fg-test-planner` | only with `spawn.test_planner_model`, from the start of the manual test to plan approval | calls `manual-test plan-only`, writes `test-plan.md`; the tester then follows it without its own stop at the plan |

## Subagents

The skills start them themselves, and they are **not teammates**: a subagent lives inside one call,
has no role of its own in `agents/`, and keeps working in solo mode — there it is the only outside
view that is left.

| Who is started | Which skill | Why |
|---|---|---|
| Review axes, 2–5 of them | `review` | Each looks from its own angle: correctness together with an architecture minimum, a fresh look, frontend (the diff touches the frontend and the frame has rules for it), check against the spec, check against the project style. The axes are different on purpose — five identical agents cost five times as much and find the same thing |
| Frame reviewer | `review-frame` | Checks `rules.md`, `arch.md` and the config against the code |
| Spec reviewer | `review-spec` | Reads the spec by a checklist, without knowing the author's intent |
| Style reviewer, by the key `defaults.style_review` | `review`, `review-spec` | Checks the change against how the project already does similar things: a finding must name a neighbour file |
| Test plan helpers, default 1 | `manual-test` | Build their own plan **blind**, in parallel with the tester, and are merged into the shared one |
| Test report reviewer | `review-test` | Works out from the spec and the diff what the run had to prove, and reproduces a sample of what was claimed |

What they all share is a **clean context**: a subagent gets neither the caller's reasoning, nor its
conclusions, nor what it chose not to check. This is why they exist: an agent that was shown someone
else's answer starts reviewing it instead of reaching its own.

The second shared thing — **a subagent's findings are not applied directly**. The caller re-checks
each one against the code and only then decides: the clean context gives completeness, the author's
check gives accuracy.

The prompts sit next to their skills as separate files — `spec-reviewer.md`, `style-reviewer.md`,
`frame-reviewer.md`, `plan-helper.md`, `test-reviewer.md`. `review` has no such file: there are
several axes and they differ, so the common prompt skeleton lives in the skill itself.

## What appears in a task

Everything is in `.forge/tasks/{KEY}-{slug}/`:

| File | Who writes it |
|---|---|
| `state.md` | recovery point after `/clear`: stage, artifacts, log. All stage skills write it |
| `context.md` | `task`, when the task statement is long |
| `decisions.md` | `brainstorming` |
| `spec.md`, `spec-review-{n}.md` | `make-extended-spec`, `review-spec` |
| `implementation-report.md` | `implement-extended-spec` — deviations and Prevention |
| `review-{i}.md` | `review`, plus the "Re-check N" and "Fixes {n}" sections |
| `test-plan.md` | `manual-test plan-only` — the manual test plan from the planner; the `approved:` line tells an approved plan from a draft |
| `manual-test.md` | `manual-test`, plus "Verification round N", "Re-test N", "Plan round N" and "Fixes {n}" |
| `fixes-{n}.md` | `fix` — one per fix round, numbered across the task: what was applied, what was rejected and why, what is still open |
| `evidence/` | `manual-test` — all run files except the report: `evidence-{scenario number}-{name}.{ext}` (output where the result depends on the amount of data; the number is from the plan, the checklist uses the same one), "before" snapshots, fixture id lists, screenshots |
| `test-review-{n}.md` | `review-test`, if a report review was asked for |
| `auto.md` | `auto` — counters, limits, decisions made without escalation, the report checked against the plan, the run result |
| `progress.tsv` | all skills through `bin/forge-progress` — the live run log. Not an artifact: covered by `.forge/.gitignore`, it does not go into commits |

## References

`reference/`, the skills link to it by relative path:

- `config-lookup.md` — how `.forge/config.yml` is found and what a missing key means;
- `frame-format.md` — the frame format: language, markers (`decided` and others), reference cards;
- `subagents.md` — how to start a one-off subagent: without `name` and `isolation`;
- `state-file.md` — the `state.md` format and update rules: who touches `stage`, and who only the log;
- `correctness-checklist.md` — the correctness checklist for a review axis;
- `progress.md` — live progress lines: one `bin/forge-progress` call per checkpoint, the task log
  in its folder (`progress.tsv`), milestones in `.forge/run/index.tsv`. `auto` writes the run, stages
  and rounds; each skill writes steps from its own list (the lists are collected in the reference
  itself, and it is the authority). Two more writers are session hooks, not skills: `bin/forge-waiting`
  sets and clears the "waiting for input" mark, `bin/forge-command` writes long commands to
  `.forge/run/commands.tsv`; the hooks are set up by the monitor README.
  Two readers read these lines: `monitor/` — a browser page with the history by runs, stages and steps,
  for several projects at once (set up by `bin/forge-monitor`, everything machine-specific is outside
  the plugin, in `~/.config/forge-monitor`; it has its own README with the port and the tunnel), and
  `bin/progress-line` — a segment of the terminal status line, how to plug it in is described in the
  reference. Turned off by the key `defaults.progress: off`;
- `timings.md` — how time is measured: the stamp comes from `date -Is`, the raw string goes into the
  note, waiting for a person is marked separately. What a **stage** cost — the `## Timings` table in
  `auto.md` (this is the main number); what it was made of — the `## Timings` block in the skill's
  report (`implement-extended-spec`, `review`, `manual-test`, `fix`); the span of the skill itself — in
  the `state.md` log line. Turned off by the key `defaults.timings: off`.

## Config and folder modes

`init` creates `.forge/config.yml`. All keys are optional: a missing key is a full answer, the skill
takes its default and asks nothing. What can be there — the table in `/forge:init`.

The `.forge/` folder lives in one of two modes:

- **default** — the project repository tracks it, task artifacts go into the same commits as the
  code;
- **`--separate`** — the folder is excluded from the project and has its own repository; artifacts
  are committed separately, code commits do not see them.

The mode sets how `commit` behaves and where the other skills look for the config.
