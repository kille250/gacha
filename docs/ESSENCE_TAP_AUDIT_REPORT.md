# Essence-Tap Game: Bug Hunt & Validation Audit Report

**Audit Date:** 2026-01-03
**Auditor:** Claude (Opus 4.5)
**Scope:** Complete security, functional, and logic audit of essence-tap clicker minigame

---

## Executive Summary

After comprehensive review of the essence-tap game codebase, I found **4 potential issues** warranting attention. The codebase is generally well-written with good security practices in place, including:

- Server-side validation of all client inputs
- Rate limiting on clicks and API endpoints
- Proper transaction handling for state changes
- Deduplication mechanisms for multi-tab scenarios
- Weekly FP cap enforcement across all FP sources

Most of the items flagged in the original audit checklist have already been addressed with proper fixes.

---

## FINDINGS (FIXED)

### [LOW] Issue 1: Jackpot FP Award Uses Wrong Property Name - FIXED

**Type**: Logic Error
**Location**: `backend/websocket/essenceTapHandler.js:1216`, `backend/routes/essenceTap.js:1206`
**Description**: When awarding fate points from jackpot win, the code used `fpResult.appliedFP` but `applyFPWithCap` returns `actualFP`.

**Fix Applied**: Changed to use `fpResult.actualFP` with proper object structure for fatePoints.

---

### [LOW] Issue 2: Inconsistent FatePoints Field Structure - FIXED

**Type**: Logic Error
**Location**: `backend/websocket/essenceTapHandler.js:1216`, `backend/routes/essenceTap.js:1206`
**Description**: The jackpot FP award treated `user.fatePoints` as a number, but elsewhere it's an object with `global.points` structure.

**Fix Applied**: Updated jackpot FP handling to use consistent object structure matching other FP award paths.

---

### [INFO] Issue 3: Time Warp Ability Does Not Respect maxOfflineHours Cap

**Type**: Potential Logic Issue
**Location**: `backend/services/essenceTapService.js:2064-2070`
**Description**: The Time Warp ability grants 30 minutes of instant production without checking against `maxOfflineHours`.

**Current Behavior**:
```javascript
if (ability.id === 'time_warp' && ability.effects?.offlineMinutes) {
  const offlineMinutes = ability.effects.offlineMinutes;
  const productionPerSecond = calculateProductionPerSecond(state, []);
  bonusEssence = Math.floor(productionPerSecond * offlineMinutes * 60 * GAME_CONFIG.offlineEfficiency);
  newState.essence = (state.essence || 0) + bonusEssence;
  newState.lifetimeEssence = (state.lifetimeEssence || 0) + bonusEssence;
}
```

**Analysis**: This is likely **intentional design** - Time Warp is a prestige-5 ability with a 5-minute cooldown, so the 30-minute instant production is a reward for progression. The `maxOfflineHours` (8 hours) is for actual offline time tracking, not ability bonuses.

**Recommendation**: No change required - document this as intentional if not already documented.

---

### [INFO] Issue 4: Character Assignment Validation Gap

**Type**: Security (Minor)
**Location**: `backend/services/essenceTapService.js:1544-1568`
**Description**: The `assignCharacter` function validates character ownership by checking against `ownedCharacters` array, but this array is constructed from the database query and passed from the caller.

**Current Behavior**:
```javascript
function assignCharacter(state, characterId, ownedCharacters) {
  const isOwned = ownedCharacters.some(c => c.id === characterId || c.characterId === characterId);
  if (!isOwned) {
    return { success: false, error: 'Character not owned' };
  }
  // ...
}
```

**Analysis**: The validation depends on the caller correctly fetching owned characters. Looking at the WebSocket handler:
```javascript
const userCharacters = await UserCharacter.findAll({
  where: { UserId: userId },
  include: ['Character'],
  transaction
});
```

This is correctly fetching only the user's owned characters, so the validation is sound.

**Recommendation**: No change required - this is a defense-in-depth pattern.

---

## AREAS VERIFIED AS CORRECT

### Combo System ✅
- Combo decay (1500ms) correctly implemented with server-side validation
- `maxComboMultiplier` (2.5) enforced in `processTapBatch` (line 267-269 in essenceTapHandler.js)
- Combo multiplier validated before processing taps

### Critical Hits ✅
- Base crit chance (1%) + upgrades + element bonuses calculated correctly
- `baseCritMultiplier` (10x) stacks correctly with upgrades
- Crit streak tracking handles batch processing appropriately

### Golden Essence ✅
- 0.1% chance per click with proper RNG
- 100x multiplier applied after all other multipliers
- Golden essence correctly tracked in `essenceTypes.golden`

