import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, RotateCcw, CheckCircle, X } from "lucide-react";
import { quizAPI } from "@/services/api";
import { useNavigate } from "react-router-dom";

interface QuizQuestion {
  image_url: string;
  prompted_family_member_id: number;
  options: Array<{
    id: number;
    name: string;
  }>;
}

interface QuizAnswer {
  is_correct: boolean;
  correct_member_id: number;
}

export const FamilyMemberQuiz = () => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<QuizQuestion | null>(
    null
  );
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [quizAnswer, setQuizAnswer] = useState<QuizAnswer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);

  // Fetch quiz question on component mount
  useEffect(() => {
    fetchQuestion();
  }, []);

  const fetchQuestion = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const question = await quizAPI.getQuestion();
      setCurrentQuestion(question);
      setSelectedAnswer(null);
      setQuizAnswer(null);
      setShowFeedback(false);
    } catch (err: any) {
      console.error("Quiz question fetch error:", err);
      if (err?.response?.status === 400) {
        setError(
          "Not enough family members with photos to generate quiz questions. Please add more family members and upload photos for them."
        );
      } else {
        let errorMessage = "Failed to load quiz question";

        if (err?.response?.data) {
          const data = err.response.data;
          if (typeof data === "string") {
            errorMessage = data;
          } else if (data.detail) {
            if (typeof data.detail === "string") {
              errorMessage = data.detail;
            } else if (Array.isArray(data.detail)) {
              // Handle Pydantic validation errors
              errorMessage = data.detail
                .map((error: any) => error.msg || error)
                .join(", ");
            }
          } else if (data.message) {
            errorMessage = data.message;
          }
        }

        setError(errorMessage);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnswerSelect = async (selectedMemberId: number) => {
    if (selectedAnswer || !currentQuestion) return;

    setSelectedAnswer(selectedMemberId);
    setIsSubmitting(true);

    try {
      const answer = await quizAPI.submitAnswer(
        currentQuestion.prompted_family_member_id,
        selectedMemberId
      );
      setQuizAnswer(answer);
      setShowFeedback(true);
    } catch (err: any) {
      console.error("Quiz answer submission error:", err);
      let errorMessage = "Failed to submit answer";

      if (err?.response?.data) {
        const data = err.response.data;
        if (typeof data === "string") {
          errorMessage = data;
        } else if (data.detail) {
          if (typeof data.detail === "string") {
            errorMessage = data.detail;
          } else if (Array.isArray(data.detail)) {
            // Handle Pydantic validation errors
            errorMessage = data.detail
              .map((error: any) => error.msg || error)
              .join(", ");
          }
        } else if (data.message) {
          errorMessage = data.message;
        }
      }

      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleNext = () => {
    fetchQuestion(); // Fetch a new question
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 px-6">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#E02478] mx-auto"></div>
          <p className="mt-4 text-lg">Loading quiz question...</p>
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
                {!error.includes("Not enough") && (
                  <Button
                    variant="outline"
                    onClick={fetchQuestion}
                    className="w-full"
                  >
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                )}
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
          <h1 className="text-3xl md:text-4xl font-bold text-center">
            Family Recognition Quiz
          </h1>
          <p className="text-center text-white/70 mt-2">
            Who is in this photo?
          </p>
        </motion.div>

        {/* Question Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-8">
            <CardContent className="p-8">
              {/* Photo */}
              <div className="text-center mb-8">
                <motion.div
                  className="relative inline-block"
                  whileHover={{ scale: 1.02 }}
                  transition={{ duration: 0.2 }}
                >
                  <img
                    src={`http://localhost:8000${currentQuestion.image_url}`}
                    alt="Family member to identify"
                    className="w-64 h-64 md:w-80 md:h-80 object-cover rounded-lg mx-auto shadow-lg ring-2 ring-[#E02478]/20"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=400";
                    }}
                  />
                </motion.div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <AnimatePresence>
                  {currentQuestion.options.map((option, index) => {
                    const isSelected = selectedAnswer === option.id;
                    const isCorrect =
                      quizAnswer?.correct_member_id === option.id;
                    const isWrong = isSelected && !quizAnswer?.is_correct;

                    let buttonClass =
                      "w-full p-6 text-lg transition-all duration-300";
                    if (showFeedback) {
                      if (isCorrect) {
                        buttonClass +=
                          " bg-green-500 hover:bg-green-600 border-green-400";
                      } else if (isWrong) {
                        buttonClass +=
                          " bg-red-500 hover:bg-red-600 border-red-400";
                      } else {
                        buttonClass += " opacity-50";
                      }
                    } else if (isSelected) {
                      buttonClass += " ring-2 ring-[#E02478]";
                    }

                    return (
                      <motion.div
                        key={option.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant={
                            showFeedback && isCorrect ? "default" : "outline"
                          }
                          className={buttonClass}
                          onClick={() => handleAnswerSelect(option.id)}
                          disabled={isSubmitting || showFeedback}
                        >
                          <div className="flex items-center justify-center space-x-2">
                            {showFeedback && isCorrect && (
                              <CheckCircle className="h-5 w-5" />
                            )}
                            <span>{option.name}</span>
                          </div>
                        </Button>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {/* Feedback */}
              {showFeedback && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-8 text-center"
                >
                  <div
                    className={`p-4 rounded-lg ${
                      quizAnswer?.is_correct
                        ? "bg-green-500/20 border border-green-500/50"
                        : "bg-red-500/20 border border-red-500/50"
                    }`}
                  >
                    <p
                      className={`text-lg font-semibold ${
                        quizAnswer?.is_correct
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {quizAnswer?.is_correct ? "Correct!" : "Incorrect"}
                    </p>
                    {!quizAnswer?.is_correct && (
                      <p className="text-white/70 mt-2">
                        The correct answer was{" "}
                        {
                          currentQuestion.options.find(
                            (opt) => opt.id === quizAnswer?.correct_member_id
                          )?.name
                        }
                      </p>
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
