import React from 'react';
import { List, Datagrid, TextField, Edit, Create, SimpleForm, TextInput, BooleanInput, EditButton, BooleanField, Pagination } from 'react-admin';

export const ExclusionPatternList = () => (
  <List pagination={<Pagination />}>
    <Datagrid>
      <TextField source="id" />
      <TextField source="name" />
      <TextField source="pattern" />
      <BooleanField source="is_active" />
      <EditButton />
    </Datagrid>
  </List>
);

export const ExclusionPatternEdit = () => (
  <Edit>
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="pattern" />
      <BooleanInput source="is_active" />
    </SimpleForm>
  </Edit>
);

export const ExclusionPatternCreate = () => (
  <Create>
    <SimpleForm>
      <TextInput source="name" />
      <TextInput source="pattern" />
      <BooleanInput source="is_active" defaultValue={true} />
    </SimpleForm>
  </Create>
);
