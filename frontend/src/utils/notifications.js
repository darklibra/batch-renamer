/**
 * Simple notification utility for components outside React Admin context
 */

// Simple notification queue
const notifications = [];
const listeners = [];

export const notify = (message, options = {}) => {
  const notification = {
    id: Date.now(),
    message,
    type: options.type || 'info', // 'success', 'error', 'warning', 'info'
    duration: options.duration || 5000,
    timestamp: new Date()
  };

  // Add to browser notifications if available
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(message, {
      icon: '/vite.svg',
      tag: notification.id
    });
  }

  // Log to console with appropriate styling
  const styles = {
    success: 'color: green; font-weight: bold',
    error: 'color: red; font-weight: bold',
    warning: 'color: orange; font-weight: bold',
    info: 'color: blue; font-weight: bold'
  };

  console.log(
    `%c[${notification.type.toUpperCase()}] ${message}`,
    styles[notification.type] || styles.info
  );

  // Add to notifications queue
  notifications.push(notification);

  // Clean up old notifications
  setTimeout(() => {
    const index = notifications.findIndex(n => n.id === notification.id);
    if (index !== -1) {
      notifications.splice(index, 1);
    }
  }, notification.duration);

  // Notify listeners
  listeners.forEach(listener => listener(notification));

  return notification;
};

// Request notification permission on first use
export const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.log('Notification permission request failed:', error);
      return false;
    }
  }
  return Notification.permission === 'granted';
};

// Get current notifications
export const getNotifications = () => [...notifications];

// Subscribe to notification changes
export const onNotification = (callback) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index !== -1) {
      listeners.splice(index, 1);
    }
  };
};