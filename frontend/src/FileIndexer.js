import React, { useState } from 'react';
import { Card, CardContent, CardHeader, TextField, Button, Typography } from '@mui/material';
import { useDataProvider } from 'react-admin';

const FileIndexer = () => {
  const [directoryPath, setDirectoryPath] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const dataProvider = useDataProvider();

  const handleIndex = async () => {
    setMessage('');
    setError('');
    try {
      const result = await dataProvider.indexFiles(directoryPath); // 패턴 전달 제거
      setMessage(`인덱싱 완료: ${result.indexed_files.length}개의 파일이 추가되었습니다.`);
      setDirectoryPath(''); // 성공 시 입력 필드 초기화
    } catch (err) {
      setError(`인덱싱 실패: ${err.message}`);
    }
  };

  return (
    <Card sx={{ margin: '2em' }}>
      <CardHeader title="파일 인덱싱" />
      <CardContent>
        <Typography variant="body1" gutterBottom>
          인덱싱할 디렉토리의 절대 경로를 입력하세요.
        </Typography>
        <TextField
          label="디렉토리 경로"
          variant="outlined"
          fullWidth
          value={directoryPath}
          onChange={(e) => setDirectoryPath(e.target.value)}
          sx={{ marginBottom: '1em' }}
        />
        <Button variant="contained" onClick={handleIndex}>
          인덱싱 시작
        </Button>
        {message && <Typography color="primary" sx={{ marginTop: '1em' }}>{message}</Typography>}
        {error && <Typography color="error" sx={{ marginTop: '1em' }}>{error}</Typography>}
      </CardContent>
    </Card>
  );
};

export default FileIndexer;
