import React, { useState } from 'react';
import { List, Datagrid, TextField, Edit, Create, SimpleForm, TextInput, EditButton, Pagination, useListContext, BulkDeleteButton, Button, BooleanField } from 'react-admin';
import { Box, Typography, Paper, List as MuiList, ListItem as MuiListItem, ListItemText as MuiListItemText, Checkbox } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useNotify, useRedirect, useRecordContext, useFormState } from 'react-admin';
import { useFormContext } from 'react-hook-form'; // Import useFormContext
import dataProvider from './dataProvider';
import FileSelectionPopup from './FileSelectionPopup';

const ApplyPatternBulkActionButton = () => {
  const { selectedIds } = useListContext();
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const notify = useNotify();

  const handleApplyToFiles = async (selectedFiles) => {
    const fileIds = selectedFiles[0]?.id === 'all' ? ['all'] : selectedFiles.map(f => f.id);
    if (fileIds.length === 0) {
      notify('적용할 파일을 선택해주세요.', { type: 'warning' });
      return;
    }

    try {
      await dataProvider.create('file-change-patterns/apply-saved-pattern', {
        data: {
          pattern_ids: selectedIds,
          file_ids: fileIds,
        },
      });
      notify('선택된 파일에 패턴 적용을 시작했습니다.', { type: 'success' });
    } catch (error) {
      notify(`패턴 적용 중 오류 발생: ${error.message}`, { type: 'error' });
    }
    setIsPopupOpen(false);
  };

  return (
    <>
      <Button
        variant="text"
        color="primary"
        onClick={() => setIsPopupOpen(true)}
        disabled={!selectedIds.length}
        sx={{ ml: 1 }}
        label="패턴 적용"
        icon={<CheckCircleOutlineIcon />}
        size="small"
      >
      </Button>
      <FileSelectionPopup
        open={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        onFileSelect={handleApplyToFiles}
      />
    </>
  );
};

const FileChangePatternBulkActionButtons = () => (
  <>
    <ApplyPatternBulkActionButton />
    <BulkDeleteButton />
  </>
);

export const FileChangePatternList = () => (
  <List pagination={<Pagination />}>
    <Datagrid rowClick="show" bulkActionButtons={<FileChangePatternBulkActionButtons />} >
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="regex_pattern" />
      <TextField source="replacement_format" />
      <TextField source="is_confirmed" />
      <EditButton />
    </Datagrid>
  </List>
);

export const FileChangePatternEdit = () => (
  <Edit>
    <FileChangePatternEditForm />
  </Edit>
);

const FileChangePatternEditForm = () => {
  const notify = useNotify();
  const redirect = useRedirect();
  const record = useRecordContext(); // useRecordContext 사용
  // const { getValues } = useFormContext(); // useFormContext 사용 (더 이상 직접 사용하지 않음)

  const [name, setName] = useState(record ? record.name : '');
  const [regexPattern, setRegexPattern] = useState(record ? record.regex_pattern : '');
  const [regexVariables, setRegexVariables] = useState([]);
  const [replacementFormat, setReplacementFormat] = useState(record ? record.replacement_format : '');
  const [extractedData, setExtractedData] = useState([]);

  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedTestFiles, setSelectedTestFiles] = useState([]);
  const [popupSelectedFileIds, setPopupSelectedFileIds] = useState(new Set());
  const [testResults, setTestResults] = useState(null);
  const [showConfirmButton, setShowConfirmButton] = useState(false);

  // record가 변경될 때마다 상태 업데이트 (초기 로드 및 새로고침 시)
  React.useEffect(() => {
    if (record) {
      setName(record.name);
      setRegexPattern(record.regex_pattern);
      setReplacementFormat(record.replacement_format);

      // 패턴 ID가 있을 경우 추출된 데이터 로드
      if (record.id) {
        dataProvider.getExtractedDataByPattern(record.id)
          .then(response => {
            setExtractedData(response);
          })
          .catch(error => {
            console.error('추출된 데이터 로드 중 오류 발생:', error);
            notify('추출된 데이터 로드 중 오류 발생', { type: 'error' });
          });
      }
    }
  }, [record, notify]);

  const memoizedInitialSelectedFileIds = React.useMemo(() => {
    return Array.from(popupSelectedFileIds);
  }, [popupSelectedFileIds]);

  const handleFileSelectForTest = (files) => {
    setSelectedTestFiles(files);
    setIsPopupOpen(false);
  };

  const handlePopupSelectionChange = (selectedIdsSet) => {
    setPopupSelectedFileIds(selectedIdsSet);
  };

  const handleTestPattern = async () => {
    // const { name, regex_pattern, replacement_format } = getValues(); // 폼의 현재 값 가져오기 (더 이상 사용 안함)

    if (!name || !regexPattern || !replacementFormat) {
      notify('패턴 이름, 정규식, 교체 형식을 모두 입력해주세요.', { type: 'warning' });
      return;
    }
    if (selectedTestFiles.length === 0) {
      notify('테스트할 파일을 선택해주세요.', { type: 'warning' });
      return;
    }

    notify('패턴 테스트를 시작합니다...', { type: 'info' });
    setTestResults(null);
    setShowConfirmButton(false);

    try {
      const fileIds = selectedTestFiles.map(file => file.id);
      const response = await dataProvider.create('file-change-patterns/test', {
        data: {
          name: name,
          regex_pattern: regexPattern,
          replacement_format: replacementFormat,
          file_ids: fileIds,
        },
      });

      setTestResults(response.data.results);
      notify('패턴 테스트 완료', { type: 'success' });
      setShowConfirmButton(true);
    } catch (error) {
      console.error('패턴 테스트 중 오류 발생:', error);
      notify(`패턴 테스트 중 오류 발생: ${error.message || error.detail}`, { type: 'error' });
      setTestResults({ error: error.message || error.detail });
      setShowConfirmButton(false);
    }
  };

  const handleConfirmAndSave = async () => {
    // const { name, regex_pattern, replacement_format } = getValues(); // 폼의 현재 값 가져오기 (더 이상 사용 안함)

    notify('패턴을 저장합니다...', { type: 'info' });
    try {
      await dataProvider.update('file-change-patterns', {
        id: record.id,
        data: {
          name: name,
          regex_pattern: regexPattern,
          replacement_format: replacementFormat,
          is_confirmed: true, // 수정 시에도 확인된 것으로 간주
        },
        previousData: record, // react-admin의 update 메서드에 필요
      });
      notify('패턴이 성공적으로 업데이트되었습니다.', { type: 'success' });
      redirect('/file-change-patterns');
    } catch (error) {
      console.error('패턴 업데이트 중 오류 발생:', error);
      notify(`패턴 업데이트 중 오류 발생: ${error.message || error.detail}`, { type: 'error' });
    }
  };

  return (
    <SimpleForm onSubmit={() => { }} toolbar={null}> {/*onSubmit 제거, toolbar 제거 */}
      <TextInput source="id" label="ID" value={record ? record.id : ''} fullWidth disabled />
      <TextInput source="name" label="패턴 이름" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
      <TextInput source="regex_pattern" label="정규식 패턴" value={regexPattern} onChange={async (e) => {
        setRegexPattern(e.target.value);
        try {
          const response = await dataProvider.getRegexVariables(e.target.value);
          setRegexVariables(response.data);
        } catch (error) {
          console.error('정규식 변수 가져오기 오류:', error);
          setRegexVariables([]);
        }
      }} fullWidth />
      {regexVariables.length > 0 && (
        <Box sx={{ mt: -1, mb: 1, ml: 2 }}>
          <Typography variant="body2" color="textSecondary">
            사용 가능한 변수: {regexVariables.map(v => `{${v}}`).join(', ')}
          </Typography>
        </Box>
      )}
      <TextInput source="replacement_format" label="교체 형식 (JSON)" value={replacementFormat} onChange={(e) => setReplacementFormat(e.target.value)} fullWidth helperText={`예: {"name": "$0:s$", "start": "$1:d$"}`} />
      <Checkbox source="is_confirmed" label="확인됨" disabled />

      <Box sx={{ mt: 2, mb: 2 }}>
        <Typography variant="h6" gutterBottom>테스트 파일 선택</Typography>
        <Button variant="contained" onClick={() => setIsPopupOpen(true)}>
          테스트 파일 선택
        </Button>
        {selectedTestFiles.length > 0 && (
          <Box sx={{ mt: 1 }}>
            <Typography variant="body2">선택된 테스트 파일:</Typography>
            <MuiList dense>
              {selectedTestFiles.map((file) => (
                <MuiListItem key={file.id} disablePadding>
                  <MuiListItemText primary={file.full_path} />
                </MuiListItem>
              ))}
            </MuiList>
          </Box>
        )}
        <FileSelectionPopup
          open={isPopupOpen}
          onClose={() => setIsPopupOpen(false)}
          onFileSelect={handleFileSelectForTest}
          initialSelectedFileIds={memoizedInitialSelectedFileIds}
          onSelectionChange={handlePopupSelectionChange}
        />
      </Box>

      <Button variant="contained" color="primary" onClick={handleTestPattern} sx={{ mb: 2 }}>
        패턴 테스트
      </Button>

      {testResults && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>테스트 결과</Typography>
          {testResults.error ? (
            <Typography color="error">오류: {testResults.error}</Typography>
          ) : (
            <MuiList dense>
              {Object.entries(testResults).map(([fileId, result]) => (
                <MuiListItem key={fileId} disablePadding>
                  <MuiListItemText
                    primary={`파일 ID: ${fileId}`}
                    secondary={result ? JSON.stringify(result, null, 2) : '추출된 데이터 없음'}
                  />
                </MuiListItem>
              ))}
            </MuiList>
          )}
          {showConfirmButton && (
            <Button variant="contained" color="secondary" onClick={handleConfirmAndSave} sx={{ mt: 2 }}>
              확인 및 저장
            </Button>
          )}
        </Paper>
      )}

      
    </SimpleForm>
  );
};

