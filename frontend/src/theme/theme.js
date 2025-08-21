/**
 * Extended Material-UI Theme - Clear File System
 * Comprehensive theme configuration with design tokens integration
 */

import { createTheme } from '@mui/material/styles';
import { designTokens } from './designTokens.js';

const { colors, typography, layout, spacing, animation } = designTokens;

// Base theme configuration
const baseTheme = createTheme({
  // Color palette from design tokens
  palette: {
    mode: 'light',
    primary: colors.primary,
    secondary: colors.secondary,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
    success: colors.success,
    text: colors.text,
    background: colors.background,
    divider: colors.divider,
    
    // Custom status colors
    status: colors.status
  },

  // Typography system
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif'
    ].join(','),
    
    // Typography variants
    h1: {
      fontWeight: typography.weights.bold,
      fontSize: '2.5rem',
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight
    },
    h2: {
      fontWeight: typography.weights.bold,
      fontSize: '2rem',
      lineHeight: typography.lineHeights.tight,
      letterSpacing: typography.letterSpacing.tight
    },
    h3: {
      fontWeight: typography.weights.semibold,
      fontSize: '1.75rem',
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal
    },
    h4: {
      fontWeight: typography.weights.semibold,
      fontSize: '1.5rem',
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal
    },
    h5: {
      fontWeight: typography.weights.medium,
      fontSize: '1.25rem',
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal
    },
    h6: {
      fontWeight: typography.weights.medium,
      fontSize: '1.125rem',
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal
    },
    body1: {
      fontWeight: typography.weights.regular,
      fontSize: '1rem',
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal
    },
    body2: {
      fontWeight: typography.weights.regular,
      fontSize: '0.875rem',
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.normal
    },
    caption: {
      fontWeight: typography.weights.regular,
      fontSize: '0.75rem',
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.wide
    },
    overline: {
      fontWeight: typography.weights.medium,
      fontSize: '0.75rem',
      lineHeight: typography.lineHeights.normal,
      letterSpacing: typography.letterSpacing.wide,
      textTransform: 'uppercase'
    }
  },

  // Spacing function
  spacing: (factor) => spacing.element * factor,

  // Shape (border radius)
  shape: {
    borderRadius: layout.borderRadius.medium
  },

  // Breakpoints
  breakpoints: {
    values: designTokens.breakpoints
  },

  // Z-index
  zIndex: designTokens.zIndex,

  // Transitions
  transitions: {
    duration: {
      shortest: 150,
      shorter: 200,
      short: 250,
      standard: 300,
      complex: 375,
      enteringScreen: 225,
      leavingScreen: 195
    },
    easing: {
      easeInOut: animation.easing.easeInOut,
      easeOut: animation.easing.easeOut,
      easeIn: animation.easing.easeIn,
      sharp: animation.easing.sharp
    }
  }
});

// Extended theme with component overrides
export const clearFileTheme = createTheme(baseTheme, {
  // Component-specific overrides
  components: {
    // Layout components
    MuiContainer: {
      styleOverrides: {
        root: {
          maxWidth: `${layout.maxWidth}px !important`,
          paddingLeft: spacing.page,
          paddingRight: spacing.page,
          '@media (max-width: 600px)': {
            paddingLeft: spacing.component,
            paddingRight: spacing.component
          }
        }
      }
    },

    // App Bar
    MuiAppBar: {
      styleOverrides: {
        root: {
          height: layout.appBarHeight,
          backgroundColor: colors.background.paper,
          color: colors.text.primary,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        }
      }
    },

    // Drawer
    MuiDrawer: {
      styleOverrides: {
        paper: {
          width: layout.drawerWidth,
          backgroundColor: colors.background.paper,
          borderRight: `1px solid ${colors.divider}`,
        }
      }
    },

    // Cards
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: layout.borderRadius.medium,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
          transition: `box-shadow ${animation.normal} ${animation.easing.easeInOut}`,
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)'
          }
        }
      }
    },

    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: spacing.cardPadding,
          '&:last-child': {
            paddingBottom: spacing.cardPadding
          }
        }
      }
    },

    // Buttons
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: layout.borderRadius.medium,
          textTransform: 'none',
          fontWeight: typography.weights.medium,
          padding: `${spacing.element}px ${spacing.component}px`,
          transition: `all ${animation.fast} ${animation.easing.easeInOut}`
        },
        sizeLarge: {
          padding: `${spacing.component}px ${spacing.section / 2}px`,
          fontSize: '1rem'
        },
        sizeSmall: {
          padding: `${spacing.tight}px ${spacing.element}px`,
          fontSize: '0.875rem'
        }
      }
    },

    // Icon buttons
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: layout.borderRadius.medium,
          transition: `all ${animation.fast} ${animation.easing.easeInOut}`
        }
      }
    },

    // Form components
    MuiTextField: {
      styleOverrides: {
        root: {
          marginBottom: spacing.formField,
          '& .MuiOutlinedInput-root': {
            borderRadius: layout.borderRadius.medium
          }
        }
      }
    },

    MuiFormControl: {
      styleOverrides: {
        root: {
          marginBottom: spacing.formField
        }
      }
    },

    // Chips
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: layout.borderRadius.large,
          fontWeight: typography.weights.medium
        }
      }
    },

    // Tables
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderColor: colors.divider,
          padding: spacing.component
        },
        head: {
          fontWeight: typography.weights.semibold,
          backgroundColor: colors.background.default
        }
      }
    },

    // Alerts
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: layout.borderRadius.medium,
          marginBottom: spacing.component
        }
      }
    },

    // Dialogs
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: layout.borderRadius.large,
          padding: spacing.component
        }
      }
    },

    // Lists
    MuiListItem: {
      styleOverrides: {
        root: {
          borderRadius: layout.borderRadius.medium,
          marginBottom: spacing.tight,
          '&.Mui-selected': {
            backgroundColor: `${colors.primary.main}08`,
            '&:hover': {
              backgroundColor: `${colors.primary.main}12`
            }
          }
        }
      }
    },

    // Typography
    MuiTypography: {
      styleOverrides: {
        h1: { marginBottom: spacing.section },
        h2: { marginBottom: spacing.section },
        h3: { marginBottom: spacing.component },
        h4: { marginBottom: spacing.component },
        h5: { marginBottom: spacing.component },
        h6: { marginBottom: spacing.element },
        body1: { marginBottom: spacing.element },
        body2: { marginBottom: spacing.element }
      }
    },

    // Loading indicators
    MuiCircularProgress: {
      styleOverrides: {
        root: {
          color: colors.primary.main
        }
      }
    },

    MuiLinearProgress: {
      styleOverrides: {
        root: {
          borderRadius: layout.borderRadius.small,
          height: 6,
          backgroundColor: colors.background.default
        },
        bar: {
          borderRadius: layout.borderRadius.small
        }
      }
    }
  },

  // Custom theme properties
  custom: {
    layout: {
      pageSpacing: spacing.page,
      sectionSpacing: spacing.section,
      componentSpacing: spacing.component,
      elementSpacing: spacing.element
    },
    
    animations: {
      fast: animation.fast,
      normal: animation.normal,
      slow: animation.slow
    },
    
    shadows: {
      card: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      cardHover: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
      elevated: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }
  }
});

export default clearFileTheme;