import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  ChevronLeft,
  RotateCcw,
  CheckCircle,
  X,
  FileText,
  Users,
  Activity,
  Calendar,
  Heart,
  BookOpen,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { quizAPI } from "@/services/api";

interface MCQQuestion {
  id: string;
  question_text: string;
  question_type: string;
  options: Array<{
    id: number;
    name: string;
  }>;
  correct_answer: string;
  explanation: string;
  background_context: string;
}

interface MCQResult {
  is_correct: boolean;
  correct_answer: string;
  explanation: string;
  background_story?: string;
}

const questionTypeIcons = {
  people: Users,
  activities: Activity,
  health: Heart,
  dates: Calendar,
  general: BookOpen,
};

export const SimpleDocumentQuiz = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<MCQQuestion | null>(
    null
  );
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizResult, setQuizResult] = useState<MCQResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [selectedQuestionType, setSelectedQuestionType] = useState<
    string | null
  >(null);

  useEffect(() => {
    fetchQuestion();
  }, []);

  const fetchQuestion = async (questionType?: string) => {
    try {
      setIsLoading(true);
      setError(null);

      const question = await quizAPI.getDocumentMCQ(questionType);
      setCurrentQuestion(question);
      setSelectedAnswer(null);
      setQuizResult(null);
      setShowFeedback(false);
    } catch (err: unknown) {
      console.error("Document MCQ fetch error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Failed to load question from your documents";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = async (selectedOption: string) => {
    if (selectedAnswer || !currentQuestion) return;

    setSelectedAnswer(selectedOption);
    setIsSubmitting(true);

    try {
      const result = await quizAPI.submitDocumentMCQAnswer(
        currentQuestion.id,
        selectedOption,
        currentQuestion
      );
      setQuizResult(result);
      setShowFeedback(true);
    } catch (err: unknown) {
      console.error("Answer submission error:", err);
      const errorMessage =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { detail?: string } } })?.response
              ?.data?.detail || "Failed to submit answer";
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    fetchQuestion(selectedQuestionType || undefined);
  };

  const handleQuestionTypeSelect = (type: string) => {
    setSelectedQuestionType(type);
    fetchQuestion(type);
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#E02478] mx-auto"></div>
          <p className="mt-4 text-lg">
            Generating question from your documents...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <Card>
            <CardContent className="p-8">
              <div className="mb-6">
                <X className="h-16 w-16 text-red-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-4">Quiz Unavailable</h2>
                <p className="text-white/70 mb-6">{error}</p>
              </div>
              <div className="space-y-4">
                <Button onClick={handleBackToDashboard} className="w-full">
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
                <Button
                  variant="outline"
                  onClick={() => fetchQuestion()}
                  className="w-full"
                >
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Button
            variant="outline"
            onClick={handleBackToDashboard}
            className="mb-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <FileText className="h-10 w-10 text-[#E02478]" />
              <h1 className="text-3xl md:text-4xl font-bold">Document Quiz</h1>
            </div>
            <p className="text-white/70">
              Questions generated from your personal documents using AI
            </p>
          </div>
        </motion.div>

        {/* Question Type Selector */}
        {!showFeedback && (
          <motion.div
            className="mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-center text-white/70 mb-4">
              Choose a focus area or continue with random questions:
            </p>
            <div className="flex justify-center gap-3 flex-wrap">
              {Object.entries(questionTypeIcons).map(([type, Icon]) => (
                <Button
                  key={type}
                  variant={
                    selectedQuestionType === type ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => handleQuestionTypeSelect(type)}
                  className="capitalize"
                >
                  <Icon className="mr-2 h-4 w-4" />
                  {type}
                </Button>
              ))}
              <Button
                variant={selectedQuestionType === null ? "default" : "outline"}
                size="sm"
                onClick={() => handleQuestionTypeSelect("")}
              >
                Random
              </Button>
            </div>
          </motion.div>
        )}

        {/* Question Card */}
        <motion.div
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
                  const isCorrect = quizResult?.correct_answer === option.name;
                  const isWrong = isSelected && !quizResult?.is_correct;

                  let buttonClass =
                    "w-full p-4 text-base transition-all duration-300 min-h-[60px] text-left whitespace-normal break-words";
                  if (showFeedback) {
                    if (isCorrect) {
                      buttonClass +=
                        " bg-green-500 hover:bg-green-600 border-green-400 text-white";
                    } else if (isWrong) {
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
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      className="w-full"
                    >
                      <Button
                        variant={
                          showFeedback && isCorrect ? "default" : "outline"
                        }
                        className={buttonClass}
                        onClick={() => handleAnswerSelect(option.name)}
                        disabled={isSubmitting || showFeedback}
                      >
                        <div className="flex items-start justify-start space-x-3 w-full">
                          <div className="flex-shrink-0 mt-1">
                            {showFeedback && isCorrect && (
                              <CheckCircle className="h-5 w-5 text-white" />
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

              {/* Feedback */}
              {showFeedback && quizResult && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8"
                >
                  <div
                    className={`p-6 rounded-lg ${
                      quizResult.is_correct
                        ? "bg-green-500/20 border border-green-500/50"
                        : "bg-red-500/20 border border-red-500/50"
                    }`}
                  >
                    <p
                      className={`text-xl font-semibold mb-3 ${
                        quizResult.is_correct
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {quizResult.is_correct ? "Correct!" : "Good Try!"}
                    </p>
                    <p className="text-white/90 mb-4">
                      {quizResult.explanation}
                    </p>
                    {quizResult.background_story && (
                      <div className="bg-white/5 p-4 rounded-lg border border-white/10">
                        <p className="text-sm text-white/70 mb-2">
                          From your documents:
                        </p>
                        <p className="text-white/90 text-sm italic">
                          {quizResult.background_story}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {/* Next Button */}
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="text-center mt-8"
                >
                  <Button onClick={handleNext} size="lg" className="px-12">
                    Next Question
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
