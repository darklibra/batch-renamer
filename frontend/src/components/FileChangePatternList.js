import React, { useEffect, useState } from 'react';
import FileChangePatternForm from './FileChangePatternForm';

function FileChangePatternList() {
  const [patterns, setPatterns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingPattern, setEditingPattern] = useState(null); // 수정 중인 패턴
  const [showForm, setShowForm] = useState(false); // 폼 표시 여부

  const API_URL = `${process.env.REACT_APP_BACKEND_URL}/api/v1/file-change-patterns`;

  const fetchPatterns = async () => {
    try {
      const response = await fetch(API_URL);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setPatterns(data.patterns || []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatterns();
  }, []);

  const handleCreate = async (newPattern) => {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPattern),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await response.json();
      fetchPatterns(); // 목록 새로고침
      setShowForm(false); // 폼 숨기기
    } catch (e) {
      setError(e.message);
    }
  };

  const handleUpdate = async (updatedPattern) => {
    try {
      const response = await fetch(`${API_URL}/${editingPattern.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedPattern),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      await response.json();
      fetchPatterns(); // 목록 새로고침
      setEditingPattern(null); // 수정 모드 종료
      setShowForm(false); // 폼 숨기기
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      fetchPatterns(); // 목록 새로고침
    } catch (e) {
      setError(e.message);
    }
  };

  const handleEditClick = (pattern) => {
    setEditingPattern(pattern);
    setShowForm(true);
  };

  const handleCancelForm = () => {
    setEditingPattern(null);
    setShowForm(false);
  };

  if (loading) {
    return <div>패턴 목록을 불러오는 중...</div>;
  }

  if (error) {
    return <div>오류 발생: {error}</div>;
  }

  return (
    <div>
      <h2>파일명 변경 패턴 관리</h2>

      {!showForm && (
        <button onClick={() => setShowForm(true)}>새 패턴 추가</button>
      )}

      {showForm && (
        <FileChangePatternForm
          pattern={editingPattern}
          onSubmit={editingPattern ? handleUpdate : handleCreate}
          onCancel={handleCancelForm}
        />
      )}

      {patterns.length === 0 ? (
        <p>등록된 패턴이 없습니다.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>이름</th>
              <th>정규식 패턴</th>
              <th>교체 형식</th>
              <th>액션</th>
            </tr>
          </thead>
          <tbody>
            {patterns.map((pattern) => (
              <tr key={pattern.id}>
                <td>{pattern.id}</td>
                <td>{pattern.name}</td>
                <td>{pattern.regex_pattern}</td>
                <td>{pattern.replacement_format}</td>
                <td>
                  <button onClick={() => handleEditClick(pattern)}>수정</button>
                  <button onClick={() => handleDelete(pattern.id)}>삭제</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default FileChangePatternList;
