# Progress

So that a run can be watched **while it is still going**. `timings.md` gives the numbers a finished
cycle is read by; this file gives the line you look at when the stage has been open for forty minutes
and nothing has printed since.

The two are the same stamps seen from two sides. A checkpoint written here is a `date` call that
`timings.md` was going to ask for anyway.

## One primitive, and never a raw `printf`

```
forge-progress <task> start <run|stage|round> "<name>" ["<extra>"]
forge-progress <task> end   <run|stage|round> "<name>" ["<extra>"]
forge-progress <task> step  "<name>" ["<extra>"]
forge-progress <task> note  "<text>"
```

`../bin/forge-progress` — resolved to an absolute path before the call, the way every other path
in these files is.

**The task is the first argument, always** — every skill of the set is called with its task and
therefore knows it; a helper that guesses "the newest folder" writes one task's steps into another's
file the day two are open. **The key, the folder name and the path to a `state.md` are all accepted
and all mean the same task**: the helper reduces them to the key and finds the folder itself. That
matters because the two ends of a stage know different things — the lead has the key, the stage skill
stands in the folder — and a log split between `ABC-123` and `ABC-123-add-login` is two tasks in the
viewer and steps without a stage in the status line. A skill that has no task — `/forge:init`,
`/forge:frame-new`, `/forge:frame-existing`, `/forge:distill` — passes `-`.

Ten skills write these lines, plus the two that live outside a task. The format lives in the helper so
that it lives in one place: a `printf` written out by hand in a SKILL.md is a second implementation,
and the two drift on the first column anyone adds.

**It never fails a run.** No `.forge/`, no config, no write permission, a broken clock — the helper
says one line on stderr and exits `0`. Monitoring that can break the thing it monitors is worse than
no monitoring.

## Where the lines go

| File | What is in it |
|---|---|
| `.forge/tasks/{KEY}-{slug}/progress.tsv` | every line of that task |
| `.forge/run/{KEY}.tsv` | its lines from before the folder existed — the opening steps of `/forge:task` |
| `.forge/run/_frame.tsv` | the lines of the skills that live outside a task |
| `.forge/run/index.tsv` | one line per milestone — `run` and `stage`, plus the first line of every task |

`paths.tasks` moves the first two, as it moves every other task artifact.

One file per task, next to `state.md` and `auto.md`: parallel teammates on different tasks never write
into the same file, and archiving a task takes its log with it. The index exists because a viewer
cannot list a directory it is served from — nginx and `http.server` render listings differently, and
neither is a format. It carries the folder name in `extra` as `dir=…`, since a page reaching the log
over HTTP cannot expand `{KEY}-*` itself. **The first line of a task goes there whatever its kind**:
a task driven by slash calls has no `run` and no `stage` at all, and without that line it would never
appear in the viewer.

Columns are `ts`, `task`, `kind`, `name`, `event`, `extra` — tab-separated, one line per event,
appended and never rewritten. A single `printf` under 4 KB to a file opened `O_APPEND` is atomic on
Linux, which is what makes parallel writers safe without a lock.

**It is a runtime log, not an artifact.** `.forge/.gitignore` holds `tasks/*/progress.tsv` and `run/`,
so `/forge:commit` never picks it up. The helper appends those lines itself if they are missing.

## `start` / `end`, and why steps have only one

**A stage or a round writes both.** Its two ends are the number, and the tail between one stage's end
and the next one's start is real — it is the seam the lead spends deciding what comes next.

**A step writes only `start`.** A step ends when the next step of the same task starts, or when the
stage around it ends. Steps are where the calls would pile up, and this halves them for a number
nobody reads off a step anyway.

The viewer pairs an `end` with the last unclosed `start` of the same `kind` and `name`. A row that
never got its `end` stays open — which is exactly how "what is happening right now" is drawn, and how
a stage that died shows as the stage that died.

**`note` is for what the timeline cannot show by itself**: why the run is standing still. A question
the user has not answered, a stand that would not come up, a limit that stopped a loop. One line, and
it closes the moment it is written — it marks a point, it does not measure a span. Nothing else
belongs in it: a `note` per paragraph turns the one signal that means "look here" into scrollback.

## What is a checkpoint

The same border `timings.md` draws: **not every paragraph.** A step is a named point that the skill
was going to reach anyway and that a person waiting would recognise — "the fan-out went out", "the
plan came back approved", "task 3 of 7 of the change map".

Reading files, thinking, drafting: not a step. They are what fills the gap between steps, and the gap
is visible as the difference.

**A checkpoint stamped after the fact is not written at all.** Three steps appearing in the same
second, at the end of the work, are three zero-length rows and one earlier row that swallowed their
time — the log then says the opposite of what happened. A step that was missed stays missed: say so in
the report if it matters, and leave the row out.

## The steps of each skill

The list is repeated in each skill, where the work is, and gathered here, where the whole set can be
compared. **Where the two disagree, this table is the authority** — one of them has to be, and a
denominator that each skill keeps for itself stops matching the day one of them grows a step.

The step names are English, as every other key of the set is. A skill appends free detail after a
colon — `fan-out: axis 2/4, frontend` — in the project `language`. The order is the order the steps
happen in, which is not always the order the skill's own sections are written in.

