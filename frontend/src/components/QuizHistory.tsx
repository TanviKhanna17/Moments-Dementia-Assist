import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChevronLeft,
  History,
  TrendingUp,
  TrendingDown,
  Award,
  Clock,
  Target,
  Calendar,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { quizAPI } from "@/services/api";

interface QuizSession {
  id: number;
  session_name?: string;
  total_questions: number;
  questions_answered: number;
  correct_answers: number;
  session_score: number;
  total_time_spent: number;
  avg_response_time: number;
  created_at: string;
  completed_at: string;
}

interface QuizHistoryData {
  sessions: QuizSession[];
  total_sessions: number;
  average_score: number;
  improvement_trend: string;
  gemini_summary: string;
}

export const QuizHistory = () => {
  const navigate = useNavigate();
  const [historyData, setHistoryData] = useState<QuizHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuizHistory();
  }, []);

  const loadQuizHistory = async () => {
    try {
      setIsLoading(true);
      const data = await quizAPI.getQuizHistory();
      setHistoryData(data);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load quiz history";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case "improving":
        return <TrendingUp className="h-5 w-5 text-green-400" />;
      case "declining":
        return <TrendingDown className="h-5 w-5 text-red-400" />;
      default:
        return <Target className="h-5 w-5 text-blue-400" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#E02478] mx-auto"></div>
          <p className="mt-4 text-lg">Loading quiz history...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Error Loading History</h2>
            <p className="text-white/70 mb-6">{error}</p>
            <Button onClick={() => navigate("/dashboard")}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!historyData || historyData.sessions.length === 0) {
    return (
      <div className="min-h-screen pt-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mb-6"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-4">
                <History className="h-10 w-10 text-[#E02478]" />
                <h1 className="text-3xl md:text-4xl font-bold">Quiz History</h1>
              </div>
            </div>
          </motion.div>

          <Card>
            <CardContent className="p-12 text-center">
              <BookOpen className="h-16 w-16 text-white/30 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-4">No Quiz History Yet</h2>
              <p className="text-white/70 mb-6">
                Complete your first document quiz to see your progress and
                insights here.
              </p>
              <Button onClick={() => navigate("/document-quiz")} size="lg">
                Take Your First Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="mb-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <History className="h-10 w-10 text-[#E02478]" />
              <h1 className="text-3xl md:text-4xl font-bold">Quiz History</h1>
            </div>
            <p className="text-white/70">
              Track your progress and view AI-powered insights
            </p>
          </div>
        </motion.div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <Award className="h-8 w-8 text-[#E02478] mx-auto mb-2" />
              <div className="text-2xl font-bold text-[#E02478]">
                {historyData.total_sessions}
              </div>
              <div className="text-white/70">Total Sessions</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Target className="h-8 w-8 text-blue-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-blue-400">
                {historyData.average_score.toFixed(1)}%
              </div>
              <div className="text-white/70">Average Score</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              {getTrendIcon(historyData.improvement_trend)}
              <div className="text-2xl font-bold mt-2">
                {historyData.improvement_trend}
              </div>
              <div className="text-white/70">Trend</div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 text-center">
              <Clock className="h-8 w-8 text-green-400 mx-auto mb-2" />
              <div className="text-2xl font-bold text-green-400">
                {historyData.sessions.length > 0
                  ? (
                      historyData.sessions.reduce(
                        (sum, s) => sum + s.avg_response_time,
                        0
                      ) / historyData.sessions.length
                    ).toFixed(1)
                  : "0"}
                s
              </div>
              <div className="text-white/70">Avg Response</div>
            </CardContent>
          </Card>
        </div>

        {/* AI Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Sparkles className="h-6 w-6 text-[#E02478]" />
              <span>AI Progress Analysis</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-white/90 leading-relaxed">
              {historyData.gemini_summary}
            </p>
          </CardContent>
        </Card>

        {/* Session History */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historyData.sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-[#E02478]" />
                    </div>
                    <div>
                      <h3 className="font-semibold">
                        {session.session_name || `Quiz Session #${session.id}`}
                      </h3>
                      <div className="flex items-center space-x-4 text-sm text-white/60">
                        <span>{formatDate(session.completed_at)}</span>
                        <span>•</span>
                        <span>{session.total_questions} questions</span>
                        <span>•</span>
                        <span>
                          {Math.floor(session.total_time_spent / 60)}:
                          {(session.total_time_spent % 60)
                            .toString()
                            .padStart(2, "0")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-6">
                    <div className="text-center">
                      <div
                        className={`text-xl font-bold ${getScoreColor(
                          session.session_score
                        )}`}
                      >
                        {session.session_score.toFixed(1)}%
                      </div>
                      <div className="text-xs text-white/60">Score</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-white">
                        {session.correct_answers}/{session.total_questions}
                      </div>
                      <div className="text-xs text-white/60">Correct</div>
                    </div>

                    <div className="text-center">
                      <div className="text-lg font-bold text-blue-400">
                        {session.avg_response_time.toFixed(1)}s
                      </div>
                      <div className="text-xs text-white/60">Avg Time</div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center space-x-4 mt-8">
          <Button onClick={() => navigate("/document-quiz")} size="lg">
            Take New Quiz
          </Button>
          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            size="lg"
          >
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
