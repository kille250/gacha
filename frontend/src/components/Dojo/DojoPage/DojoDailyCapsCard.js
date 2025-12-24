/**
 * DojoDailyCapsCard - Daily progress and caps display
 *
 * Shows daily limits for points and tickets with progress bars.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { FaCoins, FaTicketAlt, FaStar } from 'react-icons/fa';

import {
  DailyCapsCard,
  DailyCapsHeader,
  DailyCapsTitle,
  DailyCapsReset,
  DailyCapsGrid,
  DailyCapItem,
  DailyCapIcon,
  DailyCapProgress,
  DailyCapLabel,
  DailyCapBar,
  DailyCapFill,
  DailyCapNumbers,
  TicketProgressSection,
  TicketProgressLabel,
  TicketProgressBars,
  TicketProgressItem,
  TicketProgressBar,
  TicketProgressFill,
} from './DojoPage.styles';

const DojoDailyCapsCard = ({ dailyCaps, ticketProgress }) => {
  const { t } = useTranslation();

  if (!dailyCaps) return null;

  const hasTicketProgress = ticketProgress && (ticketProgress.roll > 0 || ticketProgress.premium > 0);

  return (
    <DailyCapsCard
      $isCapped={dailyCaps.isPointsCapped}
      role="region"
      aria-label={t('dojo.dailyProgress')}
    >
      <DailyCapsHeader>
        <DailyCapsTitle>
          📊 {t('dojo.dailyProgress')}
        </DailyCapsTitle>
        <DailyCapsReset>
          {t('dojo.resetsAtMidnight')}
        </DailyCapsReset>
      </DailyCapsHeader>

      <DailyCapsGrid>
        {/* Points Progress */}
        <DailyCapItem $isCapped={dailyCaps.remaining.points <= 0}>
          <DailyCapIcon aria-hidden="true">
            <FaCoins />
          </DailyCapIcon>
          <DailyCapProgress>
            <DailyCapLabel>{t('common.points')}</DailyCapLabel>
            <DailyCapBar
              role="progressbar"
              aria-valuenow={dailyCaps.todayClaimed.points}
              aria-valuemax={dailyCaps.limits.points}
            >
              <DailyCapFill
                style={{
                  width: `${Math.min(100, (dailyCaps.todayClaimed.points / dailyCaps.limits.points) * 100)}%`
                }}
                $isCapped={dailyCaps.remaining.points <= 0}
              />
            </DailyCapBar>
            <DailyCapNumbers>
              {dailyCaps.todayClaimed.points.toLocaleString()} / {dailyCaps.limits.points.toLocaleString()}
            </DailyCapNumbers>
          </DailyCapProgress>
        </DailyCapItem>

        {/* Roll Tickets Progress */}
        <DailyCapItem $isCapped={dailyCaps.remaining.rollTickets <= 0}>
          <DailyCapIcon aria-hidden="true">
            <FaTicketAlt />
          </DailyCapIcon>
          <DailyCapProgress>
            <DailyCapLabel>{t('dojo.rollTicketsLabel')}</DailyCapLabel>
            <DailyCapBar
              role="progressbar"
              aria-valuenow={dailyCaps.todayClaimed.rollTickets}
              aria-valuemax={dailyCaps.limits.rollTickets}
            >
              <DailyCapFill
                style={{
                  width: `${Math.min(100, (dailyCaps.todayClaimed.rollTickets / dailyCaps.limits.rollTickets) * 100)}%`
                }}
                $isCapped={dailyCaps.remaining.rollTickets <= 0}
              />
            </DailyCapBar>
            <DailyCapNumbers>
              {dailyCaps.todayClaimed.rollTickets} / {dailyCaps.limits.rollTickets}
            </DailyCapNumbers>
          </DailyCapProgress>
        </DailyCapItem>

        {/* Premium Tickets Progress */}
        <DailyCapItem $isCapped={dailyCaps.remaining.premiumTickets <= 0}>
          <DailyCapIcon $premium aria-hidden="true">
            <FaStar />
          </DailyCapIcon>
          <DailyCapProgress>
            <DailyCapLabel>{t('dojo.premiumTicketsLabel')}</DailyCapLabel>
            <DailyCapBar
              role="progressbar"
              aria-valuenow={dailyCaps.todayClaimed.premiumTickets}
              aria-valuemax={dailyCaps.limits.premiumTickets}
            >
              <DailyCapFill
                style={{
                  width: `${Math.min(100, (dailyCaps.todayClaimed.premiumTickets / dailyCaps.limits.premiumTickets) * 100)}%`
                }}
                $premium
                $isCapped={dailyCaps.remaining.premiumTickets <= 0}
              />
            </DailyCapBar>
            <DailyCapNumbers>
              {dailyCaps.todayClaimed.premiumTickets} / {dailyCaps.limits.premiumTickets}
            </DailyCapNumbers>
          </DailyCapProgress>
        </DailyCapItem>
      </DailyCapsGrid>

      {/* Ticket Progress (Pity System) */}
      {hasTicketProgress && (
        <TicketProgressSection>
          <TicketProgressLabel>🎫 {t('dojo.ticketProgress')}</TicketProgressLabel>
          <TicketProgressBars>
            {ticketProgress.roll > 0 && (
              <TicketProgressItem>
                <FaTicketAlt aria-hidden="true" />
                <TicketProgressBar
                  role="progressbar"
                  aria-valuenow={Math.round(ticketProgress.roll * 100)}
                  aria-valuemax={100}
                >
                  <TicketProgressFill style={{ width: `${ticketProgress.roll * 100}%` }} />
                </TicketProgressBar>
                <span>{Math.round(ticketProgress.roll * 100)}%</span>
              </TicketProgressItem>
            )}
            {ticketProgress.premium > 0 && (
              <TicketProgressItem $premium>
                <FaStar aria-hidden="true" />
                <TicketProgressBar
                  role="progressbar"
                  aria-valuenow={Math.round(ticketProgress.premium * 100)}
                  aria-valuemax={100}
                >
                  <TicketProgressFill $premium style={{ width: `${ticketProgress.premium * 100}%` }} />
                </TicketProgressBar>
                <span>{Math.round(ticketProgress.premium * 100)}%</span>
              </TicketProgressItem>
            )}
          </TicketProgressBars>
        </TicketProgressSection>
      )}
    </DailyCapsCard>
  );
};

export default DojoDailyCapsCard;
