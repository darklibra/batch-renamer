import React, { useEffect, useState } from 'react';

function FileList() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/v1/files`); // GET /api/v1/files 호출

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setFiles(data || []);
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, []);

  if (loading) {
    return <div>파일 목록을 불러오는 중...</div>;
  }

  if (error) {
    return <div>오류 발생: {error}</div>;
  }

  return (
    <div>
      <h2>인덱싱된 파일 목록</h2>
      {files.length === 0 ? (
        <p>표시할 파일이 없습니다. 백엔드에서 디렉토리를 인덱싱했는지 확인하세요.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>파일명</th>
              <th>확장자</th>
              <th>디렉토리</th>
              <th>전체 경로</th>
              <th>크기 (bytes)</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => (
              <tr key={file.id}>
                <td>{file.id}</td>
                <td>{file.filename}</td>
                <td>{file.extension}</td>
                <td>{file.directory}</td>
                <td>{file.full_path}</td>
                <td>{file.size}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default FileList;