export const FileChangePatternCreate = () => {
  const notify = useNotify();
  const redirect = useRedirect();

  const [name, setName] = useState('');
  const [regexPattern, setRegexPattern] = useState('');
  const [replacementFormat, setReplacementFormat] = useState('');
  const [regexVariables, setRegexVariables] = useState([]);
  const [isPopupOpen, setIsPopupOpen] = useState(false);
  const [selectedTestFiles, setSelectedTestFiles] = useState([]); // 파일 테스트를 위한 선택된 파일
  const [popupSelectedFileIds, setPopupSelectedFileIds] = useState(new Set()); // 팝업에서 선택된 파일 ID

  const memoizedInitialSelectedFileIds = React.useMemo(() => {
    return Array.from(popupSelectedFileIds);
  }, [popupSelectedFileIds]);

  const [testResults, setTestResults] = useState(null); // 테스트 결과
  const [showConfirmButton, setShowConfirmButton] = useState(false); // 확인 및 저장 버튼 표시 여부

  const handleFileSelectForTest = (files) => {
    setSelectedTestFiles(files);
    setIsPopupOpen(false);
  };

  const handlePopupSelectionChange = (selectedIdsSet) => {
    setPopupSelectedFileIds(selectedIdsSet);
  };

  const handleTestPattern = async () => {
    if (!name || !regexPattern || !replacementFormat) {
      notify('패턴 이름, 정규식, 교체 형식을 모두 입력해주세요.', { type: 'warning' });
      return;
    }
    if (selectedTestFiles.length === 0) {
      notify('테스트할 파일을 선택해주세요.', { type: 'warning' });
      return;
    }

    notify('패턴 테스트를 시작합니다...', { type: 'info' });
    setTestResults(null);
    setShowConfirmButton(false);

    try {
      const fileIds = selectedTestFiles.map(file => file.id);
      const response = await dataProvider.create('file-change-patterns/test', {
        data: {
          name: name,
          regex_pattern: regexPattern,
          replacement_format: replacementFormat,
          file_ids: fileIds,
        },
      });

      setTestResults(response.data.results);
      notify('패턴 테스트 완료', { type: 'success' });
      setShowConfirmButton(true);
    } catch (error) {
      console.error('패턴 테스트 중 오류 발생:', error);
      notify(`패턴 테스트 중 오류 발생: ${error.message || error.detail}`, { type: 'error' });
      setTestResults({ error: error.message || error.detail });
      setShowConfirmButton(false);
    }
  };

  const handleConfirmAndSave = async () => {
    notify('패턴을 저장합니다...', { type: 'info' });
    try {
      await dataProvider.create('file-change-patterns/confirm', {
        data: {
          name: name,
          regex_pattern: regexPattern,
          replacement_format: replacementFormat,
        },
      });
      notify('패턴이 성공적으로 저장되었습니다.', { type: 'success' });
      redirect('/file-change-patterns');
    } catch (error) {
      console.error('패턴 저장 중 오류 발생:', error);
      notify(`패턴 저장 중 오류 발생: ${error.message || error.detail}`, { type: 'error' });
    }
  };

  return (
    <Create title="새 파일 변경 패턴 생성">
      <SimpleForm onSubmit={() => { }} toolbar={null}> {/*onSubmit 제거, toolbar 제거 */}
        <TextInput source="name" label="패턴 이름" value={name} onChange={(e) => setName(e.target.value)} fullWidth />
        <TextInput source="regex_pattern" label="정규식 패턴" value={regexPattern} onChange={async (e) => {
          setRegexPattern(e.target.value);
          try {
            const response = await dataProvider.getRegexVariables(e.target.value);
            setRegexVariables(response.data);
          } catch (error) {
            console.error('정규식 변수 가져오기 오류:', error);
            setRegexVariables([]);
          }
        }} fullWidth />
        {regexVariables.length > 0 && (
          <Box sx={{ mt: -1, mb: 1, ml: 2 }}>
            <Typography variant="body2" color="textSecondary">
              사용 가능한 변수: {regexVariables.map(v => `{${v}}`).join(', ')}
            </Typography>
          </Box>
        )}
        <TextInput source="replacement_format" label="교체 형식 (JSON)" value={replacementFormat} onChange={(e) => setReplacementFormat(e.target.value)} fullWidth helperText={`예: {"name": "$0:s$", "start": "$1:d$"}`} />

        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>테스트 파일 선택</Typography>
          <Button variant="contained" onClick={() => setIsPopupOpen(true)}>
            테스트 파일 선택
          </Button>
          {selectedTestFiles.length > 0 && (
            <Box sx={{ mt: 1 }}>
              <Typography variant="body2">선택된 테스트 파일:</Typography>
              <MuiList dense>
                {selectedTestFiles.map((file) => (
                  <MuiListItem key={file.id} disablePadding>
                    <MuiListItemText primary={file.full_path} />
                  </MuiListItem>
                ))}
              </MuiList>
            </Box>
          )}
          <FileSelectionPopup
            open={isPopupOpen}
            onClose={() => setIsPopupOpen(false)}
            onFileSelect={handleFileSelectForTest}
            initialSelectedFileIds={memoizedInitialSelectedFileIds}
            onSelectionChange={handlePopupSelectionChange}
          />
        </Box>

        <Button variant="contained" color="primary" onClick={handleTestPattern} sx={{ mb: 2 }}>
          패턴 테스트
        </Button>

        {testResults && (
          <Paper sx={{ p: 2, mb: 2 }}>
            <Typography variant="h6" gutterBottom>테스트 결과</Typography>
            {testResults.error ? (
              <Typography color="error">오류: {testResults.error}</Typography>
            ) : (
              <MuiList dense>
                {Object.entries(testResults).map(([fileId, result]) => (
                  <MuiListItem key={fileId} disablePadding>
                    <MuiListItemText
                      primary={`파일 ID: ${fileId}`}
                      secondary={result ? JSON.stringify(result, null, 2) : '추출된 데이터 없음'}
                    />
                  </MuiListItem>
                ))}
              </MuiList>
            )}
            {showConfirmButton && (
              <Button variant="contained" color="secondary" onClick={handleConfirmAndSave} sx={{ mt: 2 }}>
                확인 및 저장
              </Button>
            )}
          </Paper>
        )}
      </SimpleForm>
    </Create>
  );
};