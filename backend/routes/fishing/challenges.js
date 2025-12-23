/**
 * Fishing Challenges Routes
 * 
 * Handles: /challenges, /challenges/:id/claim
 * Daily challenge system.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { enforcementMiddleware } = require('../../middleware/enforcement');
const { deviceBindingMiddleware } = require('../../middleware/deviceBinding');
const { User } = require('../../models');

// Config imports
const { DAILY_CHALLENGES } = require('../../config/fishing');

// Service imports
const { getOrResetChallenges, applyChallengeRewards } = require('../../services/fishingService');

// Error classes
const {
  UserNotFoundError,
  ChallengeError
} = require('../../errors/FishingErrors');

// GET / - Get current daily challenges
// Security: enforcement checked (banned users cannot access game features)
router.get('/', [auth, enforcementMiddleware], async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const { challenges, autoClaimedRewards } = getOrResetChallenges(user);
    
    // Check if challenges were just reset
    const wasReset = challenges.date !== user.fishingChallenges?.date;
    
    // If reset occurred with unclaimed rewards, apply them now
    if (autoClaimedRewards.length > 0) {
      applyChallengeRewards(user, autoClaimedRewards);
    }
    
    // Save if reset or auto-claim occurred
    if (wasReset || autoClaimedRewards.length > 0) {
      user.fishingChallenges = challenges;
      await user.save();
    }
    
    // Build detailed challenge info
    const challengeDetails = challenges.active.map(id => {
      const challenge = DAILY_CHALLENGES[id];
      if (!challenge) return null;
      
      return {
        id: challenge.id,
        name: challenge.name,
        description: challenge.description,
        difficulty: challenge.difficulty,
        target: challenge.target,
        progress: challenges.progress[id] || 0,
        completed: challenges.completed.includes(id),
        reward: challenge.reward
      };
    }).filter(Boolean);
    
    // Calculate UTC midnight for reset time
    const now = new Date();
    const utcMidnight = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() + 1, // Next day
      0, 0, 0, 0
    ));
    
    res.json({
      challenges: challengeDetails,
      completedToday: challenges.completed.length,
      resetsAt: utcMidnight.toISOString(),
      timezone: 'UTC', // Fix 5.1: Document that reset is UTC-based
      // Include auto-claimed rewards info if any occurred during this request
      autoClaimedRewards: autoClaimedRewards.length > 0 ? autoClaimedRewards : undefined
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/claim - Claim a completed challenge reward
// Security: enforcement checked, device binding verified
router.post('/:id/claim', [auth, enforcementMiddleware, deviceBindingMiddleware('reward_claim')], async (req, res, next) => {
  try {
    const { id: challengeId } = req.params;
    
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const { challenges, autoClaimedRewards } = getOrResetChallenges(user);
    
    // If reset occurred with auto-claims, apply them first
    if (autoClaimedRewards.length > 0) {
      applyChallengeRewards(user, autoClaimedRewards);
      user.fishingChallenges = challenges;
      await user.save();
      
      // Check if the requested challenge was auto-claimed
      if (autoClaimedRewards.some(r => r.id === challengeId)) {
        throw new ChallengeError('already_claimed');
      }
    }
    
    const challenge = DAILY_CHALLENGES[challengeId];
    
    if (!challenge) {
      throw new ChallengeError('not_found');
    }
    
    if (!challenges.active.includes(challengeId)) {
      throw new ChallengeError('not_active');
    }
    
    const progress = challenges.progress[challengeId] || 0;
    if (progress < challenge.target) {
      throw new ChallengeError('not_completed', { progress, target: challenge.target });
    }
    
    if (challenges.completed.includes(challengeId)) {
      throw new ChallengeError('already_claimed');
    }
    
    // Apply rewards
    const rewards = [];
    if (challenge.reward.points) {
      user.points = (user.points || 0) + challenge.reward.points;
      rewards.push(`+${challenge.reward.points} points`);
    }
    if (challenge.reward.rollTickets) {
      user.rollTickets = (user.rollTickets || 0) + challenge.reward.rollTickets;
      rewards.push(`+${challenge.reward.rollTickets} roll tickets`);
    }
    if (challenge.reward.premiumTickets) {
      user.premiumTickets = (user.premiumTickets || 0) + challenge.reward.premiumTickets;
      rewards.push(`+${challenge.reward.premiumTickets} premium tickets`);
    }
    
    // Mark as completed
    challenges.completed.push(challengeId);
    user.fishingChallenges = challenges;
    
    // Update achievements
    const achievements = user.fishingAchievements || {};
    achievements.challengesCompleted = (achievements.challengesCompleted || 0) + 1;
    user.fishingAchievements = achievements;
    
    await user.save();
    
    res.json({
      success: true,
      challenge: challengeId,
      rewards: challenge.reward,
      message: `Challenge completed! ${rewards.join(', ')}`
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

