import { useEffect, useRef, useState } from 'react';

/**
 * Hook for managing focus and keyboard navigation accessibility
 */
export const useFocusManagement = () => {
  const focusableElementsSelector = 
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"]), [contenteditable="true"]';

  const trapFocus = (container) => {
    if (!container) return () => {};

    const focusableElements = container.querySelectorAll(focusableElementsSelector);
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element on mount
    setTimeout(() => {
      firstElement?.focus();
    }, 100);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  };

  const restoreFocus = (previousElement) => {
    if (previousElement && typeof previousElement.focus === 'function') {
      previousElement.focus();
    }
  };

  return { trapFocus, restoreFocus };
};

/**
 * Hook for keyboard navigation in lists and grids
 */
export const useKeyboardNavigation = (items = [], options = {}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const {
    orientation = 'vertical', // 'vertical', 'horizontal', 'grid'
    loop = true,
    gridCols = 4, // For grid navigation
    onSelect = () => {},
    onEscape = () => {}
  } = options;

  const handleKeyDown = (event) => {
    const { key, metaKey, ctrlKey } = event;
    let newIndex = currentIndex;

    switch (key) {
      case 'ArrowDown':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault();
          if (orientation === 'grid') {
            newIndex = Math.min(currentIndex + gridCols, items.length - 1);
          } else {
            newIndex = loop ? 
              (currentIndex + 1) % items.length : 
              Math.min(currentIndex + 1, items.length - 1);
          }
        }
        break;

      case 'ArrowUp':
        if (orientation === 'vertical' || orientation === 'grid') {
          event.preventDefault();
          if (orientation === 'grid') {
            newIndex = Math.max(currentIndex - gridCols, 0);
          } else {
            newIndex = loop ?
              (currentIndex - 1 + items.length) % items.length :
              Math.max(currentIndex - 1, 0);
          }
        }
        break;

      case 'ArrowRight':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault();
          newIndex = loop ?
            (currentIndex + 1) % items.length :
            Math.min(currentIndex + 1, items.length - 1);
        }
        break;

      case 'ArrowLeft':
        if (orientation === 'horizontal' || orientation === 'grid') {
          event.preventDefault();
          newIndex = loop ?
            (currentIndex - 1 + items.length) % items.length :
            Math.max(currentIndex - 1, 0);
        }
        break;

      case 'Home':
        event.preventDefault();
        newIndex = 0;
        break;

      case 'End':
        event.preventDefault();
        newIndex = items.length - 1;
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        onSelect(currentIndex, items[currentIndex]);
        break;

      case 'Escape':
        event.preventDefault();
        onEscape();
        break;

      default:
        // Letter navigation for quick jumping
        if (key.length === 1 && !metaKey && !ctrlKey) {
          const letter = key.toLowerCase();
          const startIndex = (currentIndex + 1) % items.length;
          
          for (let i = 0; i < items.length; i++) {
            const index = (startIndex + i) % items.length;
            const item = items[index];
            
            if (item && typeof item === 'object' && item.name) {
              if (item.name.toLowerCase().startsWith(letter)) {
                newIndex = index;
                break;
              }
            } else if (typeof item === 'string') {
              if (item.toLowerCase().startsWith(letter)) {
                newIndex = index;
                break;
              }
            }
          }
        }
        break;
    }

    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  return {
    currentIndex,
    setCurrentIndex,
    handleKeyDown
  };
};

/**
 * Hook for managing dialog accessibility
 */
export const useDialogAccessibility = (isOpen) => {
  const dialogRef = useRef(null);
  const previousActiveElement = useRef(null);
  const { trapFocus, restoreFocus } = useFocusManagement();

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement;
      
      const cleanup = trapFocus(dialogRef.current);
      
      return () => {
        cleanup();
        restoreFocus(previousActiveElement.current);
      };
    }
  }, [isOpen, trapFocus, restoreFocus]);

  return dialogRef;
};

/**
 * Hook for announcing changes to screen readers
 */
export const useScreenReaderAnnouncement = () => {
  const [announcement, setAnnouncement] = useState('');

  const announce = (message, priority = 'polite') => {
    setAnnouncement(''); // Clear first to ensure change is detected
    setTimeout(() => {
      setAnnouncement(message);
    }, 100);
    
    // Clear after announcement
    setTimeout(() => {
      setAnnouncement('');
    }, 1000);
  };

  const AnnouncementRegion = () => (
    <div
      aria-live="polite"
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      }}
    >
      {announcement}
    </div>
  );

  return { announce, AnnouncementRegion };
};

/**
 * Hook for skip links functionality
 */
export const useSkipLinks = () => {
  const skipLinksRef = useRef([]);
  
  const registerSkipTarget = (id, label) => {
    skipLinksRef.current.push({ id, label });
  };

  const SkipLinks = () => (
    <nav
      aria-label="Skip links"
      style={{
        position: 'absolute',
        top: '-40px',
        left: '6px',
        zIndex: 10000
      }}
    >
      {skipLinksRef.current.map(({ id, label }) => (
        <a
          key={id}
          href={`#${id}`}
          style={{
            position: 'absolute',
            left: '-10000px',
            top: 'auto',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
            backgroundColor: '#000',
            color: '#fff',
            padding: '8px',
            textDecoration: 'none',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 'bold'
          }}
          onFocus={(e) => {
            e.target.style.position = 'static';
            e.target.style.left = 'auto';
            e.target.style.width = 'auto';
            e.target.style.height = 'auto';
            e.target.style.overflow = 'visible';
          }}
          onBlur={(e) => {
            e.target.style.position = 'absolute';
            e.target.style.left = '-10000px';
            e.target.style.width = '1px';
            e.target.style.height = '1px';
            e.target.style.overflow = 'hidden';
          }}
        >
          {label}
        </a>
      ))}
    </nav>
  );

  return { registerSkipTarget, SkipLinks };
};

/**
 * Hook for high contrast mode detection
 */
export const useHighContrast = () => {
  const [highContrast, setHighContrast] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-contrast: high)');
    setHighContrast(mediaQuery.matches);

    const handler = (e) => setHighContrast(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return highContrast;
};

/**
 * Hook for reduced motion preference
 */
export const useReducedMotion = () => {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handler = (e) => setReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);

    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return reducedMotion;
};