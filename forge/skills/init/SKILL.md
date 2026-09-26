---
name: init
disable-model-invocation: true
description: Set up .forge/ in the project root — config, convention frame, checks file, proposals register and tasks folder. The --separate flag makes the folder private.
argument-hint: "[--separate]"
---

# Set up the `.forge/` folder

Create the folder that every other `forge` skill reads: one config, one frame, one register, one
place for task artifacts.

Config lookup for all `forge` skills: `../../reference/config-lookup.md`. This skill is the only
one that may create the config; the others ask when it is missing.

## Modes

| Mode | What you do | What the user gets |
|---|---|---|
| default (no flag) | create `.forge/` as a plain folder in the work-tree root | the folder belongs to the project repo: it shows up in `git status`, it is committed with the code, and it arrives in every new worktree by itself |
| `--separate` | plus: add `.forge/` to the main clone's `.git/info/exclude`, then `git init` inside `.forge` | the folder is private: it never enters the project repo. Its own repo holds the history. The user adds the remote by hand |

In `--separate`, when a config repo already exists, `git clone <remote> .forge` replaces `git init` —
but only into a folder that is missing or empty, which is what `clone` accepts. A folder that already
holds files (the mode switch below) gets `git init` plus `git remote add`, and the user supplies the
remote.

Append the exclude line only when it is not there yet — `grep -q '^\.forge/$' .git/info/exclude` — so
a second run with `--separate` leaves one line and not two.

The path to the main clone's `.git` is the one from step 2 of the config-lookup reference. Read it
there; a second copy of that command in this file would drift from the first one.

## Steps

### 1. Look before you write

Find the work-tree root: `git rev-parse --show-toplevel`. No git repo → say so and stop; the whole
set is built on the repo root.

**Are you in a linked worktree?** Compare that root with the main clone root (step 2 of the
config-lookup reference). They differ → this is a linked worktree, and the folder does not belong
here:

- `--separate`: create `.forge/` in the **main clone**, and say where you put it. The lookup only
  walks worktree → main clone, so a private folder created inside a worktree is invisible from the
  main clone and from every sibling worktree — while the exclude line, which is shared by all of
  them, hides it everywhere. The two halves of the setup would sit in different places.
- default mode: ask first. The folder is tracked by the project repo, so creating it here puts all of
  `.forge/` on this worktree's branch; in the main clone it lands on the branch checked out there.

Folder already there? Then this is a re-run. Keep every file that exists — you add what is missing
and nothing else. With `--separate` on a folder that is currently plain, switch the mode: add the
exclude line, run `git init` inside, and keep all content in place.

### 2. Read the project, do not ask for what you can see

Derive the config values yourself. Read what the project already carries:

| Value | Where to look |
|---|---|
| `commands.backend_tests` | `composer.json` scripts, `phpunit.xml*`, `pest.php`, `Makefile` targets, `vendor/bin/*` runners |
| `commands.frontend_tests` | `package.json` scripts, vitest/jest config files |
| `commands.static` | `phpstan.neon*`, `psalm.xml`, `tsconfig.json`, a `typecheck` script |
| `commands.lint` | `pint.json`, `.php-cs-fixer*`, eslint config, a `lint` script |
| `workdir` | the folder those files sit in, when it is not the repo root |
| `language` | the language of the last ~50 subjects in `git log` |
| `branch.naming` | the shape of existing branch names (`git branch -a`), written as free text with one example |
| `branch.parents` | long-lived branches in the repo (`develop`, `main`, release branches) and which task prefixes point at them |

A project that runs commands inside a container needs the container prefix inside the command
string — the value has to work when pasted into a shell as it stands.

Found nothing for a key → the key is left out. A key with a guessed value looks like a working
setting: someone edits it later and waits for an effect that never comes.

### 3. Agree the whole config, then write it

Show the **complete** draft in chat, key by key, each with the source of its value
(`composer.json:scripts.test`, `git log`, "proposal, nothing found"). The user takes each key,
edits it, or drops it. Keys the user drops do not reach the file.

