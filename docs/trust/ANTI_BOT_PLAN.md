# Anti-bot & review-integrity plan

**Goal:** make StackAtlas the place where talk about brands can be trusted.
Reddit-style bot flooding — especially astroturfed brand praise — is the
threat model. Every layer below is cheap for a human and expensive for a
script, and none of them track reading behaviour (see
`docs/privacy/DATA_INVENTORY.md` principle 1).

## Layer 1 — Database-enforced limits (shipped: migration `20261020123000`)

Enforced in `BEFORE INSERT` triggers, so no client or API trick bypasses them:

| Rule | Why |
|---|---|
| Email must be confirmed before any post/comment/rating | kills throwaway-address farms at zero cost |
| Accounts < 24 h old cannot rate brands | the cheapest brand-spam vector gets a cooling-off period |
| 10 posts/h, 40 comments/h, 20 ratings/day per account | humans never hit these; scripts hit them in seconds |
| One rating per user per brand (unique index) | changes are updates; re-rating cannot stack |
| Suspended / banned / deletion-requested accounts cannot contribute | closes the "post then delete" loophole |

## Layer 2 — Account standing (next)

- **Contribution trust score**, computed in the database from age, confirmed
  email, non-removed posts, and reports *against* the account. Low standing
  = ratings shown but not counted in the brand average; standing rises with
  time and clean history. Nothing here uses reading data.
- **Disclosed affiliation flag** on profiles (Terms §5 already requires
  disclosure). Posts by flagged accounts about their brand show a badge and
  are excluded from the brand's star average.
- **One-account policy** support: flag clusters that rate the same brands in
  the same direction within minutes of each other (co-rating graph), surface
  to the moderation queue — no automatic action.

## Layer 3 — Friction only where it pays

- **Cloudflare Turnstile at sign-up** (and only there). Privacy-respecting,
  no cookies for the user, free. It *is* a third party: adding it means a
  line in the Cookie Policy and `DATA_INVENTORY.md`'s third-party table.
  Decision pending; sign-up email confirmation already does most of the work.
- **Honeypot field** on sign-up and post forms (hidden input bots fill in).
  Zero cost, zero privacy impact. Implement alongside Turnstile decision.
- **Proof-of-purchase for ratings** (optional): `product_batches` already
  exists — a rating that cites a batch/lot number gets a "verified batch"
  badge and more weight. Humans with a bottle can do this; bots cannot.

## Layer 4 — Moderation loop (exists; strengthen)

- The report → moderation queue → audited action pipeline already exists.
- Add: brand-page "report astroturfing" reason; weekly digest of brands with
  anomalous rating velocity (ratings/day vs trailing average).

## What we will NOT do

- No device fingerprinting, no IP-based reputation stored in our DB, no
  behavioural tracking of reading or searching. Trust is built from what
  accounts *publish*, never from what they *read*.
- No CAPTCHA on every action — friction belongs at account creation, not on
  people who have already proven themselves.

## Measuring success

- % of brand ratings from accounts > 30 days old
- median time between account creation and first brand rating
- reports-per-1000-ratings trend
- share of brand pages with a rating-velocity anomaly in the last 30 days
