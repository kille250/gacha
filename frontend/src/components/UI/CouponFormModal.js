// components/UI/CouponFormModal.js
/**
 * CouponFormModal - Admin form for creating/editing coupons
 *
 * Supports coupon types:
 * - coins: Currency reward (uses value field)
 * - character: Character reward (uses characterId field)
 * - ticket: Regular gacha tickets (uses value field for quantity)
 * - premium_ticket: Premium gacha tickets (uses value field for quantity)
 */
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaTicketAlt, FaCoins, FaUsers, FaCalendarAlt, FaTimes, FaGem } from 'react-icons/fa';

const CouponFormModal = ({ show, onClose, onSubmit, coupon, characters }) => {
  const [formData, setFormData] = useState({
    code: '',
    description: '',
    type: 'coins',
    value: 100,
    characterId: '',
    maxUses: 1,
    usesPerUser: 1,
    startDate: '',
    endDate: '',
    isActive: true
  });
  
  // Helper to safely parse dates
  const formatDateForInput = (dateValue) => {
    if (!dateValue) return '';
    try {
      const date = new Date(dateValue);
      // Check if the date is valid
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    } catch (e) {
      return '';
    }
  };

  useEffect(() => {
    if (coupon) {
      setFormData({
        code: coupon.code || '',
        description: coupon.description || '',
        type: coupon.type || 'coins',
        value: coupon.value || 0,
        characterId: coupon.characterId || '',
        maxUses: coupon.maxUses || 1,
        usesPerUser: coupon.usesPerUser || 1,
        startDate: formatDateForInput(coupon.startDate),
        endDate: formatDateForInput(coupon.endDate),
        isActive: coupon.isActive !== false
      });
    } else {
      // Reset form for new coupons
      setFormData({
        code: '',
        description: '',
        type: 'coins',
        value: 100,
        characterId: '',
        maxUses: 1,
        usesPerUser: 1,
        startDate: '',
        endDate: '',
        isActive: true
      });
    }
  }, [coupon, show]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };
  
  if (!show) return null;
  
  return (
    <ModalOverlay onMouseDown={onClose}>
      <ModalContent onMouseDown={e => e.stopPropagation()}>
        <ModalHeader>
          <ModalTitle>
            <FaTicketAlt />
            {coupon ? 'Edit Coupon' : 'Create New Coupon'}
          </ModalTitle>
          <CloseButton onClick={onClose}><FaTimes /></CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <FormGroup>
              <Label>Coupon Code</Label>
              <Input 
                type="text" 
                name="code" 
                value={formData.code}
                onChange={handleChange}
                placeholder="SUMMER2023"
                required
                pattern="^[a-zA-Z0-9\-]+$"
                title="Use only letters, numbers, and hyphens"
                maxLength="20"
              />
              <FormHint>No spaces, only letters, numbers, and hyphens</FormHint>
            </FormGroup>
            
            <FormGroup>
              <Label>Description</Label>
              <Input 
                type="text" 
                name="description" 
                value={formData.description}
                onChange={handleChange}
                placeholder="Summer 2023 promotional coupon"
              />
            </FormGroup>
            
            <FormRow>
              <FormGroup>
                <Label>Coupon Type</Label>
                <Select
                  name="type"
                  value={formData.type}
                  onChange={handleChange}
                >
                  <option value="coins">Coins Reward</option>
                  <option value="character">Character Reward</option>
                  <option value="ticket">Ticket Reward</option>
                  <option value="premium_ticket">Premium Ticket Reward</option>
                </Select>
              </FormGroup>

              {formData.type === 'coins' ? (
                <FormGroup>
                  <Label><FaCoins /> Coin Value</Label>
                  <Input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    min="1"
                    max="100000"
                    required
                  />
                </FormGroup>
              ) : formData.type === 'character' ? (
                <FormGroup>
                  <Label><FaUsers /> Character</Label>
                  <Select
                    name="characterId"
                    value={formData.characterId}
                    onChange={handleChange}
                    required
                  >
                    <option value="">-- Select Character --</option>
                    {characters.map(char => (
                      <option key={char.id} value={char.id}>
                        {char.name} ({char.series}) - {char.rarity}
                      </option>
                    ))}
                  </Select>
                </FormGroup>
              ) : formData.type === 'ticket' ? (
                <FormGroup>
                  <Label><FaTicketAlt /> Ticket Quantity</Label>
                  <Input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    required
                  />
                  <FormHint>Number of regular gacha tickets to award</FormHint>
                </FormGroup>
              ) : formData.type === 'premium_ticket' ? (
                <FormGroup>
                  <Label><FaGem /> Premium Ticket Quantity</Label>
                  <Input
                    type="number"
                    name="value"
                    value={formData.value}
                    onChange={handleChange}
                    min="1"
                    max="100"
                    required
                  />
                  <FormHint>Number of premium gacha tickets to award</FormHint>
                </FormGroup>
              ) : null}
            </FormRow>
            
            <FormRow>
              <FormGroup>
                <Label>Maximum Total Uses</Label>
                <Input 
                  type="number" 
                  name="maxUses" 
                  value={formData.maxUses}
                  onChange={handleChange}
                  min="-1"
                  title="Use -1 for unlimited"
                />
                <FormHint>-1 for unlimited</FormHint>
              </FormGroup>
              
              <FormGroup>
                <Label>Uses Per User</Label>
                <Input 
                  type="number" 
                  name="usesPerUser" 
                  value={formData.usesPerUser}
                  onChange={handleChange}
                  min="1"
                  max="100"
                />
              </FormGroup>
            </FormRow>
            
            <FormRow>
              <FormGroup>
                <Label><FaCalendarAlt /> Start Date</Label>
                <Input 
                  type="date" 
                  name="startDate" 
                  value={formData.startDate}
                  onChange={handleChange}
                />
                <FormHint>Leave empty for immediate start</FormHint>
              </FormGroup>
              
              <FormGroup>
                <Label><FaCalendarAlt /> End Date</Label>
                <Input 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate}
                  onChange={handleChange}
                />
                <FormHint>Leave empty for no expiration</FormHint>
              </FormGroup>
            </FormRow>
            
            <FormGroup>
              <CheckboxWrapper>
                <Checkbox 
                  type="checkbox" 
                  name="isActive" 
                  id="isActive"
                  checked={formData.isActive}
                  onChange={handleChange}
                />
                <CheckboxLabel htmlFor="isActive">
                  <CheckboxIndicator $checked={formData.isActive}>
                    {formData.isActive && '✓'}
                  </CheckboxIndicator>
                  Active
                </CheckboxLabel>
              </CheckboxWrapper>
            </FormGroup>
            
            <ButtonGroup>
              <CancelButton type="button" onClick={onClose}>Cancel</CancelButton>
              <SubmitButton type="submit">
                {coupon ? 'Update Coupon' : 'Create Coupon'}
              </SubmitButton>
            </ButtonGroup>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

// ==================== STYLED COMPONENTS ====================

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
`;

const ModalContent = styled.div`
  background: #1c1c1e;
  border-radius: 20px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 
    0 0 0 1px rgba(255, 255, 255, 0.1),
    0 25px 80px rgba(0, 0, 0, 0.5);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const ModalTitle = styled.h3`
  margin: 0;
  color: #fff;
  font-size: 20px;
  font-weight: 600;
  letter-spacing: -0.02em;
  display: flex;
  align-items: center;
  gap: 12px;
  
  svg {
    color: #FF9F0A;
  }
`;

const CloseButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: rgba(255, 255, 255, 0.6);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: #fff;
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  flex: 1;
`;

const FormRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 20px;
  
  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormGroup = styled.div`
  margin-bottom: 20px;
  
  ${FormRow} & {
    margin-bottom: 0;
  }
`;

const Label = styled.label`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
  
  svg {
    color: rgba(255, 255, 255, 0.5);
    font-size: 14px;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 15px;
  color: #fff;
  transition: all 0.2s;
  
  &:focus {
    outline: none;
    border-color: #007AFF;
    background: rgba(255, 255, 255, 0.08);
  }
  
  &::placeholder {
    color: rgba(255, 255, 255, 0.3);
  }
  
  &::-webkit-calendar-picker-indicator {
    filter: invert(1);
    opacity: 0.5;
    cursor: pointer;
  }
`;

const FormHint = styled.small`
  color: rgba(255, 255, 255, 0.4);
  font-size: 12px;
  margin-top: 6px;
  display: block;
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-size: 15px;
  color: #fff;
  cursor: pointer;
  transition: all 0.2s;
  appearance: none;
  background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='white' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 16px;
  padding-right: 40px;
  
  &:focus {
    outline: none;
    border-color: #007AFF;
    background-color: rgba(255, 255, 255, 0.08);
  }
  
  option {
    background: #2c2c2e;
    color: #fff;
    padding: 12px;
  }
`;

const CheckboxWrapper = styled.div`
  display: flex;
  align-items: center;
`;

const Checkbox = styled.input`
  position: absolute;
  opacity: 0;
  pointer-events: none;
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }
`;

const CheckboxIndicator = styled.span`
  width: 22px;
  height: 22px;
  border-radius: 6px;
  background: ${props => props.$checked ? '#34C759' : 'rgba(255, 255, 255, 0.1)'};
  border: 2px solid ${props => props.$checked ? '#34C759' : 'rgba(255, 255, 255, 0.2)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 14px;
  font-weight: bold;
  transition: all 0.2s;
`;

const ButtonGroup = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const SubmitButton = styled.button`
  background: #34C759;
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: #2DB54A;
  }
`;

const CancelButton = styled.button`
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.8);
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 500;
  font-size: 15px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.15);
  }
`;

export default CouponFormModal;
