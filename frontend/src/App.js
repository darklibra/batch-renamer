
import React from 'react';
import { Admin, Resource, Layout, CustomRoutes } from 'react-admin';
import { Route } from 'react-router-dom';
import dataProvider from './dataProvider';
import { FileList } from './files';
import { FileChangePatternList, FileChangePatternEdit, FileChangePatternCreate } from './fileChangePatterns';
import { ExclusionPatternList, ExclusionPatternEdit, ExclusionPatternCreate } from './exclusionPatterns';
import FileScanner from './FileScanner';
import PatternTester from './PatternTester';
import MyMenu from './MyMenu';
import RenameAndCopyDetail from './RenameAndCopyDetail';

import { FileChangeRequestList, FileChangeRequestShow, FileChangeRequestCreate } from './fileChangeRequests';

const MyLayout = (props) => <Layout {...props} appBar={() => null} menu={MyMenu} />;

const App = () => (
  <Admin dataProvider={dataProvider} layout={MyLayout} dashboard={FileScanner}>
    <CustomRoutes>
      <Route path="/pattern-tester" element={<PatternTester />} />
      <Route path="/scan" element={<FileScanner />} />
    </CustomRoutes>
    <Resource name="files" list={FileList} />
    <Resource 
      name="file-change-patterns" 
      list={FileChangePatternList} 
      edit={FileChangePatternEdit} 
      create={FileChangePatternCreate} 
      show={RenameAndCopyDetail}
    />
    <Resource 
      name="exclusion-patterns" 
      list={ExclusionPatternList} 
      edit={ExclusionPatternEdit} 
      create={ExclusionPatternCreate} 
    />
    <Resource 
      name="file-change-requests" 
      list={FileChangeRequestList} 
      show={FileChangeRequestShow}
      create={FileChangeRequestCreate}
    />
  </Admin>
);

export default App;