Write nothing before that answer. This file is read on every call of every skill in the set, so a
key that got in "just in case" costs attention every time.

### 4. Create the files

```
.forge/
  config.yml       the agreed keys only, with the comments that explain them
  rules.md         stub: "Empty. Written by /forge:frame-new or /forge:frame-existing."
  arch.md          stub: "Empty. Written by /forge:frame-new or /forge:frame-existing."
  checks.md        stub: working mechanical checks only
  proposals.md     stub with four sections (see below)
  tasks/           empty
  .gitignore       two lines: `tasks/*/progress.tsv` and `run/`
```

The `.gitignore` closes the live progress log from commits — it is a runtime view rewritten on every
step, not an artifact, and in the default mode this folder is committed with the code
(`../../reference/progress.md`). `--separate` is covered by the same file: there the folder has a
repository of its own, and it commits artifacts just the same.

`proposals.md` starts with the four sections that `/forge:distill` and `/forge:frame-existing` expect,
each empty: **Working proposals**, **Rejected — do not bring back without a new reason**,
**Dropped on age**, **Candidates for the team file**.

An empty `rules.md` / `arch.md` is the normal state until `/forge:frame-new` or `/forge:frame-existing`
runs. It is not a
blocker for anything.

### 5. Report

One line with the folder path, the mode, and what is worth running next: `/forge:frame-existing` to
fill the frame from the code, or — when the project has no code yet — `/forge:frame-new
<architecture document>` to fill it from the plan; then `/forge:task` to open the first task. In `--separate`, add the reminder that the
remote of the `.forge` repo is still missing.

## Config shape

Every key is optional and every key has a default, so a short file is a healthy file.

```yaml
# Project config for the forge skills.   <- write the comments in the config `language`

workdir: <folder, or key absent>

branch:
  naming: >
    <free text: how branches are named here, with one example>
  parents:
    <PREFIX->: <parent branch>
    default: ask

conventions:
  rules: .forge/rules.md
  arch:  .forge/arch.md
  references: <folder of reference cards, e.g. .claude/rules/forge>
  language: <language code of the frame>
  external:
    - <path to a frame document owned by someone else>

commands:
  backend_tests:  "<command>"
  frontend_tests: "<command>"
  static:         "<command>"
  lint:           "<command>"

hooks:
  manual-test: >
    <free instruction for that skill>

paths:
  tasks:     .forge/tasks
  checks:    .forge/checks.md
  proposals: .forge/proposals.md

defaults:
  decision_mode: recommend_and_ask
  candidate_ttl_tasks: 10
  autonomy: <ask | mid | high>
  spec_review_passes: <number>
  code_review_runs: <number>
  review_fix_rounds: <number>
  test_fix_rounds: <number>
  test_review: <ra | r | off>
  test_plan_helpers: <number>
  style_review: <on | off>
  timings: <on | off>
  progress: <on | off>

language: <language code>
```

| Key | What it sets | Default when the key is absent |
|---|---|---|
| `workdir` | folder the `commands` run from | work-tree root |
| `branch.naming` | branch name rule, free text; overrides the rule inside `/forge:task` | the rule inside the skill |
| `branch.parents` | parent branch per task-key prefix; `default: ask` means a STOP question | STOP question about the base |
| `conventions.rules`, `conventions.arch` | where `/forge:frame-existing` writes the frame and where the rest read it | `.forge/rules.md`, `.forge/arch.md` |
| `conventions.references` | folder of reference cards (`../../reference/frame-format.md`); agreed by `/forge:frame-new` or `/forge:frame-existing` when the first card is written | no cards |
| `conventions.language` | language of the frame — `rules.md`, `arch.md`, cards. Set it apart from `language` when the frame should cost fewer tokens than the artifacts: it is read on every call | `language` |
| `conventions.external` | frame documents owned by someone else: read only | no external sources |
| `commands` | what the gates run | the skill asks at the first gate |
| `hooks.<skill>` | free instruction for one skill, read before it starts | no hook |
| `paths.tasks`, `paths.checks`, `paths.proposals` | task folders, working checks, proposal register | `.forge/tasks`, `.forge/checks.md`, `.forge/proposals.md` |
| `defaults.decision_mode` | `autonomous` / `recommend_and_ask` / `ask_each_time` | `recommend_and_ask` |
| `defaults.candidate_ttl_tasks` | how many tasks a candidate may sit without a repeat | 10 |
| `defaults.autonomy` | which forks `/forge:auto` closes without asking — `ask` / `mid` / `high`. The unattended `night` is asked for per run, not set here: it carries a question round of its own, and the forks inside the stage skills keep closing by `defaults.decision_mode`, which is the key that decides whether an unattended run gets that far | `ask` |
| `defaults.spec_review_passes` | passes of the spec review `/forge:auto` asks `/forge:make-extended-spec` for | the default inside `/forge:make-extended-spec` |
| `defaults.code_review_runs` | review runs `/forge:auto` makes at the review stage | the default named in `/forge:auto` |
| `defaults.review_fix_rounds` | fix → re-check rounds inside one review run | the default named in `/forge:auto` |
| `defaults.test_fix_rounds` | defect → fix → re-test rounds at the manual-test stage | the default named in `/forge:auto` |
| `defaults.test_review` | the review pass over the test report — `ra` closes its findings by running them, `r` only offers, `off` skips it | the default named in `/forge:auto` |
| `defaults.test_plan_helpers` | subagents that build a test plan blind and are merged into the tester's; `0` turns them off | the default inside `/forge:manual-test` |
| `defaults.style_review` | `on` adds a reviewer whose only subject is consistency with the code already in the project — an axis in `/forge:review`, a second reviewer in `/forge:review-spec`. Read by those two skills themselves, so it works on a slash call as well. Its findings never outrank a real bug: `Medium` at the most, never must-fix | `off` |
| `defaults.progress` | live progress rows for the monitor and the status line (`../../reference/progress.md`) | on |
| `defaults.timings` | `off` stops the whole set from measuring time — no `date` calls, no `## Timings` blocks, no spans in the `state.md` log. See `reference/timings.md` | `on` |
| `language` | language of artifacts and commit messages | project language from `git log` |

The seven `defaults` keys of the cycle are read by `/forge:auto` alone, and only when the project wants
other values than the ones that skill names. A project that never runs the cycle end to end has no
use for them: leave them out.

One key that is still asked for and still does not exist:

- **A commit-cadence key** — the consumer is written, and the job already has a home:
  `hooks.implement-extended-spec` (`"one commit at the end"`, `"do not commit, leave the tree
  dirty"`). A second place to set one thing means two places to look when they disagree.

## Done when

- The folder exists with all seven entries above, and every file the user already had is untouched.
- Every key in `config.yml` was shown with its source and accepted by name; the file holds no key
  that was not accepted, and no key with an empty value.
- Every command in `commands` was checked for **existence, not for a green run**: its runner
  resolves (`command -v <bin>`, or the file is there — `ls vendor/bin/<bin>`), and a command that
  calls a project script has that script in `composer.json` / `package.json`. Nothing was executed:
  a command pasted as it stands can start the whole test suite against a dev database, and setting
  up a folder is not the moment for that.
- The folder sits in the main clone root — or, in default mode, in the linked worktree the user chose
  out loud.
- With `--separate`: `git status` in the project repo does not list `.forge/`, `.forge/.git` exists,
  and `.git/info/exclude` holds exactly one `.forge/` line.
- The report names the folder, the mode and the next step.

## Borders

Only files inside `.forge/` and — in `--separate` — the one line in `.git/info/exclude`. No project
file is edited, no package is installed, no commit is made here: the artifacts of the first task
are committed by `/forge:commit`.
