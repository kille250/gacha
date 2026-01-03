# Essence Tap Configuration Changelog

This document tracks the version history and major changes to the Essence Tap game configuration.

## Version 4.0 - Tournament Enhancements (Current)

### Overview
Major overhaul of the weekly tournament system to create a more engaging competitive experience with better retention mechanics.

### New Features
- **Bracket System**: Players compete within skill-matched brackets (S, A, B, C) based on percentile rankings
- **Rank-Based Rewards**: Position within bracket now awards specific rewards, cosmetics, and titles
- **Daily Checkpoints**: 7 cumulative milestones throughout the week provide mid-week engagement
- **Burning Hours**: Limited-time 2x essence multiplier events create appointment gaming
- **Tournament Streaks**: Consecutive weekly participation rewards with up to 25% essence bonus
- **Tournament Cosmetics**: Exclusive avatar frames, titles, badges, and profile flair
- **Underdog Mechanics**: Catch-up bonuses for players behind in rankings

### Balance Changes
- Rebalanced Champion tier threshold: 100B → 25B (more achievable)
- Adjusted tier rewards to fit within weekly FP cap
- Added promotion/demotion system between brackets
- Introduced bracket-specific leaderboards (max 50 players per bracket)

### Cosmetics Added
- Champion's Laurel (frame) - 1st place finisher
- Podium frames (silver/bronze) - 2nd/3rd place
- Top 10 badge
- Streak badges (4, 8, 12 weeks)
- Dedicated Player and Tournament Veteran frames
- Bracket Champion frame
- Essence Champion title

---

## Version 3.0 - Major Rebalancing

### Overview
Extended the game's progression curve from 2-4 hours to 2-4 weeks, creating a more sustainable long-term experience.

### Progression Changes
- **First Prestige**: Increased from ~30 minutes to 4-6 hours of play
- **Endgame Duration**: Extended from 2-4 hours to 2-4 weeks
- **Early Game**: Maintained fast progression (first generator in 30s)
- **Mid Game**: Tier 5 generators now achievable in 3-4 hours (was <1 hour)
- **Late Game**: Tier 10 generators require 2-3 weeks (was hours)

### Generator Changes
- Reduced base outputs across all tiers (especially early game)
  - Essence Sprite: 1.0 → 0.5 essence/sec
  - Mana Well: 8 → 3 essence/sec
  - Crystal Node: 47 → 15 essence/sec
  - (continued pattern through all tiers)
- Increased costs significantly
  - Void Rift: 1.4M → 10M base cost
  - Celestial Gate: 20M → 250M base cost
  - Eternal Nexus: 330M → 7.5B base cost
  - Primordial Core: 5.1B → 250B base cost
  - Infinity Engine: 75B → 10T base cost
- Raised unlock thresholds to require investment in current tier

### Click Upgrade Changes
- Reduced power bonuses
  - Total click power from upgrades: 73 → 32.5
  - Total crit chance from upgrades: 20% → 11%
  - Total crit multiplier from upgrades: 40x → 18x
- Increased costs significantly (10-50x increase)
- Made critical hit upgrades more expensive to prevent early burst damage

### Generator Upgrade Changes
- Increased costs (5-100x increase)
- Increased required ownership to unlock
  - Tier 1: 10 → 15 generators required
  - Tier 2: 50 → 75 generators required

### Global Upgrade Changes
- Massively increased costs (10x-250x increase)
- Now positioned as late-game power spikes
- Essence Supremacy now requires billions of essence

### Synergy Upgrade Changes
- Increased costs (10-20x increase)
- Positioned as meaningful mid-game choices

### Prestige System Changes
- Minimum essence to prestige: 1M → 50M
- Prestige cooldown: 1 hour → 4 hours (prevent FP farming)
- Shard divisor: 1M → 10M (slower accumulation)
- Shard multiplier: 1% → 2% per shard (more impactful)
- Maximum effective shards: 1000 → 500
- Prestige upgrade costs increased
- Prestige upgrade bonuses reduced to balance longer progression

### Fate Points & Milestones
- Scaled all milestone thresholds to new economy
- First FP milestone: 1M → 10M essence (~2-3 hours)
- Added new late-game milestones (1T, 10T)
- Weekly essence milestone: 100M → 1B
- Repeatable milestone threshold: 100B → 1T

