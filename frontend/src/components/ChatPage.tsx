import React, { useState, useEffect } from "react";
import { MessageSquare, Upload, BarChart3, Brain } from "lucide-react";
import ChatBot from "./ChatBot";
import DocumentUpload from "./DocumentUpload";
import { chatAPI } from "../services/api";

interface Document {
  id: number;
  filename: string;
  created_at: string;
  chunks_count?: number;
}

interface KnowledgeBaseStats {
  total_documents: number;
  total_text_chunks: number;
  total_conversations: number;
  knowledge_base_ready: boolean;
}

const ChatPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"chat" | "upload" | "stats">(
    "chat"
  );
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<KnowledgeBaseStats>({
    total_documents: 0,
    total_text_chunks: 0,
    total_conversations: 0,
    knowledge_base_ready: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadStats();
  }, []);

  const loadDocuments = async () => {
    try {
      const response = await chatAPI.getDocuments();
      setDocuments(response.data);
    } catch (error) {
      console.error("Failed to load documents:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await chatAPI.getKnowledgeBaseStats();
      setStats(response.data);
    } catch (error) {
      console.error("Failed to load stats:", error);
    }
  };

  const handleSendMessage = async (message: string) => {
    setIsLoading(true);
    try {
      const response = await chatAPI.sendQuestion(message);
      return response.data;
    } catch (error) {
      console.error("Failed to send message:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadDocument = async (file: File) => {
    setIsUploading(true);
    try {
      await chatAPI.uploadDocument(file);
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error("Failed to upload document:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      await chatAPI.deleteDocument(documentId);
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error("Failed to delete document:", error);
      throw error;
    }
  };

  const handleInitializeDemo = async () => {
    setIsUploading(true);
    try {
      await chatAPI.initializeDemo();
      await loadDocuments();
      await loadStats();
    } catch (error) {
      console.error("Failed to initialize demo:", error);
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageSquare },
    { id: "upload" as const, label: "Documents", icon: Upload },
    { id: "stats" as const, label: "Statistics", icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen pt-24 px-6">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex items-center justify-between py-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-[#E02478] to-purple-600 rounded-lg shadow-lg shadow-[#E02478]/30">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Life Assistant</h1>
              <p className="text-lg text-white/70">
                Your personal memory companion powered by AI
              </p>
            </div>
          </div>

          {/* Knowledge Base Status */}
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-medium text-white">
                {stats.total_documents} Document
                {stats.total_documents !== 1 ? "s" : ""}
              </div>
              <div className="text-xs text-white/70">
                {stats.total_text_chunks} chunks indexed
              </div>
            </div>
            <div
              className={`px-4 py-2 rounded-full text-xs font-medium backdrop-blur-sm ${
                stats.knowledge_base_ready
                  ? "bg-green-500/20 text-green-300 border border-green-500/30"
                  : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
              }`}
            >
              {stats.knowledge_base_ready ? "Ready" : "Setup Required"}
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg border border-white/10">
          <nav className="flex space-x-2 p-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-6 rounded-lg font-medium text-sm transition-all duration-200 ${
                    activeTab === tab.id
                      ? "bg-[#E02478] text-white shadow-lg shadow-[#E02478]/30"
                      : "text-white/70 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto">
        {activeTab === "chat" && (
          <div className="max-w-4xl mx-auto">
            {!stats.knowledge_base_ready ? (
              <div className="bg-yellow-500/20 border border-yellow-500/30 backdrop-blur-sm rounded-lg p-6 mb-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-yellow-500/20 rounded-full">
                    <Upload className="w-5 h-5 text-yellow-300" />
                  </div>
                  <div>
                    <h3 className="font-medium text-yellow-100">
                      Setup Required
                    </h3>
                    <p className="text-yellow-200 mt-1">
                      Upload some documents first to start chatting. Go to the
                      Documents tab to get started.
                    </p>
                    <button
                      onClick={() => setActiveTab("upload")}
                      className="mt-3 px-4 py-2 bg-[#E02478] text-white rounded-lg hover:bg-[#E02478]/80 transition-colors shadow-lg shadow-[#E02478]/30"
                    >
                      Upload Documents
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-[600px]">
                <ChatBot
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  className="h-full"
                />
              </div>
            )}
          </div>
        )}

        {activeTab === "upload" && (
          <div className="max-w-4xl mx-auto">
            <DocumentUpload
              documents={documents}
              onUpload={handleUploadDocument}
              onDelete={handleDeleteDocument}
              onInitializeDemo={handleInitializeDemo}
              isUploading={isUploading}
            />
          </div>
        )}

        {activeTab === "stats" && (
          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Documents */}
              <div className="bg-black/40 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">
                      Documents
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {stats.total_documents}
                    </p>
                  </div>
                  <div className="p-3 bg-[#E02478]/20 rounded-full">
                    <Upload className="w-6 h-6 text-[#E02478]" />
                  </div>
                </div>
              </div>

              {/* Text Chunks */}
              <div className="bg-black/40 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">
                      Text Chunks
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {stats.total_text_chunks}
                    </p>
                  </div>
                  <div className="p-3 bg-green-500/20 rounded-full">
                    <Brain className="w-6 h-6 text-green-400" />
                  </div>
                </div>
              </div>

              {/* Conversations */}
              <div className="bg-black/40 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">
                      Conversations
                    </p>
                    <p className="text-2xl font-bold text-white">
                      {stats.total_conversations}
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-full">
                    <MessageSquare className="w-6 h-6 text-purple-400" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div className="bg-black/40 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white/70">Status</p>
                    <p
                      className={`text-lg font-bold ${
                        stats.knowledge_base_ready
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    >
                      {stats.knowledge_base_ready ? "Ready" : "Setup Needed"}
                    </p>
                  </div>
                  <div
                    className={`p-3 rounded-full ${
                      stats.knowledge_base_ready
                        ? "bg-green-500/20"
                        : "bg-yellow-500/20"
                    }`}
                  >
                    <BarChart3
                      className={`w-6 h-6 ${
                        stats.knowledge_base_ready
                          ? "text-green-400"
                          : "text-yellow-400"
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Activity */}
            <div className="mt-8 bg-black/40 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 p-6">
              <h3 className="text-lg font-semibold text-white mb-4">
                Getting Started
              </h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stats.total_documents > 0 ? "bg-green-400" : "bg-white/30"
                    }`}
                  />
                  <span className="text-sm text-white/70">
                    Upload your first document
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stats.total_conversations > 0
                        ? "bg-green-400"
                        : "bg-white/30"
                    }`}
                  />
                  <span className="text-sm text-white/70">
                    Start your first conversation
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      stats.total_documents > 3 ? "bg-green-400" : "bg-white/30"
                    }`}
                  />
                  <span className="text-sm text-white/70">
                    Build your knowledge base (3+ documents)
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
