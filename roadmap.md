# Call reliability
# Voice monetization MVP
- [ ] Confirm feasible anti-abuse limits and secure Pix confirmation method.
- [ ] Implement server-authoritative guest wallet, 100-coin bonus, inactivity cooldown and paid-search debits with regression tests.
- [ ] Enforce paid matchmaking on the server and implement compatible two-person fallback without charging automatic requeue.
- [ ] Add wallet, paid-filter lock, fixed Pix packages and authenticated administration.
- [ ] Update universal privacy choices and reserved advertisement placements.
- [ ] Verify payment settlement, concurrent debits, free calls, filtered calls and requeue end-to-end.

# Call reliability
- [x] Repair matchmaking and call signaling races.
- [x] Handle microphone permissions, audio playback, disconnects, and cleanup visibly.
- [x] Verify two-person audio, mute, hangup, cancellation, and regression tests (two successive calls with inbound audio packets on both peers; seven tests passed).
- [x] Check availability of a relay for restrictive mobile networks (no existing connection available).
- [x] Enable a TURN relay: Cloudflare TURN credentials issued server-side (1h), verified live.

# Call controls and safety
- [x] Automatically requeue the remaining participant after a peer leaves, preserving their microphone and preferences.
- [x] Enforce mutual location compatibility and verify automatic rematching with regression tests and live calls.
- [x] Suspend the current guest entry after a valid call report; verified warning screen and removal of call controls, with fresh re-entry allowed.
- [x] Add Próximo with a new search and no forced call time limit.
- [x] Ask for a name, own gender and location on every entry; verified fresh form and both call indicators.
- [x] Record reports and enforce temporary entry suspension server-side without accounts or permanent bans.
- [x] Verify reporting, suspension and re-entry through the live UI; 11 regression tests passed.
- [x] Confirm connected audio after the changes on actual devices (sandbox pairs matched, but connected audio was not confirmed; needs device/network test).