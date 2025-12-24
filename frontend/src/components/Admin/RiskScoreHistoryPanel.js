/**
 * RiskScoreHistoryPanel.js
 * 
 * Displays risk score history and changes for a user.
 */
import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaChartLine, FaSync, FaArrowUp, FaArrowDown, FaMinus, FaShieldAlt } from 'react-icons/fa';
import { theme, motionVariants } from '../../design-system';
import { getUserRiskHistory } from '../../utils/api';

const RiskScoreHistoryPanel = ({ userId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    if (!userId) return;
    
    setLoading(true);
    setError(null);
    try {
      const result = await getUserRiskHistory(userId);
      setData(result);
    } catch (err) {
      console.error('Failed to fetch risk history:', err);
      setError('Failed to load risk history');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const formatRelativeTime = (ts) => {
    if (!ts) return 'Unknown';
    const diff = Date.now() - new Date(ts).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getScoreColor = (score) => {
    if (score >= 85) return '#ff3b30';
    if (score >= 70) return '#ff9500';
    if (score >= 50) return '#ffcc00';
    if (score >= 30) return '#007aff';
    return theme.colors.success;
  };

  const getChangeIcon = (oldScore, newScore) => {
    if (newScore > oldScore) return <FaArrowUp />;
    if (newScore < oldScore) return <FaArrowDown />;
    return <FaMinus />;
  };

  const getChangeColor = (oldScore, newScore) => {
    if (newScore > oldScore) return '#ff3b30';
    if (newScore < oldScore) return theme.colors.success;
    return theme.colors.textSecondary;
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>
          <FaSync className="spin" /> Loading risk history...
        </LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <ErrorState>{error}</ErrorState>
      </Container>
    );
  }

  if (!data) return null;

  // Combine history from user model and audit events
  const allHistory = [
    ...(data.history || []).map(h => ({
      ...h,
      source: 'automatic',
      newScore: h.score
    })),
    ...(data.events || []).map(e => ({
      ...e,
      timestamp: e.timestamp,
      source: 'event'
    }))
  ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return (
    <Container
      variants={motionVariants.staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <Header>
        <Title>
          <FaChartLine /> Risk Score History
        </Title>
        <RefreshButton onClick={fetchData}>
          <FaSync />
        </RefreshButton>
      </Header>

      <CurrentScore>
        <ScoreCircle $color={getScoreColor(data.currentScore)}>
          {data.currentScore || 0}
        </ScoreCircle>
        <ScoreInfo>
          <ScoreLabel>Current Risk Score</ScoreLabel>
          <ScoreStatus $color={getScoreColor(data.currentScore)}>
            {data.currentScore >= 85 ? 'Critical' :
             data.currentScore >= 70 ? 'High' :
             data.currentScore >= 50 ? 'Elevated' :
             data.currentScore >= 30 ? 'Monitoring' :
             'Normal'}
          </ScoreStatus>
        </ScoreInfo>
      </CurrentScore>

      {allHistory.length > 0 ? (
        <HistorySection>
          <HistoryTitle>Score Changes</HistoryTitle>
          <HistoryList>
            <AnimatePresence>
              {allHistory.slice(0, 15).map((item, index) => (
                <HistoryItem
                  key={item.id || `${item.timestamp}-${index}`}
                  variants={motionVariants.staggerItem}
                >
                  <ChangeIndicator $color={getChangeColor(item.oldScore, item.newScore)}>
                    {getChangeIcon(item.oldScore, item.newScore)}
                  </ChangeIndicator>
                  <ChangeContent>
                    <ChangeScores>
                      {item.oldScore !== undefined && item.oldScore !== null && (
                        <>
                          <OldScore>{item.oldScore}</OldScore>
                          <span>→</span>
                        </>
                      )}
                      <NewScore $color={getScoreColor(item.newScore || item.score)}>
                        {item.newScore || item.score}
                      </NewScore>
                      {item.oldScore !== undefined && item.newScore !== undefined && (
                        <Delta $positive={item.newScore < item.oldScore}>
                          ({item.newScore > item.oldScore ? '+' : ''}{item.newScore - item.oldScore})
                        </Delta>
                      )}
                    </ChangeScores>
                    <ChangeReason>{item.reason || 'No reason recorded'}</ChangeReason>
                    {item.adminId && (
                      <AdminBadge>
                        <FaShieldAlt /> Admin action
                      </AdminBadge>
                    )}
                  </ChangeContent>
                  <ChangeTime>{formatRelativeTime(item.timestamp)}</ChangeTime>
                </HistoryItem>
              ))}
            </AnimatePresence>
          </HistoryList>
        </HistorySection>
      ) : (
        <EmptyState>No risk score changes recorded</EmptyState>
      )}
    </Container>
  );
};

const Container = styled(motion.div)``;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${theme.spacing.md};
`;

const Title = styled.h4`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  font-size: ${theme.fontSizes.md};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0;
  
  svg { color: ${theme.colors.primary}; }
`;

const RefreshButton = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  background: ${theme.colors.backgroundTertiary};
  border: none;
  border-radius: ${theme.radius.md};
  color: ${theme.colors.textSecondary};
  cursor: pointer;
  
  &:hover {
    color: ${theme.colors.text};
  }
  
  .spin {
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: ${theme.spacing.sm};
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
  
  .spin {
    animation: spin 1s linear infinite;
  }
`;

const ErrorState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.error};
`;

const CurrentScore = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.lg};
  background: ${theme.colors.backgroundTertiary};
  border-radius: ${theme.radius.xl};
  margin-bottom: ${theme.spacing.lg};
`;

const ScoreCircle = styled.div`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: ${theme.fontSizes['2xl']};
  font-weight: ${theme.fontWeights.bold};
  color: white;
  background: ${props => props.$color};
  flex-shrink: 0;
`;

const ScoreInfo = styled.div``;

const ScoreLabel = styled.div`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  margin-bottom: ${theme.spacing.xs};
`;

const ScoreStatus = styled.div`
  font-size: ${theme.fontSizes.lg};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
`;

const HistorySection = styled.div``;

const HistoryTitle = styled.h5`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.semibold};
  color: ${theme.colors.text};
  margin: 0 0 ${theme.spacing.md} 0;
`;

const HistoryList = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${theme.spacing.xs};
  max-height: 300px;
  overflow-y: auto;
`;

const HistoryItem = styled(motion.div)`
  display: flex;
  align-items: flex-start;
  gap: ${theme.spacing.md};
  padding: ${theme.spacing.sm} ${theme.spacing.md};
  background: ${theme.colors.surface};
  border-radius: ${theme.radius.md};
`;

const ChangeIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: ${theme.radius.md};
  background: ${props => props.$color}20;
  color: ${props => props.$color};
  flex-shrink: 0;
`;

const ChangeContent = styled.div`
  flex: 1;
  min-width: 0;
`;

const ChangeScores = styled.div`
  display: flex;
  align-items: center;
  gap: ${theme.spacing.sm};
  margin-bottom: 2px;
  
  span { color: ${theme.colors.textSecondary}; }
`;

const OldScore = styled.span`
  font-size: ${theme.fontSizes.sm};
  color: ${theme.colors.textSecondary};
  text-decoration: line-through;
`;

const NewScore = styled.span`
  font-size: ${theme.fontSizes.sm};
  font-weight: ${theme.fontWeights.bold};
  color: ${props => props.$color};
`;

const Delta = styled.span`
  font-size: ${theme.fontSizes.xs};
  color: ${props => props.$positive ? theme.colors.success : '#ff3b30'};
`;

const ChangeReason = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textSecondary};
`;

const AdminBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: ${theme.spacing.xs};
  padding: 2px 6px;
  background: rgba(175, 82, 222, 0.15);
  border-radius: ${theme.radius.sm};
  font-size: 10px;
  color: #af52de;
  margin-top: ${theme.spacing.xs};
`;

const ChangeTime = styled.div`
  font-size: ${theme.fontSizes.xs};
  color: ${theme.colors.textMuted};
  flex-shrink: 0;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: ${theme.spacing.xl};
  color: ${theme.colors.textSecondary};
`;

export default RiskScoreHistoryPanel;

