# Operations browser evidence — 20 October 2026

Captured from the actual local Node server and production game build. Four independent browser identities used normal character creation and party menus. One pair completed DEADLOCK from authored starts with real keyboard/mouse input; the other started HANDSHAKE. An independent authenticated administrator browser received SSE updates.

- `01-locked.png`: administrator login screen.
- `02-two-parties.png`: four players, two parties, duplicate names distinguished by session/slot.
- `03-active-chambers.png`: DEADLOCK and HANDSHAKE simultaneously active.
- `04-payload-deliveries.png`: actual receiver acceptance and exit unlock.
- `05-completed.png`: both named exit arrivals and DEADLOCK completion.
- `06-reconnected.png`: administrator reload and player reconnect, without duplicate completion.
- `checks.txt`: assertions from `pnpm check:observability`.
- `dashboard-snapshot.json`: sanitized real server snapshot after completion; contains only boot-local pseudonyms and cosmetic names.

Screenshots were visually reviewed for readable names, session/chamber context, payload attribution and completion. They contain no administrator credential, join code or raw visitor UUID. The reused scenario’s detailed private identity report is deliberately excluded.

These files establish local behavior. Aggregate-only live production verification is in `production-verification.json` and the implementation handoff. The deployed game and structured Fly events passed a real DEADLOCK solve; production administrator authentication remains unconfigured and untested.
