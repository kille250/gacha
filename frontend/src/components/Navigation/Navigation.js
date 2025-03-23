import React, { useContext } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { MdDashboard, MdCollections, MdExitToApp, MdSettings } from 'react-icons/md';
import { AuthContext } from '../../context/AuthContext';

const Navigation = () => {
  const location = useLocation();
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <NavContainer>
      <NavLinks>
        <NavItem
          isActive={location.pathname === '/gacha'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <StyledLink to="/gacha">
            <MdDashboard />
            <span>Gacha</span>
          </StyledLink>
        </NavItem>
        
        <NavItem
          isActive={location.pathname === '/collection'}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <StyledLink to="/collection">
            <MdCollections />
            <span>Collection</span>
          </StyledLink>
        </NavItem>

        {/* Admin-Link, nur für Administratoren anzeigen */}
        {user?.isAdmin && (
          <NavItem
            isActive={location.pathname === '/admin'}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
          >
            <StyledLink to="/admin">
              <MdSettings />
              <span>Admin</span>
            </StyledLink>
          </NavItem>
        )}

      </NavLinks>
      
      <UserControls>
        <Username>{user?.username || 'User'}</Username>
        <LogoutButton 
          onClick={handleLogout}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          <MdExitToApp />
          <span>Logout</span>
        </LogoutButton>
      </UserControls>
    </NavContainer>
  );
};

const NavContainer = styled.nav`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 30px;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(8px);
  color: white;
  position: sticky;
  top: 0;
  z-index: 100;
`;

const NavLinks = styled.ul`
  display: flex;
  list-style: none;
  gap: 20px;
`;

const NavItem = styled(motion.li)`
  padding: 8px 15px;
  border-radius: 20px;
  background: ${props => props.isActive ? 'rgba(255, 255, 255, 0.2)' : 'transparent'};
`;

const StyledLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  text-decoration: none;
  font-size: 16px;
  font-weight: 500;
  
  svg {
    font-size: 20px;
  }
`;

const UserControls = styled.div`
  display: flex;
  align-items: center;
  gap: 15px;
`;

const Username = styled.span`
  font-weight: 500;
  opacity: 0.8;
`;

const LogoutButton = styled(motion.button)`
  display: flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  padding: 8px 15px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 14px;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
`;

export default Navigation;