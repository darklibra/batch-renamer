import React from 'react';
import { Button, IconButton, Tooltip } from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Visibility,
  Refresh,
  Search,
  Settings,
  Download,
  Upload,
  FileCopy,
  DriveFileMove,
  ArrowBack
} from '@mui/icons-material';

/**
 * Improved Standardized Action Button Components
 * 
 * Key Improvements:
 * 1. Fixed BackButton to include proper ArrowBack icon by default
 * 2. Enhanced icon handling for all components
 * 3. Added proper React icon components throughout
 */

// Primary action button for creating new items
export const CreateButton = ({ 
  label = "Create", 
  onClick, 
  icon = <Add />, 
  variant = "contained",
  size = "medium",
  disabled = false,
  fullWidth = false,
  ...props 
}) => (
  <Button
    variant={variant}
    size={size}
    startIcon={icon}
    onClick={onClick}
    disabled={disabled}
    fullWidth={fullWidth}
    sx={{ 
      fontWeight: 600,
      textTransform: 'none',
      ...props.sx 
    }}
    {...props}
  >
    {label}
  </Button>
);

// Edit action button with consistent styling
export const EditButton = ({ 
  onClick, 
  size = "small", 
  variant = "outlined",
  label = "Edit",
  iconOnly = false,
  disabled = false,
  ...props 
}) => {
  if (iconOnly) {
    return (
      <Tooltip title="Edit">
        <IconButton
          size={size}
          onClick={onClick}
          disabled={disabled}
          color="primary"
          {...props}
        >
          <Edit fontSize={size === "small" ? "small" : "medium"} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      startIcon={<Edit />}
      onClick={onClick}
      disabled={disabled}
      sx={{ textTransform: 'none', ...props.sx }}
      {...props}
    >
      {label}
    </Button>
  );
};

// Delete action button with error styling
export const DeleteButton = ({ 
  onClick, 
  size = "small",
  variant = "outlined",
  label = "Delete",
  iconOnly = false,
  disabled = false,
  confirmMessage = "Are you sure you want to delete this item?",
  ...props 
}) => {
  const handleClick = () => {
    if (confirmMessage && !window.confirm(confirmMessage)) {
      return;
    }
    onClick();
  };

  if (iconOnly) {
    return (
      <Tooltip title="Delete">
        <IconButton
          size={size}
          onClick={handleClick}
          disabled={disabled}
          color="error"
          {...props}
        >
          <Delete fontSize={size === "small" ? "small" : "medium"} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      startIcon={<Delete />}
      onClick={handleClick}
      disabled={disabled}
      color="error"
      sx={{ textTransform: 'none', ...props.sx }}
      {...props}
    >
      {label}
    </Button>
  );
};

// View/Details action button
export const ViewButton = ({ 
  onClick, 
  size = "small", 
  variant = "outlined",
  label = "View Details",
  fullWidth = false,
  disabled = false,
  ...props 
}) => (
  <Button
    variant={variant}
    size={size}
    startIcon={<Visibility />}
    onClick={onClick}
    disabled={disabled}
    fullWidth={fullWidth}
    sx={{ textTransform: 'none', ...props.sx }}
    {...props}
  >
    {label}
  </Button>
);

// Refresh action button
export const RefreshButton = ({ 
  onClick, 
  size = "medium",
  variant = "outlined",
  label = "Refresh",
  iconOnly = false,
  disabled = false,
  loading = false,
  ...props 
}) => {
  if (iconOnly) {
    return (
      <Tooltip title="Refresh">
        <IconButton
          size={size}
          onClick={onClick}
          disabled={disabled || loading}
          color="primary"
          {...props}
        >
          <Refresh 
            fontSize={size === "small" ? "small" : "medium"}
            sx={{ 
              animation: loading ? 'spin 1s linear infinite' : 'none',
              '@keyframes spin': {
                '0%': { transform: 'rotate(0deg)' },
                '100%': { transform: 'rotate(360deg)' }
              }
            }}
          />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      startIcon={<Refresh />}
      onClick={onClick}
      disabled={disabled || loading}
      sx={{ textTransform: 'none', ...props.sx }}
      {...props}
    >
      {loading ? 'Refreshing...' : label}
    </Button>
  );
};

// Settings/Configuration action button
export const SettingsButton = ({ 
  onClick, 
  size = "medium",
  variant = "outlined",
  label = "Settings",
  iconOnly = false,
  disabled = false,
  ...props 
}) => {
  if (iconOnly) {
    return (
      <Tooltip title="Settings">
        <IconButton
          size={size}
          onClick={onClick}
          disabled={disabled}
          color="primary"
          {...props}
        >
          <Settings fontSize={size === "small" ? "small" : "medium"} />
        </IconButton>
      </Tooltip>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      startIcon={<Settings />}
      onClick={onClick}
      disabled={disabled}
      sx={{ textTransform: 'none', ...props.sx }}
      {...props}
    >
      {label}
    </Button>
  );
};

// Copy action button for file operations
export const CopyButton = ({ 
  onClick, 
  size = "medium",
  variant = "contained",
  label = "Copy",
  disabled = false,
  loading = false,
  ...props 
}) => (
  <Button
    variant={variant}
    size={size}
    startIcon={<FileCopy />}
    onClick={onClick}
    disabled={disabled || loading}
    sx={{ 
      textTransform: 'none',
      fontWeight: 600,
      ...props.sx 
    }}
    {...props}
  >
    {loading ? 'Copying...' : label}
  </Button>
);

// Move action button for file operations
export const MoveButton = ({ 
  onClick, 
  size = "medium",
  variant = "contained",
  label = "Move",
  color = "secondary",
  disabled = false,
  loading = false,
  ...props 
}) => (
  <Button
    variant={variant}
    size={size}
    color={color}
    startIcon={<DriveFileMove />}
    onClick={onClick}
    disabled={disabled || loading}
    sx={{ 
      textTransform: 'none',
      fontWeight: 600,
      ...props.sx 
    }}
    {...props}
  >
    {loading ? 'Moving...' : label}
  </Button>
);

// IMPROVED: Back/Navigation button with ArrowBack icon by default
export const BackButton = ({ 
  onClick, 
  label = "Back",
  size = "medium",
  variant = "text",
  icon = <ArrowBack />, // FIXED: Default ArrowBack icon added
  disabled = false,
  ...props 
}) => (
  <Button
    variant={variant}
    size={size}
    startIcon={icon}
    onClick={onClick}
    disabled={disabled}
    sx={{ 
      textTransform: 'none',
      color: 'text.secondary',
      ...props.sx 
    }}
    {...props}
  >
    {label}
  </Button>
);

// Generic Icon Action Button for flexible icon actions
export const IconActionButton = ({ 
  icon,
  onClick, 
  tooltip,
  size = "medium",
  color = "primary",
  disabled = false,
  ...props 
}) => (
  <Tooltip title={tooltip || ""}>
    <IconButton
      size={size}
      color={color}
      onClick={onClick}
      disabled={disabled}
      {...props}
    >
      {icon}
    </IconButton>
  </Tooltip>
);

export default {
  CreateButton,
  EditButton,
  DeleteButton,
  ViewButton,
  RefreshButton,
  SettingsButton,
  CopyButton,
  MoveButton,
  BackButton,
  IconActionButton
};