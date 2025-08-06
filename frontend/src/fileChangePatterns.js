import React from 'react';
import { List, Datagrid, TextField, Edit, Create, SimpleForm, TextInput, EditButton, Pagination } from 'react-admin';

export const FileChangePatternList = () => (
  <List pagination={<Pagination />}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="regex_pattern" />
      <TextField source="replacement_format" />
      <EditButton />
    </Datagrid>
  </List>
);

export const FileChangePatternEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="regex_pattern" />
      <TextInput source="replacement_format" />
    </SimpleForm>
  </Edit>
);

export const FileChangePatternCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="regex_pattern" />
      <TextInput source="replacement_format" />
    </SimpleForm>
  </Create>
);
