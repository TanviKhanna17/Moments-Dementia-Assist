import { motion } from "framer-motion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  Settings,
  Clock,
  Hash,
  Users,
  Activity,
  Calendar,
  Heart,
  BookOpen,
  Play,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface QuizSetupData {
  sessionName: string;
  totalQuestions: number;
  questionTimer: number;
  questionTypes: string[];
}

interface QuizSetupProps {
  onStartQuiz: (setupData: QuizSetupData) => void;
}

const questionTypeOptions = [
  {
    id: "people",
    label: "People & Relationships",
    icon: Users,
    color: "text-blue-400",
  },
  {
    id: "activities",
    label: "Activities & Hobbies",
    icon: Activity,
    color: "text-green-400",
  },
  {
    id: "health",
    label: "Health & Medical",
    icon: Heart,
    color: "text-red-400",
  },
  {
    id: "dates",
    label: "Dates & Appointments",
    icon: Calendar,
    color: "text-purple-400",
  },
  {
    id: "general",
    label: "General Information",
    icon: BookOpen,
    color: "text-orange-400",
  },
];

export const QuizSetup = ({ onStartQuiz }: QuizSetupProps) => {
  const navigate = useNavigate();
  const [setupData, setSetupData] = useState<QuizSetupData>({
    sessionName: "",
    totalQuestions: 10,
    questionTimer: 30,
    questionTypes: [],
  });

  const handleQuestionTypeToggle = (typeId: string) => {
    setSetupData((prev) => ({
      ...prev,
      questionTypes: prev.questionTypes.includes(typeId)
        ? prev.questionTypes.filter((t) => t !== typeId)
        : [...prev.questionTypes, typeId],
    }));
  };

  const handleStartQuiz = () => {
    if (setupData.totalQuestions < 1 || setupData.totalQuestions > 15) {
      alert("Please select between 1 and 15 questions");
      return;
    }

    if (setupData.questionTimer < 10 || setupData.questionTimer > 60) {
      alert("Please select a timer between 10 and 60 seconds");
      return;
    }

    onStartQuiz(setupData);
  };

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
            onClick={() => navigate("/dashboard")}
            className="mb-6"
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <Settings className="h-10 w-10 text-[#E02478]" />
              <h1 className="text-3xl md:text-4xl font-bold">Quiz Setup</h1>
            </div>
            <p className="text-white/70">
              Customize your document-based memory quiz session
            </p>
          </div>
        </motion.div>

        {/* Setup Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-center text-2xl">
                Session Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Session Name */}
              <div className="space-y-2">
                <Label htmlFor="sessionName" className="text-lg font-medium">
                  Session Name (Optional)
                </Label>
                <Input
                  id="sessionName"
                  placeholder="e.g., Morning Memory Practice"
                  value={setupData.sessionName}
                  onChange={(e) =>
                    setSetupData((prev) => ({
                      ...prev,
                      sessionName: e.target.value,
                    }))
                  }
                  className="text-lg p-4"
                />
                <p className="text-sm text-white/60">
                  Give this quiz session a memorable name for tracking progress
                </p>
              </div>

              {/* Number of Questions */}
              <div className="space-y-4">
                <Label className="text-lg font-medium flex items-center space-x-2">
                  <Hash className="h-5 w-5" />
                  <span>Number of Questions</span>
                </Label>
                <div className="flex items-center space-x-4">
                  <Input
                    type="number"
                    min="1"
                    max="15"
                    value={setupData.totalQuestions}
                    onChange={(e) =>
                      setSetupData((prev) => ({
                        ...prev,
                        totalQuestions: Math.min(
                          15,
                          Math.max(1, parseInt(e.target.value) || 1)
                        ),
                      }))
                    }
                    className="w-24 text-lg text-center"
                  />
                  <span className="text-white/70">questions (1-15 max)</span>
                </div>
                <div className="flex space-x-2">
                  {[5, 10, 15].map((num) => (
                    <Button
                      key={num}
                      variant={
                        setupData.totalQuestions === num ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setSetupData((prev) => ({
                          ...prev,
                          totalQuestions: num,
                        }))
                      }
                    >
                      {num}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Timer per Question */}
              <div className="space-y-4">
                <Label className="text-lg font-medium flex items-center space-x-2">
                  <Clock className="h-5 w-5" />
                  <span>Timer per Question</span>
                </Label>
                <div className="flex items-center space-x-4">
                  <Input
                    type="number"
                    min="10"
                    max="60"
                    value={setupData.questionTimer}
                    onChange={(e) =>
                      setSetupData((prev) => ({
                        ...prev,
                        questionTimer: Math.min(
                          60,
                          Math.max(10, parseInt(e.target.value) || 30)
                        ),
                      }))
                    }
                    className="w-24 text-lg text-center"
                  />
                  <span className="text-white/70">seconds (10-60 range)</span>
                </div>
                <div className="flex space-x-2">
                  {[15, 30, 45, 60].map((time) => (
                    <Button
                      key={time}
                      variant={
                        setupData.questionTimer === time ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setSetupData((prev) => ({
                          ...prev,
                          questionTimer: time,
                        }))
                      }
                    >
                      {time}s
                    </Button>
                  ))}
                </div>
              </div>

              {/* Question Types */}
              <div className="space-y-4">
                <Label className="text-lg font-medium">
                  Question Focus Areas (Optional)
                </Label>
                <p className="text-sm text-white/60 mb-4">
                  Select specific areas to focus on, or leave blank for random
                  questions
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {questionTypeOptions.map((type) => {
                    const Icon = type.icon;
                    const isSelected = setupData.questionTypes.includes(
                      type.id
                    );

                    return (
                      <motion.div
                        key={type.id}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <Button
                          variant={isSelected ? "default" : "outline"}
                          className={`w-full p-4 h-auto justify-start space-x-3 ${
                            isSelected
                              ? "bg-[#E02478] hover:bg-[#E02478]/80"
                              : ""
                          }`}
                          onClick={() => handleQuestionTypeToggle(type.id)}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isSelected ? "text-white" : type.color
                            }`}
                          />
                          <div className="text-left">
                            <div className="font-medium">{type.label}</div>
                          </div>
                        </Button>
                      </motion.div>
                    );
                  })}
                </div>
                <p className="text-xs text-white/50">
                  {setupData.questionTypes.length === 0
                    ? "All question types will be included randomly"
                    : `Selected: ${setupData.questionTypes.length} focus area(s)`}
                </p>
              </div>

              {/* Summary & Start Button */}
              <div className="bg-white/5 p-6 rounded-lg border border-white/10">
                <h3 className="text-lg font-semibold mb-4">Session Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#E02478]">
                      {setupData.totalQuestions}
                    </div>
                    <div className="text-sm text-white/70">Questions</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#E02478]">
                      {setupData.questionTimer}s
                    </div>
                    <div className="text-sm text-white/70">Per Question</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-[#E02478]">
                      ~
                      {Math.ceil(
                        (setupData.totalQuestions * setupData.questionTimer) /
                          60
                      )}
                    </div>
                    <div className="text-sm text-white/70">Minutes Total</div>
                  </div>
                </div>

                <Button
                  onClick={handleStartQuiz}
                  size="lg"
                  className="w-full bg-[#E02478] hover:bg-[#E02478]/80 text-lg py-4"
                >
                  <Play className="mr-2 h-6 w-6" />
                  Start Quiz Session
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
