# Correctness checklist — for the review axis

The checklist the "correctness + architectural minimum" axis loads. Stack-general: the
Laravel/Eloquent snippets are illustrative, not a statement about this project.

Two notes on how to read it here:

- **Where this file describes reporting, the axis prompt wins.** The card shape and the severity
  labels come from there.
- **This file does not enumerate a project's own rules.** Where the text below defers to "the
  project's conventions skill / CLAUDE.md", read that as the frame documents the axis prompt names —
  `rules.md`, `arch.md` and the external sources.

---

## Overview

Review a change for correctness **and** for the failure modes that pass every test and surface only in production: non-atomic multi-write operations, N+1 queries, read-modify-write races, and authorization gaps. A green test suite is not evidence these are absent — they only fire under concurrency, scale, or partial failure.

**Core principle:** report only findings, ordered by severity, each verified against the code. No "this looks fine" filler. Every finding states what is wrong, why it matters, and the fix.

## Workflow

1. **Scope the change.** Get the diff (`git diff`, PR files). Identify the *intent* — what should this change do? Review against intent, not just "is the code valid".
2. **Read with context.** Read changed files *and* enough surrounding code (the model, the caller, the relation definitions, the migration) to judge correctness. Most false positives come from reviewing a hunk in isolation.
3. **Run the dimension checklist** (below) over every changed file.
4. **Verify each suspected finding before reporting it.** Confirm the relation isn't already eager-loaded upstream; confirm the writes really can fail independently; confirm the auth check isn't done by middleware. Speculative findings destroy trust — if you can't confirm it from the code, mark it explicitly as "unconfirmed — verify X".
5. **Report by severity.** Only findings. End with a one-line verdict.

## Severity

| Level | Meaning |
|---|---|
| **Critical** | Data loss/corruption, security hole, money/permission bug. Blocks merge. |
| **High** | Wrong behavior on a real path, or a perf cliff (N+1 on a list endpoint) that will hurt in prod. |
| **Medium** | Edge-case bug, missing validation, fragile error handling. |
| **Low / Nit** | Readability, naming, minor duplication. Group these; don't belabor. |

## Dimension checklist

