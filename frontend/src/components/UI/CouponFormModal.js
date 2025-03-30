// components/UI/CouponFormModal.js
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { FaTicketAlt, FaCoins, FaUsers, FaCalendarAlt, FaTimes } from 'react-icons/fa';

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
        startDate: coupon.startDate ? new Date(coupon.startDate).toISOString().split('T')[0] : '',
        endDate: coupon.endDate ? new Date(coupon.endDate).toISOString().split('T')[0] : '',
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
    <ModalOverlay>
      <ModalContent>
        <ModalHeader>
          <h3><FaTicketAlt /> {coupon ? 'Edit Coupon' : 'Create New Coupon'}</h3>
          <CloseButton onClick={onClose}><FaTimes /></CloseButton>
        </ModalHeader>
        
        <ModalBody>
          <form onSubmit={handleSubmit}>
            <FormRow>
              <FormGroup fullWidth>
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
                <HelperText>No spaces, only letters, numbers, and hyphens</HelperText>
              </FormGroup>
            </FormRow>
            
            <FormRow>
              <FormGroup fullWidth>
                <Label>Description</Label>
                <Input 
                  type="text" 
                  name="description" 
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Summer 2023 promotional coupon"
                />
              </FormGroup>
            </FormRow>
            
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
                <HelperText>-1 for unlimited</HelperText>
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
                <HelperText>Leave empty for immediate start</HelperText>
              </FormGroup>
              
              <FormGroup>
                <Label><FaCalendarAlt /> End Date</Label>
                <Input 
                  type="date" 
                  name="endDate" 
                  value={formData.endDate}
                  onChange={handleChange}
                />
                <HelperText>Leave empty for no expiration</HelperText>
              </FormGroup>
            </FormRow>
            
            <FormRow>
              <FormGroup>
                <CheckboxLabel>
                  <Checkbox 
                    type="checkbox" 
                    name="isActive" 
                    checked={formData.isActive}
                    onChange={handleChange}
                  />
                  <span>Active</span>
                </CheckboxLabel>
              </FormGroup>
            </FormRow>
            
            <ButtonGroup>
              <SubmitButton type="submit">
                {coupon ? 'Update Coupon' : 'Create Coupon'}
              </SubmitButton>
              <CancelButton type="button" onClick={onClose}>
                Cancel
              </CancelButton>
            </ButtonGroup>
          </form>
        </ModalBody>
      </ModalContent>
    </ModalOverlay>
  );
};

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
`;

const ModalContent = styled.div`
  background-color: white;
  border-radius: 8px;
  width: 95%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 20px;
  border-bottom: 1px solid #eee;
  
  h3 {
    margin: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }
`;

const CloseButton = styled.button`
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #777;
  display: flex;
  align-items: center;
  
  &:hover {
    color: #333;
  }
`;

const ModalBody = styled.div`
  padding: 20px;
`;

const FormRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
  margin-bottom: 20px;
  
  @media (min-width: 768px) {
    flex-direction: row;
  }
`;

const FormGroup = styled.div`
  flex: ${props => props.fullWidth ? '1 1 100%' : '1 1 0'};
  min-width: 0;
`;

const Label = styled.label`
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 5px;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  
  &:focus {
    border-color: #3498db;
    outline: none;
  }
`;

const HelperText = styled.small`
  color: #777;
  font-size: 12px;
`;

const Select = styled.select`
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  background-color: white;
  
  &:focus {
    border-color: #3498db;
    outline: none;
  }
`;

const CheckboxLabel = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background-color: ${props => props.checked ? '#e8f5e9' : 'white'};
`;

const Checkbox = styled.input`
  width: 18px;
  height: 18px;
`;

const ButtonGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
  
  @media (min-width: 768px) {
    flex-direction: row;
    justify-content: flex-end;
  }
`;

const SubmitButton = styled.button`
  background-color: #27ae60;
  color: white;
  border: none;
  border-radius: 4px;
  padding: 12px 20px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
  
  @media (min-width: 768px) {
    width: auto;
  }
  
  &:hover {
    background-color: #219653;
  }
`;

const CancelButton = styled.button`
  background-color: #e0e0e0;
  color: #333;
  border: none;
  border-radius: 4px;
  padding: 12px 20px;
  font-weight: bold;
  cursor: pointer;
  width: 100%;
  
  @media (min-width: 768px) {
    width: auto;
  }
  
  &:hover {
    background-color: #d0d0d0;
  }
`;

export default CouponFormModal;