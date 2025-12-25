/**
 * AuditLogViewer.js
 * 
 * Filterable audit log viewer for security events.
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaHistory, FaSync, FaFilter, FaDownload } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import { theme, motionVariants } from '../../design-system';
import { getAuditLog, exportAuditLog } from '../../utils/api';
import { AUDIT_CATEGORIES } from '../../constants/securityConstants';
import {
  IconError,
  IconAuth,
  IconAdmin,
  IconSecurity,
  IconEconomy,
  IconAppeal,
  IconLog,
} from '../../constants/icons';
import {
  HeaderRow,
  SectionTitle,
  ItemCount,
  SecondaryButton,
  Select,
  Input,
} from './AdminStyles';

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
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    severity: '',
    eventType: '',
    userId: '',
    adminId: '',
    adminActionsOnly: false,
    limit: 50,
    offset: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filters };
      if (!params.severity) delete params.severity;
      if (!params.eventType) delete params.eventType;
      if (!params.userId) delete params.userId;
      if (!params.adminId) delete params.adminId;
      if (!params.adminActionsOnly) delete params.adminActionsOnly;

      const data = await getAuditLog(params);
      setEvents(data.events || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || t('admin.security.fetchAuditError', 'Failed to load audit log'));
    } finally {
      setLoading(false);
    }
  }, [filters, t]);
  
  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);
  
  // Debounce timer ref for text inputs
  const debounceTimerRef = useRef(null);
  
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
  };
  
  // Debounced filter change for text inputs (userId, adminId)
  const handleDebouncedFilterChange = (key, value) => {
    // Clear previous timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      setFilters(prev => ({ ...prev, [key]: value, offset: 0 }));
    }, 500);
  };
  
  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);
  
  const handleNextPage = () => {
    setFilters(prev => ({ ...prev, offset: prev.offset + prev.limit }));
  };
  
  const handlePrevPage = () => {
    setFilters(prev => ({ ...prev, offset: Math.max(0, prev.offset - prev.limit) }));
  };
  
  const handleExport = async (format) => {
    setExporting(true);
    try {
      const params = {
        format,
        limit: 10000,
        severity: filters.severity || undefined,
        eventType: filters.eventType || undefined,
        userId: filters.userId || undefined
      };
      
      if (format === 'csv') {
        const blob = await exportAuditLog(params);
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${Date.now()}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        const data = await exportAuditLog(params);
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit-log-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      setExportError(err.response?.data?.error || t('admin.security.exportError', 'Export failed'));
      setTimeout(() => setExportError(null), 5000);
    } finally {
      setExporting(false);
    }
  };
  
  const formatEventType = (eventType) => {
    return eventType.replace(/\./g, ' › ').replace(/_/g, ' ');
  };
  
  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  const getEventIcon = (eventType) => {
    // Returns icon for event type - rendered with aria-hidden in JSX
    if (eventType.startsWith('auth.login.failed')) return <IconError />;
    if (eventType.startsWith('auth')) return <IconAuth />;
    if (eventType.startsWith('admin')) return <IconAdmin />;
    if (eventType.startsWith('security')) return <IconSecurity />;
    if (eventType.startsWith('economy')) return <IconEconomy />;
    if (eventType.startsWith('appeal')) return <IconAppeal />;
    return <IconLog />;
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
          <SecondaryButton onClick={() => setShowFilters(!showFilters)} aria-expanded={showFilters} aria-controls="filters-panel">
            <FaFilter aria-hidden="true" /> {t('admin.security.filters')}
          </SecondaryButton>
          <ExportDropdown>
            <SecondaryButton disabled={exporting} aria-haspopup="true">
              <FaDownload aria-hidden="true" /> {exporting ? t('admin.security.exporting') : t('admin.security.export')}
            </SecondaryButton>
            <ExportMenu role="menu">
              <ExportOption onClick={() => handleExport('json')} role="menuitem">JSON</ExportOption>
              <ExportOption onClick={() => handleExport('csv')} role="menuitem">CSV</ExportOption>
            </ExportMenu>
          </ExportDropdown>
          <SecondaryButton onClick={fetchEvents} disabled={loading} aria-label={t('admin.security.refresh')}>
            <FaSync className={loading ? 'spin' : ''} aria-hidden="true" />
          </SecondaryButton>
        </HeaderActions>
      </HeaderRow>

      {exportError && (
        <ExportErrorBanner>
          {exportError}
        </ExportErrorBanner>
      )}

      <AnimatePresence>
        {showFilters && (
          <FiltersPanel
            id="filters-panel"
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
                <option value="info">{t('admin.security.info')}</option>
                <option value="warning">{t('admin.security.warning')}</option>
                <option value="critical">{t('admin.security.critical')}</option>
              </Select>
            </FilterGroup>
            
            <FilterGroup>
              <FilterLabel id="category-label">{t('admin.security.category')}</FilterLabel>
              <Select 
                value={filters.eventType} 
                onChange={(e) => handleFilterChange('eventType', e.target.value)}
                aria-labelledby="category-label"
              >
                <option value="">{t('common.all')}</option>
                {Object.keys(AUDIT_CATEGORIES).map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </Select>
            </FilterGroup>
            
            <FilterGroup>
              <FilterLabel id="userid-label">{t('admin.security.userId')}</FilterLabel>
              <Input 
                type="number"
                placeholder={t('admin.security.userIdPlaceholder')}
                defaultValue={filters.userId}
                onChange={(e) => handleDebouncedFilterChange('userId', e.target.value)}
                aria-labelledby="userid-label"
              />
            </FilterGroup>
            
            <FilterGroup>
              <FilterLabel id="adminid-label">{t('admin.security.adminId')}</FilterLabel>
              <Input 
                type="number"
                placeholder={t('admin.security.adminIdPlaceholder')}
                defaultValue={filters.adminId}
                onChange={(e) => handleDebouncedFilterChange('adminId', e.target.value)}
                aria-labelledby="adminid-label"
              />
            </FilterGroup>
            
            <FilterGroup>
              <FilterLabel>{t('admin.security.adminActions')}</FilterLabel>
              <CheckboxLabel>
                <Checkbox 
                  type="checkbox"
                  checked={filters.adminActionsOnly}
                  onChange={(e) => handleFilterChange('adminActionsOnly', e.target.checked)}
                />
                {t('admin.security.showAdminActionsOnly')}
              </CheckboxLabel>
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
          ) : error ? (
            <ErrorRow>
              {error}
            </ErrorRow>
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
                    <EventIcon aria-hidden="true">{getEventIcon(event.eventType)}</EventIcon>
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

const ExportDropdown = styled.div`
  position: relative;
  
  &:hover > div {
    display: block;
  }
`;

const ExportMenu = styled.div`
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  background: ${theme.colors.surface};
  border: 1px solid ${theme.colors.surfaceBorder};
  border-radius: ${theme.radius.md};
  overflow: hidden;
  z-index: 100;
  min-width: 100px;
  margin-top: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
`;

const ExportOption = styled.button`
  display: block;
  width: 100%;
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: none;
  border: none;
  text-align: left;
  color: ${theme.colors.text};
  font-size: ${theme.fontSizes.sm};
  cursor: pointer;
  
  &:hover {
    background: ${theme.colors.backgroundTertiary};
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

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.text};
  cursor: pointer;
  padding: ${theme.spacing.sm} 0;
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: ${theme.colors.primary};
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

const ErrorRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.error};
`;

const ExportErrorBanner = styled.div`
  padding: ${theme.spacing.md};
  background: rgba(255, 59, 48, 0.1);
  border: 1px solid rgba(255, 59, 48, 0.3);
  border-radius: ${theme.radius.md};
  color: ${theme.colors.error};
  font-size: ${theme.fontSizes.sm};
  margin-bottom: ${theme.spacing.md};
  text-align: center;
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

