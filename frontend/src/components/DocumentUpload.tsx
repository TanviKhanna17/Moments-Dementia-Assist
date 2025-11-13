import React, { useState, useRef } from "react";
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
} from "lucide-react";

interface Document {
  id: number;
  filename: string;
  created_at: string;
  chunks_count?: number;
}

interface DocumentUploadProps {
  documents: Document[];
  onUpload: (file: File) => Promise<void>;
  onDelete: (documentId: number) => Promise<void>;
  onInitializeDemo: () => Promise<void>;
  isUploading?: boolean;
  className?: string;
}

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  documents,
  onUpload,
  onDelete,
  onInitializeDemo,
  isUploading = false,
  className = "",
}) => {
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find((file) => file.type === "application/pdf");

    if (pdfFile) {
      handleFileUpload(pdfFile);
    } else {
      setUploadStatus("error");
      setUploadMessage("Please upload a PDF file");
      setTimeout(() => setUploadStatus("idle"), 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadStatus("idle");
      await onUpload(file);
      setUploadStatus("success");
      setUploadMessage(`Successfully uploaded: ${file.name}`);
      setTimeout(() => setUploadStatus("idle"), 3000);

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage("Failed to upload file. Please try again.");
      setTimeout(() => setUploadStatus("idle"), 3000);
    }
  };

  const handleDeleteDocument = async (doc: Document) => {
    if (window.confirm(`Are you sure you want to delete "${doc.filename}"?`)) {
      try {
        await onDelete(doc.id);
      } catch (error) {
        setUploadStatus("error");
        setUploadMessage("Failed to delete document. Please try again.");
        setTimeout(() => setUploadStatus("idle"), 3000);
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Upload Area */}
      <div className="bg-black/40 backdrop-blur-sm rounded-lg shadow-xl border border-white/10 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">
          Upload Documents
        </h3>

        {/* Status Message */}
        {uploadStatus !== "idle" && (
          <div
            className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
              uploadStatus === "success"
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-red-50 text-red-700 border border-red-200"
            }`}
          >
            {uploadStatus === "success" ? (
              <CheckCircle className="w-4 h-4" />
            ) : (
              <AlertCircle className="w-4 h-4" />
            )}
            <span className="text-sm">{uploadMessage}</span>
          </div>
        )}

        {/* Drop Zone */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragOver
              ? "border-[#E02478] bg-[#E02478]/10"
              : "border-white/30 hover:border-white/50"
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            className="hidden"
          />

          <Upload
            className={`w-12 h-12 mx-auto mb-4 ${
              dragOver ? "text-[#E02478]" : "text-white/60"
            }`}
          />

          <h4 className="text-lg font-medium text-white mb-2">
            Drop your PDF files here
          </h4>
          <p className="text-white/70 mb-4">or click to browse your files</p>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-4 py-2 bg-[#E02478] text-white rounded-lg hover:bg-[#E02478]/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-[#E02478]/30"
          >
            {isUploading ? "Uploading..." : "Choose File"}
          </button>

          <p className="text-xs text-white/50 mt-2">
            Supported formats: PDF (max 10MB)
          </p>
        </div>

        {/* Demo Data Button */}
        <div className="mt-4 pt-4 border-t border-white/10">
          <button
            onClick={onInitializeDemo}
            disabled={isUploading}
            className="w-full px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
          >
            Load Demo Documents (John Miller's Diary)
          </button>
          <p className="text-xs text-white/50 mt-1 text-center">
            This will load sample caretaker diary documents for testing
          </p>
        </div>
      </div>

      {/* Documents List */}
      <div className="bg-black/40 backdrop-blur-sm rounded-lg shadow-xl border border-white/10">
        <div className="p-4 border-b border-white/10">
          <h4 className="font-semibold text-white">Your Documents</h4>
          <p className="text-sm text-white/70">
            {documents.length} document{documents.length !== 1 ? "s" : ""}{" "}
            uploaded
          </p>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 text-center text-white/60">
            <FileText className="w-12 h-12 mx-auto mb-4 text-white/30" />
            <p>No documents uploaded yet</p>
            <p className="text-sm">
              Upload PDFs to start building your knowledge base
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/10">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="p-4 hover:bg-white/5 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="w-5 h-5 text-[#E02478] mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-white truncate">
                        {doc.filename}
                      </h5>
                      <div className="flex items-center gap-4 mt-1 text-xs text-white/60">
                        <span>Uploaded {formatDate(doc.created_at)}</span>
                        {doc.chunks_count && (
                          <span>{doc.chunks_count} text chunks</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDocument(doc)}
                    className="p-2 text-white/40 hover:text-red-400 transition-colors"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentUpload;
