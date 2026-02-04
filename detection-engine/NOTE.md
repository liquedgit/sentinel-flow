# Detection Engine - Future Considerations

Notes for items deferred from Phase 1 implementation.

---

## 1. Cache Staleness When Portal Updates Mappings

**Problem:** When the portal marks a violation as false positive or manually edits endpoint mappings, the changes are written to the database. The detection engine keeps mappings in memory and has no way to know when the portal updates the DB, so the cache becomes stale.

**Future options:**
- Add a `mapping-updates` Kafka topic: portal (or its backend) publishes mapping changes; detection engine consumes and refreshes cache
- Periodic cache reload from DB (e.g., every N minutes)
- Portal backend updates DB and publishes to Kafka; detection engine subscribes

---

## 2. Scan Overwrites Manual Edits

**Context:** For now we only plan to run scan once. Manual edits and false-positive handling may be added later.

**Problem:** When scan runs, it upserts `endpoint_mappings` and would overwrite roles that were manually added (e.g., via false-positive handling). The schema has `auto_generated BOOLEAN`.

**Future consideration:** When implementing manual edits, ensure scan only updates rows with `auto_generated = true` and does not overwrite manually edited mappings.

---

## 3. Request Log Insert Failure and Offset Commit

**Problem:** If inserting into `request_logs` fails (e.g., DB down), we should not commit the Kafka offset—otherwise we lose the log permanently.

**Current approach:** Log and continue (may lose data on DB failure).

**Future improvement:** Only commit offset after successful DB insert. Implement retry with backoff before giving up. Consider dead-letter queue for messages that fail after retries.
