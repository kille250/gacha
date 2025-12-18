import { keyframes, css } from 'styled-components';

// ==================== KEYFRAME ANIMATIONS ====================

export const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

export const float = keyframes`
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-12px); }
`;

export const pulse = keyframes`
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.8; }
`;

export const shimmer = keyframes`
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
`;

export const glow = keyframes`
  0%, 100% { 
    filter: brightness(1);
    box-shadow: 0 0 20px currentColor;
  }
  50% { 
    filter: brightness(1.2);
    box-shadow: 0 0 35px currentColor;
  }
`;

export const slideIn = keyframes`
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
`;

export const scaleIn = keyframes`
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
`;

export const cardReveal = keyframes`
  0% { transform: rotateY(90deg) scale(0.8); opacity: 0; }
  60% { transform: rotateY(-5deg) scale(1.02); }
  100% { transform: rotateY(0) scale(1); opacity: 1; }
`;

export const sparkle = keyframes`
  0%, 100% { opacity: 0; transform: scale(0); }
  50% { opacity: 1; transform: scale(1); }
`;

// ==================== FRAMER MOTION VARIANTS ====================

export const cardVariants = {
  hidden: { 
    opacity: 0, 
    rotateY: 90,
    scale: 0.85,
    y: 20
  },
  visible: { 
    opacity: 1, 
    rotateY: 0,
    scale: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
      duration: 0.6
    }
  },
  exit: { 
    opacity: 0, 
    rotateY: -90,
    scale: 0.85,
    transition: { duration: 0.3 }
  }
};

export const cardVariantsFast = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { 
    opacity: 1, 
    scale: 1,
    transition: { duration: 0.15 }
  },
  exit: { 
    opacity: 0, 
    scale: 0.95,
    transition: { duration: 0.1 }
  }
};

export const gridItemVariants = {
  hidden: { opacity: 0, scale: 0.8, y: 20 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      delay: i * 0.04,
      type: 'spring',
      stiffness: 120,
      damping: 12
    }
  }),
  hover: {
    scale: 1.05,
    y: -5,
    zIndex: 10,
    transition: { duration: 0.2 }
  }
};

export const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1,
    transition: { duration: 0.25 }
  },
  exit: { 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const modalVariants = {
  hidden: { scale: 0.95, opacity: 0, y: 10 },
  visible: { 
    scale: 1, 
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 25
    }
  },
  exit: { 
    scale: 0.95, 
    opacity: 0,
    y: 10,
    transition: { duration: 0.15 }
  }
};

export const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } }
};

export const slideVariants = {
  hidden: { x: '100%', opacity: 0 },
  visible: { 
    x: 0, 
    opacity: 1,
    transition: {
      type: 'spring',
      damping: 30,
      stiffness: 300
    }
  },
  exit: { 
    x: '100%', 
    opacity: 0,
    transition: { duration: 0.2 }
  }
};

export const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: { duration: 0.3 }
  }
};

