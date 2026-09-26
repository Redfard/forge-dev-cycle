---
name: task
description: Open a task: create a folder in .forge/tasks, create state.md and a work branch from the parent branch. Input — a key, a link or just a description. Runs when something names it — the user or forge:auto.
argument-hint: "<key | link | task description>"
---

# Open a task

Create the folder every later skill writes into, the `state.md` that lets any of them start from a
clean session, and the working branch.

Config lookup: `../../reference/config-lookup.md`. Read `hooks.task` from the config before you
start and follow it inside the borders below; no hook is a full answer.

## The input can be anything

A key, a link, a few sentences, or nothing at all. This skill knows nothing about any issue
tracker and expects no particular task shape. A tracker that the skill was taught by name lives
shorter than the skill does.

## Steps

**Progress:** `../../reference/progress.md`. Your steps are `key`, `open-check`, `description`,
`tree-check`, `branch`, `folder` — the call is `../../bin/forge-progress <task> step "<name>"`,
and each step is marked **Checkpoint:** in the text where it happens. The list here is the index
of them.

Run them in this order. Nothing outside `.forge/` changes until step 6, so every question that can
send the work down another road is asked while there is still nothing to undo.

### 1. Key

**Checkpoint:** `step "key"`.

A key looks like `ABC-123`: two or more **upper-case** letters, a hyphen, digits. Look for it in the
argument and inside a link.

Match what you found against the prefixes in `branch.parents`. A hit is the key, and no question is
needed. The shape fits but the prefix is unknown → show what you found and ask: is this a key, or a
piece of the description? Free text is full of that shape — `UTF-8`, `PHP-8`, `HTTP-500` — and a task
opened as `UTF-8` walks the user into a STOP question about the parent branch of a key that never
existed.

Nothing key-shaped, or the user says it is description: take the highest `NNN-*` folder in
`paths.tasks`, add one, pad to three digits.

### 2. Is this task already open?

**Checkpoint:** `step "open-check"`.

With a key: any folder matching `{KEY}-*` in `paths.tasks`. Without: the number from step 1 is free
by construction. Neither needs the slug, which is why this question comes before it.

A folder is there → **STOP question** with two ways out: continue from the stage in `state.md`, or
start over — rename the old folder to `{TASK}-archived-{n}` and create a fresh one. Ask it here,
before any branch exists: the answer decides whether there is a new branch to cut at all.

### 3. Task description

**Checkpoint:** `step "description"`.

- The input has a link and you have something that opens it → open it and take the content.
- Nothing to open it with, or no link → work with the text you were given.
- Nothing at all → one question to the user.

A short description goes into `title` in the `state.md` header. A long one goes into `context.md`,
and `state.md` points at it.

### 4. Folder name

With a key: `{KEY}-{slug}`. Without: `{NNN}-{slug}`. The slug is English kebab-case, 2–6 words, in
both cases — folder names in the project language are awkward to type and to grep. A task with no key
is recognised by its number, so two words are enough there.

The slug comes from the description, so it cannot be built before step 3.

### 5. Is the work tree clean — the precondition for step 6

**Checkpoint:** `step "tree-check"`.

`git status --porcelain`, **ignoring everything under the `.forge/` folder the lookup returned**.
Anything left → **STOP question**: commit, stash, or stay on this branch.

Ask it here, not after the branch exists. `git checkout -b` on a dirty tree usually succeeds and
carries the uncommitted edits onto the new branch, so the failure is silent: the task starts with
someone else's changes inside it and nothing said a word. That silent mix is what the question is
for.

**Why `.forge/` is excluded.** Nobody commits it before this point: `/forge:init` and
`/forge:frame-existing` deliberately end without a commit, so in the default mode the folder sits there
untracked, and the very first `/forge:task` of a project would meet a STOP question about the set's
own files. Worse, "stash" would sweep away the folder that was just created. The artifacts are not
the code this task is about, and `/forge:commit` is what decides their fate.

Uncommitted work under `.forge/` belongs to **another** task → say so in one line before you switch:
it travels to the new branch with everything else, and only its owner knows whether that matters.

### 6. Branch

**Checkpoint:** `step "branch"`.

Name: `branch.naming` from the config when that key is there. Otherwise the rule built in here:
`<a-few-words-about-the-task>-<number>`, and without the number for a task with no key.

Parent: `branch.parents` by the key prefix. Prefix not listed, or `default: ask` → **STOP question**
about the base. A right name on a wrong base is the failure that costs, and it is the base that
nobody notices.

**The branch already exists** — after "continue from the stage" in step 2, or left over from an
attempt that stopped halfway. Then switch to it instead of creating it, and check that the parent is
an ancestor of it (`git merge-base --is-ancestor <parent> <branch>`). It is not → ask the user;
picking either branch point on your own is the wrong call, because one of them silently changes what
the task will be diffed against.

New branch, and the repo has a remote: `git fetch origin <parent> && git checkout -b <branch>
origin/<parent>` — the fresh state of the parent, not the local copy. No remote → branch from the
local parent. The fetch fails, or the remote has no such branch → say so and ask: cut from the local
parent, or stop. A local parent is often behind, and a task that quietly starts on a stale base looks
healthy until the first merge.

### 7. Create the folder and write `state.md`

**Checkpoint:** `step "folder"`.

Take the template and the rules from `../../reference/state-file.md` — that file holds the shape
this file must have, because every other skill of the cycle reads and updates it after you. The Log
line it asks for carries a span — take the start stamp before you do anything else.

Fill in `task`, `title`, `branch`, `parent`, `base`, `stage: task`, `updated`, one log line about the
branch, and the artifacts table with the files the next steps will produce.

`base` is the full SHA of the commit the branch was cut from — `git rev-parse origin/<parent>` when
you cut from the remote, `git rev-parse <parent>` when you cut from the local branch, and
`git merge-base <parent> <branch>` for a branch that already existed. Record it now: every later step
compares against this commit, and by then the parent branch has moved and may be gone.

## Done when

- `paths.tasks/{folder}/state.md` exists, and its `branch` and `parent` match what `git branch
  --show-current` and the config say.
- The branch is checked out, and the parent is an ancestor of it — a fresh branch sits on the parent
  tip, an existing one carries its own commits on top.
- The folder name holds a key only when the prefix is one the project knows, or the user said it is a
  key. `UTF-8` and `HTTP-500` are descriptions.
- The task description is in `title`, or in `context.md` with `title` summarising it.
- Both STOP cases were settled **before** the branch was cut: the work tree was clean or the user
  chose what to do with it, and the folder was new or the user chose. A question asked after
  `git checkout -b` is a question that came too late.
- The steps of this skill are in the live log — `../../reference/progress.md` — or `defaults.progress` is `off`.

## Borders

This skill creates a folder, a file and a branch. It writes no spec, reads no code, and calls no
other skill. Finish with the path to `state.md`, the branch name, and `/forge:brainstorming` or
`/forge:make-extended-spec` as the next step.
