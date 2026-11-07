# Payment reservation reconciliation

Offer acceptance atomically reserves the request and offer with a reservation identifier. A checkout dispatched to RapidPay is marked on the offer; ambiguous gateway failures are retained for review. A second checkout is blocked while a dispatched attempt is unresolved. Automatic expiry only releases holds where checkout was not dispatched and the outcome is not unknown.

This is a fail-closed safeguard, not a complete reconciliation system. The finance reconciliation page includes a read-only queue of unresolved or overdue dispatched offer holds and their latest ledger evidence. The current integration does not expose an authoritative gateway status lookup or an administrator resolution action. Operations must not clear a hold or create another payment attempt until the gateway confirms the outcome and the associated payment ledger has been reconciled. Implement and test a provider-verified status lookup, webhook correlation, audit-logged admin resolution and alerts before production rollout.

Existing records without a reservation identifier require manual investigation; the retry endpoint does not infer that an old checkout is safe to repeat. Historical records are not migrated automatically.

New checkout attempts persist their expected amount and reference in a separate intent before gateway dispatch. This is an internal expectation, not a checkout-created ledger event and not evidence of payment. Verified events received by the active webhook are stored before processing; unmatched or failed processing is visible in the finance review queue. A pending event may need operational investigation after a process interruption: automatic replay and a provider status lookup are not implemented. Webhook headers, statuses and reconciliation rules remain subject to verification against the merchant documentation before production use.

Finance can open an unresolved event in the reconciliation page to compare its recorded checkout intent, up to 20 recent ledger records, and linked offer or booking states. This view is read-only and does not authenticate a payment outcome or resolve a case.
