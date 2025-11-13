# Empathetic Family Recognition Aid

AI powered companion system for people affected by dementia.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Python 3.8+** (for backend)
- **Node.js 18+** and **npm** (for frontend)
- **Google Gemini API Key** (for RAG functionality)
- **Git** (optional, for cloning the repository)

## Getting Started

### 1. Clone the Repository

```bash
git clone <repository-url>
cd major-project
```

### 2. Backend Setup

#### Step 1: Navigate to the backend directory

```bash
cd backend
```

#### Step 2: Create a virtual environment

**Windows:**

```bash
python -m venv venv
venv\Scripts\activate
```

**Linux/Mac:**

```bash
python3 -m venv venv
source venv/bin/activate
```

#### Step 3: Install dependencies

```bash
pip install -r requirements.txt
```

#### Step 4: Configure environment variables

Create a `.env` file in the `backend` directory (you can copy from `env_example.txt`):

```bash
# Windows
copy env_example.txt .env

# Linux/Mac
cp env_example.txt .env
```

Edit the `.env` file and add your Google Gemini API key:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SECRET_KEY=your_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
FAISS_INDEX_PATH=./faiss_indexes
CHUNK_SIZE=1000
MAX_CONTEXT_LENGTH=3000
SIMILARITY_THRESHOLD=0.7
```

> **Note:** To get a Google Gemini API key:
>
> 1. Visit [Google AI Studio]
> 2. Sign in with your Google account
> 3. Create a new API key
> 4. Copy the key and paste it in your `.env` file

#### Step 5: Run the backend server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The backend API will be available at `http://localhost:8000`


### 3. Frontend Setup

#### Step 1: Navigate to the frontend directory

Open a new terminal window and navigate to the frontend directory:

```bash
cd frontend
```

#### Step 2: Install dependencies

```bash
npm install
```

#### Step 3: Start the development server

```bash
npm run dev
```

The frontend application will be available at `http://localhost:5173`

> **Note:** Make sure the backend server is running before using the frontend application, as it depends on the API endpoints.

## Project Structure

```
major-project/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── core/           # Configuration files
│   │   ├── db/             # Database setup
│   │   ├── models/         # SQLAlchemy models
│   │   ├── routers/        # API route handlers
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   └── main.py         # FastAPI application entry point
│   ├── faiss_indexes/      # Vector database indexes
│   ├── rag-docs/           # Sample documents for RAG
│   ├── uploads/            # User uploaded files
│   ├── requirements.txt    # Python dependencies
│   └── .env               # Environment variables (create this)
├── frontend/               # React + Vite frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── context/        # React context providers
│   │   ├── services/       # API service functions
│   │   └── main.tsx        # Application entry point
│   └── package.json        # Node.js dependencies
└── README.md              # This file
```
