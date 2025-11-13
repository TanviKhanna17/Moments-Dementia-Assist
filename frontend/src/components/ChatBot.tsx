import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  AlertCircle,
  CheckCircle,
  Clock,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
} from "lucide-react";

interface ChatMessage {
  id: string;
  type: "user" | "bot";
  content: string;
  timestamp: Date;
  confidence?: number;
  sources?: number;
  highlightedWordIndex?: number;
}

interface ChatBotProps {
  onSendMessage: (message: string) => Promise<{
    response: string;
    confidence_score: number;
    sources_used: number;
  }>;
  isLoading?: boolean;
  className?: string;
}

interface SpeechSyncState {
  startTime: number;
  wordsPerSecond: number;
  totalWords: number;
  lastEstimatedIndex: number;
  lastBoundaryIndex: number;
}

const ChatBot: React.FC<ChatBotProps> = ({
  onSendMessage,
  isLoading = false,
  className = "",
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "1",
      type: "bot",
      content:
        "Hello! I'm your personal memory assistant. I'm here to help you remember important details from your life using your personal documents.\n\nI can help you with questions about:\n• Family members and relationships\n• Important dates and celebrations\n• Health information and medications\n• Work and career details\n• Where you live and daily routines\n\nWhat would you like to remember today?",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Speech recognition state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Text-to-speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(
    null
  );
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number>(-1);
  const synthesisRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const selectedVoiceRef = useRef<SpeechSynthesisVoice | null>(null);
  const boundaryEventFiredRef = useRef<boolean>(false);
  const animationFrameRef = useRef<number | null>(null);
  const speechSyncRef = useRef<SpeechSyncState | null>(null);

  const getNow = () =>
    typeof performance !== "undefined" ? performance.now() : Date.now();

  const cancelSpeechSync = () => {
    if (typeof window !== "undefined" && animationFrameRef.current !== null) {
      window.cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = null;
    speechSyncRef.current = null;
  };

  const startSpeechSync = (totalWords: number, rate: number) => {
    if (typeof window === "undefined" || totalWords <= 0) {
      return;
    }

    cancelSpeechSync();

    const baseWordsPerSecond = 3.2;
    const initialWordsPerSecond = Math.max(
      1.8,
      Math.min(baseWordsPerSecond * rate, 5.5)
    );

    const state: SpeechSyncState = {
      startTime: getNow(),
      wordsPerSecond: initialWordsPerSecond,
      totalWords,
      lastEstimatedIndex: 0,
      lastBoundaryIndex: 0,
    };

    speechSyncRef.current = state;

    const tick = () => {
      const syncState = speechSyncRef.current;
      if (!syncState) {
        return;
      }

      const elapsedSeconds = (getNow() - syncState.startTime) / 1000;
      const predictedIndex = Math.floor(
        elapsedSeconds * syncState.wordsPerSecond
      );
      const boundedIndex = Math.min(
        syncState.totalWords - 1,
        Math.max(0, predictedIndex)
      );

      if (boundedIndex > syncState.lastEstimatedIndex) {
        syncState.lastEstimatedIndex = boundedIndex;
        setHighlightedWordIndex(boundedIndex);
      }

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    animationFrameRef.current = window.requestAnimationFrame(tick);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Select the best available voice for natural-sounding speech
  const selectBestVoice = (
    voices: SpeechSynthesisVoice[]
  ): SpeechSynthesisVoice | null => {
    if (!voices || voices.length === 0) return null;

    // Priority order for voice selection (most natural-sounding first)
    const preferredKeywords = [
      "neural", // Neural voices are usually more natural
      "premium", // Premium voices
      "enhanced", // Enhanced voices
      "natural", // Natural voices
      "google", // Google voices (often high quality)
      "microsoft", // Microsoft voices
      "zira", // Windows natural voice
      "samantha", // macOS natural voice
      "karen", // macOS natural voice
      "moira", // macOS natural voice
      "susan", // macOS natural voice
    ];

    // Filter English voices
    const englishVoices = voices.filter((v) => v.lang.startsWith("en"));

    if (englishVoices.length === 0) {
      return voices[0] || null;
    }

    // Score voices based on preferred keywords
    let bestVoice: SpeechSynthesisVoice | null = null;
    let bestScore = -1;

    for (const voice of englishVoices) {
      const nameLower = voice.name.toLowerCase();
      let score = 0;

      // Check for preferred keywords (higher score for earlier keywords)
      for (let i = 0; i < preferredKeywords.length; i++) {
        if (nameLower.includes(preferredKeywords[i])) {
          score = (preferredKeywords.length - i) * 10; // Higher score for earlier keywords
          break;
        }
      }

      // Prefer cloud-based voices (usually better quality)
      if (!voice.localService) {
        score += 5;
      }

      // Prefer female voices (often sound more natural and warm)
      if (
        nameLower.includes("female") ||
        nameLower.includes("woman") ||
        nameLower.includes("samantha") ||
        nameLower.includes("karen") ||
        nameLower.includes("zira") ||
        nameLower.includes("moira") ||
        nameLower.includes("susan") ||
        nameLower.includes("aria")
      ) {
        score += 3;
      }

      // Avoid robotic-sounding voices
      if (nameLower.includes("robotic") || nameLower.includes("monotone")) {
        score -= 10;
      }

      if (score > bestScore) {
        bestScore = score;
        bestVoice = voice;
      }
    }

    // If no preferred voice found, use first English voice
    return bestVoice || englishVoices[0] || null;
  };

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        window.SpeechRecognition ||
        (
          window as unknown as {
            webkitSpeechRecognition: { new (): SpeechRecognition };
          }
        ).webkitSpeechRecognition;

      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onstart = () => {
          setIsListening(true);
        };

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = event.results[0][0].transcript;
          setInputMessage(transcript);
          setIsListening(false);
        };

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }

    // Initialize speech synthesis and select best voice
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      synthesisRef.current = window.speechSynthesis;

      // Load voices and select the best one
      const loadVoices = () => {
        const voices = synthesisRef.current?.getVoices() || [];
        selectedVoiceRef.current = selectBestVoice(voices);

        if (selectedVoiceRef.current) {
          console.log("Selected voice:", selectedVoiceRef.current.name);
        }
      };

      // Voices may not be immediately available, so we need to wait
      loadVoices();
      if (synthesisRef.current.onvoiceschanged !== undefined) {
        synthesisRef.current.onvoiceschanged = loadVoices;
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (utteranceRef.current && synthesisRef.current) {
        synthesisRef.current.cancel();
      }
      cancelSpeechSync();
    };
  }, []);

  // Start/stop speech recognition
  const toggleSpeechRecognition = () => {
    if (!recognitionRef.current) {
      alert(
        "Speech recognition is not supported in your browser. Please use Chrome or Edge."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      recognitionRef.current.start();
    }
  };

  // Speak message with word highlighting
  const speakMessage = (messageId: string, text: string) => {
    if (!synthesisRef.current) {
      alert("Text-to-speech is not supported in your browser.");
      return;
    }

    // Stop any ongoing speech
    if (isSpeaking) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      setHighlightedWordIndex(-1);
      cancelSpeechSync();
      return;
    }

    // Clean text and split into words for highlighting
    // Preserve the original text structure for accurate word matching
    const cleanText = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
    const words = cleanText.split(/\s+/).filter((word) => word.length > 0);

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // Use the selected voice if available
    if (selectedVoiceRef.current) {
      utterance.voice = selectedVoiceRef.current;
    } else {
      // Fallback: try to select a voice now (in case voices loaded late)
      const voices = synthesisRef.current?.getVoices() || [];
      const bestVoice = selectBestVoice(voices);
      if (bestVoice) {
        utterance.voice = bestVoice;
        selectedVoiceRef.current = bestVoice;
      } else {
        utterance.lang = "en-US";
      }
    }

    // Optimized parameters for natural-sounding speech
    utterance.rate = 0.95; // Slightly slower for more natural pace (0.9-1.0 is ideal)
    utterance.pitch = 1.0; // Natural pitch (1.0 is neutral)
    utterance.volume = 1.0; // Full volume

    // Track word boundaries using character positions
    // Build a character-to-word-index mapping for accurate highlighting
    const wordsForHighlighting = words;
    const charToWordMap: number[] = [];
    let charPos = 0;

    for (let i = 0; i < wordsForHighlighting.length; i++) {
      const word = wordsForHighlighting[i];
      // Map each character in this word to this word's index
      for (let j = 0; j < word.length; j++) {
        charToWordMap[charPos + j] = i;
      }
      charPos += word.length;
      // Add space after word (except last word)
      if (i < wordsForHighlighting.length - 1) {
        charToWordMap[charPos] = i; // Space belongs to current word
        charPos += 1;
      }
    }

    // Track if boundary events are firing
    boundaryEventFiredRef.current = false;

    utterance.onboundary = (event: SpeechSynthesisEvent) => {
      const charIndex =
        event.charIndex === undefined || event.charIndex === null
          ? -1
          : event.charIndex;

      if (charIndex < 0) {
        return;
      }

      // Use the pre-built mapping for fast lookup
      let wordIndex = charToWordMap[charIndex];

      // Fallback: if index is out of bounds, find closest valid word
      if (wordIndex === undefined) {
        if (charIndex >= charPos) {
          wordIndex = wordsForHighlighting.length - 1;
        } else {
          for (let i = 0; i < wordsForHighlighting.length; i++) {
            let wordStart = 0;
            for (let j = 0; j < i; j++) {
              wordStart += wordsForHighlighting[j].length + 1;
            }
            if (
              charIndex >= wordStart &&
              charIndex < wordStart + wordsForHighlighting[i].length
            ) {
              wordIndex = i;
              break;
            }
          }
          if (wordIndex === undefined) {
            if (charPos === 0) {
              wordIndex = 0;
            } else {
              wordIndex = Math.min(
                Math.floor((charIndex / charPos) * wordsForHighlighting.length),
                wordsForHighlighting.length - 1
              );
            }
          }
        }
      }

      if (
        wordIndex === undefined ||
        wordIndex < 0 ||
        wordIndex >= wordsForHighlighting.length
      ) {
        return;
      }

      boundaryEventFiredRef.current = true;

      const syncState = speechSyncRef.current;

      if (syncState) {
        const elapsedSecondsFromEvent =
          typeof event.elapsedTime === "number" &&
          !Number.isNaN(event.elapsedTime)
            ? event.elapsedTime
            : (getNow() - syncState.startTime) / 1000;

        const wordsSpoken = wordIndex + 1;

        if (elapsedSecondsFromEvent > 0 && wordsSpoken > 0) {
          const measuredWordsPerSecond = Math.max(
            1.8,
            Math.min(wordsSpoken / elapsedSecondsFromEvent, 6)
          );

          syncState.wordsPerSecond =
            syncState.wordsPerSecond * 0.6 + measuredWordsPerSecond * 0.4;
        }

        syncState.lastBoundaryIndex = Math.max(
          syncState.lastBoundaryIndex,
          wordIndex
        );
        syncState.lastEstimatedIndex = wordIndex;
      }

      setHighlightedWordIndex((prev) =>
        wordIndex === prev ? prev : wordIndex
      );
    };

    utterance.onstart = () => {
      if (wordsForHighlighting.length > 0) {
        setHighlightedWordIndex(0);
        startSpeechSync(wordsForHighlighting.length, utterance.rate);
      } else {
        setHighlightedWordIndex(-1);
        cancelSpeechSync();
      }
    };

    utterance.onend = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      setHighlightedWordIndex(-1);
      cancelSpeechSync();
    };

    utterance.onerror = () => {
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      setHighlightedWordIndex(-1);
      cancelSpeechSync();
    };

    utteranceRef.current = utterance;
    setSpeakingMessageId(messageId);
    setIsSpeaking(true);
    synthesisRef.current.speak(utterance);
  };

  // Stop speaking
  const stopSpeaking = () => {
    if (synthesisRef.current) {
      synthesisRef.current.cancel();
      setIsSpeaking(false);
      setSpeakingMessageId(null);
      setHighlightedWordIndex(-1);
      cancelSpeechSync();
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await onSendMessage(inputMessage.trim());

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content: response.response,
        timestamp: new Date(),
        confidence: response.confidence_score,
        sources: response.sources_used,
      };

      setMessages((prev) => [...prev, botMessage]);

      // Auto-play the bot's response
      setTimeout(() => {
        speakMessage(botMessage.id, response.response);
      }, 500);
    } catch {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: "bot",
        content:
          "I'm sorry, I encountered an error while processing your question. Please try again.",
        timestamp: new Date(),
        confidence: 0,
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "text-green-600";
    if (confidence >= 0.6) return "text-yellow-600";
    return "text-red-600";
  };

  const getConfidenceIcon = (confidence: number) => {
    if (confidence >= 0.8) return <CheckCircle className="w-3 h-3" />;
    if (confidence >= 0.6) return <Clock className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  return (
    <div
      className={`flex flex-col h-full bg-black/40 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 ${className}`}
    >
      {/* Chat Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-gradient-to-r from-[#E02478]/20 to-purple-600/20">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#E02478]/20 rounded-full backdrop-blur-sm">
            <Bot className="w-5 h-5 text-[#E02478]" />
          </div>
          <div>
            <h3 className="font-semibold text-white">Life Assistant</h3>
            <p className="text-sm text-white/70">
              Ask me about your personal information
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gradient-to-b from-transparent to-black/20">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex gap-3 ${
              message.type === "user" ? "justify-end" : "justify-start"
            }`}
          >
            {message.type === "bot" && (
              <div className="flex-shrink-0 p-2 bg-[#E02478]/20 backdrop-blur-sm rounded-full">
                <Bot className="w-4 h-4 text-[#E02478]" />
              </div>
            )}

            <div
              className={`max-w-[80%] ${
                message.type === "user" ? "order-2" : ""
              }`}
            >
              <div
                className={`p-3 rounded-lg ${
                  message.type === "user"
                    ? "bg-[#E02478] text-white ml-auto shadow-lg shadow-[#E02478]/30"
                    : "bg-white/10 backdrop-blur-sm text-white border border-white/20"
                }`}
              >
                {message.type === "bot" ? (
                  <div className="text-sm leading-relaxed">
                    {(() => {
                      // Split by lines for display
                      const lines = message.content.split("\n");
                      let globalWordIndex = 0;

                      return lines.map((line, lineIndex) => {
                        if (line.trim() === "") {
                          return <p key={lineIndex} className="h-2" />;
                        }

                        const lineWords = line.trim().split(/\s+/);

                        return (
                          <p key={lineIndex} className="mb-2 last:mb-0">
                            {lineWords.map((word, wordIdx) => {
                              const currentWordIndex = globalWordIndex;
                              const isHighlighted =
                                speakingMessageId === message.id &&
                                highlightedWordIndex === currentWordIndex;

                              globalWordIndex++;

                              return (
                                <span
                                  key={wordIdx}
                                  className={`transition-all duration-200 ${
                                    isHighlighted
                                      ? "bg-[#E02478]/50 text-white font-semibold px-1 rounded"
                                      : ""
                                  }`}
                                >
                                  {word}
                                  {wordIdx < lineWords.length - 1 && " "}
                                </span>
                              );
                            })}
                          </p>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="text-sm leading-relaxed">
                    {message.content.split("\n").map((line, index) => (
                      <p
                        key={index}
                        className={`${
                          line.trim() === "" ? "h-2" : "mb-2 last:mb-0"
                        }`}
                      >
                        {line.trim() || "\u00A0"}
                      </p>
                    ))}
                  </div>
                )}

                {/* TTS controls for bot messages */}
                {message.type === "bot" && (
                  <div className="mt-2 flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (speakingMessageId === message.id && isSpeaking) {
                          stopSpeaking();
                        } else {
                          speakMessage(message.id, message.content);
                        }
                      }}
                      className="p-1.5 rounded hover:bg-white/10 transition-colors"
                      title={
                        speakingMessageId === message.id && isSpeaking
                          ? "Stop speaking"
                          : "Listen"
                      }
                    >
                      {speakingMessageId === message.id && isSpeaking ? (
                        <VolumeX className="w-4 h-4 text-[#E02478]" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-white/70 hover:text-[#E02478]" />
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div
                className={`flex items-center gap-2 mt-1 text-xs text-white/60 ${
                  message.type === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <span>
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>

                {message.type === "bot" && message.confidence !== undefined && (
                  <>
                    <span>•</span>
                    <div
                      className={`flex items-center gap-1 ${getConfidenceColor(
                        message.confidence
                      )}`}
                    >
                      {getConfidenceIcon(message.confidence)}
                      <span>
                        {(message.confidence * 100).toFixed(0)}% confident
                      </span>
                    </div>
                    {message.sources && message.sources > 0 && (
                      <>
                        <span>•</span>
                        <span>
                          {message.sources} source
                          {message.sources > 1 ? "s" : ""}
                        </span>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>

            {message.type === "user" && (
              <div className="flex-shrink-0 p-2 bg-[#E02478] rounded-full order-3 shadow-lg shadow-[#E02478]/30">
                <User className="w-4 h-4 text-white" />
              </div>
            )}
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex gap-3 justify-start">
            <div className="flex-shrink-0 p-2 bg-[#E02478]/20 backdrop-blur-sm rounded-full">
              <Bot className="w-4 h-4 text-[#E02478]" />
            </div>
            <div className="bg-white/10 backdrop-blur-sm text-white p-3 rounded-lg border border-white/20">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#E02478] rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-[#E02478] rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-[#E02478] rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your life..."
              className="w-full p-3 pr-12 border border-white/20 bg-black/20 backdrop-blur-sm rounded-lg resize-none focus:ring-2 focus:ring-[#E02478] focus:border-transparent text-white placeholder-white/50"
              rows={1}
              disabled={isLoading || isListening}
              style={{ minHeight: "44px", maxHeight: "120px" }}
            />
            {isListening && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
            )}
          </div>
          <button
            onClick={toggleSpeechRecognition}
            disabled={isLoading}
            className={`px-4 py-2 rounded-lg transition-all duration-200 ${
              isListening
                ? "bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/30"
                : "bg-white/10 text-white hover:bg-white/20 border border-white/20"
            }`}
            title={isListening ? "Stop listening" : "Start voice input"}
          >
            {isListening ? (
              <MicOff className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading || isListening}
            className="px-4 py-2 bg-[#E02478] text-white rounded-lg hover:bg-[#E02478]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-[#E02478]/30"
          >
            <Send className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-2 text-xs text-white/50 text-center">
          Ask questions like "When is my daughter's birthday?" or "What
          medication do I take?"
        </div>
      </div>
    </div>
  );
};

export default ChatBot;
