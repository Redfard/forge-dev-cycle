# Timings

So that a finished cycle can be read for **where the time went**. A stage that took forty minutes and
a stage that took four look identical in an artifact with no clock in it, and the one worth fixing is
invisible.

## The clock is `date`, and the raw output is the evidence

You have no clock. A time written from memory is invented, and an invented number is worse than a
missing one because it will be believed.

**Stamp with `date -Is`** — it prints the date, the seconds and the offset in one string, so a span
across midnight, a run continued the next day and a container on UTC all read correctly. Two calls per
measured span: one **as the first action**, before the work, and one when the work is done.

**The raw string of both ends goes into the row's note**, unchanged. That is the whole verification
story: a stamp nobody can check is a stamp nobody should trust, and the cheapest way to make an
invented pair expensive is to require the thing that produced it.

**A span with no start of its own is `—` in Start and `(—)` in Elapsed**, and the note says which of
the two reasons it is: *not stamped* (nobody took it — the work was already under way when this rule
was reached), or *continued* (another session began this stage). Never reconstruct one afterwards, and
never write a start that was not taken.

## What is worth stamping

Not every paragraph. Four things eat the wall clock, and the rest is noise between them:

1. **The skill itself** — from its first action to the moment its report is written. Its tail (the
   commit call, the sections it appends elsewhere, `state.md`) falls outside and is nobody's row: the
   lead's table is what covers the stage end to end.
2. **A command that runs the project's code** — tests, gates, static analysis, a build, a migration.
   Where the runner prints its own duration (`Duration: 12.34s`), **take that number** and leave Start
   and End as `—` with the runner named in the note: its number is more accurate than the stamps around
   it, and it costs nothing.
3. **A fan-out of subagents** — review axes, plan helpers. Spawned in one message, they come back
   together, so **each subagent reports its own span** and the fan-out row is the longest of them, named
   in the note. Not asked for in the axis prompt → the row is the fan-out's own two stamps and the note
   says the breakdown was not collected.
4. **A unit the skill repeats** — a task of the change map, a round of fixes. One row each, or one row
   with the count and the total when they are small.

Reading files, writing the report, thinking: not stamped. They are what fills the gap between the four
above, and the gap is visible as the difference.

## Waiting for a person is not work

A span that contains a question to the user contains their lunch break. Stage 2 is a dialogue, stage 6
stops at its plan for an answer, every STOP waits — and left unmarked, those rows top every table and
send the reader optimising a conversation.

**A row that waited says so in the note, with the wait subtracted where it can be**: `12m, of which
~9m waiting for the answer`. Cannot be separated → the note says `includes waiting`, and the row is
excluded from "the longest rows" summary. A number that mixes the two is worse than no number: it is
the one that gets acted on.

## Format

| Field | Shape |
|---|---|
| Start, End | `HH:MM:SS`, from the `date -Is` string |
| Elapsed | `Ns` under a minute, `Nm` under an hour, `Nh Nm` above it |
| Note | the two raw `date -Is` strings, plus the wait, the runner, the count — whatever the row needs |

```markdown
| What | Start | End | Elapsed | Note |
|---|---|---|---|---|
| the round | 14:00:11 | 14:26:02 | 26m | 2026-08-17T14:00:11+00:00 → 2026-08-17T14:26:02+00:00 |
| tests of the round | — | — | 41s | runner's own number, 41 tests |
| review fan-out, 3 axes | 14:20:03 | 14:48:40 | 28m | longest: the frontend axis, 27m |
```

## Where it goes, and which number is the answer

| Level | Written by | Where | What it answers |
|---|---|---|---|
| the stage, end to end | the lead of `/forge:auto` | `## Timings` in `auto.md` | **how long the stage cost** — this is the authoritative number |
| inside the skill | the skill | `## Timings` at the very end of its report | which part of the stage that was |
| the skill's own span | the skill | the Log line of `state.md` | the same span as the first row of its own block |

The lead's row runs from the spawn to the signal and therefore includes what the skill's own span
leaves out — its tail, the queue, and any waiting. **The difference between the two numbers is not
queueing by default**: name in the note what it actually was, or say it was not established.

**Which reports carry a block:** the ones that run commands or fan out — `/forge:implement-extended-spec`,
`/forge:review`, `/forge:manual-test`, `/forge:fix`. The rest of the stage skills carry the span in
their `state.md` Log line and nothing more; a block with one row in it is noise.

The same stamps are also written as live rows, for a run that is being watched rather than read
afterwards: `progress.md`. Those rows are where the raw stamps of this run already sit, so a row of
the table may be read off them instead of being remembered. What the table *says* is still this
file's: which rows carry `—`, what waiting is marked, whose number a runner's own is.

**Turning it off:** `defaults.timings: off` in the config removes all of the above — no stamps, no
blocks, no spans in the Log. A project that does not want the calls says so once, rather than having
every skill quietly skip them. Missing key means on.
