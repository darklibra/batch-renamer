/**
 * File Selection Panel Component
 * 파일 선택 패널 컴포넌트
 * 
 * 단일 책임 원칙: 파일 선택 UI만 담당
 * 높은 응집도: 파일 선택 관련 UI 요소들만 포함
 * 재사용성: 다른 컨텍스트에서도 사용 가능
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Checkbox,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Divider,
  Alert
} from '@mui/material';
import {
  InsertDriveFile,
  Clear,
  SelectAll,
  FilterList,
  Search,
  Info
} from '@mui/icons-material';

/**
 * 파일 선택 패널 컴포넌트
 */
const FileSelectionPanel = ({
  // 데이터
  files = [],
  selectedFileIds = [],
  patterns = [],
  
  // 이벤트 핸들러
  onSelectionChange,
  onAutoSelect,
  onClearSelection,
  
  // 설정
  maxSelectionCount = 100,
  enableAutoSelect = true,
  enablePatternFilter = true,
  
  // 스타일
  elevation = 1,
  sx = {}
}) => {
  // 로컬 상태
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPattern, setFilterPattern] = useState('');
  const [sortBy, setSortBy] = useState('name');

  /**
   * 필터링된 파일 목록
   */
  const filteredFiles = useMemo(() => {
    let result = files;

    // 검색어 필터
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      result = result.filter(file => 
        file.filename.toLowerCase().includes(searchLower) ||
        file.path.toLowerCase().includes(searchLower)
      );
    }

    // 패턴 필터
    if (filterPattern && enablePatternFilter) {
      result = result.filter(file => 
        !file.pattern_id || file.pattern_id.toString() === filterPattern
      );
    }

    // 정렬
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.filename.localeCompare(b.filename);
        case 'path':
          return a.path.localeCompare(b.path);
        case 'size':
          return (b.size || 0) - (a.size || 0);
        case 'modified':
          return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
        default:
          return 0;
      }
    });

    return result;
  }, [files, searchTerm, filterPattern, sortBy, enablePatternFilter]);

  /**
   * 선택 상태 관리
   */
  const handleFileToggle = useCallback((fileId) => {
    const newSelection = selectedFileIds.includes(fileId)
      ? selectedFileIds.filter(id => id !== fileId)
      : [...selectedFileIds, fileId];
    
    if (newSelection.length <= maxSelectionCount) {
      onSelectionChange?.(newSelection);
    }
  }, [selectedFileIds, maxSelectionCount, onSelectionChange]);

  /**
   * 전체 선택/해제
   */
  const handleSelectAll = useCallback(() => {
    const filteredFileIds = filteredFiles.map(file => file.id);
    const areAllSelected = filteredFileIds.every(id => selectedFileIds.includes(id));
    
    if (areAllSelected) {
      // 현재 필터된 파일들 선택 해제
      const newSelection = selectedFileIds.filter(id => !filteredFileIds.includes(id));
      onSelectionChange?.(newSelection);
    } else {
      // 현재 필터된 파일들 모두 선택 (제한 수 내에서)
      const availableSlots = maxSelectionCount - selectedFileIds.length;
      const toAdd = filteredFileIds
        .filter(id => !selectedFileIds.includes(id))
        .slice(0, availableSlots);
      
      onSelectionChange?.([...selectedFileIds, ...toAdd]);
    }
  }, [filteredFiles, selectedFileIds, maxSelectionCount, onSelectionChange]);

  /**
   * 자동 선택 (패턴 기반)
   */
  const handleAutoSelect = useCallback(() => {
    if (!enableAutoSelect || !onAutoSelect) return;
    
    onAutoSelect();
  }, [enableAutoSelect, onAutoSelect]);

  /**
   * 선택 클리어
   */
  const handleClearSelection = useCallback(() => {
    onClearSelection?.();
  }, [onClearSelection]);

  /**
   * 파일 크기 포맷팅
   */
  const formatFileSize = useCallback((bytes) => {
    if (!bytes || bytes === 0) return '-';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    const k = 1024;
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${units[i]}`;
  }, []);

  /**
   * 선택 통계
   */
  const selectionStats = useMemo(() => {
    const selectedFiles = files.filter(file => selectedFileIds.includes(file.id));
    const totalSize = selectedFiles.reduce((sum, file) => sum + (file.size || 0), 0);
    
    return {
      count: selectedFileIds.length,
      totalSize,
      hasPatternFiles: selectedFiles.some(file => file.extracted_data && Object.keys(file.extracted_data).length > 0),
      missingMetadataCount: selectedFiles.filter(file => 
        !file.extracted_data || Object.keys(file.extracted_data).length === 0
      ).length
    };
  }, [files, selectedFileIds]);

  return (
    <Card elevation={elevation} sx={{ height: '100%', ...sx }}>
      <CardHeader
        title={
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="h6">
              파일 선택
            </Typography>
            <Chip 
              label={`${selectedFileIds.length}/${maxSelectionCount}`} 
              size="small" 
              color={selectedFileIds.length > 0 ? 'primary' : 'default'}
            />
          </Box>
        }
        action={
          <Box display="flex" gap={1}>
            {enableAutoSelect && (
              <Tooltip title="패턴 기반 자동 선택">
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={handleAutoSelect}
                  disabled={patterns.length === 0}
                >
                  자동 선택
                </Button>
              </Tooltip>
            )}
            <Tooltip title="선택 해제">
              <IconButton 
                size="small" 
                onClick={handleClearSelection}
                disabled={selectedFileIds.length === 0}
              >
                <Clear />
              </IconButton>
            </Tooltip>
          </Box>
        }
      />

      <CardContent sx={{ pt: 0, height: 'calc(100% - 64px)', display: 'flex', flexDirection: 'column' }}>
        
        {/* 검색 및 필터 */}
        <Box display="flex" gap={2} mb={2}>
          <TextField
            size="small"
            placeholder="파일명 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <Search color="action" sx={{ mr: 1 }} />
            }}
            sx={{ flexGrow: 1 }}
          />
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>정렬</InputLabel>
            <Select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              label="정렬"
            >
              <MenuItem value="name">이름</MenuItem>
              <MenuItem value="path">경로</MenuItem>
              <MenuItem value="size">크기</MenuItem>
              <MenuItem value="modified">수정일</MenuItem>
            </Select>
          </FormControl>

          {enablePatternFilter && patterns.length > 0 && (
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>패턴 필터</InputLabel>
              <Select
                value={filterPattern}
                onChange={(e) => setFilterPattern(e.target.value)}
                label="패턴 필터"
              >
                <MenuItem value="">전체</MenuItem>
                {patterns.map(pattern => (
                  <MenuItem key={pattern.id} value={pattern.id.toString()}>
                    {pattern.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
        </Box>

        {/* 선택 도구 */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Button
            size="small"
            startIcon={<SelectAll />}
            onClick={handleSelectAll}
            disabled={filteredFiles.length === 0}
          >
            {filteredFiles.every(file => selectedFileIds.includes(file.id)) ? '선택 해제' : '전체 선택'}
          </Button>

          <Typography variant="body2" color="text.secondary">
            {filteredFiles.length}개 파일 표시
          </Typography>
        </Box>

        {/* 선택 통계 */}
        {selectedFileIds.length > 0 && (
          <>
            <Alert 
              severity="info" 
              sx={{ mb: 2 }}
              icon={<Info />}
            >
              <Typography variant="body2">
                선택된 파일: {selectionStats.count}개 
                ({formatFileSize(selectionStats.totalSize)})
                {selectionStats.missingMetadataCount > 0 && (
                  <span style={{ color: 'orange' }}>
                    <br />
                    메타데이터 없음: {selectionStats.missingMetadataCount}개
                  </span>
                )}
              </Typography>
            </Alert>
            <Divider sx={{ mb: 2 }} />
          </>
        )}

        {/* 파일 목록 */}
        <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
          {filteredFiles.length === 0 ? (
            <Box display="flex" flexDirection="column" alignItems="center" py={4}>
              <InsertDriveFile color="disabled" sx={{ fontSize: 48, mb: 2 }} />
              <Typography color="text.secondary">
                {files.length === 0 ? '파일이 없습니다' : '검색 조건에 맞는 파일이 없습니다'}
              </Typography>
            </Box>
          ) : (
            <List dense>
              {filteredFiles.map(file => (
                <ListItem 
                  key={file.id}
                  button
                  onClick={() => handleFileToggle(file.id)}
                  sx={{
                    border: '1px solid',
                    borderColor: selectedFileIds.includes(file.id) ? 'primary.main' : 'divider',
                    borderRadius: 1,
                    mb: 1,
                    backgroundColor: selectedFileIds.includes(file.id) ? 'primary.50' : 'background.paper'
                  }}
                >
                  <ListItemIcon>
                    <Checkbox
                      checked={selectedFileIds.includes(file.id)}
                      onChange={() => handleFileToggle(file.id)}
                      color="primary"
                    />
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Typography variant="body2" fontWeight="medium">
                        {file.filename}
                      </Typography>
                    }
                    secondary={
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          {file.path}
                        </Typography>
                        {file.size && (
                          <Typography variant="caption" color="text.secondary" sx={{ ml: 2 }}>
                            {formatFileSize(file.size)}
                          </Typography>
                        )}
                        {file.extracted_data && Object.keys(file.extracted_data).length > 0 && (
                          <Chip 
                            label="메타데이터 있음" 
                            size="small" 
                            color="success" 
                            variant="outlined"
                            sx={{ ml: 1, height: 18, fontSize: '0.7rem' }}
                          />
                        )}
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default FileSelectionPanel;