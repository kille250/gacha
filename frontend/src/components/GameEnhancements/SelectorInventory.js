/**
 * SelectorInventory - Character selector tickets display
 *
 * Shows owned character selectors and allows using them
 * to pick any character of the matching rarity.
 */

import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { FaTicketAlt, FaHeart, FaCrown, FaCheck, FaSearch } from 'react-icons/fa';
import { useSelectors } from '../../hooks/useGameEnhancements';

const Container = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  padding: 20px;
  margin: 12px 0;
  border: 1px solid rgba(255, 215, 0, 0.2);
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const Title = styled.h3`
  color: #fff;
  margin: 0;
  font-size: 1.1rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SelectorCount = styled.div`
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 171, 0, 0.2) 100%);
  padding: 6px 12px;
  border-radius: 16px;
  color: #ffd700;
  font-weight: 600;
  font-size: 0.9rem;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 32px;
  color: #666;
`;

const EmptyIcon = styled.div`
  font-size: 3rem;
  margin-bottom: 12px;
  opacity: 0.5;
`;

const EmptyText = styled.div`
  font-size: 0.9rem;
`;

const SelectorGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
`;

const SelectorCard = styled(motion.div)`
  background: ${props => {
    switch (props.$rarity) {
      case 'legendary': return 'linear-gradient(135deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 171, 0, 0.15) 100%)';
      case 'epic': return 'linear-gradient(135deg, rgba(156, 39, 176, 0.15) 0%, rgba(103, 58, 183, 0.15) 100%)';
      default: return 'linear-gradient(135deg, rgba(33, 150, 243, 0.15) 0%, rgba(3, 169, 244, 0.15) 100%)';
    }
  }};
  border: 2px solid ${props => {
    switch (props.$rarity) {
      case 'legendary': return 'rgba(255, 215, 0, 0.4)';
      case 'epic': return 'rgba(156, 39, 176, 0.4)';
      default: return 'rgba(33, 150, 243, 0.4)';
    }
  }};
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: ${props => {
      switch (props.$rarity) {
        case 'legendary': return 'rgba(255, 215, 0, 0.6)';
        case 'epic': return 'rgba(156, 39, 176, 0.6)';
        default: return 'rgba(33, 150, 243, 0.6)';
      }
    }};
  }
`;

const SelectorIcon = styled.div`
  font-size: 2.5rem;
  margin-bottom: 8px;
  color: ${props => {
    switch (props.$rarity) {
      case 'legendary': return '#ffd700';
      case 'epic': return '#ba68c8';
      default: return '#64b5f6';
    }
  }};
`;

const SelectorRarity = styled.div`
  color: #fff;
  font-weight: 600;
  font-size: 0.9rem;
  text-transform: capitalize;
  margin-bottom: 4px;
`;

const SelectorLabel = styled.div`
  color: #888;
  font-size: 0.75rem;
`;

const SelectorDate = styled.div`
  color: #666;
  font-size: 0.7rem;
  margin-top: 8px;
`;

// Character Picker Modal
const PickerModal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  flex-direction: column;
  z-index: 1000;
  padding: 20px;
`;

const PickerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
`;

const PickerTitle = styled.h2`
  color: #fff;
  margin: 0;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 12px 16px;
  margin-bottom: 16px;
`;

const SearchInput = styled.input`
  flex: 1;
  background: none;
  border: none;
  color: #fff;
  font-size: 1rem;
  outline: none;

  &::placeholder {
    color: #666;
  }
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
`;

const FilterButton = styled.button`
  background: ${props => props.$active ? 'rgba(255, 215, 0, 0.3)' : 'rgba(255, 255, 255, 0.1)'};
  border: 1px solid ${props => props.$active ? 'rgba(255, 215, 0, 0.5)' : 'transparent'};
  color: ${props => props.$active ? '#ffd700' : '#888'};
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

const CharacterGrid = styled.div`
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 12px;
  padding-bottom: 80px;
`;

const CharacterCard = styled(motion.div)`
  background: ${props => props.$selected
    ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.3) 0%, rgba(56, 142, 60, 0.3) 100%)'
    : 'rgba(255, 255, 255, 0.05)'};
  border: 2px solid ${props => props.$selected ? '#4caf50' : 'rgba(255, 255, 255, 0.1)'};
  border-radius: 12px;
  padding: 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const CharacterImage = styled.div`
  width: 80px;
  height: 80px;
  margin: 0 auto 8px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);
  overflow: hidden;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const CharacterName = styled.div`
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const OwnedBadge = styled.div`
  position: absolute;
  top: 6px;
  right: 6px;
  background: rgba(76, 175, 80, 0.8);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  color: #fff;
`;

