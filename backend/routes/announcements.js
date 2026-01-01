const express = require('express');
const router = express.Router();
const { Op } = require('sequelize');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');
const { Announcement, UserAnnouncementStatus, User } = require('../models');
const { isValidUUID, parseDate } = require('../utils/validation');
const { logSecurityEvent, AUDIT_EVENTS } = require('../services/auditService');

// ===========================================
// PUBLIC / USER ENDPOINTS
// ===========================================

/**
 * GET /api/announcements
 * Get all active announcements for the current user
 * Returns announcements with user's read/acknowledged status
 */
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Determine target audience for user
    // For now, we use 'all' for regular users, 'admins' for admin users
    const targetAudiences = ['all'];
    if (user.isAdmin) {
      targetAudiences.push('admins');
    }
    // Could add 'premium' or 'new_users' based on user attributes

    const now = new Date();

    // Get active announcements
    const announcements = await Announcement.findAll({
      where: {
        status: 'published',
        targetAudience: { [Op.in]: targetAudiences },
        [Op.or]: [
          { publishAt: null },
          { publishAt: { [Op.lte]: now } }
        ],
        [Op.and]: [
          {
            [Op.or]: [
              { expiresAt: null },
              { expiresAt: { [Op.gt]: now } }
            ]
          }
        ]
      },
      order: [
        ['priority', 'DESC'],
        ['createdAt', 'DESC']
      ],
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    // Get user's statuses for these announcements
    const announcementIds = announcements.map(a => a.id);
    const statuses = await UserAnnouncementStatus.findAll({
      where: {
        userId,
        announcementId: { [Op.in]: announcementIds }
      }
    });

    const statusMap = new Map(statuses.map(s => [s.announcementId, s]));

    // Merge announcements with user status
    const result = announcements.map(announcement => {
      const status = statusMap.get(announcement.id);
      return {
        ...announcement.toJSON(),
        userStatus: status ? {
          viewedAt: status.viewedAt,
          acknowledgedAt: status.acknowledgedAt,
          dismissedAt: status.dismissedAt
        } : null,
        isRead: !!status?.viewedAt,
        isAcknowledged: !!status?.acknowledgedAt,
        isDismissed: !!status?.dismissedAt
      };
    });

    // Calculate unread count
    const unreadCount = result.filter(a => !a.isRead && !a.isDismissed).length;

    return res.json({
      announcements: result,
      unreadCount
    });
  } catch (err) {
    console.error('Error fetching announcements:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/announcements/unacknowledged
 * Get announcements that require acknowledgment but haven't been acknowledged
 * Used for showing mandatory acknowledgment modals
 */
router.get('/unacknowledged', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const announcements = await Announcement.getUnacknowledgedAnnouncements(userId);

    return res.json({ announcements });
  } catch (err) {
    console.error('Error fetching unacknowledged announcements:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/announcements/:id
 * Get a specific announcement by ID
 */
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Get user's status for this announcement
    const status = await UserAnnouncementStatus.findOne({
      where: {
        userId: req.user.id,
        announcementId: id
      }
    });

    return res.json({
      ...announcement.toJSON(),
      userStatus: status ? {
        viewedAt: status.viewedAt,
        acknowledgedAt: status.acknowledgedAt,
        dismissedAt: status.dismissedAt
      } : null,
      isRead: !!status?.viewedAt,
      isAcknowledged: !!status?.acknowledgedAt,
      isDismissed: !!status?.dismissedAt
    });
  } catch (err) {
    console.error('Error fetching announcement:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/announcements/:id/view
 * Mark an announcement as viewed
 */
router.post('/:id/view', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const status = await UserAnnouncementStatus.markViewed(req.user.id, id);

    return res.json({
      message: 'Announcement marked as viewed',
      status: {
        viewedAt: status.viewedAt,
        acknowledgedAt: status.acknowledgedAt,
        dismissedAt: status.dismissedAt
      }
    });
  } catch (err) {
    console.error('Error marking announcement as viewed:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/announcements/:id/acknowledge
 * Acknowledge an announcement (for required acknowledgments)
 */
router.post('/:id/acknowledge', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const status = await UserAnnouncementStatus.markAcknowledged(req.user.id, id);

    return res.json({
      message: 'Announcement acknowledged',
      status: {
        viewedAt: status.viewedAt,
        acknowledgedAt: status.acknowledgedAt,
        dismissedAt: status.dismissedAt
      }
    });
  } catch (err) {
    console.error('Error acknowledging announcement:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/announcements/:id/dismiss
 * Dismiss an announcement (hide from user's view)
 */
router.post('/:id/dismiss', auth, async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Check if dismissible
    if (!announcement.dismissible) {
      return res.status(400).json({ error: 'This announcement cannot be dismissed' });
    }

    // Check if requires acknowledgment but not acknowledged
    if (announcement.requiresAcknowledgment) {
      const hasAcknowledged = await UserAnnouncementStatus.hasAcknowledged(req.user.id, id);
      if (!hasAcknowledged) {
        return res.status(400).json({
          error: 'You must acknowledge this announcement before dismissing it'
        });
      }
    }

    const status = await UserAnnouncementStatus.markDismissed(req.user.id, id);

    return res.json({
      message: 'Announcement dismissed',
      status: {
        viewedAt: status.viewedAt,
        acknowledgedAt: status.acknowledgedAt,
        dismissedAt: status.dismissedAt
      }
    });
  } catch (err) {
    console.error('Error dismissing announcement:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// ===========================================
// ADMIN ENDPOINTS
// ===========================================

/**
 * GET /api/announcements/admin/all
 * Get all announcements (including drafts and archived) for admin
 */
router.get('/admin/all', [auth, adminAuth], async (req, res) => {
  try {
    const { status, type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const where = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const { count, rows: announcements } = await Announcement.findAndCountAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    return res.json({
      announcements,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (err) {
    console.error('Error fetching all announcements:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/announcements/admin/:id
 * Get a specific announcement by ID (admin view with full details)
 */
router.get('/admin/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findByPk(id, {
      include: [{
        model: User,
        as: 'creator',
        attributes: ['id', 'username']
      }]
    });

    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    return res.json(announcement);
  } catch (err) {
    console.error('Error fetching announcement:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/announcements/admin
 * Create a new announcement
 */
router.post('/admin', [auth, adminAuth], async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'info',
      priority = 'medium',
      status = 'draft',
      displayMode = 'banner',
      targetAudience = 'all',
      dismissible = true,
      requiresAcknowledgment = false,
      publishAt,
      expiresAt
    } = req.body;

    // Validate required fields
    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Title is required' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Validate type
    const validTypes = ['maintenance', 'update', 'event', 'patch_notes', 'promotion', 'warning', 'info'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: 'Invalid announcement type' });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }

    // Validate status
    const validStatuses = ['draft', 'scheduled', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Validate display mode
    const validDisplayModes = ['banner', 'modal', 'inline', 'toast'];
    if (!validDisplayModes.includes(displayMode)) {
      return res.status(400).json({ error: 'Invalid display mode' });
    }

    // Validate target audience
    const validAudiences = ['all', 'premium', 'new_users', 'admins'];
    if (!validAudiences.includes(targetAudience)) {
      return res.status(400).json({ error: 'Invalid target audience' });
    }

    // If scheduled, require publishAt date
    if (status === 'scheduled' && !publishAt) {
      return res.status(400).json({ error: 'Scheduled announcements require a publish date' });
    }

    const announcement = await Announcement.create({
      title: title.trim(),
      content: content.trim(),
      type,
      priority,
      status,
      displayMode,
      targetAudience,
      dismissible,
      requiresAcknowledgment,
      publishAt: parseDate(publishAt),
      expiresAt: parseDate(expiresAt),
      createdBy: req.user.id
    });

    // Log admin action
    await logSecurityEvent(AUDIT_EVENTS.ADMIN_ACTION, req.user.id, {
      action: 'create_announcement',
      announcementId: announcement.id,
      title: announcement.title,
      type: announcement.type,
      status: announcement.status
    }, req);

    return res.status(201).json(announcement);
  } catch (err) {
    console.error('Error creating announcement:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * PUT /api/announcements/admin/:id
 * Update an existing announcement
 */
router.put('/admin/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const {
      title,
      content,
      type,
      priority,
      status,
      displayMode,
      targetAudience,
      dismissible,
      requiresAcknowledgment,
      publishAt,
      expiresAt
    } = req.body;

    // Validate type if provided
    if (type) {
      const validTypes = ['maintenance', 'update', 'event', 'patch_notes', 'promotion', 'warning', 'info'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid announcement type' });
      }
    }

    // Validate priority if provided
    if (priority) {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ error: 'Invalid priority level' });
      }
    }

    // Validate status if provided
    if (status) {
      const validStatuses = ['draft', 'scheduled', 'published', 'archived'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
    }

    // Validate display mode if provided
    if (displayMode) {
      const validDisplayModes = ['banner', 'modal', 'inline', 'toast'];
      if (!validDisplayModes.includes(displayMode)) {
        return res.status(400).json({ error: 'Invalid display mode' });
      }
    }

    // Validate target audience if provided
    if (targetAudience) {
      const validAudiences = ['all', 'premium', 'new_users', 'admins'];
      if (!validAudiences.includes(targetAudience)) {
        return res.status(400).json({ error: 'Invalid target audience' });
      }
    }

    // If changing to scheduled, require publishAt date
    const newStatus = status || announcement.status;
    const newPublishAt = publishAt !== undefined ? parseDate(publishAt) : announcement.publishAt;
    if (newStatus === 'scheduled' && !newPublishAt) {
      return res.status(400).json({ error: 'Scheduled announcements require a publish date' });
    }

    // Update fields
    await announcement.update({
      title: title !== undefined ? title.trim() : announcement.title,
      content: content !== undefined ? content.trim() : announcement.content,
      type: type || announcement.type,
      priority: priority || announcement.priority,
      status: status || announcement.status,
      displayMode: displayMode || announcement.displayMode,
      targetAudience: targetAudience || announcement.targetAudience,
      dismissible: dismissible !== undefined ? dismissible : announcement.dismissible,
      requiresAcknowledgment: requiresAcknowledgment !== undefined ? requiresAcknowledgment : announcement.requiresAcknowledgment,
      publishAt: publishAt !== undefined ? parseDate(publishAt) : announcement.publishAt,
      expiresAt: expiresAt !== undefined ? parseDate(expiresAt) : announcement.expiresAt
    });

    // Log admin action
    await logSecurityEvent(AUDIT_EVENTS.ADMIN_ACTION, req.user.id, {
      action: 'update_announcement',
      announcementId: announcement.id,
      changes: Object.keys(req.body)
    }, req);

    return res.json(announcement);
  } catch (err) {
    console.error('Error updating announcement:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/announcements/admin/:id/publish
 * Publish an announcement immediately
 */
router.post('/admin/:id/publish', [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.publish(id);

    // Log admin action
    await logSecurityEvent(AUDIT_EVENTS.ADMIN_ACTION, req.user.id, {
      action: 'publish_announcement',
      announcementId: announcement.id,
      title: announcement.title
    }, req);

    return res.json({
      message: 'Announcement published successfully',
      announcement
    });
  } catch (err) {
    console.error('Error publishing announcement:', err);
    if (err.message === 'Announcement not found') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/announcements/admin/:id/archive
 * Archive an announcement
 */
router.post('/admin/:id/archive', [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.archive(id);

    // Log admin action
    await logSecurityEvent(AUDIT_EVENTS.ADMIN_ACTION, req.user.id, {
      action: 'archive_announcement',
      announcementId: announcement.id,
      title: announcement.title
    }, req);

    return res.json({
      message: 'Announcement archived successfully',
      announcement
    });
  } catch (err) {
    console.error('Error archiving announcement:', err);
    if (err.message === 'Announcement not found') {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /api/announcements/admin/:id/duplicate
 * Duplicate an announcement (creates a draft copy)
 */
router.post('/admin/:id/duplicate', [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const original = await Announcement.findByPk(id);
    if (!original) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Create a duplicate as draft
    const duplicate = await Announcement.create({
      title: `${original.title} (Copy)`,
      content: original.content,
      type: original.type,
      priority: original.priority,
      status: 'draft',
      displayMode: original.displayMode,
      targetAudience: original.targetAudience,
      dismissible: original.dismissible,
      requiresAcknowledgment: original.requiresAcknowledgment,
      publishAt: null,
      expiresAt: null,
      createdBy: req.user.id
    });

    // Log admin action
    await logSecurityEvent(AUDIT_EVENTS.ADMIN_ACTION, req.user.id, {
      action: 'duplicate_announcement',
      originalId: id,
      newId: duplicate.id
    }, req);

    return res.status(201).json(duplicate);
  } catch (err) {
    console.error('Error duplicating announcement:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * DELETE /api/announcements/admin/:id
 * Delete an announcement
 */
router.delete('/admin/:id', [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    const announcementTitle = announcement.title;

    // Delete associated user statuses
    await UserAnnouncementStatus.destroy({
      where: { announcementId: id }
    });

    // Delete the announcement
    await announcement.destroy();

    // Log admin action
    await logSecurityEvent(AUDIT_EVENTS.ADMIN_ACTION, req.user.id, {
      action: 'delete_announcement',
      announcementId: id,
      title: announcementTitle
    }, req);

    return res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    console.error('Error deleting announcement:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * GET /api/announcements/admin/:id/stats
 * Get statistics for an announcement
 */
router.get('/admin/:id/stats', [auth, adminAuth], async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidUUID(id)) {
      return res.status(400).json({ error: 'Invalid announcement ID' });
    }

    const announcement = await Announcement.findByPk(id);
    if (!announcement) {
      return res.status(404).json({ error: 'Announcement not found' });
    }

    // Get detailed stats
    const totalViews = await UserAnnouncementStatus.count({
      where: {
        announcementId: id,
        viewedAt: { [Op.ne]: null }
      }
    });

    const totalAcknowledgments = await UserAnnouncementStatus.count({
      where: {
        announcementId: id,
        acknowledgedAt: { [Op.ne]: null }
      }
    });

    const totalDismissals = await UserAnnouncementStatus.count({
      where: {
        announcementId: id,
        dismissedAt: { [Op.ne]: null }
      }
    });

    return res.json({
      announcementId: id,
      viewCount: announcement.viewCount,
      acknowledgmentCount: announcement.acknowledgmentCount,
      stats: {
        uniqueViews: totalViews,
        acknowledgments: totalAcknowledgments,
        dismissals: totalDismissals
      }
    });
  } catch (err) {
    console.error('Error fetching announcement stats:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
