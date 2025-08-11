import React from 'react';
import { List, Datagrid, TextField, NumberField, BooleanField, Pagination } from 'react-admin';

import RenameAndCopy from './RenameAndCopy';

export const FileBulkActionButtons = () => (
    <>
        <RenameAndCopy />
    </>
);

export const FileList = () => (
    <List actions={false} bulkActionButtons={<FileBulkActionButtons />}>
        <Datagrid>
            <TextField source="id" />
            <TextField source="filename" />
            <TextField source="directory" />
            <TextField source="full_path" />
            <TextField source="size" />
            <BooleanField source="extraction_failed" />
            <TextField source="extraction_failure_reason" />
        </Datagrid>
    </List>
);
