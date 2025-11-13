import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  CheckCircle,
  X,
  Clock,
  FileText,
  Users,
  Activity,
  Calendar,
  Heart,
  BookOpen,
  Timer,
  TrendingUp,
  Award,
  Target,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { QuizSetup } from "./QuizSetup";
import { quizAPI } from "@/services/api";

interface QuizSetupData {
  sessionName: string;
  totalQuestions: number;
  questionTimer: number;
  questionTypes: string[];
}

interface SessionQuestion {
  question_id: number;
  session_id: number;
  question_number: number;
  id: string;
  question_text: string;
  question_type: string;
  options: Array<{ id: number; name: string }>;
  correct_answer: string;
  explanation: string;
  background_context: string;
}

interface SessionStats {
  session: {
    id: number;
    session_name?: string;
    total_questions: number;
    questions_answered: number;
    correct_answers: number;
    session_score: number;
    total_time_spent: number;
    avg_response_time: number;
    completed_at: string;
  };
  insights: string;
  performance_breakdown: Record<string, unknown>;
  time_analysis: Record<string, unknown>;
  recommendations: string[];
}

const questionTypeIcons = {
  people: Users,
  activities: Activity,
  health: Heart,
  dates: Calendar,
  general: BookOpen,
};

export const EnhancedDocumentQuiz = () => {
  const navigate = useNavigate();
  const [currentPhase, setCurrentPhase] = useState<
    "setup" | "quiz" | "results"
  >("setup");
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] =
    useState<SessionQuestion | null>(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(1);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [sessionStats, setSessionStats] = useState<SessionStats | null>(null);
  const [quizSetup, setQuizSetup] = useState<QuizSetupData | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const startQuizSession = async (setupData: QuizSetupData) => {
    try {
      setIsLoading(true);
      setQuizSetup(setupData);

      const session = await quizAPI.setupQuizSession({
        session_name: setupData.sessionName || undefined,
        total_questions: setupData.totalQuestions,
        question_timer: setupData.questionTimer,
      });

      setSessionId(session.id);
      setCurrentPhase("quiz");
      await loadNextQuestion(session.id, 1);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to start quiz session";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const loadNextQuestion = async (
    sessionId: number,
    questionNumber: number
  ) => {
    try {
      setIsLoading(true);
      setSelectedAnswer(null);
      setShowFeedback(false);

      const question = await quizAPI.getSessionQuestion(
        sessionId,
        questionNumber
      );
      setCurrentQuestion(question);
      setCurrentQuestionNumber(questionNumber);
      setQuestionStartTime(Date.now());

      // Start timer
      if (quizSetup) {
        setTimeLeft(quizSetup.questionTimer);
        startTimer(quizSetup.questionTimer);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load question";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const startTimer = (duration: number) => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    let remaining = duration;
    setTimeLeft(remaining);

    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        handleTimeUp();
      }
    }, 1000);
  };

  const handleTimeUp = () => {
    if (!showFeedback && currentQuestion) {
      handleAnswerSelect("", true); // Submit empty answer when time is up
    }
  };

  const handleAnswerSelect = async (
    selectedOption: string,
    timeUp: boolean = false
  ) => {
    if ((selectedAnswer && !timeUp) || !currentQuestion || !sessionId) return;

    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    const responseTime = Math.floor((Date.now() - questionStartTime) / 1000);
    setSelectedAnswer(selectedOption);
    setIsLoading(true);

    try {
      await quizAPI.submitSessionAnswer(sessionId, {
        question_id: currentQuestion.question_id,
        user_answer: selectedOption,
        response_time: responseTime,
      });
      setShowFeedback(true);
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to submit answer";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = () => {
    if (!quizSetup || !sessionId) return;

    if (currentQuestionNumber >= quizSetup.totalQuestions) {
      completeSession();
    } else {
      loadNextQuestion(sessionId, currentQuestionNumber + 1);
    }
  };

  const completeSession = async () => {
    if (!sessionId) return;

    try {
      setIsLoading(true);

      const stats = await quizAPI.completeQuizSession(sessionId);
      setSessionStats(stats);
      setCurrentPhase("results");
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to complete session";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Setup Phase
  if (currentPhase === "setup") {
    return <QuizSetup onStartQuiz={startQuizSession} />;
  }

  // Results Phase
  if (currentPhase === "results" && sessionStats) {
    return (
      <div className="min-h-screen pt-24 px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Award className="h-12 w-12 text-[#E02478]" />
              <h1 className="text-4xl font-bold">Quiz Complete!</h1>
            </div>
            <p className="text-white/70 text-lg">
              {sessionStats.session.session_name || "Document Quiz Session"}
            </p>
          </motion.div>

          {/* Session Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-8 w-8 text-[#E02478] mx-auto mb-2" />
                <div className="text-3xl font-bold text-[#E02478]">
                  {sessionStats.session.session_score.toFixed(1)}%
                </div>
                <div className="text-white/70">Final Score</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <CheckCircle className="h-8 w-8 text-green-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-green-400">
                  {sessionStats.session.correct_answers}/
                  {sessionStats.session.total_questions}
                </div>
                <div className="text-white/70">Correct Answers</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Timer className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                <div className="text-3xl font-bold text-blue-400">
                  {sessionStats.session.avg_response_time.toFixed(1)}s
                </div>
                <div className="text-white/70">Avg Response</div>
              </CardContent>
            </Card>
          </div>

          {/* AI Insights */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-[#E02478]" />
                <span>AI-Generated Insights</span>
              </h3>
              <p className="text-white/90 leading-relaxed">
                {sessionStats.insights}
              </p>
            </CardContent>
          </Card>

          {/* Performance Breakdown */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">
                Performance by Category
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(sessionStats.performance_breakdown).map(
                  ([type, data]: [string, unknown]) => {
                    const performanceData = data as {
                      accuracy?: number;
                      correct?: number;
                      total?: number;
                    };
                    const Icon =
                      questionTypeIcons[
                        type as keyof typeof questionTypeIcons
                      ] || BookOpen;
                    return (
                      <div
                        key={type}
                        className="flex items-center justify-between p-4 bg-white/5 rounded-lg"
                      >
                        <div className="flex items-center space-x-3">
                          <Icon className="h-5 w-5 text-[#E02478]" />
                          <span className="capitalize font-medium">{type}</span>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">
                            {performanceData.accuracy?.toFixed(1) || 0}%
                          </div>
                          <div className="text-sm text-white/60">
                            {performanceData.correct || 0}/
                            {performanceData.total || 0}
                          </div>
                        </div>
                      </div>
                    );
                  }
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-4">Recommendations</h3>
              <ul className="space-y-2">
                {sessionStats.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start space-x-2">
                    <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                    <span className="text-white/90">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-center space-x-4">
            <Button onClick={() => setCurrentPhase("setup")} size="lg">
              Take Another Quiz
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
  }

  // Quiz Phase
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#E02478] mx-auto"></div>
          <p className="mt-4 text-lg">Loading question...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-6">
        <Card>
          <CardContent className="p-8 text-center">
            <X className="h-16 w-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-4">Quiz Error</h2>
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

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-6">
        <p>No question available</p>
      </div>
    );
  }

  const QuestionTypeIcon =
    questionTypeIcons[
      currentQuestion.question_type as keyof typeof questionTypeIcons
    ] || BookOpen;
  const progress = quizSetup
    ? (currentQuestionNumber / quizSetup.totalQuestions) * 100
    : 0;

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header with Progress */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <FileText className="h-8 w-8 text-[#E02478]" />
              <div>
                <h1 className="text-2xl font-bold">Document Quiz</h1>
                <p className="text-white/70">
                  Question {currentQuestionNumber} of{" "}
                  {quizSetup?.totalQuestions}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div
                className={`flex items-center space-x-2 ${
                  timeLeft <= 10 ? "text-red-400" : "text-white/70"
                }`}
              >
                <Clock className="h-5 w-5" />
                <span className="text-lg font-mono">{timeLeft}s</span>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-white/10 rounded-full h-2">
            <motion.div
              className="bg-[#E02478] h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </motion.div>

        {/* Question Card */}
        <motion.div
          key={currentQuestion.question_id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-8">
            <CardContent className="p-8">
              {/* Question Type Badge */}
              <div className="flex justify-center mb-6">
                <div className="flex items-center space-x-2 px-4 py-2 rounded-full border bg-[#E02478]/20 border-[#E02478]/50">
                  <QuestionTypeIcon className="h-5 w-5 text-[#E02478]" />
                  <span className="capitalize font-medium text-[#E02478]">
                    {currentQuestion.question_type} Question
                  </span>
                </div>
              </div>

              {/* Question Text */}
              <div className="text-center mb-8">
                <h2 className="text-2xl md:text-3xl font-bold mb-4">
                  {currentQuestion.question_text}
                </h2>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-4">
                {currentQuestion.options.map((option, index) => {
                  const isSelected = selectedAnswer === option.name;
                  const isCorrect =
                    currentQuestion.correct_answer === option.name;

                  let buttonClass =
                    "w-full p-4 text-base transition-all duration-300 min-h-[60px] text-left whitespace-normal break-words";

                  if (showFeedback) {
                    if (isCorrect) {
                      buttonClass +=
                        " bg-green-500 hover:bg-green-600 border-green-400 text-white";
                    } else if (isSelected && !isCorrect) {
                      buttonClass +=
                        " bg-red-500 hover:bg-red-600 border-red-400 text-white";
                    } else {
                      buttonClass += " opacity-50";
                    }
                  } else if (isSelected) {
                    buttonClass += " ring-2 ring-[#E02478] bg-[#E02478]/10";
                  }

                  return (
                    <motion.div
                      key={option.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      whileHover={{
                        scale: timeLeft > 0 && !showFeedback ? 1.01 : 1,
                      }}
                      whileTap={{
                        scale: timeLeft > 0 && !showFeedback ? 0.99 : 1,
                      }}
                      className="w-full"
                    >
                      <Button
                        variant={
                          showFeedback && isCorrect ? "default" : "outline"
                        }
                        className={buttonClass}
                        onClick={() => handleAnswerSelect(option.name)}
                        disabled={isLoading || showFeedback || timeLeft <= 0}
                      >
                        <div className="flex items-start justify-start space-x-3 w-full">
                          <div className="flex-shrink-0 mt-1">
                            {showFeedback && isCorrect && (
                              <CheckCircle className="h-5 w-5 text-white" />
                            )}
                            {showFeedback && isSelected && !isCorrect && (
                              <X className="h-5 w-5 text-white" />
                            )}
                            {!showFeedback && (
                              <div className="w-4 h-4 border-2 border-current rounded-full flex-shrink-0 mt-0.5" />
                            )}
                          </div>
                          <span className="text-left leading-relaxed flex-1">
                            {option.name}
                          </span>
                        </div>
                      </Button>
                    </motion.div>
                  );
                })}
              </div>

              {/* Next Button */}
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mt-8"
                >
                  <Button
                    onClick={handleNextQuestion}
                    size="lg"
                    className="px-12"
                  >
                    {currentQuestionNumber >= (quizSetup?.totalQuestions || 0)
                      ? "Complete Quiz"
                      : "Next Question"}
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
