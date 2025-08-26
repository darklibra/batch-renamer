import React from 'react';
import { Box, Typography, TextField, InputAdornment, IconButton, Tooltip } from '@mui/material';
import { Search } from '@mui/icons-material';
import { CreateButton, RefreshButton } from './ActionButtons';

/**
 * Standardized Page Header Component
 * Provides consistent layout for page titles, actions, and search functionality
 */
export const PageHeader = ({ 
  title, 
  subtitle, 
  count,
  primaryAction = null,
  secondaryActions = [],
  searchProps = null,
  showSearch = false,
  spacing = 2,
  ...props 
}) => {
  // Format title with count if provided
  const displayTitle = count !== undefined ? `${title} (${count})` : title;

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'flex-start',
        mb: spacing,
        flexDirection: { xs: 'column', sm: 'row' },
        gap: { xs: 2, sm: 0 },
        ...props.sx 
      }}
      {...props}
    >
      {/* Title and Subtitle Section */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="h4" 
          sx={{ 
            fontWeight: 600,
            color: 'text.primary',
            mb: subtitle ? 1 : 0 
          }}
        >
          {displayTitle}
        </Typography>
        {subtitle && (
          <Typography 
            variant="body1" 
            color="textSecondary"
            sx={{ 
              maxWidth: { xs: '100%', md: '70%' },
              lineHeight: 1.5
            }}
          >
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Actions Section */}
      <Box 
        sx={{ 
          display: 'flex', 
          gap: 2, 
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          width: { xs: '100%', sm: 'auto' },
          flexShrink: 0
        }}
      >
        {/* Search Field */}
        {(showSearch || searchProps) && (
          <TextField
            placeholder={searchProps?.placeholder || "Search..."}
            value={searchProps?.value || ''}
            onChange={searchProps?.onChange}
            size="small"
            sx={{ 
              minWidth: { xs: '100%', sm: 300 },
              maxWidth: { xs: '100%', sm: 400 }
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
              ...searchProps?.InputProps
            }}
            {...(searchProps || {})}
          />
        )}

        {/* Secondary Actions */}
        {secondaryActions.map((action, index) => {
          const { type = 'button', ...actionProps } = action;
          
          if (type === 'refresh') {
            return (
              <RefreshButton
                key={index}
                iconOnly={action.iconOnly}
                {...actionProps}
              />
            );
          }
          
          // 🎯 개선된 액션 버튼 렌더링 - 빈 버튼 방지
          if (action.component) {
            return (
              <Box key={index} sx={{ display: 'flex' }}>
                {action.component}
              </Box>
            );
          }
          
          // Icon만 있는 경우: IconButton 사용
          if (action.icon && !action.label) {
            return (
              <Tooltip key={index} title={action.tooltip || ''}>
                <IconButton
                  onClick={action.onClick}
                  disabled={action.disabled}
                  color={action.color || 'default'}
                  size={action.size || 'medium'}
                  sx={{
                    ...action.sx
                  }}
                >
                  {action.icon}
                </IconButton>
              </Tooltip>
            );
          }
          
          // Label이 있는 경우: 기본 버튼 사용
          if (action.label) {
            return (
              <Tooltip key={index} title={action.tooltip || ''}>
                <button
                  onClick={action.onClick}
                  disabled={action.disabled}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #ccc',
                    borderRadius: '4px',
                    background: '#fff',
                    cursor: action.disabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    ...action.style
                  }}
                >
                  {action.icon}
                  {action.label}
                </button>
              </Tooltip>
            );
          }
          
          // 🚫 icon도 label도 없는 경우: 렌더링하지 않음 (빈 버튼 방지)
          console.warn(`PageHeader: Action at index ${index} has no icon or label`, action);
          return null;
        })}

        {/* Primary Action */}
        {primaryAction && (
          <CreateButton
            label={primaryAction.label || "Create"}
            onClick={primaryAction.onClick}
            icon={primaryAction.icon}
            disabled={primaryAction.disabled}
            variant={primaryAction.variant || "contained"}
            size={primaryAction.size || "medium"}
            sx={{ 
              minWidth: { xs: '100%', sm: 'auto' },
              ...primaryAction.sx 
            }}
            {...primaryAction}
          />
        )}
      </Box>
    </Box>
  );
};

/**
 * Simplified Page Header for basic pages
 */
export const SimplePageHeader = ({ title, subtitle, children, ...props }) => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      mb: 3,
      ...props.sx 
    }}
    {...props}
  >
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 600 }}>
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="body1" color="textSecondary" sx={{ mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Box>
    {children && (
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        {children}
      </Box>
    )}
  </Box>
);

/**
 * Breadcrumb-style Page Header for detail pages
 */
export const DetailPageHeader = ({ 
  backAction,
  title,
  subtitle,
  primaryAction,
  secondaryActions = [],
  ...props 
}) => (
  <Box sx={{ mb: 3, ...props.sx }} {...props}>
    {/* Back Navigation */}
    {backAction && (
      <Box sx={{ mb: 2 }}>
        <button
          onClick={backAction.onClick}
          style={{
            background: 'none',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '4px 0',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          ← {backAction.label || 'Back'}
        </button>
      </Box>
    )}

    {/* Title and Actions */}
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 600 }}>
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="body1" color="textSecondary" sx={{ mt: 0.5 }}>
            {subtitle}
          </Typography>
        )}
      </Box>

      {/* Actions */}
      {(primaryAction || secondaryActions.length > 0) && (
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {secondaryActions.map((action, index) => {
            // 🎯 빈 액션 건너뛰기
            if (!action.icon && !action.label && !action.component) {
              console.warn(`DetailPageHeader: Action at index ${index} has no content`, action);
              return null;
            }
            
            return (
              <Box key={index}>
                {action.component || (
                  action.icon && !action.label ? (
                    // Icon만 있는 경우: IconButton 사용
                    <Tooltip title={action.tooltip || ''}>
                      <IconButton
                        onClick={action.onClick}
                        disabled={action.disabled}
                        color={action.color || 'default'}
                        size={action.size || 'medium'}
                      >
                        {action.icon}
                      </IconButton>
                    </Tooltip>
                  ) : (
                    // Label이 있는 경우: 기본 버튼 사용
                    <button
                      onClick={action.onClick}
                      disabled={action.disabled}
                      style={{
                        padding: '8px 16px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        background: '#fff',
                        cursor: action.disabled ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        ...action.style
                      }}
                    >
                      {action.icon}
                      {action.label}
                    </button>
                  )
                )}
              </Box>
            );
          })}
          {primaryAction && (
            <CreateButton
              label={primaryAction.label}
              onClick={primaryAction.onClick}
              icon={primaryAction.icon}
              disabled={primaryAction.disabled}
              {...primaryAction}
            />
          )}
        </Box>
      )}
    </Box>
  </Box>
);

export default PageHeader;