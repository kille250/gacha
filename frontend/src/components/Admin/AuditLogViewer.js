/**
 * AuditLogViewer.js
 * 
 * Filterable audit log viewer for security events.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHistory, FaSync, FaFilter } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../styles/DesignSystem';
import { getAuditLog } from '../../utils/api';
import {
  HeaderRow,
  SectionTitle,
  ItemCount,
  SecondaryButton,
  Select,
  Input,
} from './AdminStyles';

const EVENT_CATEGORIES = {
  'auth': ['auth.login.success', 'auth.login.failed', 'auth.signup', 'auth.google.login', 'auth.password.change'],
  'admin': ['admin.restrict', 'admin.unrestrict', 'admin.warning', 'admin.points_adjust'],
  'security': ['security.device.new', 'security.risk.change', 'security.auto_restriction', 'security.ban_evasion'],
  'economy': ['economy.trade', 'economy.coupon.redeemed', 'economy.anomaly'],
  'appeal': ['appeal.submitted', 'appeal.approved', 'appeal.denied']
};

const SEVERITY_COLORS = {
  info: '#0a84ff',
  warning: '#ff9500',
  critical: '#ff3b30'
};

const AuditLogViewer = () => {
  const { t } = useTranslation();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState({
    severity: '',
    eventType: '',
    userId: '',
    limit: 50,
    offset: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  
  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { ...filters };
      if (!params.severity) delete params.severity;
      if (!params.eventType) delete params.eventType;
      if (!params.userId) delete params.userId;
      
      const data = await getAuditLog(params);
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (err) {
      console.error('Failed to fetch audit log:', err);
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };
  
  const handleNextPage = () => {
    setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };
  
  const handlePrevPage = () => {
    setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
  };
  
  const formatEventType = (eventType) => {
    return eventType.replace(/\./g, ' › ').replace(/_/g, ' ');
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const getEventIcon = (eventType) => {
    if (eventType.startsWith('auth.login.failed')) return '❌';
    if (eventType.startsWith('auth')) return '🔐';
    if (eventType.startsWith('admin')) return '👑';
    if (eventType.startsWith('security')) return '🛡️';
    if (eventType.startsWith('economy')) return '💰';
    if (eventType.startsWith('appeal')) return '⚖️';
    return '📝';
  };
  
  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <HeaderRow>
        <SectionTitle>
          <FaHistory /> {t('admin.security.auditLog')}
          <ItemCount>{total} {t('admin.security.events')}</ItemCount>
        </SectionTitle>
        <HeaderActions>
          <SecondaryButton onClick={() => setShowFilters(!showFilters)}>
            <FaFilter /> {t('admin.security.filters')}
          </SecondaryButton>
          <SecondaryButton onClick={fetchEvents} disabled={loading}>
            <FaSync className={loading ? 'spin' : ''} />
          </SecondaryButton>
        </HeaderActions>
      </HeaderRow>
      
      <AnimatePresence>
        {showFilters && (
          <FiltersPanel
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <FilterGroup>
              <FilterLabel>{t('admin.security.severity')}</FilterLabel>
              <Select 
                value={filters.severity} 
                onChange={(e) => handleFilterChange('severity', e.target.value)}
              >
                <option value="">{t('common.all')}</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="critical">Critical</option>
              </Select>
            </FilterGroup>
            
            <FilterGroup>
              <FilterLabel>{t('admin.security.category')}</FilterLabel>
              <Select 
                value={filters.eventType} 
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
              >
                <option value="">{t('common.all')}</option>
                {Object.keys(EVENT_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </FilterGroup>
            
            <FilterGroup>
              <FilterLabel>{t('admin.security.userId')}</FilterLabel>
              <Input 
                type="number"
                placeholder="User ID"
                value={filters.userId}
                onChange={(e) => handleFilterChange('userId', e.target.value)}
              />
            </FilterGroup>
          </FiltersPanel>
        )}
      </AnimatePresence>
      
      <EventsTable>
        <TableHeader>
          <HeaderCell $width="50px"></HeaderCell>
          <HeaderCell $width="180px">{t('admin.security.timestamp')}</HeaderCell>
          <HeaderCell>{t('admin.security.eventType')}</HeaderCell>
          <HeaderCell $width="100px">{t('admin.security.userId')}</HeaderCell>
          <HeaderCell $width="80px">{t('admin.security.severity')}</HeaderCell>
          <HeaderCell>{t('admin.security.details')}</HeaderCell>
        </TableHeader>
        
        <TableBody>
          {loading ? (
            <LoadingRow>
              <FaSync className="spin" /> {t('common.loading')}
            </LoadingRow>
          ) : events.length === 0 ? (
            <EmptyRow>
              {t('admin.security.noEvents')}
            </EmptyRow>
          ) : (
            <AnimatePresence>
              {events.map((event) => (
                <TableRow
                  key={event.id}
                  variants={motionVariants.staggerItem}
                  initial="hidden"
                  animate="visible"
                  exit={{ opacity: 0 }}
                  $severity={event.severity}
                >
                  <Cell $width="50px">
                    <EventIcon>{getEventIcon(event.eventType)}</EventIcon>
                  </Cell>
                  <Cell $width="180px">
                    <Timestamp>{formatTimestamp(event.createdAt)}</Timestamp>
                  </Cell>
                  <Cell>
                    <EventType>{formatEventType(event.eventType)}</EventType>
                  </Cell>
                  <Cell $width="100px">
                    {event.userId || event.targetUserId ? (
                      <UserIdBadge>
                        {event.userId || event.targetUserId}
                      </UserIdBadge>
                    ) : '—'}
                  </Cell>
                  <Cell $width="80px">
                    <SeverityBadge $color={SEVERITY_COLORS[event.severity]}>
                      {event.severity}
                    </SeverityBadge>
                  </Cell>
                  <Cell>
                    <Details>
                      {event.data && typeof event.data === 'object' 
                        ? Object.entries(event.data).slice(0, 3).map(([k, v]) => (
                            <DetailItem key={k}>
                              <strong>{k}:</strong> {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                            </DetailItem>
                          ))
                        : '—'
                      }
                    </Details>
                  </Cell>
                </TableRow>
              ))}
            </AnimatePresence>
          )}
        </TableBody>
      </EventsTable>
      
      <Pagination>
        <PaginationButton 
          onClick={handlePrevPage} 
          disabled={filters.offset === 0}
        >
          ← {t('common.previous')}
        </PaginationButton>
        <PageInfo>
          {filters.offset + 1} - {Math.min(filters.offset + filters.limit, total)} {t('common.of')} {total}
        </PageInfo>
        <PaginationButton 
          onClick={handleNextPage} 
          disabled={filters.offset + filters.limit >= total}
        >
          {t('common.next')} →
        </PaginationButton>
      </Pagination>
    </Container>
  );
};

const Container = styled(motion.div)``;

const HeaderActions = styled.div`
  display: flex;
  gap: ${theme.spacing.sm};
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const FiltersPanel = styled(motion.div)`
  display: flex;
  gap: ${theme.spacing.lg};
  flex-wrap: wrap;
  padding: ${theme.spacing.lg};
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.lg};
  margin-bottom: ${theme.spacing.lg};
  overflow: hidden;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  min-width: 150px;
`;

const FilterLabel = styled.label`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

const EventsTable = styled.div`
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.xl};
  overflow: hidden;
`;

const TableHeader = styled.div`
  display: flex;
  background: ${theme.colors.backgroundTertiary};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.md};
  
  @media (max-width: ${theme.breakpoints.lg}) {
    display: none;
  }
`;

const HeaderCell = styled.div`
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.textSecondary};
  text-transform: uppercase;
  letter-spacing: 0.5px;
  flex: ${props => props.$width ? `0 0 ${props.$width}` : 1};
`;

const TableBody = styled.div`
  max-height: 500px;
  overflow-y: auto;
`;

const TableRow = styled(motion.div)`
  display: flex;
  align-items: center;
  padding: ${theme.spacing.md};
  gap: ${theme.spacing.md};
  border-bottom: 1px solid ${theme.colors.surfaceBorder};
  transition: background ${theme.transitions.fast};
  border-left: 3px solid ${props => 
    props.$severity === 'critical' ? '#ff3b30' : 
    props.$severity === 'warning' ? '#ff9500' : 
    'transparent'
  };
  
  &:hover { background: ${theme.colors.backgroundTertiary}; }
  &:last-child { border-bottom: none; }
  
  @media (max-width: ${theme.breakpoints.lg}) {
    flex-wrap: wrap;
  }
`;

const Cell = styled.div`
  flex: ${props => props.$width ? `0 0 ${props.$width}` : 1};
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const LoadingRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

const EmptyRow = styled.div`
  padding: ${theme.spacing.xl};
  text-align: center;
  color: ${theme.colors.textSecondary};
`;

const EventIcon = styled.span`
  font-size: 18px;
`;

const Timestamp = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  font-family: monospace;
`;

const EventType = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.medium};
  color: ${theme.colors.text};
  text-transform: capitalize;
`;

const UserIdBadge = styled.span`
  padding: 2px 8px;
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.md};
  font-size: ${theme.fontSizes.sm};
  font-family: monospace;
`;

const SeverityBadge = styled.span`
  padding: 2px 8px;
  border-radius: ${theme.radius.full};
  font-size: ${theme.fontSizes.xs};
  font-weight: ${theme.fontWeights.bold};
  text-transform: uppercase;
  background: ${props => props.$color}20;
  color: ${props => props.$color};
`;

const Details = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: ${theme.spacing.sm};
`;

const DetailItem = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
  
  strong {
    color: ${theme.colors.text};
  }
`;

const Pagination = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  gap: ${theme.spacing.lg};
  margin-top: ${theme.spacing.lg};
`;

const PaginationButton = styled.button`
  padding: ${theme.spacing.sm} ${theme.spacing.lg};
  background: ${theme.colors.primary};
  border: none;
  border-radius: ${theme.radius.lg};
  color: white;
  font-weight: ${theme.fontWeights.medium};
  cursor: pointer;
  
  &:disabled {
    background: ${theme.colors.backgroundTertiary};
    color: ${theme.colors.textMuted};
    cursor: not-allowed;
  }
`;

const PageInfo = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
`;

export default AuditLogViewer;