### Generator System ✅
- Cost calculation uses `baseCost * (costMultiplier ^ owned)` correctly
- Bulk purchase calculates sum of individual costs
- `getMaxPurchasable` handles edge case of 0 affordable
- Generator ID validation prevents non-existent generator purchases
- Count validation prevents negative/zero purchases (line 973)

### Upgrade System ✅
- Upgrades checked against `purchasedUpgrades` array before purchase (line 1028)
- `requiredOwned` validated for generator upgrades (line 1046-1050)
- All upgrade types apply effects correctly

### Prestige System ✅
- 50M lifetime essence minimum enforced (line 1092)
- 4-hour cooldown tracked server-side (lines 1096-1109)
- Shard calculation: `floor(sqrt(lifetimeEssence / 10,000,000))` correct
- Prestige correctly resets essence, generators, upgrades, infusions
- Prestige preserves lifetimeEssence, lifetimeShards, prestigeUpgrades, assignedCharacters
- Fate Points rewards with weekly cap enforcement

### Gambling System ✅
- `minBet` (1000) enforced (line 1885)
- `maxBetPercent` (50%) enforced (lines 1889-1891)
- Cooldown (15 seconds) enforced server-side (lines 1862-1864)
- `maxDailyGambles` (10) tracked and enforced (lines 1868-1870)
- Bet type validation rejects invalid strings (lines 1874-1877)
- Bet amount sanitized with `Math.floor(Number(betAmount))` (line 1880)
- Essence clamped to 0 minimum on loss (line 1910)

### Infusion System ✅
- Cost calculation: base 50% + 5% per infusion, capped at 80%
- `minimumEssence` (100,000) required (line 1967)
- `maxPerPrestige` (5) enforced (line 1962)
- Infusion count correctly resets on prestige

### Weekly Tournament ✅
- Week reset on Monday 00:00 UTC (ISO week calculation)
- Tier thresholds checked against weekly essence
- Burning hour 2x multiplier applied correctly
- Daily checkpoints tracked with proper claiming logic
- Streak system enforces 10M minimum to maintain

### Character System ✅
- `maxAssignedCharacters` (5) enforced
- Only owned characters can be assigned
- Duplicate character IDs prevented
- Element derivation falls back to 'neutral'
- Mastery hours tracked per character

### Daily System ✅
- Daily reset at midnight UTC
- All daily counters reset (clicks, crits, essenceEarned, gamblesUsed)
- Challenge progress tracked correctly
- Challenges cannot be completed multiple times same day

### Active Abilities ✅
- Cooldowns stored as timestamps server-side
- Prestige level checked before activation
- Effects tracked and applied during duration
- `getActiveAbilityEffects` correctly returns current active effects

### Offline Progress & Sync ✅
- Offline capped at 8 hours (`maxOfflineHours`)
- 50% efficiency (`offlineEfficiency`) applied
- Earth element bonuses applied to offline
- Server timestamp used for calculations
- Multi-tab deduplication via initialization cache
- Passive gain reconciliation with 1-second guard

### Milestones & Rewards ✅
- One-time milestones claimed only once (checked against `claimedMilestones`)
- Repeatable milestones tracked correctly
- Weekly FP cap (100) enforced across all sources
- One-time milestones exempt from weekly cap

### Frontend/Backend Config Sync ✅
- Boss config values match between frontend and backend
- Tournament tiers synchronized
- Ability durations/cooldowns match
- Frontend notes previous sync fixes in comments

---

## PREVIOUSLY FIXED BUGS (Documented in Code)

The codebase contains comments referencing bug fixes that have been properly implemented:

1. **BUG #1**: Batch processing race conditions - Fixed with batch lock mechanism
2. **BUG #3 & #8**: Multi-tab duplicate offline earnings - Fixed with initialization cache
3. **BUG #6**: Prestige race conditions - Fixed with batch lock before transaction

---

## SECURITY POSTURE

### Strengths
1. All client inputs validated server-side
2. Rate limiting prevents click abuse (25 clicks/second max)
3. Transactions with row locking for state changes
4. Deduplication prevents exploit attempts across tabs
5. Timestamps validated server-side to prevent manipulation
6. Bet amounts sanitized and bounded

### Recommendations
1. Consider adding request signing for WebSocket messages
2. Consider adding server-side combo decay verification
3. Add monitoring/alerting for suspicious patterns (e.g., consistent max combo)

---

## CONCLUSION

The essence-tap game has a solid security and validation foundation. The two actionable issues found are both low severity and related to FP handling in the jackpot system. All major exploit vectors identified in the audit checklist have been addressed with appropriate mitigations.

**Fixes Applied:**
1. ✅ Fixed `appliedFP` → `actualFP` property name in jackpot handlers
2. ✅ Fixed fatePoints structure handling in jackpot handlers

