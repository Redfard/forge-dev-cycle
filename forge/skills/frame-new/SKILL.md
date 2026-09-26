---
name: frame-new
disable-model-invocation: true
description: Lay down the frame of a new project before there is any code — rules.md, arch.md, reference cards and planned checks from an input architecture document (and, if wanted, feature documents). Once, into an empty frame.
argument-hint: "<architecture document> [--domain <files>] [r|ra|a] [N]"
---

# Lay down the frame of a project that has no code yet

`/forge:frame-existing` describes a system that exists: every line rests on the code. A new project has
no code, only a document saying how it will be built. This skill turns that document into the frame
— `conventions.rules`, `conventions.arch`, the cards in `conventions.references` — so the first task
of the cycle is already specified, written and reviewed against it.

It runs **once, into an empty frame**. From then on the frame has one author, `/forge:frame-existing`,
and two authors writing the same file by different rules is how a frame starts to contradict itself.

The format of everything written here — language, marks, cards — is `../../reference/frame-format.md`.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. No config → stop and name `/forge:init`; this skill
does not create `.forge/`. Read `hooks.frame-new` before you start and follow it inside the borders
below.

**No task, no `state.md`.** The frame belongs to no task.

**Input.** The architecture document named in the invocation — required — and the documents after
`--domain`, which describe what the product does. Plus the project's own instruction files
(`AGENTS.md`, `CLAUDE.md`) and `README`, read so that the frame neither repeats them nor contradicts
them. The earlier conversation is not input.

**A blocking question** means `AskUserQuestion`: ask, stop, wait.

**Borders.** You write the three parts of the frame, two keys of `config.yml`, one section of
`paths.proposals` (step 6) and the lines in the instruction files the user accepts (step 7). No code,
no packages, no tool configs.

**Progress:** `../../reference/progress.md`. Your steps are `read-inputs`, `split-agreed`, `rules`,
`arch`, `cards`, `planned-checks`, `instructions`, `clean-reader` — the call is
`../../bin/forge-progress - step "<name>"`, marked **Checkpoint:** where each happens.

## Steps

### 1. Check that the frame is empty

`conventions.rules` and `conventions.arch` are absent or still the stubs `/forge:init` wrote, and the
folder `conventions.references` (when the key is set) holds no cards. Anything else → stop: the frame
has an author already, and the tool for changing it is `/forge:frame-existing`.

Look for application code too — source folders of the stack the document names, beyond what a
framework installer generates. Found some → blocking question: this skill writes the plan and marks
it `decided`, while code that already exists should be read, which is `/forge:frame-existing`.

### 2. Read the inputs

**Checkpoint:** `step "read-inputs"`.

Read every input document in full. Number its items as you go — every heading, every row of a
decision table, every rule in a list. That list is what step 3 has to account for.

### 3. Agree where each item goes

**Checkpoint:** `step "split-agreed"`.

Every item of the architecture document gets exactly one destination:

| Destination | What goes there |
|---|---|
| `arch.md` | how the system is built: layout, layers and which way calls go, the kinds of classes and their borders, cross-cutting decisions (transactions, errors, validation, auth, data, config) |
| `rules.md` | what work must obey and no command can catch: the criteria for putting code in the right place, the review-only rules, the decisions that change how code is written |
| a card | the shape of one kind of component, when the document shows it in code |
| planned check | a rule a command can catch — the ladder gate of `/forge:frame-existing` applies unchanged |
| left out | history of the document itself — where it was borrowed from, what was changed against the original, provenance marks. Name the reason per item |

Show the whole split in chat as one table — item number, the item in a few words, destination, why.
**Every numbered item from step 2 is in it**, left-out ones included; an item missing from the table
is an item silently dropped.

Collect in the same message every choice the document leaves open ("set per project", "level chosen
at start", two options with no pick) and every point where the document and the project's instruction
files disagree. `conventions.language` is not set yet → the frame's language joins the same round:
the frame is read on every call, so a language that costs fewer tokens than the project's `language`
is worth offering. Then one blocking question on the split and those choices. Nothing is written
before the answer.

With `--domain`: add the domain map to the same round — the product's parts (the modules, the
entry points: HTTP, console commands, scheduled jobs, queues, bots, external processes) placed on the
layers of the architecture. A part the domain documents mark as decided is `decided`; a placement
you worked out is `assumption` until the user confirms it.

