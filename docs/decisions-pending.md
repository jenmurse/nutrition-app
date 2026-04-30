# Decisions Pending

Tracker for product and architecture decisions that have been deferred but need to be made before public launch (or shortly after). Each entry should capture the question, why it's deferred, and what triggers needing to decide.

---

## Account deletion strategy

**Question:** What does "deleting a user" mean in production? Three competing answers:

1. **Cascade delete** — `onDelete: Cascade` on FK relations. Deleting a Person automatically removes their meal plans, logs, goals, etc. Aggressive and irreversible. Easy to implement, dangerous in production.
2. **SetNull on audit fields, cascade on personal data** — preserves shared artifacts (e.g., Recipes Garth created stay in Jen's library with `createdBy = null`) but removes Garth's personal data (his meal logs, goals). Mixed approach.
3. **Soft delete** — mark `deletedAt` timestamp, hide from queries, retain everything for recovery. Standard consumer-app pattern. Adds complexity to every query.

**Why deferred:** product decisions about GDPR, account deletion UX, and data retention policy aren't made yet. Picking a cascade policy commits to answers we haven't given.

**Current workaround:** `scripts/dev/wipe-user.ts` handles testing. Production has no user-facing deletion UI yet.

**Triggers needing to decide:**
- A user requests account deletion (GDPR right-to-be-forgotten)
- We add a "Delete account" button anywhere in Settings
- We need to comply with regional data laws

**Owner:** Jen

---

## Invite expiration policy

**Question:** Should invites expire? Currently they never do (set to 10 years out as a placeholder).

**Options:**
- **Never** — simple, low-friction. Acceptable for a personal-tool app where the inviter and invitee usually communicate directly.
- **30 days** — standard for most invite systems. Forces a refresh if abandoned.
- **7 days** — tight, reduces stale-link surface area but adds friction.

**Why deferred:** no abuse signal yet. Picking an expiry now is premature optimization.

**Current state:** invites effectively never expire (10-year `expiresAt`). Revisit if abuse becomes a concern or if shared-link discovery becomes a vector.

**Triggers needing to decide:**
- Reports of stale invite links being misused
- Policy review for public launch
- Any move to a multi-tenant / shared-link model

**Owner:** Jen

---

(Add new entries below as decisions get deferred.)
