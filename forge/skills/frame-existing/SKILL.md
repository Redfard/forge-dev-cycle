---
name: frame-existing
disable-model-invocation: true
description: Create or update the project frame — rules.md (what the project must do), arch.md (how the system is built) and reference cards — based on real files, commands and structure.
argument-hint: "[--with-context] [r|ra|a] [N] [what to update: rules | arch | refs | all]"
---

# Write the project frame

Three parts, and only these three:

- `conventions.rules` — **what the work must obey**. The review judges by it.
- `conventions.arch` — **how the system is built**. The spec places the change by it.
- the cards in `conventions.references` — **what one kind of component looks like**. The code is
  written from them. No key → the project has no cards, and this part is skipped.

All paths come from the config. Language, marks and the card format: `../../reference/frame-format.md`. Every other `forge` skill reads them before it works, so each line
here spends attention on every spec and every review that follows.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.frame-existing` before you start and
follow it inside the borders below; no hook is a full answer.

**No task, no `state.md`.** The frame is not a task artifact. This skill can run before the first
task exists, so it leaves `state.md` alone.

**Input.** The text next to the invocation, plus what you read in the project yourself. The earlier
conversation is not input — unless `--with-context` is passed (see below).

**A blocking question** means `AskUserQuestion`: ask, stop, wait. Do not carry on with a guess.

**Borders.** You write the three parts of the frame, and one section of `paths.proposals` (step 8). No code,
no packages, no configs, no other file.

**Progress:** `../../reference/progress.md`. Your steps are `read-project`, `scope-agreed`,
`rules`, `arch`, `cards`, `clean-reader` — the call is `../../bin/forge-progress <task> step "<name>"`, and
each step is marked **Checkpoint:** in the text where it happens. The list here is the index of
them. The task argument is `-`: this skill writes the frame, not a task.

## The ladder gate — apply it before any rule becomes text

Before a rule is written into `rules.md`, ask one question: **can one command catch this?** A grep,
a linter rule, a test, a setting in a tool that is already installed.

- **Yes** → it does not belong here. It goes to the register at `paths.proposals` as a candidate
  check, and `/forge:distill` takes it from there.
- **No** → it is a rule, and it belongs in `rules.md`.

Without this gate one run fills the frame with grep-able lines — `while`, `skip()/take()`, a
forgotten `dd(`. The file still looks fine, and the ladder quietly stops working: a rule in prose
fires only when the model happens to remember it, while a command fires every time.

## Steps

### 1. Read the project

**Checkpoint:** `step "read-project"`.

Work it out yourself: languages and frameworks, test framework, databases, infrastructure
(containers, CI), linters and static analysers **already installed**, the main branch, and the commit
style from `git log`.

The commit style is read for orientation only — it tells you how this project talks about its own
work. It does not become a section in `rules.md`: `/forge:commit` reads `git log` itself at the
moment it commits, and the frame is walked line by line by three skills on every spec and every
review. A rule needed by one skill on one call would spend everyone's attention.

### 2. Read what is already written

`conventions.rules`, `conventions.arch`, the cards in `conventions.references`, and every source in
`conventions.external`. Follow the
frame already fixed there unless the job is to change it, and remember what it holds — so the new
text neither repeats it nor contradicts it.

### 3. Agree what you touch

**Checkpoint:** `step "scope-agreed"`.

The invocation named the parts (`rules`, `arch`, `refs`, all) → use that list, no question. It named
nothing, or the wording fits two readings → blocking question.

For **each** part that already exists, its own blocking question: rewrite from scratch / extend /
leave as it is. Rewriting an existing document without asking is the failure this step exists to
prevent — the previous author's reasons are not in the file, and they are gone once it is
overwritten.

### 4. Plan `rules.md`, then write it

**Checkpoint:** `step "rules"`.

No fixed set of sections. First propose the rules this project actually needs, from what you read in
step 1 and from the user's input.

Lines marked `decided` that the code now shows get their source; lines the code went against are
not rewritten to match it — each one is a question to the user: the code is wrong, or the decision
changed.

Show the plan **before** writing: 5–12 rules or groups, what each one is for, and what is confirmed
by practice versus what is your proposal. Blocking question on that plan. Then write the document.

Choose the shape — sections, tables, lists, examples — to make the rules easy to read and apply, not
to fit a template.

The finished `rules.md` holds:

- a short line on what the document is for;
- rules tied to this project's stack, structure and commands;
- for every rule that matters, a plain-language sentence on why the project needs it;
- the check commands that really exist in the project;
- a separate block of proposals, when there are useful ideas that are not accepted or not set up yet.

### 5. Plan `arch.md`, then write it

**Checkpoint:** `step "arch"`.

No fixed architecture template. The document describes the actual shape of the project: modules,
borders, data flows, external dependencies, and the decisions that are visible in the code or came
from the user.

Show the plan **before** writing: 4–10 architecture blocks, why the reader needs each one, and for
each — confirmed by code / inferred from the structure / needs the user's confirmation. Blocking
question on that plan. Then write the document.

The finished `arch.md` holds:

- a simple statement of what the system does and where its borders are;
- the key parts, named in the vocabulary of the current stack;
- the dependencies between the parts that matter;
- the real commands, entry points and runtime components, where they exist;
- an explicit split of **confirmed by code / inferred / assumption** wherever certainty is short.

### 6. Write the cards

**Checkpoint:** `step "cards"`.

A card per kind of component the project repeats — only where several files of that kind already
exist and agree on a shape. The example is normalised from them: neutral names, no business detail,
`Status: confirmed — <path>`. A kind with one file, or files that disagree, gets no card yet; files
that disagree are a blocking question about which shape is the convention.

An existing `decided` card is checked against the files of its kind: they follow it → it becomes
`confirmed`; they do not → the same question as for a `decided` rule.

### 7. Marks that must survive into the files

Every rule and every block carries its mark, as `../../reference/frame-format.md` defines them. The
marks are the whole value of the split: without them the weakest line reads as strong as the
strongest.

### 8. Candidates for the team file

The project may have its own file of agent instructions, owned by the team. You do not touch it.

Instead, prepare the block of lines you would propose for it, show it in chat, **and write it into
the "Candidates for the team file" section of `paths.proposals`**. Chat alone is not enough: the
block is gone after a `/clear`.

Why the register and not `rules.md`: the rules are read on every spec and every review, and a
candidate that is not in force yet would spend that attention every time. The register is the home
for "proposed, not in force", and it is read by whoever sits down to go through proposals.

This is the only case where this skill writes to the register, and it writes only into that one
section. The rows of the register itself belong to `/forge:distill`.

### 9. Check what you just wrote — with a clean reader

**Checkpoint:** `step "clean-reader"`.

You wrote the frame, so you are the one person who cannot see what is wrong with it: a line you
verified an hour ago reads as verified, not as a claim. The check is `/forge:review-frame`, which
dispatches a subagent that knows nothing about your reasoning and walks every source the frame
cites.

The invocation may carry a flag and/or an integer, in any order (`ra`, `r 2`, `a3`, bare `2`):

- **`ra`, or a bare `a`** → run it and apply what it confirms — the must-fix items plus the optional
  fixes the review endorses — with no further go-ahead. Advisory and rejected items stay unapplied.
- **`r`** → run it and offer the fixes.
- **Integer N** (default `1`) → how many passes to run; a bare integer with no flag still runs N
  passes in offer mode.
- **Neither flag nor integer** → offer the run in the closing message, name what it costs (one
  subagent pass), and take the answer. Not run is a fine outcome; run without saying so is not.

Forward the same flag and the same count N to `/forge:review-frame`: it runs the pass loop itself,
writes `reviews/frame-{n}.md` per pass, and stops early once a pass finds nothing to apply.

The frame is not finished by being written. It is finished by being written and checked, and a
frame nobody checked is reported as exactly that.

### 10. Finish

A short message: which files were created or updated, the path to each, which proposals stayed
unaccepted or need a separate decision, whether the frame was checked by a clean reader and with
what result, and one line inviting the user to read the files and fix by hand whatever does not fit.

## The `--with-context` flag

Default: the earlier conversation is not input. With `--with-context`, material already loaded in
this session counts as input too — for example a project skill that carries architectural knowledge.

A rule that came from context gets the mark `from discussion`. It becomes `confirmed` only once you
have found it in the files. Otherwise the flag turns into a way to launder unchecked claims into the
frame, and the marks stop meaning anything.

## Input from `/forge:distill`

A register row with the status `accepted` that no command can catch arrives here as the text of a
rule: into `rules.md` when it is a requirement about how work is done, into `arch.md` when it is a
fact about how the system is built.

There is no traffic the other way: `/forge:distill` never writes these two files.

## Done when

- Every rule, block and card carries its mark as `../../reference/frame-format.md` defines it, and
  the frame is written in `conventions.language`.
- Every `decided` line the code now bears on was settled: it earned its source, or it went to the
  user as a question.
- No rule in `rules.md` is one that a single command could catch — those left for the register.
- Every rule and every block rests on something found in this project: a file, a command, a
  dependency, a directory. A line that would read the same in any repository does not belong.
- Each existing file was rewritten, extended or left alone by the user's answer, not by yours.
- A tool of a class the project already has was not proposed a second time.
- Proposals that the user did not accept stayed proposals, in their own block.
- The frame was checked by a clean reader, or the user was asked and declined — and the final
  message says which of the two happened.
- The final message names every file written and every proposal left open.
- The steps of this skill are in the live log — `../../reference/progress.md` — or `defaults.progress` is `off`.

## What this skill does not do

- It writes documents. Code, packages and configs stay untouched.
- Sections exist because the project needs them. A section that fits any project is noise, and it
  makes the useful lines around it cheaper to skip.
- "The document is old and messy, it will be cleaner to rewrite it" is the argument to distrust here.
  Old and messy is what an existing document looks like from outside; the reasons behind its lines
  are not in it. Ask — rewrite / extend / leave — and take the answer.
