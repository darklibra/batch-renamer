/**
 * Header Components - Clear File System
 * 표준화된 헤더 컴포넌트들을 내보내는 인덱스 파일
 */

// Existing headers (enhanced)
export { PageHeader, SimplePageHeader, DetailPageHeader } from '../common/PageHeader.jsx';

// New specialized headers
export { default as WorkflowHeader } from './WorkflowHeader.jsx';
export { default as DashboardHeader } from './DashboardHeader.jsx';
export { default as JobsHeader } from './JobsHeader.jsx';

// Header utilities and composables
export { default as BreadcrumbNav } from './BreadcrumbNav.jsx';
export { default as StatusIndicator } from './StatusIndicator.jsx';