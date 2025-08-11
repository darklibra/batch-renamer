# GEMINI.MD

## 📌 Project Overview
This project **reads files from a local folder**,  
extracts necessary information from the file names,  
and **copies the files to a new location** based on the extracted information.

The backend is built with **Python + FastAPI + SQLite**,  
and the frontend is built with **React**, organized in a **Monorepo** structure.

---

## 🚀 Requirements

### Backend
- Python 3.10 or higher
- FastAPI
- SQLite 3
- **uv** (Python package manager)

### Frontend
- Node.js 20 or higher
- npm 10 or higher, or yarn / pnpm

---

## ⚙️ Environment Variables

This project uses **`.env`** files,  
maintained separately in the `frontend` and `backend` folders.

### Backend `.env` Example
```env
DATABASE_URL=sqlite:///./app.db
API_HOST=0.0.0.0
API_PORT=8000
```

### Frontend `.env` Example
```env
REACT_APP_API_BASE_URL=http://localhost:8000
```

---

## 📂 Folder Structure

```
/project-root
 ├── backend
 │    ├── app
 │    │    ├── api
 │    │    │    ├── routes
 │    │    │    └── __init__.py
 │    │    ├── core
 │    │    ├── models
 │    │    ├── services
 │    │    ├── utils
 │    │    └── main.py
 │    ├── tests
 │    │    ├── test_file_scan.py
 │    │    ├── test_file_copy.py
 │    │    └── __init__.py
 │    ├── pyproject.toml      # uv settings
 │    ├── .env
 │    └── README.md
 │
 ├── frontend
 │    ├── src
 │    │    ├── components
 │    │    ├── pages
 │    │    ├── hooks
 │    │    ├── utils
 │    │    └── App.jsx
 │    ├── public
 │    ├── package.json
 │    ├── .env
 │    └── README.md
 │
 ├── scripts
 │    └── init_db.py
 │
 ├── IMPLEMENTATION_PLAN.md   # Design and task tracking
 ├── docker-compose.yml
 ├── README.md
 └── GEMINI.MD
```

---

## 📜 Installation & Run

### Backend
```bash
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
npm start
```

---

## 🗂 Design / Task Management
- All design documents, implementation plans, ongoing work, and completed tasks are recorded in **IMPLEMENTATION_PLAN.md**.
- Example sections:
  - Functional requirements
  - API specifications
  - Development task list
  - Progress status (To Do / In Progress / Done)

---

## 🧑‍💻 Development Principles

### 1. Development Methodology
- Develop using **TDD (Test-Driven Development)**
- Decision-making based on **5 criteria**: testability, readability (understandable even after 6 months), consistency with project patterns, simplicity, and ease of change

### 2. Design Philosophy
- Prefer **OOP** and follow **SOLID principles**
- If not all principles can be applied, **SRP (Single Responsibility Principle)** is prioritized

### 3. Error Handling
- **Fail Fast** with **clear error messages**
- Provide debugging context
- Handle exceptions at the appropriate level, **never hide errors**

### 4. Code Quality
- Before every commit:
  1. Compilation passes
  2. All tests pass
  3. Code style check passes
- Commit messages must explain **why** the change was made

---

## 📡 API Examples

### `GET /files`
- Description: Retrieve list of files from a given folder
- Response example:
```json
[
  {
    "name": "IMG_20230810_123456.jpg",
    "path": "/source/IMG_20230810_123456.jpg",
    "parsed_info": {
      "date": "2023-08-10",
      "time": "12:34:56"
    }
  }
]
```

### `POST /files/copy`
- Description: Copy file to a new path based on extracted information
- Request example:
```json
{
  "source": "/source/IMG_20230810_123456.jpg",
  "destination": "/organized/2023/08/"
}
```
- Response example:
```json
{
  "status": "success",
  "message": "File copied successfully."
}
```

---

## ⚛️ React Integration Example

```jsx
// src/hooks/useFiles.js
import { useState, useEffect } from "react";

export const useFiles = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    fetch(`${process.env.REACT_APP_API_BASE_URL}/files`)
      .then(res => res.json())
      .then(setFiles);
  }, []);

  return files;
};
```

```jsx
// src/pages/FileList.jsx
import React from "react";
import { useFiles } from "../hooks/useFiles";

export default function FileList() {
  const files = useFiles();
  return (
    <div>
      <h2>File List</h2>
      <ul>
        {files.map(file => (
          <li key={file.name}>{file.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 🧪 TDD Test Examples

```python
# tests/test_file_scan.py
from app.services.file_service import scan_folder

def test_scan_folder_reads_files(tmp_path):
    file_path = tmp_path / "test_20230810.txt"
    file_path.write_text("dummy content")
    
    files = scan_folder(tmp_path)
    
    assert len(files) == 1
    assert files[0].name == "test_20230810.txt"
```

```python
# tests/test_file_copy.py
from app.services.file_service import copy_file
import os

def test_copy_file(tmp_path):
    src = tmp_path / "source.txt"
    dst_dir = tmp_path / "dest"
    src.write_text("hello world")
    dst_dir.mkdir()

    result = copy_file(src, dst_dir)
    
    assert os.path.exists(dst_dir / "source.txt")
    assert result.status == "success"
```