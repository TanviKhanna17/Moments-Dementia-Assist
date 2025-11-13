import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { Layout } from "./components/Layout";
import { LandingPage } from "./components/LandingPage";
import { AuthPage } from "./components/AuthPage";
import { DashboardPage } from "./components/DashboardPage";
import { FamilyMemberQuiz } from "./components/FamilyMemberQuiz";
import { SimpleDocumentQuiz } from "./components/SimpleDocumentQuiz";
import { EnhancedDocumentQuiz } from "./components/EnhancedDocumentQuiz";
import { QuizHistory } from "./components/QuizHistory";
import ChatPage from "./components/ChatPage";
import { ProtectedRoute } from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <Router>
        <Layout>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage type="login" />} />
            <Route path="/register" element={<AuthPage type="register" />} />

            {/* Protected routes */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz"
              element={
                <ProtectedRoute>
                  <FamilyMemberQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document-quiz"
              element={
                <ProtectedRoute>
                  <EnhancedDocumentQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/simple-document-quiz"
              element={
                <ProtectedRoute>
                  <SimpleDocumentQuiz />
                </ProtectedRoute>
              }
            />
            <Route
              path="/quiz-history"
              element={
                <ProtectedRoute>
                  <QuizHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chatbot"
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              }
            />

            {/* Redirect any unknown routes to landing */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </Router>
    </AuthProvider>
  );
}

export default App;
