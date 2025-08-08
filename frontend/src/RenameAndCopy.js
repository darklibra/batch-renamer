
import React, { useState } from 'react';
import { useNotify, useRefresh, useListContext } from 'react-admin';
import { Button, TextField, Card, CardContent, Typography } from '@mui/material';
import dataProvider from './dataProvider';

const RenameAndCopy = () => {
    const [destinationPath, setDestinationPath] = useState('');
    const { selectedIds } = useListContext();
    const notify = useNotify();
    const refresh = useRefresh();

    const handleClick = () => {
        if (selectedIds.length === 0) {
            notify('파일을 선택하세요.', { type: 'warning' });
            return;
        }
        if (!destinationPath) {
            notify('복사할 경로를 입력하세요.', { type: 'warning' });
            return;
        }

        dataProvider.applyRenameAndCopy({
            file_ids: selectedIds,
            destination_path: destinationPath
        })
        .then(() => {
            notify('파일 이름 변경 및 복사가 시작되었습니다.', { type: 'info' });
            refresh();
        })
        .catch((e) => {
            notify(`오류: ${e.message}`, { type: 'warning' });
        });
    };

    return (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>이름 변경 및 복사</Typography>
                <Typography variant="body2" color="textSecondary" component="p">
                    선택한 파일들의 이름을 변경하고 지정된 경로에 복사합니다.
                </Typography>
                <TextField
                    label="복사할 경로"
                    value={destinationPath}
                    onChange={e => setDestinationPath(e.target.value)}
                    fullWidth
                    margin="normal"
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleClick}
                    disabled={selectedIds.length === 0}
                >
                    실행
                </Button>
            </CardContent>
        </Card>
    );
};

export default RenameAndCopy;
