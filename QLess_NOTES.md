[2026-01-29 13:46]
- There was a previous solver version that "felt good" to Ahsan (found solutions reliably) before any common-words / Scrabble / engagement changes.
- Goal: resurrect that solver as baseline, then:
  1) Add a tiny test harness: known solvable letter sets must return ≥1 solution.
  2) Use a single Scrabble dictionary (NWL) as the *only* word source for both solver and user-entered words.
  3) Solver should search directly over Scrabble words (no separate validator), so solutions are always Scrabble-legal.
- Current status: qless-game.vercel.app is on solver-v4 + Replit config, but UX is still "broken" (often no solutions found).
