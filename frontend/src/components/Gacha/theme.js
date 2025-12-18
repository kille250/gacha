// ==================== THEME CONFIGURATION ====================

export const rarityColors = {
  common: '#78909c',
  uncommon: '#66bb6a',
  rare: '#42a5f5',
  epic: '#ab47bc',
  legendary: '#ffa726'
};

export const rarityGradients = {
  common: 'linear-gradient(135deg, #78909c, #546e7a)',
  uncommon: 'linear-gradient(135deg, #66bb6a, #43a047)',
  rare: 'linear-gradient(135deg, #42a5f5, #1e88e5)',
  epic: 'linear-gradient(135deg, #ab47bc, #8e24aa)',
  legendary: 'linear-gradient(135deg, #ffa726, #fb8c00)'
};

export const theme = {
  colors: {
    primary: '#6e48aa',
    secondary: '#9e5594',
    accent: '#ffd700',
    success: '#43a047',
    error: '#e53935',
    warning: '#ffa000'
  },
  
  background: {
    page: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
    card: 'rgba(15, 23, 42, 0.8)',
    glass: 'rgba(255, 255, 255, 0.05)',
    overlay: 'rgba(0, 0, 0, 0.7)'
  },
  
  text: {
    primary: '#ffffff',
    secondary: 'rgba(255, 255, 255, 0.7)',
    muted: 'rgba(255, 255, 255, 0.4)',
    dark: '#1a1a2e'
  },
  
  border: {
    subtle: 'rgba(255, 255, 255, 0.08)',
    light: 'rgba(255, 255, 255, 0.15)',
    medium: 'rgba(255, 255, 255, 0.25)'
  },
  
  gradient: {
    primary: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    secondary: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    gold: 'linear-gradient(135deg, #f5af19 0%, #f12711 100%)',
    dark: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
    purple: 'linear-gradient(135deg, #6e48aa 0%, #9e5594 100%)',
    blue: 'linear-gradient(135deg, #4b6cb7 0%, #182848 100%)'
  },
  
  shadow: {
    small: '0 2px 8px rgba(0, 0, 0, 0.15)',
    medium: '0 4px 20px rgba(0, 0, 0, 0.25)',
    large: '0 8px 40px rgba(0, 0, 0, 0.35)',
    glow: (color) => `0 0 20px ${color}40, 0 0 40px ${color}20`
  },
  
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    xxl: '48px'
  },
  
  radius: {
    sm: '8px',
    md: '12px',
    lg: '16px',
    xl: '24px',
    full: '9999px'
  },
  
  breakpoints: {
    mobile: '480px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px'
  }
};

export default theme;

