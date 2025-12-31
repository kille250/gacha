/**
 * BannerTicketSection - Ticket-based roll options
 *
 * Displays available tickets and ticket-based pull buttons.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';

import { IconStar, IconTicket } from '../../../constants/icons';

import {
  TicketWarning,
  TicketSection,
  TicketSectionHeader,
  TicketSectionTitle,
  TicketCounts,
  TicketCount,
  TicketButtonsGrid,
  TicketPullButton,
  PremiumPullButton,
  TicketButtonIcon,
  TicketButtonText,
} from './BannerPage.styles';

const BannerTicketSection = ({
  tickets = { rollTickets: 0, premiumTickets: 0 },
  ticketLoadError,
  isRolling,
  locked,
  onRoll,
  onMultiRoll,
  getDisabledReason,
  setError,
}) => {
  const { t } = useTranslation();

  const hasAnyTickets = tickets.rollTickets > 0 || tickets.premiumTickets > 0;

  const handleTicketRoll = (ticketType) => {
    const ticketCount = ticketType === 'premium' ? tickets.premiumTickets : tickets.rollTickets;
    const reason = getDisabledReason(0, true, ticketCount);
    if (reason) {
      setError(reason);
      return;
    }
    onRoll(true, ticketType);
  };

  const handleMultiTicketRoll = (count, ticketType) => {
    const ticketCount = ticketType === 'premium' ? tickets.premiumTickets : tickets.rollTickets;
    const reason = getDisabledReason(0, true, ticketCount, count);
    if (reason) {
      setError(reason);
      return;
    }
    onMultiRoll(count, true, ticketType);
  };

  return (
    <>
      {/* Ticket load warning */}
      {ticketLoadError && (
        <TicketWarning role="alert">
          ⚠️ {t('banner.ticketLoadError') || 'Could not load ticket count. Ticket options may be unavailable.'}
        </TicketWarning>
      )}

      {/* Ticket Section - Only show if user has tickets */}
      {hasAnyTickets && (
        <TicketSection role="region" aria-label={t('common.tickets', 'Tickets')}>
          <TicketSectionHeader>
            <TicketSectionTitle>
              <IconTicket /> {t('common.tickets') || 'Your Tickets'}
            </TicketSectionTitle>
            <TicketCounts>
              {tickets.rollTickets > 0 && (
                <TicketCount aria-label={`${tickets.rollTickets} roll tickets`}>
                  <span aria-hidden="true"><IconTicket /></span>
                  <strong>{tickets.rollTickets}</strong>
                </TicketCount>
              )}
              {tickets.premiumTickets > 0 && (
                <TicketCount $premium aria-label={`${tickets.premiumTickets} premium tickets`}>
                  <span aria-hidden="true"><IconStar /></span>
                  <strong>{tickets.premiumTickets}</strong>
                </TicketCount>
              )}
            </TicketCounts>
          </TicketSectionHeader>

          <TicketButtonsGrid>
            {/* Single Roll Ticket */}
            {tickets.rollTickets > 0 && (
              <TicketPullButton
                onClick={() => handleTicketRoll('roll')}
                disabled={isRolling || locked || tickets.rollTickets < 1 || ticketLoadError}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={`Use 1 roll ticket`}
              >
                <TicketButtonIcon aria-hidden="true"><IconTicket /></TicketButtonIcon>
                <TicketButtonText>
                  <span>{t('common.use') || 'Use'} 1×</span>
                  <small>{t('common.rollTicket') || 'Roll Ticket'}</small>
                </TicketButtonText>
              </TicketPullButton>
            )}

            {/* Single Premium Ticket */}
            {tickets.premiumTickets > 0 && (
              <PremiumPullButton
                onClick={() => handleTicketRoll('premium')}
                disabled={isRolling || locked || tickets.premiumTickets < 1 || ticketLoadError}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={`Use 1 premium ticket - guaranteed rare or better`}
              >
                <TicketButtonIcon aria-hidden="true"><IconStar /></TicketButtonIcon>
                <TicketButtonText>
                  <span>{t('common.premium') || 'Premium'}</span>
                  <small>{t('common.guaranteedRare') || 'Rare+ Guaranteed!'}</small>
                </TicketButtonText>
              </PremiumPullButton>
            )}

            {/* 10x Roll Tickets */}
            {tickets.rollTickets >= 10 && (
              <TicketPullButton
                onClick={() => handleMultiTicketRoll(10, 'roll')}
                disabled={isRolling || locked || tickets.rollTickets < 10 || ticketLoadError}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={`Use 10 roll tickets`}
              >
                <TicketButtonIcon aria-hidden="true"><IconTicket /></TicketButtonIcon>
                <TicketButtonText>
                  <span>{t('common.use') || 'Use'} 10×</span>
                  <small>{t('common.rollTickets') || 'Roll Tickets'}</small>
                </TicketButtonText>
              </TicketPullButton>
            )}

            {/* 10x Premium Tickets */}
            {tickets.premiumTickets >= 10 && (
              <PremiumPullButton
                onClick={() => handleMultiTicketRoll(10, 'premium')}
                disabled={isRolling || locked || tickets.premiumTickets < 10 || ticketLoadError}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                aria-label={`Use 10 premium tickets - all rare or better`}
              >
                <TicketButtonIcon aria-hidden="true"><IconStar /></TicketButtonIcon>
                <TicketButtonText>
                  <span>10× {t('common.premium') || 'Premium'}</span>
                  <small>{t('common.allRarePlus') || 'All Rare+!'}</small>
                </TicketButtonText>
              </PremiumPullButton>
            )}
          </TicketButtonsGrid>
        </TicketSection>
      )}
    </>
  );
};

export default BannerTicketSection;
