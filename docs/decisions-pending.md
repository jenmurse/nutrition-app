# Decisions Pending

Tracker for product and architecture decisions that have been deferred but need to be made before public launch (or shortly after). Each entry should capture the question, why it's deferred, and what triggers needing to decide.

---

## Account deletion strategy

**Status: Resolved and shipped.**

**Decision:** Immediate hard delete, scoped to the requesting user only.

**What gets deleted:**
- Person profile, nutrition goals, meal plans, meal logs
- Supabase auth account
- If sole household member: all household data (recipes, ingredients, meal plans, the household itself)

**What stays (multi-member households):**
- Recipes and pantry items remain in the household — they are household-scoped, not person-scoped
- No `createdBy` nullification needed (Recipe has no createdBy field)

**Where it lives:**
- API: `DELETE /api/account`
- UI: Settings → Section 06 Account → "Delete account" button → confirmation dialog
- Only the logged-in user can delete their own account

**Recovery:** None — immediate permanent deletion. Acceptable for a friends-and-family app.

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
