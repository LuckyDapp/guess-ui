import React, { useState, useEffect } from 'react';
import { Box, Typography, Fade, Grow } from '@mui/material';
import { CheckCircle, Error, Info, Warning } from '@mui/icons-material';

export type FeedbackType = 'success' | 'error' | 'warning' | 'info';

interface InteractionFeedbackProps {
  type: FeedbackType;
  message: string;
  show: boolean;
  onClose?: () => void;
  duration?: number;
}

export function InteractionFeedback({
  type,
  message,
  show,
  onClose,
  duration = 3000
}: InteractionFeedbackProps) {
  const [visible, setVisible] = useState(show);

  useEffect(() => {
    setVisible(show);
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        onClose?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle sx={{ color: '#4caf50' }} />;
      case 'error':
        return <Error sx={{ color: '#f44336' }} />;
      case 'warning':
        return <Warning sx={{ color: '#ff9800' }} />;
      case 'info':
        return <Info sx={{ color: '#64b5f6' }} />;
      default:
        return <Info sx={{ color: '#64b5f6' }} />;
    }
  };

  const getBackgroundColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(76, 175, 80, 0.1)';
      case 'error':
        return 'rgba(244, 67, 54, 0.1)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.1)';
      case 'info':
        return 'rgba(100, 181, 246, 0.1)';
      default:
        return 'rgba(100, 181, 246, 0.1)';
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'rgba(76, 175, 80, 0.3)';
      case 'error':
        return 'rgba(244, 67, 54, 0.3)';
      case 'warning':
        return 'rgba(255, 152, 0, 0.3)';
      case 'info':
        return 'rgba(100, 181, 246, 0.3)';
      default:
        return 'rgba(100, 181, 246, 0.3)';
    }
  };

  return (
    <Fade in={visible} timeout={300}>
      <Box
        sx={{
          position: 'fixed',
          top: 100,
          right: 20,
          zIndex: 2000,
          minWidth: '300px',
          maxWidth: '400px'
        }}
      >
        <Grow in={visible} timeout={400}>
          <Box
            sx={{
              background: getBackgroundColor(),
              border: `1px solid ${getBorderColor()}`,
              borderRadius: '12px',
              p: 2,
              backdropFilter: 'blur(10px)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 2
            }}
          >
            {getIcon()}
            <Typography
              variant="body2"
              sx={{
                color: 'white',
                flex: 1,
                fontWeight: 500
              }}
            >
              {message}
            </Typography>
          </Box>
        </Grow>
      </Box>
    </Fade>
  );
}

// Hook for managing interaction feedback
export function useInteractionFeedback() {
  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message: string;
    show: boolean;
  } | null>(null);

  const showFeedback = (type: FeedbackType, message: string, duration = 3000) => {
    setFeedback({ type, message, show: true });
    if (duration > 0) {
      setTimeout(() => {
        setFeedback(prev => prev ? { ...prev, show: false } : null);
      }, duration);
    }
  };

  const hideFeedback = () => {
    setFeedback(prev => prev ? { ...prev, show: false } : null);
  };

  return {
    feedback,
    showFeedback,
    hideFeedback,
    FeedbackComponent: feedback ? (
      <InteractionFeedback
        {...feedback}
        onClose={hideFeedback}
      />
    ) : null
  };
}

// Button with enhanced interaction feedback
interface InteractiveButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  sx?: any;
}

export function InteractiveButton({
  children,
  onClick,
  variant = 'primary',
  disabled = false,
  loading = false,
  sx = {}
}: InteractiveButtonProps) {
  const [isPressed, setIsPressed] = useState(false);

  const getVariantStyles = () => {
    switch (variant) {
      case 'primary':
        return {
          background: 'linear-gradient(135deg, #64b5f6 0%, #1976d2 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1976d2 0%, #64b5f6 100%)',
            transform: 'translateY(-2px)',
          }
        };
      case 'secondary':
        return {
          background: 'linear-gradient(135deg, #666 0%, #444 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #444 0%, #666 100%)',
            transform: 'translateY(-2px)',
          }
        };
      case 'success':
        return {
          background: 'linear-gradient(135deg, #4caf50 0%, #2e7d32 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
            transform: 'translateY(-2px)',
          }
        };
      case 'danger':
        return {
          background: 'linear-gradient(135deg, #f44336 0%, #c62828 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #c62828 0%, #f44336 100%)',
            transform: 'translateY(-2px)',
          }
        };
      default:
        return {};
    }
  };

  return (
    <Box
      component="button"
      onClick={onClick}
      disabled={disabled || loading}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      sx={{
        border: 'none',
        borderRadius: '12px',
        padding: '12px 24px',
        color: 'white',
        fontSize: '16px',
        fontWeight: 600,
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s ease',
        opacity: disabled ? 0.6 : 1,
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        boxShadow: isPressed
          ? '0 2px 8px rgba(0, 0, 0, 0.2)'
          : '0 4px 15px rgba(0, 0, 0, 0.3)',
        '&:hover': {
          boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
        },
        ...getVariantStyles(),
        ...sx
      }}
    >
      {loading ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box
            sx={{
              width: '16px',
              height: '16px',
              border: '2px solid rgba(255, 255, 255, 0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }}
          />
          Loading...
        </Box>
      ) : (
        children
      )}
    </Box>
  );
}

// Add spin animation to CSS
const spinKeyframes = `
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject keyframes into document head
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = spinKeyframes;
  document.head.appendChild(style);
}