const SelectedCheck = styled(motion.div)`
  position: absolute;
  top: -8px;
  left: -8px;
  width: 24px;
  height: 24px;
  background: #4caf50;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
`;

const ConfirmBar = styled(motion.div)`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(0deg, rgba(26, 26, 46, 0.98) 0%, rgba(26, 26, 46, 0.9) 100%);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
`;

const SelectedInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const SelectedImage = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 8px;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.1);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const SelectedText = styled.div`
  color: #fff;

  .name {
    font-weight: 600;
    font-size: 1rem;
  }

  .hint {
    color: #888;
    font-size: 0.8rem;
  }
`;

const ConfirmButton = styled(motion.button)`
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border: none;
  color: #fff;
  padding: 12px 24px;
  border-radius: 12px;
  font-weight: 600;
  font-size: 1rem;
  cursor: pointer;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const LoadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 1.2rem;
`;

// Success Modal
const SuccessModal = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
`;

const SuccessContent = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 20px;
  padding: 32px;
  text-align: center;
  max-width: 360px;
  border: 2px solid rgba(76, 175, 80, 0.5);
`;

const SuccessIcon = styled(motion.div)`
  width: 80px;
  height: 80px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  color: #fff;
`;

const SuccessTitle = styled.div`
  color: #4caf50;
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 8px;
`;

const SuccessMessage = styled.div`
  color: #888;
  font-size: 0.95rem;
  margin-bottom: 20px;
`;

const SuccessButton = styled(motion.button)`
  background: linear-gradient(135deg, #4caf50 0%, #388e3c 100%);
  border: none;
  color: #fff;
  padding: 12px 32px;
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
`;

const RARITY_ICONS = {
  rare: FaTicketAlt,
  epic: FaHeart,
  legendary: FaCrown
};