**In the skill, the call stands where the step happens**, on its own line, marked `**Checkpoint:**`.
The list at the top of the skill is the index of those marks, not the instruction — a list read once
at the start is a list forgotten by the third section, and unlike the report templates a missed
checkpoint leaves no hole anyone can see.

| Skill | Its steps |
|---|---|
| `/forge:task` | `key`, `open-check`, `description`, `tree-check`, `branch`, `folder` |
| `/forge:brainstorming` | `broad-read`, `dialogue`, `close-read`, `topic-scan`, `design`, `decisions` |
| `/forge:make-extended-spec` | `frame`, `draft`, `change-map`, `pre-mortem`, `review-pass`, `handover` |
| `/forge:review-spec` | `reviewer`, `verification` |
| `/forge:implement-extended-spec` | `spec-read`, `task N/M`, `tests`, `report` |
| `/forge:review` | `scope`, `checks`, `fan-out`, `synthesis`, `report` |
| `/forge:fix` | `source`, `group`, `apply`, `tests`, `report` |
| `/forge:manual-test` | `claims`, `plan-helpers`, `plan-approval`, `environment`, `api`, `frontend`, `report`, `review-pass`, `cleanup` |
| `/forge:review-test` | `reviewer`, `verification` |
| `/forge:commit` | `hygiene`, `commit`, `tail` — **standalone only** |
| `/forge:frame-new` | `read-inputs`, `split-agreed`, `rules`, `arch`, `cards`, `planned-checks`, `instructions`, `clean-reader` |
| `/forge:frame-existing` | `read-project`, `scope-agreed`, `rules`, `arch`, `cards`, `clean-reader` |
| `/forge:distill` | `collect`, `check`, `draft`, `register` |

**`/forge:commit --step` writes no steps at all.** It is called once per task of the change map and
once per round of fixes; three lines each would bury the log of the stage it sits inside, under a name
that repeats in three different skills. The commit is part of the step that made it.

`/forge:auto` writes no steps of its own: it writes the `run`, `stage` and `round` rows, which is the
level it stands at. What happens inside a stage is the stage skill's to report — the same split as
`timings.md`. The work the roles do **between** skills — a re-check of fixed findings, a re-test — is
covered by the lead's `round` rows, and by nothing else.

## Turning it off

`defaults.progress: off` in the config — no writes, no files, and the helper returns immediately.
Missing key means on. It is independent of `defaults.timings`: a project can want the live line and
not the tables, or the other way round.

## Reading it back

Two readers, both in this plugin:

**`monitor/`** — a page with the task list on the left and the task's history on the right, broken
down by run, stage and step, each with its share of the one above it. It watches **several projects at
once**: `bin/forge-monitor <path> [<path> …]` declares them, and everything machine-specific — the list,
the symlinks, the generated compose — lands in `$FORGE_MONITOR_HOME` (`~/.config/forge-monitor`),
never in this plugin, which is shared and travels to other machines where the projects are different.
`monitor/README.md` carries both ways to serve it, the port and the tunnel.

**`bin/progress-line`** — one line for the terminal's status line:

```
⚙ MBD-472 · 5 review · fan-out: axis 2/4 · 8m
```

```
progress-line [<cwd>]     # cwd defaults to the current folder
```

It prints the open stage and the step inside it. No stage is open — a skill called by slash, since
only `/forge:auto` opens stages — it prints the last step while it is fresh. Nothing is open and
nothing is fresh: it prints nothing, which is how a terminal in a project with no run going stays
quiet. Two thresholds, both env-overridable: `FORGE_STALE_HOURS` (default 3) for an open stage, after
which the run is taken for abandoned, and `FORGE_STEP_STALE_MIN` (default 45) for a lone step — long
enough to hold a brainstorm dialogue or a test plan waiting for its answer.

**`bin/forge-command`** — the fourth writer, also a hook rather than a skill. `PreToolUse` and
`PostToolUse` on `Bash` measure every command and write the ones that ran longer than two minutes
(`FORGE_CMD_MIN_SECONDS`) into `.forge/run/commands.tsv`, with the runner's own numbers pulled out of
the output — `Tests: 2546 passed`, `Duration: 486s`. It answers the question the steps cannot: the
longest stretches of a run are test suites and gates, not the model, and without these rows their
time silently attaches to whichever step was marked last. Written per project, not per task — a hook
knows the directory and not the key — and the page merges them into the timeline by time.

**`bin/forge-waiting`** — the third writer, and the only one that is not a skill:
the session's `Notification` hook marks that the run is waiting for a person, `UserPromptSubmit`
clears it, and the page shows a banner with the question. A hook knows the moment and cannot forget
it, which is why this one is not left to the model.

Wiring it in is one line of the harness's status-line command, which is the only machine-specific
piece of all this:

```bash
# ~/.claude/statusline-command.sh — cwd comes in the JSON on stdin
/path/to/plugin/forge/bin/progress-line "$cwd"
```

`monitor/README.md` carries the checklist for setting all of this up on another machine — the
projects, the serving, the status line and the hooks.

The stamps in `.forge/tasks/…/progress.tsv` are the same ones the `## Timings` table of `auto.md` is
built from, and reading a row off the log beats reconstructing it from memory. What the table *says* —
which rows carry `—`, what waiting is marked, whose number a runner's own is — is `timings.md`'s, and
the log does not decide it.