### 4. Write `rules.md` and `arch.md`

**Checkpoint:** `step "rules"`, then `step "arch"`.

In `conventions.language`, plain and short (`../../reference/frame-format.md`). Accepted lines are
`decided`; lines the user left open stay in a separate `proposal` block.

- `rules.md`: one line on what the document is for; the rules, each with the risk it closes, how a
  reviewer checks it, and its mark; the commands that exist — none yet, so say that the planned checks
  live in `paths.proposals` until the skeleton installs them.
- `arch.md`: what the system does and where its borders are; the layout as a table *folder → layer →
  what it may call*; the kinds of classes; the cross-cutting decisions; the domain map when there is
  one. Every block marked.

The input document is not copied. Each line is rewritten to what a coding agent needs in order to act,
and a reason stays with a rule whenever the rule is one someone would argue with.

### 5. Write the cards

**Checkpoint:** `step "cards"`.

The key `conventions.references` is agreed in step 7, but the cards are written now: propose
`.claude/rules/forge/` — the folder Claude Code loads by `paths` on its own. One card per kind of
component the document shows in code, in the card format, `Status: decided`, `paths` taken from the
layout in `arch.md`.

A kind with no code in the document gets no card. Invented code is a guess dressed as a standard;
list those kinds in the report as cards to write once the skeleton exists.

### 6. Write the planned checks

**Checkpoint:** `step "planned-checks"`.

The rules a command can catch go to `paths.proposals`, into the section **Planned checks — accepted
up front, waiting for their tool** (create it when absent). They skip the register's threshold of two
sources on purpose: the user accepted them in step 3, and there are no tasks yet to repeat in.

One row each: the rule, the tool, the ready fragment (the test line, the config setting), and the
task that will install it — the skeleton. The rows of the other sections of the register belong to
`/forge:distill`; this section is written only here, and the task that installs a check removes its
row.

### 7. Config keys and instruction files

**Checkpoint:** `step "instructions"`.

One blocking question with the drafts in it:

- the keys for `config.yml`: `conventions.references` (the card folder from step 5) and
  `conventions.language` (the language agreed in step 3, when it differs from `language`);
- for `CLAUDE.md`: import lines `@.forge/rules.md` and `@.forge/arch.md`, with paths relative to
  `CLAUDE.md` — Claude Code loads imports at the start of every session, subagents included, so the
  frame is in context outside the cycle too;
- for `AGENTS.md`: one pointer line to the same two files, for harnesses that do not follow imports.

Accepted → write exactly the accepted lines. Declined → the drafts go to the section **Candidates for
the team file** of `paths.proposals`, so they survive a `/clear`.

### 8. Check with a clean reader

**Checkpoint:** `step "clean-reader"`.

`/forge:review-frame`, with the same flag and count rules as the clean-reader step of `/forge:frame-existing`, plus
`--source <input documents>`: with no code to check against, the reviewer checks that each `decided`
line says what its source says.

### 9. Report

Short: the files written, with paths; the items left out and the open `proposal` lines; the kinds
waiting for a card; the result of the clean reader, or that the user declined it.

Then the next step, as a task brief the user can hand to `/forge:task`: **the skeleton** — install
the framework and the tools of the planned checks, turn each planned row into a working test or
config and remove it from the register, build one feature end to end through every layer, add a
`PostToolUse` hook on `Edit|Write` that runs the architecture tests and exits `2` on failure, and
finish with `/forge:frame-existing` over the result: `decided` lines the code now shows become
`confirmed`, and the cards are checked against the real feature.

Last line: once the user accepts the frame, the input document has done its job — suggest moving it
to the project's archive, so the rules live in one place.

## Done when

- The split table named every item of the input document, and each item reached its destination or
  was left out with a reason.
- Every line written is marked as `../../reference/frame-format.md` says, and nothing was written
  before the user answered step 3.
- No card carries code the input document does not show.
- Every rule a command can catch is a row in the planned-checks section, not a line of `rules.md`.
- The instruction files hold only lines the user accepted; declined drafts are in the register.
- The clean reader ran, or the user declined it — the report says which.
- The steps are in the live log, or `defaults.progress` is `off`.
