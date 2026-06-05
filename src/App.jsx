import { useState, useRef } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;
const assistantSystemMessage =
  "You are a helpful Gemini-style assistant. Answer conversationally and helpfully. " +
  "When the user asks for Python code, provide only the code inside a fenced code block. " +
  "Do not include extra comments or explanatory text inside the code block itself. " +
  "You may include a brief sample input/output block after the code block, but the copied code should contain only the raw code.";

function Chatbot() {
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! I’m My Chat assistant." }
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedCode, setCopiedCode] = useState(null);
  const chatSessionRef = useRef(null);

  const copyCodeToClipboard = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      window.setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error("Copy failed", err);
    }
  };

  const renderMessageContent = (text) => {
    const codeBlockRegex = /```(?:[a-zA-Z0-9]+\n)?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
      }
      parts.push({ type: "code", content: match[1].trim() });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push({ type: "text", content: text.slice(lastIndex) });
    }

    return parts.map((part, index) => {
      if (part.type === "code") {
        const isCopied = copiedCode === part.content;
        return (
          <div key={index} className="relative rounded-3xl bg-slate-950/95 text-slate-100 p-4 overflow-x-auto border border-slate-800 shadow-[inset_0_0_0_1px_rgba(148,163,184,0.08)]">
            <button
              onClick={() => copyCodeToClipboard(part.content)}
              title={isCopied ? "Copied" : "Copy code"}
              className="absolute right-3 top-3 rounded-full bg-white/10 px-3 py-2 text-xs font-semibold text-slate-200 shadow-lg shadow-black/20 transition hover:bg-white/20"
            >
              {isCopied ? "Copied" : "📋 Copy"}
            </button>
            <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">
              {part.content}
            </pre>
          </div>
        );
      }

      return (
        <p key={index} className="whitespace-pre-wrap text-sm">
          {part.content}
        </p>
      );
    });
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    if (!genAI) {
      setErrorMessage(
        "Missing Gemini API key. Add VITE_GEMINI_API_KEY to a .env file at the project root."
      );
      return;
    }

    const newMessages = [...messages, { sender: "user", text: input }];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);
    setErrorMessage("");

    const botReply = await getGeminiResponse(input);
    setMessages([...newMessages, { sender: "bot", text: botReply }]);
    setIsTyping(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }
  };

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  const isRetryableGeminiError = (message) => {
    return /(?:503|high demand|temporarily unavailable|timeout|unavailable)/i.test(message);
  };

  const isQuotaExceededError = (message) => {
    return /quota exceeded|free_tier|limit: 0|requests per minute|request limit|generate_content_free_tier/i.test(
      message
    );
  };

  const getGeminiResponse = async (userInput) => {
    const modelsToTry = ["gemini-3.1-flash-lite", "gemini-3.1-flash", "gemini-3.1-mini"];
    let lastError;
    let quotaError = false;

    for (const modelName of modelsToTry) {
      let attempt = 0;
      const maxAttempts = 2;

      while (attempt < maxAttempts) {
        try {
          if (!chatSessionRef.current || chatSessionRef.current.model !== `models/${modelName}`) {
            const model = genAI.getGenerativeModel({
              model: modelName,
              systemInstruction: assistantSystemMessage,
              generationConfig: { temperature: 0.8 },
            });
            chatSessionRef.current = model.startChat();
          }

          const result = await chatSessionRef.current.sendMessage(userInput, {
            apiVersion: "v1beta",
          });
          return result.response.text();
        } catch (error) {
          lastError = error;
          const message =
            error instanceof Error ? error.message : "Unexpected error from Gemini.";
          console.warn(`Gemini model ${modelName} failed (attempt ${attempt + 1}):`, message);

          if (isQuotaExceededError(message)) {
            quotaError = true;
            chatSessionRef.current = null;
            console.warn(`Quota exceeded for ${modelName}, switching to next available model.`);
            break;
          }

          if (!isRetryableGeminiError(message)) {
            chatSessionRef.current = null;
            break;
          }

          attempt += 1;
          chatSessionRef.current = null;

          if (attempt >= maxAttempts) {
            console.warn(`Giving up on ${modelName} after ${maxAttempts} attempts.`);
            break;
          }

          const delay = 500 * 2 ** attempt;
          console.warn(`Retrying ${modelName} after ${delay}ms...`);
          await sleep(delay);
        }
      }
    }

    console.error("Gemini error:", lastError);
    const message =
      lastError instanceof Error
        ? lastError.message
        : "Unexpected error from Gemini.";
    const userMessage = quotaError
      ? "Quota exceeded for the selected Gemini model(s). This app is now using available flash models only. Please check your Google AI quota or billing if you need access to premium models."
      : `${message} Please try again shortly.`;
    setErrorMessage(userMessage);
    return `${userMessage}`;
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-fuchsia-500/30 blur-3xl animate-float-blur" />
        <div className="absolute right-0 top-20 h-80 w-80 rounded-full bg-cyan-400/20 blur-3xl animate-float-blur animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl animate-float-blur animation-delay-4000" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 rounded-[2rem] border border-white/10 bg-slate-900/80 p-6 shadow-[0_28px_80px_-30px_rgba(99,102,241,0.65)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.35em] text-fuchsia-300">Personal Project</p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                My Chat Assistant
              </h1>
            </div>
            <div className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-fuchsia-500 to-violet-500 px-4 py-2 text-sm font-semibold text-white shadow-xl shadow-fuchsia-500/25">
              Smooth Experience
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-3xl">
          <div className="overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/90 shadow-2xl shadow-slate-950/40 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 bg-slate-950/95 px-6 py-4">
              <div>
                <p className="text-sm text-slate-400">Live chat experience</p>
                <h2 className="mt-1 text-xl font-semibold text-white">Ask anything to my chat assistant</h2>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-100 shadow-lg shadow-slate-900/20 ring-1 ring-white/10">
                AI powered
              </div>
            </div>

            <div className="relative h-[560px] overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none" />
              <div className="h-full overflow-y-auto px-6 py-6 space-y-4">
                {errorMessage && (
                  <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-100 shadow-sm shadow-red-500/10">
                    {errorMessage}
                  </div>
                )}
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`fade-in flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`relative max-w-xl rounded-[2rem] px-5 py-4 shadow-2xl ${
                        msg.sender === "user"
                          ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-indigo-500/30 rounded-br-none"
                          : "bg-slate-900/95 text-slate-100 shadow-slate-900/40 rounded-bl-none"
                      } transition duration-300 hover:-translate-y-0.5`}
                    >
                      {renderMessageContent(msg.text)}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex items-center gap-3 rounded-3xl border border-slate-800 bg-slate-900/80 px-4 py-3 text-sm text-slate-300 shadow-inner shadow-slate-900/30">
                    <span>Bot Typing...</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-white/10 bg-slate-950/90 px-6 py-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <textarea
                  rows={3}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-grow rounded-3xl border border-slate-800 bg-slate-950/90 px-5 py-4 text-sm text-white placeholder:text-slate-500 focus:border-fuchsia-400 focus:outline-none focus:ring-2 focus:ring-fuchsia-500/20 transition-all resize-none"
                  placeholder="Type your message... Use Shift+Enter for a new line."
                />
                <button
                  onClick={handleSend}
                  className="inline-flex min-w-[120px] items-center justify-center rounded-3xl bg-gradient-to-r from-fuchsia-500 to-violet-500 px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-fuchsia-500/25 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chatbot;