# DiffInspector

A professional GitHub-style diff viewer for comparing text, code, or prompts with an intuitive side-by-side interface.

## Features

- Side-by-side text comparison with professional UI
- GitHub-style PR diff view with word-level highlighting
- Split and Unified view modes
- Interactive merge functionality
- Copy original/modified sections
- Optimal Myers diff algorithm (O(ND) complexity)
- FastAPI backend with TypeScript React frontend
- Docker support with hot-reload for development

## Tech Stack

- **Backend**: FastAPI (Python) - Port 8000
- **Frontend**: React + TypeScript + Vite - Port 3000
- **Algorithm**: Myers diff algorithm via Python's difflib

## Quick Start

### Using Docker Compose (Recommended)

```bash
docker-compose up --build
```

Then open http://localhost:3000

The app supports hot-reload - any changes to the code will automatically reflect in the browser without restarting containers.

### Manual Setup

#### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

#### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Usage

1. Paste your original text in the left panel
2. Paste your modified text in the right panel
3. Click "Check Difference"
4. View the GitHub-style diff with additions (green) and deletions (red)
5. Click on any changed line to see merge options
6. Use "Use Original" or "Use Modified" buttons to merge changes
7. Toggle between Split and Unified views

## API Endpoints

- `POST /api/diff` - Calculate diff between two texts
- `GET /health` - Health check endpoint

## Algorithm Complexity

Uses Python's difflib with Myers algorithm:
- Time: O(ND) where N is sum of lengths, D is edit distance
- Space: O(N)
- Optimal for most real-world text comparisons
