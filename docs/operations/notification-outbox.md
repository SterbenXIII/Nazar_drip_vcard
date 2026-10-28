# Notification outbox operations

Use the approved database access path for the environment being investigated. The SQL below
is illustrative; do not copy production database contents, recipient values, or lead data into
shell history, tickets, or this repository.

## Delivery model

Lead notifications are stored in SQLite's `notification_outbox` queue. Each row is for one
provider and recipient, but operators should inspect it by outbox ID only.

- `pending`: eligible for a future attempt at `next_attempt_at`.
- `processing`: claimed by a worker while a provider request is in flight.
- `delivered`: the provider reported success; `delivered_at` records that acknowledgement.
- `failed`: no more automatic attempts remain, or restart recovery found an interrupted final
  attempt.
- `cancelled`: delivery was stopped because the current Telegram recipient authorization no
  longer permits it.

The worker makes at most three provider invocations per row. Failed attempts are scheduled for
retry using `next_attempt_at`; exhaustion after the third invocation becomes `failed`. Telegram
requests have a 30-second timeout. SMTP uses 30-second connection, greeting, and inactivity
(`socket`) timeouts; those bounds do not impose a strict total SMTP delivery duration.

On restart, interrupted `processing` rows with fewer than three attempts return to `pending`.
Rows already at the three-attempt limit become `failed`.

Pending email rows retain the address selected when the lead was accepted. When rotating
`ADMIN_EMAIL`, account for queued rows still addressed to the previous setting.

This is at-least-once delivery, not exactly-once delivery. If a process stops after a provider
accepts a notification but before SQLite records `delivered`, a retry can send a duplicate. An
interrupted final attempt can remain `failed` even if the provider accepted it; review it before
requeueing.

## Read-only queue checks

In an approved SQLite client, list rows needing attention without selecting recipient or lead
fields:

```sql
SELECT id, status, provider, created_at, delivered_at, next_attempt_at
FROM notification_outbox
WHERE status IN ('failed', 'cancelled')
ORDER BY id;
```

Count active and terminal review states without exposing recipient or customer data:

```sql
SELECT status, COUNT(*) AS row_count
FROM notification_outbox
WHERE status IN ('pending', 'failed', 'cancelled')
GROUP BY status
ORDER BY status;
```

## Requeue one failed row

Before requeueing, use the approved authorization process to confirm the row's current recipient
is still authorized. Do not query or display recipient, customer, or lead fields while doing so.
Review the row's outbox ID and its possible prior external acceptance first: requeueing an
uncertain prior delivery can create a duplicate.

Run this transaction with a bound `:outbox_id` value in the approved database client. It can
affect only one primary-key row and only when its current status is `failed`:

```sql
BEGIN IMMEDIATE;

UPDATE notification_outbox
SET status = 'pending',
    attempt_count = 0,
    next_attempt_at = CAST(unixepoch('subsec') * 1000 AS INTEGER),
    last_error = NULL
WHERE id = :outbox_id
  AND status = 'failed';

SELECT changes() AS changed_rows;
-- Stop here. Run COMMIT only when changed_rows is exactly 1; otherwise run ROLLBACK.
```

The requeue resets `attempt_count` to zero, giving this deliberate manual retry a fresh maximum
of three automatic provider attempts. If `changed_rows` is not exactly one, roll back; do not
broaden the update or retry it against an unknown ID.
