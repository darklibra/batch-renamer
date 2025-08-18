import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Slider,
  TextField,
  Grid,
  LinearProgress,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Assessment,
  AutoFixHigh,
  Preview,
  PlayArrow,
  Info,
  ExpandMore,
  CheckCircle,
  ErrorOutline,
  SkipNext,
  TrendingUp,
  Settings,
  Refresh
} from '@mui/icons-material';
import dataProvider from '../dataProvider';

const PatternEvaluationPanel = ({ pattern, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState(null);
  const [applicationResult, setApplicationResult] = useState(null);
  const [error, setError] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [settings, setSettings] = useState({
    applyThreshold: 70,
    forceApply: false,
    dryRun: false
  });
  const [effectiveness, setEffectiveness] = useState(null);

  // Early return if pattern is not provided
  if (!pattern || !pattern.id) {
    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Alert severity="warning">
            Pattern information is required to perform evaluation.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // 패턴 효과성 통계 가져오기
  const fetchEffectiveness = async () => {
    try {
      if (!pattern?.id) return;
      
      const response = await fetch(`http://localhost:8000/api/v1/patterns/${pattern.id}/effectiveness-stats`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      setEffectiveness(data.effectiveness_stats);
    } catch (error) {
      console.error('Failed to fetch effectiveness stats:', error);
      setError('Failed to load effectiveness statistics');
    }
  };

  // 컴포넌트 마운트 시 효과성 통계 로드
  React.useEffect(() => {
    if (pattern?.id) {
      fetchEffectiveness();
    }
  }, [pattern?.id]);

  // 패턴 적용 미리보기
  const handlePreviewApplication = async () => {
    if (!pattern?.id) {
      setError('Pattern ID is required for preview');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setEvaluationResult(null);
      
      const response = await fetch(`http://localhost:8000/api/v1/patterns/${pattern.id}/preview-application`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apply_threshold: settings.applyThreshold
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorData}`);
      }

      const data = await response.json();
      if (data && typeof data === 'object') {
        setEvaluationResult(data);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Preview failed:', error);
      setError('Failed to preview pattern application: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // 패턴 자동 적용
  const handleApplyPattern = async (isDryRun = settings.dryRun) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`http://localhost:8000/api/v1/patterns/${pattern.id}/evaluate-and-apply`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apply_threshold: settings.applyThreshold,
          force_apply: settings.forceApply,
          dry_run: isDryRun
        })
      });

      if (!response.ok) {
        throw new Error('Failed to apply pattern');
      }

      const data = await response.json();
      setApplicationResult(data);
      setConfirmDialog(false);
      
      // 실제 적용이 완료되면 효과성 통계 새로고침
      if (!isDryRun && data.applied_files > 0) {
        await fetchEffectiveness();
        onRefresh?.();
      }
    } catch (error) {
      console.error('Application failed:', error);
      setError('Failed to apply pattern: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'success';
    if (score >= 60) return 'info';
    if (score >= 40) return 'warning';
    return 'error';
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'applied':
      case 'will_apply':
        return <CheckCircle color="success" />;
      case 'skipped':
      case 'will_skip':
        return <SkipNext color="warning" />;
      default:
        return <ErrorOutline color="action" />;
    }
  };

  return (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
          <Assessment sx={{ mr: 2, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Pattern Fitness Evaluation
          </Typography>
          <Tooltip title="Refresh stats">
            <IconButton onClick={fetchEffectiveness} size="small">
              <Refresh />
            </IconButton>
          </Tooltip>
        </Box>

        {/* 현재 효과성 통계 */}
        {effectiveness && (
          <Box sx={{ mb: 3 }}>
            <Alert severity="info">
              <Typography variant="subtitle2" gutterBottom>
                Current Pattern Statistics
              </Typography>
            </Alert>
            <Card variant="outlined" sx={{ mt: 1 }}>
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">
                      Total Applications
                    </Typography>
                    <Typography variant="h6">
                      {effectiveness.total_applications}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">
                      Currently Active
                    </Typography>
                    <Typography variant="h6">
                      {effectiveness.current_applications}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">
                      Average Score
                    </Typography>
                    <Typography variant="h6">
                      {effectiveness.avg_score?.toFixed(1) || '0.0'}
                    </Typography>
                  </Grid>
                  <Grid item xs={6} sm={3}>
                    <Typography variant="caption" color="textSecondary">
                      Max Score
                    </Typography>
                    <Typography variant="h6">
                      {effectiveness.max_score || 0}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Box>
        )}

        {/* 설정 섹션 */}
        <Accordion sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Settings sx={{ mr: 1 }} />
            <Typography>Evaluation Settings</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ mb: 3 }}>
              <Typography gutterBottom>
                Application Threshold: {settings.applyThreshold}
              </Typography>
              <Slider
                value={settings.applyThreshold}
                onChange={(e, value) => setSettings(prev => ({ ...prev, applyThreshold: value }))}
                min={0}
                max={100}
                step={5}
                marks={[
                  { value: 0, label: '0' },
                  { value: 50, label: '50' },
                  { value: 100, label: '100' }
                ]}
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="textSecondary">
                Only apply pattern to files with scores above this threshold
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.forceApply}
                    onChange={(e) => setSettings(prev => ({ ...prev, forceApply: e.target.checked }))}
                  />
                }
                label="Force Apply"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.dryRun}
                    onChange={(e) => setSettings(prev => ({ ...prev, dryRun: e.target.checked }))}
                  />
                }
                label="Dry Run Mode"
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        {/* 실행 버튼들 */}
        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <Button
            variant="outlined"
            startIcon={<Preview />}
            onClick={handlePreviewApplication}
            disabled={loading}
          >
            Preview Application
          </Button>
          <Button
            variant="contained"
            startIcon={<AutoFixHigh />}
            onClick={() => settings.dryRun ? handleApplyPattern(true) : setConfirmDialog(true)}
            disabled={loading}
          >
            {settings.dryRun ? 'Simulate Application' : 'Apply Pattern'}
          </Button>
        </Box>

        {loading && <LinearProgress sx={{ mb: 2 }} />}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* 미리보기 결과 */}
        {evaluationResult && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <Preview sx={{ mr: 1, verticalAlign: 'middle' }} />
                Preview Results
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">
                    Total Files
                  </Typography>
                  <Typography variant="h6">
                    {evaluationResult.total_files}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">
                    Will Apply
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {evaluationResult.evaluation_summary.will_apply}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">
                    Will Skip
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {evaluationResult.evaluation_summary.will_skip}
                  </Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">
                    No Change
                  </Typography>
                  <Typography variant="h6" color="text.secondary">
                    {evaluationResult.evaluation_summary.no_change}
                  </Typography>
                </Grid>
              </Grid>

              {evaluationResult.top_improvements && evaluationResult.top_improvements.length > 0 && (
                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Top Improvements
                  </Typography>
                  <List dense>
                    {evaluationResult.top_improvements.slice(0, 5).map((item, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <TrendingUp color="success" />
                        </ListItemIcon>
                        <ListItemText
                          primary={item.filename}
                          secondary={
                            <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <Chip
                                label={`${item.current_score} → ${item.new_score}`}
                                size="small"
                                color={getScoreColor(item.new_score)}
                              />
                              <span style={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                +{item.new_score - item.current_score} points
                              </span>
                            </span>
                          }
                        />
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* 적용 결과 */}
        {applicationResult && (
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                <PlayArrow sx={{ mr: 1, verticalAlign: 'middle' }} />
                {applicationResult.dry_run ? 'Simulation' : 'Application'} Results
              </Typography>
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Files Evaluated
                  </Typography>
                  <Typography variant="h6">
                    {applicationResult.evaluated_files}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    {applicationResult.dry_run ? 'Would Apply' : 'Applied'}
                  </Typography>
                  <Typography variant="h6" color="success.main">
                    {applicationResult.applied_files}
                  </Typography>
                </Grid>
                <Grid item xs={4}>
                  <Typography variant="caption" color="textSecondary">
                    Skipped
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {applicationResult.skipped_files}
                  </Typography>
                </Grid>
              </Grid>

              {applicationResult.results && applicationResult.results.length > 0 && (
                <Accordion>
                  <AccordionSummary expandIcon={<ExpandMore />}>
                    <Typography>View Detailed Results ({applicationResult.results.length} files)</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
                      {applicationResult.results.map((result, index) => (
                        <ListItem key={index}>
                          <ListItemIcon>
                            {getActionIcon(result.action)}
                          </ListItemIcon>
                          <ListItemText
                            primary={result.filename}
                            secondary={
                              <span style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Chip
                                  label={`Score: ${result.new_score}`}
                                  size="small"
                                  color={getScoreColor(result.new_score)}
                                />
                                <span style={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                                  {result.reason}
                                </span>
                              </span>
                            }
                          />
                        </ListItem>
                      ))}
                    </List>
                  </AccordionDetails>
                </Accordion>
              )}
            </CardContent>
          </Card>
        )}

        {/* 확인 다이얼로그 */}
        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
          <DialogTitle>
            <span style={{ display: 'flex', alignItems: 'center' }}>
              <Info style={{ marginRight: 8 }} />
              Confirm Pattern Application
            </span>
          </DialogTitle>
          <DialogContent>
            <Typography gutterBottom>
              This will apply the pattern to all files where it has a higher fitness score 
              than the currently applied pattern.
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Settings:
            </Typography>
            <List dense>
              <ListItem>
                <ListItemText
                  primary={`Threshold: ${settings.applyThreshold}`}
                  secondary="Minimum score required for application"
                />
              </ListItem>
              <ListItem>
                <ListItemText
                  primary={`Force Apply: ${settings.forceApply ? 'Yes' : 'No'}`}
                  secondary="Apply regardless of score comparison"
                />
              </ListItem>
            </List>
            <Alert severity="warning" sx={{ mt: 2 }}>
              This action will modify your database. Consider running a preview first.
            </Alert>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handleApplyPattern(false)}
              disabled={loading}
            >
              Apply Pattern
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default PatternEvaluationPanel;