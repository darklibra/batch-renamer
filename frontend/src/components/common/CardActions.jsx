import React from 'react';
import { Box, CardActions as MUICardActions, Divider } from '@mui/material';
import { EditButton, DeleteButton, ViewButton } from './ActionButtons';

/**
 * Standardized Card Actions Component
 * Provides consistent action button layout and styling for cards
 */
export const StandardCardActions = ({ 
  onEdit, 
  onDelete, 
  onView, 
  onTest,
  showEdit = true, 
  showDelete = true, 
  showView = true,
  showTest = false,
  customActions = [],
  layout = 'split', // 'split', 'grouped', 'stacked'
  editLabel = "Edit",
  deleteLabel = "Delete", 
  viewLabel = "View Details",
  testLabel = "Test",
  deleteConfirmMessage,
  disabled = false,
  divider = false,
  ...props 
}) => {
  // Primary actions (left side or top)
  const primaryActions = [];
  
  if (customActions.length > 0) {
    customActions.forEach((action, index) => {
      primaryActions.push(
        <Box key={`custom-${index}`}>
          {action.component || (
            <button
              onClick={action.onClick}
              disabled={disabled || action.disabled}
              style={{
                padding: '6px 12px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                background: '#fff',
                cursor: (disabled || action.disabled) ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                ...action.style
              }}
            >
              {action.label}
            </button>
          )}
        </Box>
      );
    });
  }

  if (showTest && onTest) {
    primaryActions.push(
      <button
        key="test"
        onClick={onTest}
        disabled={disabled}
        style={{
          padding: '6px 12px',
          border: '1px solid #1976d2',
          borderRadius: '4px',
          background: '#fff',
          color: '#1976d2',
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}
      >
        🧪 {testLabel}
      </button>
    );
  }

  // Secondary actions (right side or bottom)
  const secondaryActions = [];
  
  if (showView && onView) {
    secondaryActions.push(
      <ViewButton
        key="view"
        onClick={onView}
        label={viewLabel}
        disabled={disabled}
        size="small"
      />
    );
  }

  if (showEdit && onEdit) {
    secondaryActions.push(
      <EditButton
        key="edit"
        onClick={onEdit}
        label={editLabel}
        disabled={disabled}
        size="small"
      />
    );
  }

  if (showDelete && onDelete) {
    secondaryActions.push(
      <DeleteButton
        key="delete"
        onClick={onDelete}
        label={deleteLabel}
        disabled={disabled}
        size="small"
        confirmMessage={deleteConfirmMessage}
      />
    );
  }

  // Layout rendering
  const renderSplitLayout = () => (
    <MUICardActions 
      sx={{ 
        justifyContent: 'space-between', 
        px: 2, 
        py: 1.5,
        '& > :not(style) + :not(style)': {
          marginLeft: 0
        },
        ...props.sx 
      }}
      {...props}
    >
      {primaryActions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {primaryActions}
        </Box>
      )}
      {secondaryActions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {secondaryActions}
        </Box>
      )}
    </MUICardActions>
  );

  const renderGroupedLayout = () => (
    <MUICardActions 
      sx={{ 
        justifyContent: 'flex-end', 
        px: 2, 
        py: 1.5,
        gap: 1,
        ...props.sx 
      }}
      {...props}
    >
      {primaryActions}
      {secondaryActions}
    </MUICardActions>
  );

  const renderStackedLayout = () => (
    <Box sx={{ p: 2 }}>
      {primaryActions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          {primaryActions}
        </Box>
      )}
      {secondaryActions.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {secondaryActions}
        </Box>
      )}
    </Box>
  );

  let content;
  switch (layout) {
    case 'grouped':
      content = renderGroupedLayout();
      break;
    case 'stacked':
      content = renderStackedLayout();
      break;
    case 'split':
    default:
      content = renderSplitLayout();
      break;
  }

  return (
    <>
      {divider && <Divider />}
      {content}
    </>
  );
};

/**
 * Simplified Card Actions for basic use cases
 */
export const SimpleCardActions = ({ children, ...props }) => (
  <MUICardActions 
    sx={{ 
      justifyContent: 'flex-end', 
      px: 2, 
      py: 1.5,
      gap: 1,
      ...props.sx 
    }}
    {...props}
  >
    {children}
  </MUICardActions>
);

/**
 * Icon-only Card Actions for compact layouts
 */
export const CompactCardActions = ({ 
  onEdit, 
  onDelete, 
  onView,
  showEdit = true,
  showDelete = true, 
  showView = true,
  disabled = false,
  deleteConfirmMessage,
  ...props 
}) => (
  <MUICardActions 
    sx={{ 
      justifyContent: 'flex-end', 
      px: 2, 
      py: 1,
      minHeight: 'auto',
      gap: 0.5,
      ...props.sx 
    }}
    {...props}
  >
    {showView && onView && (
      <ViewButton
        onClick={onView}
        iconOnly
        disabled={disabled}
        size="small"
      />
    )}
    {showEdit && onEdit && (
      <EditButton
        onClick={onEdit}
        iconOnly
        disabled={disabled}
        size="small"
      />
    )}
    {showDelete && onDelete && (
      <DeleteButton
        onClick={onDelete}
        iconOnly
        disabled={disabled}
        size="small"
        confirmMessage={deleteConfirmMessage}
      />
    )}
  </MUICardActions>
);

/**
 * Full-width Card Actions for important actions
 */
export const FullWidthCardActions = ({ 
  primaryAction,
  secondaryAction,
  disabled = false,
  ...props 
}) => (
  <MUICardActions 
    sx={{ 
      flexDirection: 'column',
      px: 2, 
      py: 1.5,
      gap: 1,
      ...props.sx 
    }}
    {...props}
  >
    {primaryAction && (
      <Box sx={{ width: '100%' }}>
        {primaryAction.component || (
          <button
            onClick={primaryAction.onClick}
            disabled={disabled || primaryAction.disabled}
            style={{
              width: '100%',
              padding: '12px',
              border: 'none',
              borderRadius: '4px',
              background: '#1976d2',
              color: 'white',
              cursor: (disabled || primaryAction.disabled) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              fontWeight: 600,
              ...primaryAction.style
            }}
          >
            {primaryAction.label}
          </button>
        )}
      </Box>
    )}
    {secondaryAction && (
      <Box sx={{ width: '100%' }}>
        {secondaryAction.component || (
          <button
            onClick={secondaryAction.onClick}
            disabled={disabled || secondaryAction.disabled}
            style={{
              width: '100%',
              padding: '8px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              background: '#fff',
              color: '#666',
              cursor: (disabled || secondaryAction.disabled) ? 'not-allowed' : 'pointer',
              fontSize: '14px',
              ...secondaryAction.style
            }}
          >
            {secondaryAction.label}
          </button>
        )}
      </Box>
    )}
  </MUICardActions>
);

export default StandardCardActions;