# Frontend Project

This is the frontend part of the Clear File project, built with React and Vite.

## 🚀 Getting Started

### Installation

Navigate to the `frontend` directory and install the dependencies:

```bash
cd frontend
npm install
```

### Running the Development Server

To start the development server, run:

```bash
npm run dev
```

This will typically start the application at `http://localhost:5173` (or another available port).

### Environment Variables

This project uses `.env` files for environment variables. An example `.env` file is:

```env
VITE_REACT_APP_API_BASE_URL=http://localhost:8000
```

### Testing

Currently, there are no specific frontend tests configured. For future testing, you might consider:

- **Unit Tests**: Using testing libraries like `Vitest` or `Jest` for individual components and hooks.
- **End-to-End Tests**: Using tools like `Playwright` or `Cypress` for testing user flows.