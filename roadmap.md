# Call reliability
- [x] Repair matchmaking and call signaling races.
- [x] Handle microphone permissions, audio playback, disconnects, and cleanup visibly.
- [x] Verify two-person audio, mute, hangup, cancellation, and regression tests (two successive calls with inbound audio packets on both peers; seven tests passed).
- [x] Check availability of a relay for restrictive mobile networks (no existing connection available).
- [ ] Enable a TURN relay for restrictive networks (requested now) — no provider connection or TURN credentials are configured; obtain an external provider account and credentials, integrate short-lived server-issued credentials, and verify a forced-relay two-person audio call before marking active.