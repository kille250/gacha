/**
 * BaitShopModal - Wrapper modal for BaitShop component
 *
 * Integrates the BaitShop enhancement component into the
 * fishing modal system.
 */

import React from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { MdClose } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { BaitShop } from '../../GameEnhancements';

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const ModalContainer = styled(motion.div)`
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  position: sticky;
  top: 0;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  z-index: 1;
`;

const ModalTitle = styled.h2`
  color: #fff;
  margin: 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  border-radius: 8px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #fff;
  transition: background 0.2s ease;

  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

const ModalBody = styled.div`
  padding: 0;

  /* Override BaitShop container margins for modal context */
  & > div {
    margin: 0;
    border: none;
    border-radius: 0;
  }
`;

export function BaitShopModal({ show, onClose, userPoints = 0 }) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {show && (
        <Overlay
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <ModalContainer
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalHeader>
              <ModalTitle>
                <span role="img" aria-hidden="true">🪱</span>
                {t('fishing.baitShop') || 'Bait Shop'}
              </ModalTitle>
              <CloseButton onClick={onClose} aria-label={t('common.close') || 'Close'}>
                <MdClose size={20} />
              </CloseButton>
            </ModalHeader>
            <ModalBody>
              <BaitShop userPoints={userPoints} />
            </ModalBody>
          </ModalContainer>
        </Overlay>
      )}
    </AnimatePresence>
  );
}

export default BaitShopModal;
