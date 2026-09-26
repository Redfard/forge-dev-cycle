# One-shot subagents

A reviewer, an axis, a helper — an agent spawned for one answer and never addressed again. Every
skill of the set that fans out spawns them the same way.

**No `name`, no `isolation`, and no agents of its own.** A one-shot agent's report comes back as the
result of the call itself; a name turns it into an addressable teammate that has to send its report
instead — and a report never sent never arrives — while adding a window of its own on the user's
side and an idle signal that means "still working" and "already finished" at once. `isolation` would
hand it its own copy of the tree, when what is under review is usually the uncommitted tail of the
one you are standing in. A nested agent it spawns can belong to another session, so nobody here can
stop it and its silence is invisible to you — which is why the prompt tells the agent it works
alone, the one of the three that has to be written into the prompt rather than into the call.

Address it, when you have to, by the identifier its spawn returned.