export function SelectorInventory() {
  const {
    selectors,
    characters,
    loading,
    loadingCharacters,
    using,
    fetchCharactersForRarity,
    useSelector: redeemSelector
  } = useSelectors();

  const [activeSelector, setActiveSelector] = useState(null);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState('all'); // 'all', 'owned', 'new'
  const [successResult, setSuccessResult] = useState(null);

  const handleSelectorClick = async (selector) => {
    setActiveSelector(selector);
    setSelectedCharacter(null);
    setSearchQuery('');
    setOwnershipFilter('all');
    await fetchCharactersForRarity(selector.rarity);
  };

  const handleConfirm = async () => {
    if (!activeSelector || !selectedCharacter) return;

    try {
      const result = await redeemSelector(activeSelector.id, selectedCharacter.id);
      setSuccessResult(result);
      setActiveSelector(null);
      setSelectedCharacter(null);
    } catch (err) {
      console.error('Failed to use selector:', err);
    }
  };

  const filteredCharacters = characters?.characters?.filter(char => {
    const matchesSearch = char.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesOwnership =
      ownershipFilter === 'all' ||
      (ownershipFilter === 'owned' && char.owned) ||
      (ownershipFilter === 'new' && !char.owned);
    return matchesSearch && matchesOwnership;
  }) || [];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <Container>
        <Title>Loading selectors...</Title>
      </Container>
    );
  }

  if (!selectors || selectors.available === 0) {
    return (
      <Container
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Header>
          <Title>
            <FaTicketAlt size={18} />
            Character Selectors
          </Title>
        </Header>
        <EmptyState>
          <EmptyIcon><FaTicketAlt /></EmptyIcon>
          <EmptyText>
            No selectors available.<br />
            Exchange Fate Points to get selectors!
          </EmptyText>
        </EmptyState>
      </Container>
    );
  }

  return (
    <>
      <Container
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <Header>
          <Title>
            <FaTicketAlt size={18} />
            Character Selectors
          </Title>
          <SelectorCount>{selectors.available} Available</SelectorCount>
        </Header>

        <SelectorGrid>
          {selectors.selectors.map((selector) => {
            const Icon = RARITY_ICONS[selector.rarity] || FaTicketAlt;
            return (
              <SelectorCard
                key={selector.id}
                $rarity={selector.rarity}
                onClick={() => handleSelectorClick(selector)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <SelectorIcon $rarity={selector.rarity}>
                  <Icon size={40} />
                </SelectorIcon>
                <SelectorRarity>{selector.rarity}</SelectorRarity>
                <SelectorLabel>Selector</SelectorLabel>
                <SelectorDate>
                  Obtained: {formatDate(selector.obtained)}
                </SelectorDate>
              </SelectorCard>
            );
          })}
        </SelectorGrid>
      </Container>

      {/* Character Picker Modal */}
      <AnimatePresence>
        {activeSelector && (
          <PickerModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <PickerHeader>
              <PickerTitle>
                {React.createElement(RARITY_ICONS[activeSelector.rarity] || FaTicketAlt, { size: 24 })}
                Choose a {activeSelector.rarity} character
              </PickerTitle>
              <CloseButton onClick={() => setActiveSelector(null)}>
                Cancel
              </CloseButton>
            </PickerHeader>

            <SearchBar>
              <FaSearch color="#666" />
              <SearchInput
                placeholder="Search characters..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </SearchBar>

            <FilterRow>
              <FilterButton
                $active={ownershipFilter === 'all'}
                onClick={() => setOwnershipFilter('all')}
              >
                All ({characters?.total || 0})
              </FilterButton>
              <FilterButton
                $active={ownershipFilter === 'new'}
                onClick={() => setOwnershipFilter('new')}
              >
                New ({characters?.characters?.filter(c => !c.owned).length || 0})
              </FilterButton>
              <FilterButton
                $active={ownershipFilter === 'owned'}
                onClick={() => setOwnershipFilter('owned')}
              >
                Owned ({characters?.characters?.filter(c => c.owned).length || 0})
              </FilterButton>
            </FilterRow>

            {loadingCharacters ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                Loading characters...
              </div>
            ) : (
              <CharacterGrid>
                {filteredCharacters.map(char => (
                  <CharacterCard
                    key={char.id}
                    $selected={selectedCharacter?.id === char.id}
                    onClick={() => setSelectedCharacter(char)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {selectedCharacter?.id === char.id && (
                      <SelectedCheck
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                      >
                        <FaCheck size={12} />
                      </SelectedCheck>
                    )}
                    {char.owned && <OwnedBadge>Owned</OwnedBadge>}
                    <CharacterImage>
                      {char.imageUrl ? (
                        <img src={char.imageUrl} alt={char.name} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>
                          ?
                        </div>
                      )}
                    </CharacterImage>
                    <CharacterName>{char.name}</CharacterName>
                  </CharacterCard>
                ))}
              </CharacterGrid>
            )}

            {/* Confirm Bar */}
            <AnimatePresence>
              {selectedCharacter && (
                <ConfirmBar
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                >
                  <SelectedInfo>
                    <SelectedImage>
                      {selectedCharacter.imageUrl ? (
                        <img src={selectedCharacter.imageUrl} alt={selectedCharacter.name} />
                      ) : (
                        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666' }}>?</div>
                      )}
                    </SelectedImage>
                    <SelectedText>
                      <div className="name">{selectedCharacter.name}</div>
                      <div className="hint">
                        {selectedCharacter.owned ? 'Will increase constellation' : 'New character!'}
                      </div>
                    </SelectedText>
                  </SelectedInfo>
                  <ConfirmButton
                    onClick={handleConfirm}
                    disabled={using}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {using ? 'Claiming...' : 'Confirm'}
                  </ConfirmButton>
                </ConfirmBar>
              )}
            </AnimatePresence>

            {using && (
              <LoadingOverlay>
                Claiming character...
              </LoadingOverlay>
            )}
          </PickerModal>
        )}
      </AnimatePresence>

      {/* Success Modal */}
      <AnimatePresence>
        {successResult && (
          <SuccessModal
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSuccessResult(null)}
          >
            <SuccessContent
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <SuccessIcon
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 0.2 }}
              >
                <FaCheck />
              </SuccessIcon>
              <SuccessTitle>
                {successResult.isNew ? 'New Character!' : 'Constellation Up!'}
              </SuccessTitle>
              <SuccessMessage>
                {successResult.message}
              </SuccessMessage>
              <SuccessButton
                onClick={() => setSuccessResult(null)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Awesome!
              </SuccessButton>
            </SuccessContent>
          </SuccessModal>
        )}
      </AnimatePresence>
    </>
  );
}

export default SelectorInventory;
