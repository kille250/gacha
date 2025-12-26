/**
 * DojoPage - Training dojo for earning rewards
 *
 * This is the main page component that composes the extracted sub-components.
 * All state management is handled by useDojoPage hook.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Spinner } from '../design-system';
import { useDojoPage } from '../hooks/useDojoPage';

// Extracted components
import {
  DojoHeader,
  DojoErrorBanner,
  DojoClaimPopup,
  DojoAccumulatedCard,
  DojoDailyCapsCard,
  DojoHourlyRateCard,
  DojoTrainingSlots,
  DojoUpgradesSection,
  DojoCharacterPicker,
  PageContainer,
  LoadingContainer,
  MainContent,
} from '../components/Dojo/DojoPage';

// Game Enhancement Components
import { SpecializationPicker } from '../components/GameEnhancements';

// Modal overlay for SpecializationPicker
const SpecializationOverlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const SpecializationModalContent = styled(motion.div)`
  max-width: 500px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
`;

const DojoPage = () => {
  const navigate = useNavigate();
  const {
    // Core state
    user,
    status,
    loading,
    error,
    setError,

    // Rarity helpers
    getRarityColor,
    getRarityGlow,
    getAssetUrl,

    // Claim state
    claiming,
    canClaim,
    claimResult,
    dismissClaimResult,
    handleClaim,
    getClaimDisabledReason,

    // Upgrade state
    upgrading,
    handleUpgrade,
    getUpgradeDisabledReason,
    locked,

    // Character picker state
    showCharacterPicker,
    filteredCharacters,
    charactersBySeries,
    charactersLoading,
    searchQuery,
    setSearchQuery,
    openCharacterPicker,
    closeCharacterPicker,
    handleAssign,
    handleUnassign,

    // Computed values
    progressPercent,

    // Refresh function
    refreshStatus,
  } = useDojoPage();

  // Specialization picker state
  const [specializingCharacter, setSpecializingCharacter] = useState(null);

  const handleOpenSpecialization = (character) => {
    setSpecializingCharacter(character);
  };

  const handleCloseSpecialization = async (shouldRefresh = false) => {
    setSpecializingCharacter(null);
    if (shouldRefresh) {
      await refreshStatus();
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <LoadingContainer>
          <Spinner />
        </LoadingContainer>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Header */}
      <DojoHeader
        user={user}
        onBack={() => navigate(-1)}
      />

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <DojoErrorBanner
            error={error}
            onClose={() => setError(null)}
          />
        )}
      </AnimatePresence>

      {/* Claim Result Popup */}
      <AnimatePresence>
        {claimResult && (
          <DojoClaimPopup
            claimResult={claimResult}
            onDismiss={dismissClaimResult}
          />
        )}
      </AnimatePresence>

      <MainContent>
        {/* Accumulated Rewards Card */}
        <DojoAccumulatedCard
          status={status}
          progressPercent={progressPercent}
          canClaim={canClaim}
          claiming={claiming}
          locked={locked}
          onClaim={handleClaim}
          getClaimDisabledReason={getClaimDisabledReason}
          setError={setError}
        />

        {/* Daily Caps Display */}
        {status?.dailyCaps && (
          <DojoDailyCapsCard status={status} />
        )}

        {/* Hourly Rate Display */}
        <DojoHourlyRateCard status={status} />

        {/* Training Slots */}
        <DojoTrainingSlots
          status={status}
          getRarityColor={getRarityColor}
          getRarityGlow={getRarityGlow}
          getAssetUrl={getAssetUrl}
          onOpenPicker={openCharacterPicker}
          onUnassign={handleUnassign}
          onOpenSpecialization={handleOpenSpecialization}
        />

        {/* Upgrades Section */}
        <DojoUpgradesSection
          status={status}
          user={user}
          upgrading={upgrading}
          locked={locked}
          onUpgrade={handleUpgrade}
          getUpgradeDisabledReason={getUpgradeDisabledReason}
          setError={setError}
        />
      </MainContent>

      {/* Character Picker Modal */}
      <AnimatePresence>
        {showCharacterPicker && (
          <DojoCharacterPicker
            filteredCharacters={filteredCharacters}
            charactersBySeries={charactersBySeries}
            charactersLoading={charactersLoading}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClose={closeCharacterPicker}
            onSelect={handleAssign}
            getRarityColor={getRarityColor}
            getAssetUrl={getAssetUrl}
          />
        )}
      </AnimatePresence>

      {/* Specialization Picker Modal */}
      <AnimatePresence>
        {specializingCharacter && (
          <SpecializationOverlay
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCloseSpecialization}
          >
            <SpecializationModalContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SpecializationPicker
                character={specializingCharacter}
                userLevel={user?.level || 1}
                onClose={handleCloseSpecialization}
              />
            </SpecializationModalContent>
          </SpecializationOverlay>
        )}
      </AnimatePresence>
    </PageContainer>
  );
};

export default DojoPage;
