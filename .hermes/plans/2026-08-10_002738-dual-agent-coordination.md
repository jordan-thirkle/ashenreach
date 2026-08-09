# Dual-Agent Shared-Repo Coordination Plan (Hermes + Command Code CLI)

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.
> Applies ONLY after user approves execution (currently in plan mode).

**Goal:** Make two AI agents (Hermes and the commandcode CLI) work correctly on the single shared Ashenreach repo at `D:\Projects\Brawler` without clobbering each other, and clean current working-tree drift so state is trustworthy again.

**Architecture:** One repo, one working tree, one origin (`github.com/jordan-thirkle/ashenreach`). Both agents edit the same files on the same disk and share the same `.git`. Sharing happens automatically at the filesystem level; **push is the only cross-machine sync** (for Vercel/CI/backup). No per-agent branches — YAGNI for a solo dev + two agents. Instead: (1) a single handoff file that records who owns what, (2) strict pull-rebase-before-edit / commit-per-chunk / push-after-chunk, (3) hygiene that removes both agents' temp noise so `git status` is a truthful signal.

**Tech Stack:** git (Git for Windows / git-bash), Vite + TypeScript + three.js, Command Code CLI, Hermes terminal.

---

## Current Context (verified read-only, 2026-08-10)

- `git status -sb` → `## master...origin/master`; local == origin: `0 0` ahead/behind. **Everything committed so far is already shared.**
- Uncommitted (tracked, modified): `PROGRESS.md`, `src/Game.ts` (diff is EMPTY — likely CRLF normalization via autocrlf; must be resolved before trust), `tests/e2e/REPORT.md`, `tests/e2e/metrics.json`, `tests/e2e/report.json` (regenerated every run — should be untracked).
- Untracked: `NEXT.md` (Command Code's handoff/protocol — KEEP, it's authoritative for their pending work), `cap_boot.mjs`, `cap_cam.mjs`, `cap_cam2.mjs`, `cap_err.mjs`, `cap_play.mjs` (Hermes debug scripts — DELETE after camera verification is done).
- `.hermes/` does not exist yet (created by this plan file).
- `NEXT.md` pending items (Command Code's): restore node_modules dep w/o force-copy, fresh typecheck/unit/build, biome fix acceptance, gameplay verification status, persistence semantics for souls/death piles, HUD clarity for souls + cairn instruction, preserve E2E reports/scripts until ownership resolved, keep dependency-mutation lessons as observations (no CC infra change).

## Risks / Open Questions

1. **`src/Game.ts` status-vs-diff mismatch** — `git status` says modified but `git diff` is empty. Almost certainly CRLF (autocrlf) touch, but MUST be inspected (`git diff --ignore-space-at-eol`, then `git add -p` if real) before assuming clean. If it's pure line-ending churn, normalize via `.gitattributes` (`*.ts text eol=lf`) and don't commit noise.
2. **Ownership collision** — both agents touching `src/` concurrently. Mitigated by HANDOFF file + rule "one agent in `src/` at a time".
3. **Locked `node_modules/@rollup/...` binary** (NEXT.md #1) — held by some process; do NOT force-copy or hand-edit node_modules. Retry restore when lock released.
4. **E2E reports are already tracked** — `.gitignore` alone won't drop them; need `git rm --cached` once.
5. **Persistence semantics (NEXT #4)** — design decision pending; affects Save.ts/Scores.ts and the marketing "Your run" panel. Do not implement until user decides.

---

## Task 1: Snapshot the real `src/Game.ts` diff

**Objective:** Determine whether the uncommitted `src/Game.ts` change is real code or CRLF noise; resolve so the tree is trustworthy.

**Files:** `src/Game.ts`

- Step 1: Inspect with whitespace-insensitive diff.
  Run: `git diff --ignore-space-at-eol src/Game.ts`
  Expected: empty if CRLF-only; real hunks if actual code.
- Step 2: If real code, review it and confirm whose work it is (check against NEXT.md items / recent commandcode edits). Do NOT commit blindly.
- Step 3: If CRLF-only, add `.gitattributes` at repo root:
  `*.ts text eol=lf` (plus `*.mjs text eol=lf`, `*.json text eol=lf`)
- Step 4: Normalize + confirm clean.
  Run: `git add --renormalize src/Game.ts && git diff --cached --stat`
  Expected: empty staged diff (or only the real change).
- Step 5: Commit.
  `git add .gitattributes src/Game.ts && git commit -m "chore: normalize line endings via .gitattributes"`

## Task 2: Untrack E2E report noise (one-time)

**Objective:** Stop regenerated test reports from appearing in every `git status`.

**Files:** `tests/e2e/REPORT.md`, `tests/e2e/metrics.json`, `tests/e2e/report.json`, `.gitignore`

- Step 1: `git rm --cached tests/e2e/REPORT.md tests/e2e/metrics.json tests/e2e/report.json`
- Step 2: Confirm `.gitignore` covers them (already added last session; verify).
  Run: `grep -n "e2e" .gitignore`
- Step 3: Commit.
  `git commit -m "chore: untrack regenerated e2e reports (keep on disk, out of git)"`

## Task 3: Delete Hermes debug scripts (ownership resolved—camera verified)

**Objective:** Remove temp Playwright capture scripts that pollute the shared tree; Command Code's NEXT.md says preserve temp scripts until ownership resolved — camera verification is now done, so ownership resolves to DELETE for `cap_*.mjs`.

**Files:** Delete `cap_boot.mjs`, `cap_cam.mjs`, `cap_cam2.mjs`, `cap_err.mjs`, `cap_play.mjs`

- Step 1: Confirm nothing references them (`grep -rn "cap_" src/ tests/ scripts/ web/` → no hits).
- Step 2: `rm cap_boot.mjs cap_cam.mjs cap_cam2.mjs cap_err.mjs cap_play.mjs`
- Step 3: Add guard to `.gitignore`: `cap_*.mjs`
- Step 4: Commit: `git commit -am "chore: remove debug capture scripts; guard cap_*.mjs"`

## Task 4: Handoff file — who owns what, right now

**Objective:** One authoritative file both agents read/write before touching `src/`.

**Files:** Create `.hermes/HANDOFF.md`

Content (starter):
```
# Agent Handoff — Ashenreach
Last updated: <date>
- Hermes: camera verification DONE (live numeric above:true 2026-08-10). Marketing site v2 shipped.
- CommandCode: biome fix pending acceptance; dep restore blocked on rollup binary lock (NEXT.md #1).
- RULE: one agent in src/ at a time. Write here before starting a src/ edit; clear after push.
- Persistence semantics (NEXT #4): awaiting Jordan's decision — do not implement yet.
```
- Step 1: Write `.hermes/HANDOFF.md`.
- Step 2: Add a pointer line in `AGENTS.md` so future sessions see it: `Before touching src/, read .hermes/HANDOFF.md`.
- Step 3: Commit: `git commit -am "docs: agent handoff protocol + AGENTS.md pointer"`

## Task 5: Working protocol (pull-rebase / commit / push) documented for both agents

**Objective:** Encode the "how we work together" contract in the repo so any future agent follows it.

**Files:** `AGENTS.md` (add section)

```
## Shared-repo protocol (Hermes + Command Code CLI)
- One tree, one origin. Disk writes are instantly shared; PUSH is for Vercel/CI/backup only.
- Before editing src/: git pull --rebase && read .hermes/HANDOFF.md. Write your name there if you're first in.
- Commit per logical chunk; push after each chunk. Never force-push. Never hand-edit node_modules.
- Leave `git status` truthful: no temp scripts, no regenerated reports, no CRLF noise.
- E2E reports regenerate every run — they are gitignored; do not re-add.
```

- Step 1: Add section to `AGENTS.md`.
- Step 2: Also mirror into `CLAUDE.md` pointer (already points to AGENTS.md — confirm).
- Step 3: Commit.

## Task 6: Verify shared state end-to-end (post-hygiene)

**Objective:** Prove both agents see an identical, clean, buildable tree.

**Files:** none (verification only)

- Step 1: `git status --short` → expected: empty (or only known NEXT.md / HANDOFF-tracked files).
- Step 2: `git rev-list --left-right --count origin/master...HEAD` → `0 0`.
- Step 3: `npm run typecheck && npm run build` → green.
- Step 4: `E2E_PORT=4191 node tests/e2e/run.mjs` → PASS (LUM>0, 0 console errors).
- Step 5: `git pull --rebase` → "Already up to date" (proves origin in sync).
- Step 6: Report to Jordan: tree clean, both agents' work accounted for, camera verified live.

## Task 7: What each agent does next (after protocol is in place)

**Objective:** Clear division so no collision on the next sprint.

- Hermes: awaits Jordan's persistence-semantics decision (NEXT #4), then Save/Scores + marketing "Your run" panel wiring; meanwhile can do docs/SEO/config.
- CommandCode: NEXT.md #1–#3 (dep restore → typecheck/unit/build → biome fix acceptance).

---

## Verification (overall)

- `git status` clean (no temp, no reports, no CRLF noise)
- `origin/master...HEAD` = `0 0` after final push
- `npm run typecheck` + `npm run build` + e2e PASS on the shared tree
- `AGENTS.md` + `.hermes/HANDOFF.md` present and both agents can follow without asking Jordan

## Tradeoffs

- **Branch-per-agent rejected**: more merge overhead than a solo dev + two workers needs; the handoff file is cheaper.
- **CRLF normalization via .gitattributes** is the durable fix vs chasing whitespace diffs forever.
- **Keeping NEXT.md as Command Code's handoff** (not folding it away) preserves their authority over their own queue; we only add our own handoff lane.

## Open Questions for Jordan

1. Persistence semantics (NEXT #4): souls banked vs death piles vs collected world state — decide before Save/Scores work.
2. Should the marketing "Your run" panel show souls-banked from the live save once persistence lands? (currently shows best score only)
3. Is the camera-verification instrumentation acceptable to remove (Task 3) or do you want it kept until you've eyeballed the live build yourself?