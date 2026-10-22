# Call reliability
- [x] Repair matchmaking and call signaling races.
- [x] Handle microphone permissions, audio playback, disconnects, and cleanup visibly.
- [x] Verify two-person audio, mute, hangup, cancellation, and regression tests (two successive calls with inbound audio packets on both peers; seven tests passed).
- [x] Check availability of a relay for restrictive mobile networks (no existing connection available).
- [x] Enable a TURN relay: Cloudflare TURN credentials issued server-side (1h), verified live.

# Call controls and safety
- [ ] Suspend the current guest entry immediately after a valid call report; allow fresh re-entry without permanent bans.
- [ ] Add Próximo with a new search and no forced call time limit.
- [ ] Ask for a name on each new entry; add own gender and both call indicators.
- [ ] Add reporting and enforceable moderation/ban controls (identity and review approach awaiting user decision).
- [ ] Verify changed call flows and safety rules.