| Dimension | Look for |
|---|---|
| **Transactions / atomicity** | Multiple related writes not wrapped atomically; side effects fired before commit; read-modify-write without a lock. *(deep dive below)* |
| **N+1 / query perf** | Relation access or query inside a loop/`map`/resource; `count()` per row; unbounded `->get()`; filtering in PHP instead of SQL. *(deep dive below)* |
| **Correctness** | Null/empty handling, off-by-one, inverted conditionals, wrong operator, unhandled edge cases, early-return skipping cleanup. |
| **Authorization** | Can the *wrong* user do this? Ownership checked, or just authentication? IDOR via request-supplied IDs. Policy/gate present. When the action mutates resource A but authorizes on a *related* resource B, confirm B actually gates A (e.g. editing a Document gated by its Project's update policy). |
| **Input & mass assignment** | Validation on all new inputs; `$fillable`/`$guarded`; trusting client-supplied IDs, status, or `user_id`. |
| **Partial update / PATCH semantics** | Does an update endpoint distinguish "field omitted" (leave alone) from "field present but empty" (clear)? Guarding every assignment on `!== null` silently makes nullable fields impossible to clear. |
| **Error handling** | Swallowed exceptions, over-broad `catch`, errors that leak internals, failure paths that leave inconsistent state. |
| **Concurrency / idempotency** | Jobs/webhooks/retries that double-apply; check-then-act races; non-idempotent handlers. |
| **API contract** | Response shape changes, status codes, breaking changes to existing consumers. |
| **Migrations / schema** | Reversibility; backfills or `NOT NULL`/index adds that lock large tables; destructive ops on live data. |
| **Tests** | Does the change have tests? Do they assert behavior (not implementation)? Are failure/edge paths covered? |
| **Reuse / simplicity** | Reinventing an existing helper; duplicated logic; needless complexity. |
| **Consistency with existing code** | Does the change follow the patterns, naming, structure, and idioms already used in this codebase? Compare against neighboring/similar files — base classes, layering, error-handling style, API/response shape, test structure, localization. New code that diverges from the established approach (even when individually valid) is a finding: point to the existing pattern it should match. Defer to the project's conventions skill / CLAUDE.md for the canonical rules; this check is about staying consistent with what's already there. |

---

## Deep dive: transactions & atomicity

**The question to ask on every write: "If this fails halfway, what state is left behind?"**

### When a transaction is REQUIRED

- **Two or more writes that must all-or-nothing succeed** — insert a parent + its children, update a balance + write a ledger row, change status + create an audit record. If write #2 fails, write #1 must not survive.
- **Read-modify-write where concurrent callers can interleave** — decrementing stock, allocating a limited resource, generating a sequential number, toggling a status guarded by "only if currently X". This needs a transaction **and** a row lock (`lockForUpdate`), not just a transaction.

```php
// ❌ Non-atomic: a failure after the first write leaves an orphaned document
$document = Document::create($data);
$document->revisions()->create($revisionData);   // throws → document exists with no revision
event(new DocumentCreated($document));

// ✅ Atomic + side effect deferred until the data is durable
$document = DB::transaction(function () use ($data, $revisionData) {
    $document = Document::create($data);
    $document->revisions()->create($revisionData);
    return $document;
});
DB::afterCommit(fn () => event(new DocumentCreated($document)));
// or: dispatch the event/job from inside the closure but ensure it runs afterCommit
```

```php
// ❌ Lost update / double-spend: two requests both read 5, both write 4
$account = Account::find($id);
if ($account->balance >= $amount) {
    $account->balance -= $amount;
    $account->save();
}

// ✅ Serialize the read-modify-write with a row lock inside a transaction
DB::transaction(function () use ($id, $amount) {
    $account = Account::lockForUpdate()->find($id);
    abort_if($account->balance < $amount, 422);
    $account->decrement('balance', $amount);
});
```

### Transaction pitfalls (flag these too)

- **Side effects dispatched before commit.** Queuing a job, firing an event, sending mail, or calling an external API *inside* the transaction (without `afterCommit`) — the worker can pick up the job before the transaction commits and hit "model not found", or the email goes out for a write that then rolls back. Move side effects to after commit.
- **External I/O inside the transaction.** HTTP calls, large file uploads, slow third-party work inside `DB::transaction` hold the connection and row locks open for the whole duration. Do the I/O outside; keep the transaction to the DB writes only.
- **Swallowed exceptions defeat rollback.** `DB::transaction(fn () => ...)` only rolls back if the closure *throws*. Catching the exception inside and returning normally commits the partial work. With manual `beginTransaction()`, every error path must `rollBack()` — check the `catch`.
- **Unnecessary transaction.** A single statement wrapped in a transaction is noise, not a bug — mention as Nit at most.

---

## Deep dive: N+1 & query performance

**Symptom:** a database query issued *per item* while iterating — a relation accessed inside a `foreach`/`map`/`each`, inside an API resource/transformer, inside an accessor used on a list, or a `->count()` per row. 1 query becomes 1 + N.

```php
// ❌ N+1: one query for documents, then one per document for its author
$documents = Document::where('project_id', $projectId)->get();
return $documents->map(fn ($doc) => [
    'name'   => $doc->name,
    'author' => $doc->author->name,   // lazy-loads author once per row
]);

// ✅ Eager load the relation up front: 2 queries total
$documents = Document::where('project_id', $projectId)
    ->with('author')
    ->get();
```

Other N+1 shapes and their fixes:

- **Counting a relation per row** → `withCount('documents')`, read `->documents_count`. Not `$x->documents->count()` in a loop.
- **Relation needed only on some rows** → `loadMissing(...)`; for paginated results eager-load on the query (`->with(...)->paginate()`).
- **Polymorphic `morphTo` in a loop** → `->with(['commentable' => fn ($m) => $m->morphWith([...])])`.
- **`whereHas` is NOT N+1** — it compiles to a single query. Don't flag it. The bug is *accessing* the relation per row, not constraining by it.

**Other query smells worth flagging:**
- Unbounded `->get()` / `->all()` on a table that grows — needs pagination or a `limit`.
- Fetching rows then filtering/summing in PHP that SQL could do (`->get()->filter(...)`, `->get()->sum(...)`).
- Missing index for a new `WHERE`/`ORDER BY` introduced by the change.

**Frontend analogue (JS):** `await`-ing API calls one-by-one inside a loop is the same waterfall — batch the endpoint or use `Promise.all`.

**Verify before flagging:** confirm the relation isn't already eager-loaded by the caller, the query builder, or a global scope. If a `with()` exists upstream, there's no N+1.

---

## What NOT to flag (keep signal high)

- A `with()` that already covers the relation — no N+1.
- A single write wrapped in a transaction — harmless; Nit at most.
- Premature optimization on a path that runs once / on tiny fixed data.
- `whereHas`/`has`/`whereIn` — single queries, not N+1.
- Style preferences the project's own conventions don't mandate.
