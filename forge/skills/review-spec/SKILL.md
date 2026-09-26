---
name: review-spec
description: Review of a task spec in the forge cycle: a clean subagent works by a checklist, the author checks each finding, the report goes to spec-review-{n}.md. Called from forge:make-extended-spec with the flags r / ra.
argument-hint: "<task key | path to spec.md> [r|ra|a] [N]"
---

# Reviewing Specs

## Overview

Dispatch a clean subagent to review a design spec, then **independently verify every finding against the document yourself** before deciding what to fix. The subagent's clean context removes author bias; your verification removes the subagent's false positives. Both halves are required — neither alone is trustworthy.

This is a rigid workflow. Do not skip the verification step or summarize it away.

## When to use

- A spec is written and not yet built.
- As the review step after `/forge:make-extended-spec`.

## How this skill runs inside `forge`

Config lookup: `../../reference/config-lookup.md`. Read `hooks.review-spec` before you start and
follow it inside the borders of this skill; no hook is a full answer.

**Zero context.** The input is a task key, a path to `state.md`, or a path to the spec itself — not
the chat history. Nothing was passed → the newest folder in `paths.tasks` by modification time.

**What you read from the step before you:** `spec.md` in the task folder. It is not there → say so
plainly and ask which document to review; do not review something else instead.

**The frame.** `conventions.rules`, `conventions.arch`, the cards in `conventions.references` whose
`paths` match the files of the change map, and the sources in `conventions.external` are ground truth about the project, so they go to the reviewer as pointers (see step 2) and they are
part of what you verify findings against. The frame is still empty → say so in the report, and judge
the spec on its own terms.

**Where the report goes.** `{task folder}/spec-review-{n}.md`, one file per pass: `n` is the next
free number, so pass 1 writes `spec-review-1.md`. The chat gets the verdict in short; the file holds
it in full, because the implementer may read it in a fresh session.

**`state.md`.** When the pass is done, update it as `../../reference/state-file.md` says.

**Progress:** `../../reference/progress.md`. Your steps are `reviewer`, `verification` — the call
is `../../bin/forge-progress <task> step "<name>"`, and each step is marked **Checkpoint:** in the
text where it happens. The list here is the index of them. The skill is not finished while one of
them has no line.

## Invocation — flags and pass count

The invocation may carry a flag and/or an integer, in any order (e.g. `ra 3`, `r2`, `a 2`, bare `3`):

- **Integer N** (default `1`) — how many review passes to run. Each pass dispatches a **fresh** clean reviewer against the **current** state of the document, so pass N+1 reviews the fixes pass N applied.
- **`a` (apply)** — present (`ra`, `a`) → this invocation is the user's standing approval to **apply** the must-fix + endorsed-optional set **every pass, with no per-pass go-ahead** (still your discretion which optionals count as endorsed; advisory/rejected never auto-applied). Absent (`r`, or a bare integer) → **offer** each pass and wait; never edit without the user's word.

Run passes `1..N` in sequence, each running the full Workflow below. In apply mode, finish applying a pass's fixes **before** starting the next pass — the next reviewer must see the updated document. **Stop early** if a pass surfaces nothing to apply (no must-fix, no endorsed); report that it converged in fewer than N passes rather than burning empty passes.

## Workflow

1. **Resolve the target and parse the invocation.** Take the spec path from the task folder; if the task folder holds no spec, ask which document. Read the flag + pass count N (see Invocation above).

2. **Dispatch the clean reviewer of this pass** (the harness's subagent tool — `Agent`, or its equivalent — as `general-purpose`; one fresh reviewer per pass, never a prior pass's agent; spawned the way `../../reference/subagents.md` says — no `name`, no `isolation`, and told it works alone). Give it: the file path, the checklist (paste the full contents of `spec-reviewer.md`), repo read access, and — to speed discovery — **the neutral technical pointers you already have**: the repo/module path the spec concerns, the tech stack, the frame documents (`conventions.rules`, `conventions.arch`, the matching cards from `conventions.references`, `conventions.external`) to consult — **as absolute paths you resolved yourself, never as the relative values the config holds** (`../../reference/config-lookup.md`, "a path that goes into a subagent prompt"; a reviewer that cannot open the frame reviews without it and says nothing) — where to grep, plus anything else helpful that is **ground truth, not intent**. **Include these by default** — they're cheap for you and save the reviewer discovery time; skip only a pointer you genuinely don't have. **NEVER pass intent or conversation context** — your conversation history, the brainstorm, `decisions.md`, the rationale behind decisions, or any "what I meant" answers; that contamination defeats the self-sufficiency test. Don't hand it an authoritative "these are the files that change" list either — let it verify the change map against the code itself. While it works, you may pre-read the sources the document's own claims point at — that is the verification step 3 owes anyway, brought forward, not the reviewer's search done twice. If it stalls, see "When the reviewer does not come back" below. The subagent reads the document itself and returns a flat list of findings, each with a section-or-line reference, what is wrong, and what it costs — ungraded and unranked, because weighing them is step 3's job.
   **A second reviewer, on style — only when `defaults.style_review` is `on`.** Spawn it in the
   **same message** as the first, so the two run in parallel: decided here, before the checkpoint
   below, because a reviewer already sent cannot be joined by a parallel one afterwards. It gets
   the full contents of `style-reviewer.md` in place of the checklist, the same pointers, the same
   ban on intent and context, and the same spawn discipline — no `name`, no `isolation`, told it
   works alone. Its subject is whether the design this spec describes is built the way the project
   already builds things of its kind; it returns findings the same way, flat and ungraded. The key
   is absent or `off` → one reviewer, exactly as before, and the report says the style pass did
   not run.
   **Checkpoint:** `step "reviewer"`.

