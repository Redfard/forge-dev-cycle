# The `state.md` file

`state.md` is the recovery point of a task. Any `forge` skill can start from it alone, after a
`/clear`, a `/resume` or a re-spawn, so it is the one file the whole set shares.

## Structure is fixed and English

Header keys, section headings, column names, the `stage` values and the status words are part of
the contract between the skills. They are never translated. The free prose — `title` and the text
of a log line — is written in the config `language`.

The reason to hold the line here: nearly every skill of the set reads and writes this file, and the
value of `language` differs per project. The three that do not are the three that live outside a task — `/forge:init`
runs before any task exists, `/forge:frame-existing` writes the frame rather than a task artifact, and
`/forge:distill` works across all tasks at once. A heading that follows `language` makes every skill depend on it,
and the first skill that looks for a heading in the other language writes a second section of its
own next to the first one.

## Template — created by `/forge:task`

```markdown
---
task: ABC-123
title: <one line, what the task is about>
branch: <by the project rule>
parent: <parent branch>
base: <full sha of the commit the branch was cut from>
stage: task          # task | brainstorming | make-extended-spec | review-spec |
                     # implement-extended-spec | review | manual-test | commit | done
updated: 2026-08-06 14:20
---
## Artifacts
| File | Status |
|---|---|
| decisions.md | planned |
## Log
- 14:02–14:05 (3m) task — folder created, branch cut from <parent>
- ?–14:31 (—) make-extended-spec — spec written; start not stamped
```

`Status` takes one of three words: `planned`, `in progress`, `ready`.

`base` is written once, by `/forge:task`, and never changed afterwards. `/forge:review` diffs
against it and `/forge:distill --verify` uses it to reach the code from before the fix. A name — a
branch, a parent — stops resolving the day someone merges and deletes it, and a parent branch moves
on by itself; a SHA does neither.

## How a skill updates it

Every skill that works inside a task does this after its own work is done and before it reports:

1. `stage` — its own name from the list above; `done` when the cycle is over.

   **A skill that runs inside a stage rather than as one leaves `stage` alone** and writes only the log
   line. While that stage is still open, `stage` has to keep naming the step the work is actually at —
   otherwise a `/clear` resumes from the step that merely happened last. Four are that case, and none
   of them has a value of its own in the list above:

   - `/forge:commit --step` — called per task by the implementation, and once per round of fixes by
     `/forge:fix`.
   - `/forge:fix` — a round of fixes belongs to the loop that found them, so `stage` keeps saying
     `review` or `manual-test` until that loop closes. This holds on **every** invocation, a person's
     slash call included: the loop is open either way.
   - `/forge:review-test` — a pass over the manual-test report, run while stage 6 is still open.
   - `/forge:manual-test plan-only` — the plan is half of stage 6, and the run that closes the stage is
     the tester's. Written as `manual-test`, it would send a continued run straight to the commit.
2. Its row in **Artifacts** — add the file it produced, or move the status of a row that is already
   there.
3. One line in **Log** — **the span**, skill name, what happened in a few words. The span is
   `HH:MM–HH:MM (Nm)`, stamped by real `date` calls as `timings.md` says: without a start time the log
   records when a stage ended and never what it cost. The start is taken **as the skill's first
   action** — a start remembered at the end of the work is a start that was invented.

   No start was taken → `?–HH:MM (—)`, and the words say which case it is: the stage was continued from
   another session, or nobody stamped it. `defaults.timings: off` → no span at all, just the finish
   time, as it was before.

   **The Log is ordered by writing, not by time.** A skill that runs inside a stage — `/forge:commit
   --step`, `/forge:fix`, `/forge:review-test` — writes its line while the outer skill is still going,
   so the outer line lands below lines whose spans start later. Read the spans, not the order.
4. `updated` — now, from the same `date` call that closed the span. "Now" written from memory is the
   same invented number `timings.md` refuses everywhere else.

The two sections above are the only ones. Add rows inside them. A second section with a name of
your own splits the recovery point in two, and the next skill reads whichever half it finds first.

A skill that skips this step breaks recovery for every skill after it, not for itself.
