import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Settings, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const RAGChatbot = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen pt-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="mb-12 text-center"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center justify-center mb-6">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard")}
              className="mr-4"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Personal Life Assistant
          </h1>
          <p className="text-xl text-white/70">
            AI-powered chatbot to help answer your personal questions
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="text-center py-16">
            <CardHeader>
              <div className="mx-auto w-24 h-24 bg-[#E02478]/20 rounded-full flex items-center justify-center mb-6">
                <Settings className="h-12 w-12 text-[#E02478] animate-spin" />
              </div>
              <CardTitle className="text-3xl mb-4">Under Development</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-white/70 text-lg max-w-2xl mx-auto">
                Our Personal Life Assistant is currently being developed to help
                you with questions like:
              </p>

              <div className="grid md:grid-cols-2 gap-4 max-w-3xl mx-auto text-left">
                <div className="bg-white/5 rounded-lg p-4">
                  <MessageCircle className="h-6 w-6 text-[#E02478] mb-2" />
                  <p className="text-white/80">
                    "When is my daughter's birthday?"
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <MessageCircle className="h-6 w-6 text-[#E02478] mb-2" />
                  <p className="text-white/80">
                    "When do I need to take my medicine?"
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <MessageCircle className="h-6 w-6 text-[#E02478] mb-2" />
                  <p className="text-white/80">
                    "What's my doctor's appointment date?"
                  </p>
                </div>
                <div className="bg-white/5 rounded-lg p-4">
                  <MessageCircle className="h-6 w-6 text-[#E02478] mb-2" />
                  <p className="text-white/80">
                    "Tell me about my family members"
                  </p>
                </div>
              </div>

              <div className="mt-8">
                <p className="text-white/60 mb-4">
                  This feature will use advanced AI to answer your personal
                  questions using your stored information.
                </p>
                <p className="text-[#E02478] font-semibold">Coming Soon!</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};
