/**
 * Fishing Challenges Routes
 * 
 * Handles: /challenges, /challenges/:id/claim
 * Daily challenge system.
 */

const express = require('express');
const router = express.Router();
const auth = require('../../middleware/auth');
const { User } = require('../../models');

// Config imports
const { DAILY_CHALLENGES } = require('../../config/fishing');

// Service imports
const { getOrResetChallenges } = require('../../services/fishingService');

// Error classes
const {
  UserNotFoundError,
  ChallengeError
} = require('../../errors/FishingErrors');

// GET / - Get current daily challenges
router.get('/', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const challenges = getOrResetChallenges(user);
    
    // Check if challenges were just reset
    const wasReset = challenges.date !== user.fishingChallenges?.date;
    
    // Save if reset occurred
    if (wasReset) {
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
    
    res.json({
      challenges: challengeDetails,
      completedToday: challenges.completed.length,
      resetsAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
    });
  } catch (err) {
    next(err);
  }
});

// POST /:id/claim - Claim a completed challenge reward
router.post('/:id/claim', auth, async (req, res, next) => {
  try {
    const { id: challengeId } = req.params;
    
    const user = await User.findByPk(req.user.id);
    if (!user) throw new UserNotFoundError(req.user.id);
    
    const challenges = getOrResetChallenges(user);
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

