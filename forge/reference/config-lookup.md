# Finding the project config

Every `forge` skill reads `.forge/config.yml` before it starts. That file is the only place where
project settings live. The steps are the same for every skill.

## Steps

1. `ROOT=$(git rev-parse --show-toplevel)`. If `$ROOT/.forge/config.yml` exists, that is the config.
2. Else `MAIN=$(dirname "$(git rev-parse --path-format=absolute --git-common-dir)")`. If
   `$MAIN/.forge/config.yml` exists, that is the config. This is a worktree, and the `.forge/`
   folder sits in the main clone (`--separate` mode).

   Keep `--path-format=absolute`. Without it git prints a relative path, and from a worktree that
   path points at a folder that is not there.
3. Else there is no config. **Ask the user**: where the folder is, or whether to run `/forge:init`.
   Only `/forge:init` creates it.

"There is no config, so I will pick a sensible path myself" is the one move to avoid here. A skill
that guesses writes the task files where nobody looks for them, and the next skill in the cycle
then starts from nothing.

`/forge:init` names the root command of step 1 in its own steps too. That copy is deliberate, not a
stray: `init` runs when there is no config yet, so it has to find the root before this file has
anything to find. Every other skill takes the root from here.

## Where files are read and written

**Everything lives in the folder the lookup returned**: the config, the frame (`rules.md`,
`arch.md`), the checks, the register, the distill cursor, and the task artifacts under `tasks/`.
One folder, one answer — no path is assembled from anywhere else.

The one exception is `conventions.references`: the reference cards live in the project tree — by
default under `.claude/rules/` — because the harness loads them from there by path on its own
(`frame-format.md`). Its value counts from the work-tree root.

The task artifacts are about the code of one work tree, so the single rule deserves its reason:

- **Default mode** — the folder is tracked by the project repo, so every work tree checks out its
  own copy and step 1 finds it right here. The folder the lookup returns already *is* this work
  tree's folder, and the artifacts land beside the code they describe without a rule of their own.
- **`--separate`** — there is exactly one folder, in the main clone, and the exclude line hides
  `.forge/` in every work tree. Writing artifacts to `$ROOT/.forge/tasks/` from a linked worktree
  would create a second folder that belongs to no repository at all: the config, the frame and the
  cursor would resolve to the main clone while the specs and the reviews sat in the worktree.
  `/forge:commit` would then find nothing to commit into the `.forge` repository, and
  `/forge:distill` would move one cursor over a corpus that is different in every work tree.

The folder the lookup returns is not inside the current work tree — `--separate`, or a branch older
than `.forge/` — → say where you are writing, in one line, the first time you write there.

## A path that goes into a subagent prompt is resolved first

Config values are relative — `.forge/rules.md` is relative to the folder above, and a reference file
is relative to the skill that names it. A subagent knows neither location: it starts somewhere else
entirely, so a relative path handed to it opens nothing.

Resolve every path to an absolute one **before** it enters the prompt — the frame documents, the
external sources, the checklists, the artifacts you want read. A subagent that cannot open what it
was pointed at does not report a broken path; it works from memory and says nothing, which is the
one outcome that looks exactly like a run that went well.

## Missing keys

Every key in `config.yml` is optional. A missing key is a full answer: take the default that the
skill names and ask nothing.
