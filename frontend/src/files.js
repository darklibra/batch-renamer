import React from 'react';
import { List, Datagrid, TextField, NumberField, BooleanField, Pagination } from 'react-admin';

export const FileList = () => (
  <List pagination={<Pagination />}>
    <Datagrid>
      <NumberField source="id" />
      <TextField source="filename" />
      <TextField source="extension" />
      <TextField source="directory" />
      <TextField source="full_path" />
      <NumberField source="size" />
      <BooleanField source="extraction_failed" />
    </Datagrid>
  </List>
);