3. **Reconcile — verify, do not relay.** Re-open the document and check **every** finding against the actual text and the actual source. The reviewer graded nothing and ranked nothing; how heavy a finding is, is your call, made after you have looked. Then bucket:
   **Checkpoint:** `step "verification"`.
   - **Must-fix** — verified, and leaving it in produces a wrong build. The test: *if nobody fixes this, does the delivered change differ from the change that was asked for, or does some claim in the document turn out to be untrue?* Yes to either — must-fix. It applies per finding: a long list of small things never adds up to one must-fix.
   - **Optional** — verified and real, but the implementation lands correctly without it. Tag each as **endorsed** (you yourself agree with the fix — it improves the document, no scope creep) or **advisory** (borderline, stylistic, or scope-expanding — leave to the user).
   - **Rejected** — false positive / wrong reference / not a real issue, with a one-line reason.

   A finding from the style reviewer is never **must-fix**, and it is **advisory** unless you write
   the reason it is endorsed — apply mode applies the endorsed set without asking, and consistency
   with the code around it is worth a fix and never worth forcing one. A finding merged with one
   that names a real defect follows the defect.

4. **Report** the verdict grouped by bucket, into `spec-review-{n}.md`; within Optional, mark which are endorsed vs advisory. Findings that share one root cause are reported as **one** finding with its consequences listed under it — eight entries that are eight faces of "section 1 describes the store wrongly" read as eight problems and get fixed as eight patches. Never a cap on the count, though: findings with genuinely separate causes each get their line.

   Close the report with what the pass can and cannot claim, and name which reviewers ran: they guard precision, not recall. When nothing survives, that reads "this pass's reviewers found nothing they chose to flag" — never "the document is clean."

5. **Apply or offer — by mode (see Invocation).**
   - **Apply mode (`a`):** apply the must-fix + endorsed optionals to the document now, no go-ahead needed; never apply advisory or rejected. Then report what was applied and what was left.
   - **Offer mode (default):** propose **must-fix + the endorsed optionals together** (the set you would apply if it were your call); list the advisory optionals separately as available on request. Edit only on the user's go-ahead.

6. **Next pass.** If passes remain and this pass had something to apply, return to step 2 with a **fresh** reviewer on the now-updated document, writing to the next `spec-review-{n}.md`. Stop early on convergence (a pass with nothing to apply); after the final pass, report how many passes ran and the net of what changed.

## When the reviewer does not come back

A dispatched reviewer can come back empty — it errors out, it returns something that is not a
findings list, or the harness reports it as finished with nothing to show. The ladder below is what
happens then. It has no clock in it on purpose: you have no way to measure minutes and no way to
sleep, so a rule written in minutes is a rule that gets improvised.

1. **It answered, but not with findings** — ask it once for whatever it has, partial findings
   included.
2. **It came back with nothing, or the ask went unanswered → say so in the open**, in the language
   from `language`, as its own line rather than folded into a status: the reviewer did not deliver,
   and the pass is not what it was supposed to be. The user learns it from you, not from a report
   that quietly reads as complete.
3. **Then dispatch one replacement**, same prompt, fresh agent. If the first one cannot be stopped —
   a nested agent can belong to another session — dispatch the replacement anyway and disregard
   whatever the first one returns later.
4. **The replacement fails the same way → run the pass yourself**, against the same checklist you
   handed the reviewer.

Two reviewers went out and one of them is the silent one → the ladder is walked for that one alone,
against the prompt that one was given, and the other's findings are not held back waiting for it.

One replacement, not a loop. A self-run pass carries a label wherever its findings go: the
reviewer never returned, this pass had no clean context, precision holds because every finding
was checked against the source, recall is lower than a dispatched pass. A record that says
"reviewed" without that line is false.

## Iron rules

- **Verify before accepting.** Accepting a finding without re-reading the cited section/source is a red flag.
- **Reject only with a textual reason, never intent.** You may be the document's author; the bias the clean reviewer removed returns here and pushes you to wave off real findings. "I know what I meant" is not a valid rejection — if a finding can only be defended by intent that is not in the text, uphold it.
- **Calibrate.** Nitpicks are never must-fix. Always give a clear verdict.
- **A reviewer guards precision, not recall.** It can only filter the findings it produced; it cannot surface what it missed. Report honestly.

See `spec-reviewer.md` for the checklist to hand the subagent, and `style-reviewer.md` for the style pass.
