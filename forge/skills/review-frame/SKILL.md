---
name: review-frame
description: Review of the project frame in the forge cycle: a clean subagent checks rules.md, arch.md, reference cards and config.yml against the code (or, while there is no code, against the source document) by a checklist, the author re-checks each finding, the report goes to reviews/frame-{n}.md. Called from forge:frame-existing and forge:frame-new with the flags r / ra / a.
argument-hint: "[r|ra|a] [N] [--source <documents>]"
---

# Reviewing the frame

## Overview

Dispatch a clean subagent to check the frame against the code, then **verify every finding
yourself before deciding what to fix**. The subagent's clean context removes author bias; your
verification removes its false positives. Both halves are required — neither alone is trustworthy.

The frame is the one document every other skill trusts without checking. A wrong line in it is not
one wrong answer, it is a wrong answer repeated on every spec and every review until someone opens
the source.

## When to use

- After `/forge:frame-existing` or `/forge:frame-new` wrote or updated the frame — it is the author checking his own work,
  which is exactly what a clean reader is for.
- When the code the frame rests on has moved: the module list, `clients.json`, the CI workflows,
  the pinned dependency versions, the project loader.
- Before trusting a frame nobody has checked since it was written.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.review-frame` before you start and
follow it inside the borders of this skill; no hook is a full answer.

**Zero context.** The input is the config and the frame files, not the chat history. This skill may
run in a fresh session about a frame somebody else wrote.

**No task, no `state.md`.** The frame belongs to no task, so nothing in `paths.tasks` is read or
written.

**What gets reviewed.** `conventions.rules`, `conventions.arch`, the cards in
`conventions.references`, the project `config.yml`, and every file inside the config folder that the
frame points at. The format they are judged by — marks, cards — is `../../reference/frame-format.md`.

**`--source <documents>`** — the documents a `decided` frame was derived from, passed by
`/forge:frame-new`. They go to the reviewer as the ground truth for `decided` lines while the code
cannot be. Sources in `conventions.external` are
**read but not judged** — they belong to someone else. What is judged is whether the frame agrees
with them, and where it knowingly overrides them, whether it says so.

**Where the report goes.** `reviews/frame-{n}.md` inside the folder the config lookup returned, one
file per pass: `n` is the next free number. Create `reviews/` if it is absent. The chat gets the
verdict in short; the file holds it in full, because whoever fixes the frame may read it in a fresh
session.

## Invocation — flags and pass count

The invocation may carry a flag and/or an integer, in any order (`ra 2`, `r`, `a 3`, bare `2`):

- **Integer N** (default `1`) — how many passes. Each pass dispatches a **fresh** reviewer against
  the **current** state of the frame, so pass N+1 reviews the fixes pass N applied.
- **`a` (apply)** — present (`ra`, `a`) → standing approval to apply the must-fix + endorsed-optional
  set every pass, with no per-pass go-ahead. Absent → **offer** each pass and wait.

Stop early if a pass surfaces nothing to apply, and report that it converged in fewer than N passes.

## Workflow

1. **Resolve the targets.** From the config: the absolute paths of `conventions.rules`,
   `conventions.arch`, the cards in `conventions.references`, the config file itself, and the files inside the config folder the frame
   points at. A frame file that is missing or still the empty placeholder is not a finding to
   report — say so plainly and stop; there is nothing to review.

2. **Dispatch ONE clean reviewer subagent for this pass** (the harness's subagent tool — `Agent`, or
   its equivalent — as `general-purpose`; one fresh reviewer per pass, spawned the way
   `../../reference/subagents.md` says — no `name`, no `isolation`, and told it works alone).
   Give it: the absolute paths
   of the frame files, the checklist (paste the full contents of `frame-reviewer.md`), repo read
   access, and the neutral pointers you already have — the repository root, the working directory
   from `workdir`, the sources listed in `conventions.external`, the `--source` documents, the
   frame format `../../reference/frame-format.md`, **as absolute paths you resolved
   yourself, never the relative values the config holds** (`../../reference/config-lookup.md`, "a
   path that goes into a subagent prompt"). **NEVER pass intent or conversation context** — why a
   rule was written that way, what was discussed, what the author meant. That contamination is
   exactly what the pass exists to remove: the author's certainty is what let the wrong line through
   in the first place.

   While it works, you may pre-read the sources the frame's own claims point at — that is the
   verification step 3 owes anyway, brought forward. If the reviewer stalls, see "When the reviewer
   does not come back" in `review-spec/SKILL.md`; the ladder there applies here unchanged.

3. **Reconcile — verify, do not relay.** Open **every** cited source yourself and check the finding
   against the actual file, the actual count, the actual command output. A number is re-counted, not
   eyeballed. Then bucket:
   - **Must-fix** — verified, and leaving it in makes the frame lie. The test: *would someone acting
     on this line do the wrong thing, or state something untrue?* Two shapes qualify beyond a plain
     false claim: a rule that flags practice the project accepts, and a rule that names a lever that
     does not work.
   - **Optional** — verified and real, but nobody is misled. Tag **endorsed** (you agree with the
     fix) or **advisory** (borderline or scope-expanding, left to the user).
   - **Rejected** — false positive, with a one-line reason from the text or the source.

4. **Report** into `reviews/frame-{n}.md`, grouped by bucket, each finding naming the file, the
   section and the source that settles it. Findings that share one root cause are reported as one.
   Close with what the pass can and cannot claim: one reviewer guards precision, not recall — when
   nothing survives, that reads "one reviewer found nothing it chose to flag", never "the frame is
   correct".

5. **Apply or offer — by mode.** Apply mode: apply must-fix + endorsed now, then report what was
   applied and what was left. Offer mode: propose must-fix + endorsed together, list advisory
   separately, edit only on the user's go-ahead.

   A finding that is true about the project but does not belong in the frame — a mechanical check, a
   candidate for the team's own instruction file — goes to its section of `paths.proposals`, not
   into `rules.md`.

6. **Next pass.** Passes remaining and something applied → step 2 with a fresh reviewer on the
   updated frame, writing the next `reviews/frame-{n}.md`.

## Iron rules

- **Verify before accepting.** Accepting a finding without opening the cited source is the failure
  this skill is built to prevent, in the other direction.
- **Reject only with a textual reason, never intent.** You may be the frame's author. "I checked
  this when I wrote it" is not a rejection — that is the belief that produces wrong lines, not the
  evidence that clears them. Re-open the file.
- **A count is re-counted.** `wc -l`, `grep -c`, the actual list. Counts are what rot first: they
  were right the day they were written.
- **Calibrate.** Wording preference is never must-fix. A frame that reads well and states one untrue
  thing is worse than a plain one that states none.

See `frame-reviewer.md` for the checklist to hand the subagent.
