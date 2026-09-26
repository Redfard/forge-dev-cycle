# The frame: what its documents look like

The frame is three things: `conventions.rules`, `conventions.arch`, and the reference cards in
`conventions.references`. Two skills write it — `/forge:frame-new` once, into an empty frame, and
`/forge:frame-existing` from then on. `/forge:review-frame` checks it. This file is the format all three
share; each of them points here instead of carrying its own copy.

## Language

The frame is written in `conventions.language`; absent → `language`. It is read on every spec, every
review and every coding session, so it is the one place where token cost is paid again and again:
plain words, short sentences, one rule per line where one line holds it. Names from the code —
classes, folders, commands — stay exactly as they are in the code.

## Marks

A reader who cannot tell a checked fact from a guess treats the weakest line in the file as if it
were the strongest. The marks are that distinction; a line without one is unfinished.

**Rules** (`rules.md`) — every rule carries the risk it closes, how to check it, and one of:

| Mark | Means |
|---|---|
| a source — `app/Models/User.php:42`, a command, a config file | the project already does this, and the source shows it |
| `decided` | the user chose it, and there is no code yet to show it |
| `proposal` | an idea nobody has accepted yet — kept in its own block, apart from the rules in force |

**Architecture blocks** (`arch.md`) — each carries one of:

| Mark | Means |
|---|---|
| `confirmed` | visible in the code, with the path |
| `inferred` | follows from the structure, not stated anywhere |
| `assumption` | a guess that needs the user |
| `decided` | the user chose it, and there is no code yet to show it |

`decided` is not a weaker `confirmed`, it is a different claim: "this is the plan" rather than "this
is how it is". It holds until code exists. From then on the code settles it — the line either earns
its source (`confirmed`, or the path for a rule) or becomes a finding, because a plan the code went
against is no longer true of the project. `/forge:review-frame` does that settling.

## Reference cards

A card shows the shape of one kind of component — a controller, an action, a repository, a test —
as a minimal, complete piece of code. Rules say what must hold; a card shows what that looks like
when it holds, which is what a model copies most reliably.

**Where.** One file per kind, `<kind>.md`, in the folder `conventions.references`. The key is absent
→ the project has no cards, and every reader goes on without them.

**Frontmatter.** `paths` — the globs of the files that kind lives in:

```yaml
---
paths:
  - "app/Actions/**/*.php"
---
```

This is the field Claude Code uses to load a file from `.claude/rules/` on its own when a session
touches a matching file, so a folder under `.claude/rules/` gets the cards into every coding session,
with or without a `forge` skill. Every other reader — the `forge` skills, their subagents, another
harness — reads the same field to choose which cards apply.

**Body**, in this order:

- first line: `Status: decided` or `Status: confirmed — <path of the file the example follows>`;
- what the kind is for, in one or two lines — not a repeat of its borders from `arch.md`;
- one minimal, complete code example, neutral names, no business detail;
- what in the example must be repeated;
- the allowed variants, and when a deviation is fine.

A card never cites another card or a URL: it is loaded alone, into a context where nothing else may
be.

**Which cards a skill reads.** The ones whose `paths` match the files it is about to write, change or
judge — the change map of a spec, the files of an edit, the diff of a review. Reading every card on
every call spends the attention the cards exist to focus.
