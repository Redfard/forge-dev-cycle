---
name: commit
description: Commit in the forge cycle: commits the task changes and the .forge/ artifacts according to the folder mode. As a step — called from forge:implement-extended-spec for each task and from forge:fix for each fix round; on its own — at the end of the cycle, together with the question about push and merge.
argument-hint: "[--step] [<task key | path to state.md>]"
---

# Commit the work

This skill owns committing for the whole set. Nobody else writes a commit message, picks files, or
touches a hook: the implementation decides **when** a commit happens, and everything about **how** it
happens lives here.

## Two modes, and mixing them up breaks two things quietly

The mode comes from the invocation: **`--step` means this call sits inside a stage that is still
running** — one task of the implementation, or one round of `/forge:fix`, inside `/forge:auto` or by a
person's own slash call; without it the call is standalone, at the end of the cycle.

| | `--step` — called from inside a running stage | standalone — called by a person |
|---|---|---|
| Commits | the code of this one task | whatever is left, plus the task artifacts |
| The tail (push / merge / branch) | **not run** | run, as a question |
| `stage` in `state.md` | **untouched**, one log line only | set to `commit`, as usual |
| Artifacts under `.forge/` | left alone | committed by folder mode (below) |

Both exceptions exist for the same reason: on ten tasks, ten per-task calls would otherwise ask the
push question ten times in the middle of the work, and would leave `stage: commit` in `state.md`
while the implementation is still running — a `/clear` would then resume from the wrong step.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.commit` before you start — it carries
what the history cannot show — and follow it inside the borders below; no hook is a full answer.

**`state.md`** is updated as `../../reference/state-file.md` says, with the mode difference above.

**The task** comes from the argument, or from the newest folder in `paths.tasks` when nothing was
passed.

**Progress:** `../../reference/progress.md`. Your steps are `hygiene`, `commit`, `tail` — the call
is `../../bin/forge-progress <task> step "<name>"`, and each step is marked **Checkpoint:** in the
text where it happens. The list here is the index of them. **Standalone only.** Called with
`--step` this skill writes no steps at all — it runs once per task and once per round, and its
three lines would bury the log of the stage around it.

## The message style is worked out here, not stored anywhere

Read `git log` on this repository — a few dozen recent subjects — and follow what you find: the
language, the shape of the subject line, whether a task key is a prefix, whether the project uses
conventional commits, how bodies are used. The style is a fact about the repository, and a fact read
at the moment of work cannot go stale the way a copy of it in a config would.

`hooks.commit` overrides what the history does not show. Nothing goes into `rules.md`: three skills
read the frame line by line on every spec and every review, and a commit convention is needed by one
skill on one call — a line there would spend everyone's attention for one reader.

## Hygiene — the same on every project

**Checkpoint:** `step "hygiene"`.

- **One commit, one logical change.** A task from the change map is one commit; two unrelated fixes
  are two.
- **Files by name.** No `git add -A`, no `git add .`, no `git commit -a`. A sweeping add takes
  whatever else the tree happens to hold — a debug file, another task's edit, a half-written
  artifact — and nobody reads a diff they did not intend to make.
- **Never `--no-verify`, never `--amend`.** A hook that fails is a finding: fix the cause and make a
  new commit. Bypassing it hides the problem in a commit that looks clean, and amending rewrites a
  commit someone may already have.
- **Checks come before the commit, not after.** In `--step` mode the caller has just run them — the
  task's tests from the implementation, the tests of the round from `/forge:fix`. On a standalone call,
  when you cannot tell that anything was run since the last change, say so in one line and ask: run the
  gate commands from `commands` (out of `workdir`), or commit as is.
- **Files that look like secrets** — `.env`, `*.pem`, `credentials*`, key and token files — go in
  only after the user says so explicitly, named one by one.
- **No AI signature and no `Co-Authored-By` trailer.**
- **Push, merge, force-push and deleting a branch happen only on an explicit request**, and only in
  the tail below.

## Standalone call: any state of the tree is a valid entry

**Checkpoint:** `step "commit"`.

By the time this is called, the work is usually already in commits. All three states are normal:

1. **Something is uncommitted** — commit it by the rules above. Often these are the fixes that came
   out of review and manual testing.
2. **Everything is uncommitted** — the implementation may have been told not to commit
   (`hooks.implement-extended-spec` can say exactly that). Commit it, in logical pieces, not one
   lump, unless the cadence override asked for one commit.
3. **Nothing to commit** — that is not a reason to stop. The artifacts and the tail are still yours.

Leaving without work is only right when there is nothing to commit **and** the artifacts are already
committed. Then say in one line what is already done and which commit the branch stands on.

## The artifacts of `.forge/` — by folder mode

| Mode | What happens |
|---|---|
| default | the folder is tracked by the project repo, so the task artifacts go in **the same commit as the code**, added by name — they are part of the change, like documentation |
| `--separate` | nothing from `.forge/` can enter the project commit: the folder is excluded. The artifacts get **their own commit in the `.forge` repository**, right after the code commit, with no push |

The folder is excluded but `.forge/.git` does not exist → skip the artifact commit and say so in the
final message, in one line. Silence here reads as "the artifacts are committed" when they are not
stored anywhere at all.

In `--step` mode artifacts are left alone: mid-implementation they are half-written — the report does
not exist yet, and `state.md` still points at a step that is running.

## The tail — standalone only

**Checkpoint:** `step "tail"`.

After the commits, one question with three answers: **push / merge / nothing**.

- Push to the task branch — on a plain "yes".
- **Force-push, and any push to the parent branch** — only after the user confirms that specific
  action, named as it is. These two rewrite or move something other people build on.
- Merge — say what it will merge into what, and wait for the answer.
- Deleting the branch is not part of the tail. Ask for it separately, if at all.

## Done when

- Every commit holds one logical change, with files added by name, and no `--amend`, no
  `--no-verify`, no AI trailer.
- The message follows the style you actually read out of `git log` — say in one line what you read
  from it.
- `--step`: the tail did not run, `stage` in `state.md` is untouched, and a log line was added.
- Standalone: the artifacts were committed by folder mode, or the skip was stated in the final
  message; `stage` is `commit`.
- Nothing was pushed, merged or force-pushed without the user asking for that action by name.
- The final message names each commit made, and which commit the branch now stands on.
- The steps of this skill are in the live log — `../../reference/progress.md` — or `defaults.progress` is `off`.