### Daily Challenges
- Scaled essence rewards and targets to match new economy
- Click-based targets unchanged (activity-based)

### Ticket Generation
- Scaled essence targets for ticket challenges
- Generator milestone thresholds increased
- Maintained achievable targets for mobile sessions

### Mini-Milestones
- Kept early milestones achievable for short sessions
- Scaled later session milestones to match economy
- Maintained 2-5 minute session engagement goals

---

## Version 2.0 - Enhancement Update

### New Systems
- **Character Mastery System**
  - 10 mastery levels per character
  - XP earned based on time assigned
  - +2% production bonus per mastery level
  - Special abilities unlock at levels 5 and 10
  - 50 Account XP reward for reaching max mastery

- **Essence Type Variety**
  - Pure Essence (from clicks)
  - Ambient Essence (from generators)
  - Golden Essence (rare, 10x value)
  - Prismatic Essence (ultra-rare, 100x value)
  - Some premium upgrades require specific essence types

- **Series Synergy Bonuses**
  - Matching dojo system mechanics
  - Bonuses for using characters from same series
  - Diversity bonus for all different series
  - Featured series rotation (weekly, +25% bonus)

- **Weekly Tournament/Leaderboard**
  - 6 competitive tiers (Bronze through Champion)
  - Tier-based rewards (FP and roll tickets)
  - Participation rewards for engagement
  - Featured series bonus during tournaments
  - Leaderboard refreshes every 5 minutes

- **Enhanced Gamble System**
  - Progressive jackpot system
  - Three bet types (safe, risky, extreme)
  - Jackpot chance increases with bet type and streak
  - Maximum 10 gambles per day with cooldowns

- **Additional Roll Ticket Generation**
  - Daily ticket challenges
  - Golden essence exchange system
  - Streak bonuses for consecutive play
  - Generator milestone tickets
  - FP to ticket exchange (limited)

### Feature Additions
- Click power now scales with generator count (+0.1% per generator, cap at +200%)
- Repeatable essence milestones for ongoing FP rewards
- Element derivation for characters without explicit element
- Underdog bonuses for common/uncommon characters
- Golden essence events (0.1% chance, 100x value)

### Balance Changes
- Added combo system (max 2.5x multiplier, 1.5s decay time)
- Increased max offline hours: 4 → 8 hours
- Added weekly FP cap (100 FP/week from Essence Tap)
- Prestige FP rewards: First prestige 25 → 20 FP, per prestige 10 → 8 FP

---

## Version 1.0 - Initial Release

### Core Systems
- **10-tier generator system**
  - Essence Sprite through Infinity Engine
  - Exponential cost scaling (1.15x multiplier)
  - Progressive unlock thresholds

- **Upgrade System**
  - Click upgrades (power, crit chance, crit multiplier)
  - Generator upgrades (2x multipliers)
  - Global upgrades (+10% to +100% all production)
  - Synergy upgrades (generators boost each other)

- **Prestige System**
  - Awakening shards based on lifetime essence
  - Permanent multipliers from shards
  - Purchasable prestige upgrades with shard currency
  - Starting essence bonus after prestige

- **Character Integration**
  - Up to 5 characters can be assigned
  - Rarity-based production bonuses
  - Element-based special abilities
  - Element synergy bonuses

- **Core Mechanics**
  - Click-to-earn essence
  - Passive generation from purchased generators
  - Critical hits (1% base chance, 10x multiplier)
  - Combo system for active clicking
  - Offline progress (50% efficiency, max 4 hours)

- **Daily Systems**
  - Daily challenges with rewards
  - Daily modifiers (rotating by day of week)
  - Daily FP caps and limits

- **Active Abilities**
  - Essence Storm (10x production for 5s)
  - Critical Focus (guaranteed crits for 3s)
  - Golden Rush (50x golden chance for 10s)
  - Time Warp (instant offline progress)

- **Risk/Reward Mechanics**
  - Gamble system (bet essence for multiplied returns)
  - Infusion system (permanent boost for essence cost)

- **Fate Points Integration**
  - One-time milestones (5-100 FP)
  - Repeatable weekly milestones
  - Prestige rewards
  - XP rewards for various activities

### Balance Philosophy
- Early game: 0-10 min, fast and rewarding
- Mid game: Hours 1-10, steady progression
- Late game: Days 1-7, slower but satisfying
- Endgame: Weeks 2-4, optimization and mastery
