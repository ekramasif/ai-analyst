"use client";

import { RepoBanner } from "@/components/repo-banner";
import { useChat } from "ai/react";
import { MessageComponent } from "@/components/message";
// Import Loader2 for spinner
import { FileText, PlayIcon, PlusIcon, X, Loader2 } from "lucide-react";
import { extractCodeFromText } from "@/lib/code";
import Logo from "@/components/logo";
import { useEffect, useState, useRef } from "react"; // Added useRef
import modelsList from "@/lib/models.json";
import { LLMModelConfig, LLMModel } from "@/lib/model"; // Added LLMModel type import
import { LLMPicker } from "@/components/llm-picker";
// import { LLMSettings } from "@/components/llm-settings"; // Uncomment if you re-enable settings
import { useLocalStorage } from "usehooks-ts";
import { toUploadableFile } from "@/lib/utils";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  const exampleMessages = [
    "Person's age born in 1998 as line",
    "Analyze letters in word fibonacci",
    "Plot a chart of the last 10 years of the S&P 500",
  ];

  const [isLoading, setIsLoading] = useState(false);
  const [languageModel, setLanguageModel] = useLocalStorage<LLMModelConfig>(
    "languageModel",
    {
      model: modelsList.models[0]?.id || "gemini-2.0-flash", // Default to the first model in models.json
    }
  );

  // Ensure currentModel is always defined and defaults to the first model
  const currentModel = modelsList.models.find(
    (model): model is LLMModel => model.id === languageModel.model
  ) || modelsList.models[0]; // Fallback to the first model if not found

  useEffect(() => {
    // If the current model is not valid, reset to the first model
    if (!currentModel || currentModel.id !== languageModel.model) {
      setLanguageModel({ model: modelsList.models[0]?.id });
    }
  }, [currentModel, languageModel.model]);

  function handleLanguageModelChange(e: Partial<LLMModelConfig>) { // Allow partial updates
    setLanguageModel((prev) => ({ ...prev, ...e }));
  }

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
    setInput,
  } = useChat({
    api: "/api/chat", // Ensure API endpoint is specified if not default
    body: { // Send model/config info with every request via body hook
        model: currentModel,
        config: languageModel,
    },
    onFinish: async (message) => {
      const code = extractCodeFromText(message.content);
      if (code) {
        // Keep loading true until sandbox finishes
        // setIsLoading(true); // Already set by customSubmit

        const formData = new FormData();
        formData.append("code", code);

        // Re-read files state inside onFinish if needed, or ensure it's stable
        files.forEach(file => {
            formData.append(`file_${file.name}`, file);
        });

        try {
          const response = await fetch("/api/sandbox", {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
             throw new Error(`Sandbox API error: ${response.statusText}`);
          }

          const result = await response.json();

          // Ensure message object is extensible if needed or create a new one
          const updatedMessage = {
            ...message,
            toolInvocations: [
              {
                state: "result" as const,
                toolCallId: message.id, // Or generate a unique ID if needed
                toolName: "runCode",
                args: code,
                result,
              },
            ],
          };

          console.log("Sandbox Result:", result);
          setMessages((prev) => {
            // Find and replace the message by ID for robustness
            const index = prev.findIndex(m => m.id === message.id);
            if (index !== -1) {
                const newMessages = [...prev];
                newMessages[index] = updatedMessage;
                return newMessages;
            }
            // Fallback: append if somehow not found (shouldn't happen with onFinish)
            return [...prev, updatedMessage];
          });

        } catch (error) {
            console.error("Sandbox execution failed:", error);
            // Optionally add an error message to the chat
            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: `Error executing code: ${error instanceof Error ? error.message : String(error)}`}]);
        } finally {
            setFiles([]); // Clear files after attempt
            setIsLoading(false); // Stop loading indicator
        }

      } else {
         setIsLoading(false); // Stop loading if no code was found
      }
    },
    onError: (error) => {
        console.error("Chat API Error:", error);
        setIsLoading(false); // Ensure loading stops on error
        // Optionally display error to user in chat
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: `Error: ${error.message}`}]);
    },
    // Send files only when submitting, not via the hook's body by default
    // The customSubmit handles adding files to the request data
  });

  // Scroll to bottom effect
  useEffect(() => {
    const messagesElement = document.getElementById("messages");
    if (messagesElement) {
      messagesElement.scrollTop = messagesElement.scrollHeight;
    }
  }, [messages]);

  // File handling
  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files || [])]);
    }
     // Reset file input value so the same file can be selected again
     if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleFileRemove(fileToRemove: File) {
    setFiles((prev) => prev.filter((f) => f !== fileToRemove));
  }

  // Custom submit handler to include files and model/config
  async function customSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim() && files.length === 0) return; // Don't submit empty
    if (!currentModel) {
        // Handle case where model isn't selected or found
        console.error("No model selected or found.");
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'system', content: "Error: Please select a valid language model."}]);
        return; // Prevent submission
    }

    setIsLoading(true);

    // Prepare file data for the useChat hook's data option
    const fileData = await Promise.all(
        files.map((f) => toUploadableFile(f, { cutOff: 5 })) // Adjust cutOff as needed
    );

    // Call the useChat handleSubmit with additional data
    handleSubmit(e, {
      data: {
        files: fileData,
        model: currentModel, // Send the full model object
        config: languageModel, // Send the current config
      },
    });
     // Clear input after submission is initiated
     // useChat's handleSubmit should handle clearing the input,
     // but doing it here ensures it happens if needed.
     // setInput(''); // Re-enable if useChat doesn't clear it as expected
  }

  return (
    // Add a subtle background to the whole page
    <div className="flex flex-col min-h-screen max-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="flex justify-between items-center px-4 md:px-6 py-3 border-b border-gray-200 bg-white/90 backdrop-blur-sm sticky top-0 z-10">
        {/* Centered content */}
        <div className="flex items-center gap-3 w-full max-w-4xl mx-auto">
          <Logo className="w-7 h-7" />
          <h1 className="text-lg font-semibold text-gray-800">
             Analyst {" "} {/* Removed 'by' for cleaner look */}
            <span className="text-sm font-normal text-gray-500 hidden sm:inline">
                by{" "}
                <a
                href="https://www.linkedin.com/in/ekram-asif/"
                target="_blank"
                rel="noopener noreferrer" // Added rel for security
                className="text-orange-600 hover:text-orange-700 transition-colors"
                >
                Ekram Asif
                </a>
            </span>
          </h1>
          <div className="ml-auto"> {/* Pushes banner to the right */}
             <RepoBanner />
          </div>
        </div>
      </nav>

      {/* Message Area */}
      {/* Added more padding, especially at the bottom */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4" id="messages">
        {messages.map((m) => (
          // Ensure MessageComponent has appropriate styling internally
          <MessageComponent key={m.id} message={m} />
        ))}
         {/* Add a small spacer at the bottom */}
         <div className="h-4"></div>
      </div>

      {/* Input Area Section */}
      {/* Consistent padding, slightly darker bg for separation */}
      <div className="bg-white/80 backdrop-blur-sm border-t border-gray-200 p-4 md:px-6 md:pb-6">
        <div className="mx-auto w-full max-w-3xl flex flex-col gap-3">
          {/* Example Prompts and File Previews Row */}
          {/* Show examples only if no messages AND no files */}
          {messages.length === 0 && files.length === 0 && (
            <div className="flex gap-2 overflow-x-auto scrollbar-thin pb-2">
              {exampleMessages.map((msg) => (
                <button
                  key={msg}
                  type="button" // Good practice for buttons not submitting forms
                  className="flex-shrink-0 px-3 py-1.5 border border-gray-300 rounded-full text-sm text-gray-700 bg-white hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1"
                  onClick={() => setInput(msg)}
                  disabled={isLoading}
                >
                  {msg}
                </button>
              ))}
            </div>
          )}

          {/* File Previews - Shown if files exist */}
          {files.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <div
                  key={file.name + file.lastModified} // More robust key
                  className="flex items-center gap-1.5 pl-2 pr-1 py-1 border border-gray-300 rounded-full bg-slate-100 text-gray-800 text-sm"
                >
                  <FileText className="w-4 h-4 flex-shrink-0 text-gray-600" />
                  <span className="truncate max-w-[150px]">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleFileRemove(file)}
                    className="p-0.5 rounded-full hover:bg-red-100 text-gray-500 hover:text-red-600 disabled:opacity-50"
                    disabled={isLoading}
                    aria-label={`Remove ${file.name}`} // Accessibility
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Model Selection and Loading Indicator Row */}
          <div className="flex justify-between items-center gap-2 flex-wrap">
             <div className="flex gap-2 items-center">
                 <LLMPicker
                    // Ensure modelsList.models is correctly typed or cast if needed
                    models={modelsList.models as LLMModel[]}
                    languageModel={languageModel}
                    onLanguageModelChange={handleLanguageModelChange}
                 />
                {/* Settings - uncomment and style if needed */}
                {/*
                <LLMSettings
                    apiKeyConfigurable={!process.env.NEXT_PUBLIC_NO_API_KEY_INPUT}
                    baseURLConfigurable={!process.env.NEXT_PUBLIC_NO_BASE_URL_INPUT}
                    languageModel={languageModel}
                    onLanguageModelChange={handleLanguageModelChange}
                />
                */}
             </div>

            {/* Loading indicator - moved here for better visibility */}
            {isLoading && (
               <div className="flex items-center gap-1.5 text-sm text-gray-600">
                 <Loader2 className="w-4 h-4 animate-spin" />
                 <span>Processing...</span>
               </div>
            )}
          </div>

          {/* Input Form */}
          <form
            onSubmit={customSubmit}
            // Enhanced styling for the form container
            className={`flex items-center gap-2 border border-gray-300 rounded-xl p-1.5 pr-2 bg-white shadow-sm focus-within:ring-2 focus-within:ring-orange-400 focus-within:border-transparent transition-shadow ${isLoading ? 'opacity-70' : ''}`}
          >
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              id="multimodal"
              name="multimodal"
              accept=".txt,.csv,.json,.md,.py,.pdf,.png,.jpg,.jpeg,.webp" // Expanded accept types
              multiple={true}
              className="hidden"
              onChange={handleFileInput}
              disabled={isLoading}
            />
            {/* File Upload Button */}
            <button
              type="button"
              title="Attach files" // Tooltip
              className="p-2 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-100 focus:outline-none focus:ring-1 focus:ring-orange-400 disabled:opacity-50"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <PlusIcon className="w-5 h-5" />
            </button>
            {/* Text Input */}
            <input
              autoFocus
              required={files.length === 0} // Only require if no files are attached
              className="flex-grow px-2 py-1 outline-none border-none focus:ring-0 bg-transparent text-gray-800 placeholder-gray-400 disabled:bg-gray-100"
              value={input}
              placeholder="Enter your prompt or attach files..."
              onChange={handleInputChange}
              disabled={isLoading}
            />
            {/* Submit Button */}
            <button
              type="submit"
              title="Send message" // Tooltip
              className="p-2 rounded-lg bg-orange-500 text-white hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              disabled={isLoading || (!input.trim() && files.length === 0)} // Disable if loading or empty
            >
              {/* Show spinner when loading, otherwise play icon */}
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <PlayIcon className="w-5 h-5" /> // Use Send or ArrowUp icon if preferred
              )}
            </button>
          </form>
           {/* Optional: Small text for model info */}
           {currentModel && (
                <p className="text-xs text-gray-500 text-center mt-1">
                    Using {currentModel.name} ({currentModel.provider})
                </p>
           )}
        </div>
      </div>
    </div>
  );
}