"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
}

interface AIChatPanelProps {
    problemId: string;
    isLoggedIn: boolean;
}

export default function AIChatPanel({ problemId, isLoggedIn }: AIChatPanelProps) {
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load chat history when panel opens
    useEffect(() => {
        if (!open || !isLoggedIn || historyLoaded) return;

        async function loadHistory() {
            try {
                const { data } = await api.get(`/ai/chat/${problemId}`);
                setMessages(data.messages || []);
                setHistoryLoaded(true);
            } catch {
                // History not available — start fresh
                setHistoryLoaded(true);
            }
        }
        loadHistory();
    }, [open, isLoggedIn, problemId, historyLoaded]);

    // Auto-scroll on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed || loading) return;

        const userMsg: ChatMessage = {
            role: "user",
            content: trimmed,
            timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const { data } = await api.post("/ai/chat", {
                problemId,
                message: trimmed,
            });

            const aiMsg: ChatMessage = {
                role: "assistant",
                content: data.response,
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, aiMsg]);
        } catch (err: any) {
            const errorMsg: ChatMessage = {
                role: "assistant",
                content: "Sorry, I'm having trouble right now. Please try again.",
                timestamp: Date.now(),
            };
            setMessages((prev) => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    const handleClear = async () => {
        try {
            await api.delete(`/ai/chat/${problemId}`);
            setMessages([]);
        } catch {
            // Ignore
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isLoggedIn) return null;

    return (
        <>
            {/* Toggle Button */}
            <button
                onClick={() => setOpen(!open)}
                className="fixed bottom-6 right-6 z-50 h-12 w-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-900/30 hover:shadow-purple-700/50 hover:scale-105 transition-all flex items-center justify-center text-xl"
                title="AI Assistant"
            >
                {open ? "✕" : "🤖"}
            </button>

            {/* Chat Panel */}
            {open && (
                <div className="fixed bottom-20 right-6 z-50 w-[400px] h-[520px] rounded-lg border border-zinc-700 bg-zinc-900 shadow-2xl shadow-black/50 flex flex-col overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-950">
                        <div className="flex items-center gap-2">
                            <span className="text-sm">🤖</span>
                            <h3 className="text-sm font-semibold text-white">AI Assistant</h3>
                            <span className="px-1.5 py-0.5 text-[10px] rounded bg-purple-900/50 text-purple-300 font-medium">
                                Beta
                            </span>
                        </div>
                        <button
                            onClick={handleClear}
                            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                            title="Clear chat"
                        >
                            Clear
                        </button>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                        {messages.length === 0 && (
                            <div className="text-center py-8">
                                <div className="text-3xl mb-3">🤖</div>
                                <p className="text-sm text-zinc-400 mb-1">
                                    Hi! I&apos;m your AI coding assistant.
                                </p>
                                <p className="text-xs text-zinc-500">
                                    Ask me for hints, approach ideas, or help with edge cases.
                                </p>
                                <div className="mt-4 space-y-1.5">
                                    {[
                                        "What approach should I use?",
                                        "What edge cases should I consider?",
                                        "Explain the problem in simpler terms",
                                    ].map((q) => (
                                        <button
                                            key={q}
                                            onClick={() => {
                                                setInput(q);
                                            }}
                                            className="block w-full text-left text-xs text-zinc-400 hover:text-white px-3 py-2 rounded border border-zinc-800 hover:border-zinc-600 transition-colors"
                                        >
                                            {q}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${msg.role === "user"
                                            ? "bg-blue-600 text-white"
                                            : "bg-zinc-800 text-zinc-200 border border-zinc-700"
                                        }`}
                                >
                                    {msg.content}
                                </div>
                            </div>
                        ))}

                        {loading && (
                            <div className="flex justify-start">
                                <div className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-400">
                                    <span className="inline-flex gap-1">
                                        <span className="animate-bounce" style={{ animationDelay: "0ms" }}>●</span>
                                        <span className="animate-bounce" style={{ animationDelay: "150ms" }}>●</span>
                                        <span className="animate-bounce" style={{ animationDelay: "300ms" }}>●</span>
                                    </span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input */}
                    <div className="border-t border-zinc-800 px-3 py-3">
                        <div className="flex gap-2">
                            <input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about this problem..."
                                className="flex-1 rounded bg-zinc-800 border border-zinc-700 px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500 transition-colors"
                                disabled={loading}
                            />
                            <button
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                                className="rounded bg-purple-600 px-3 py-2 text-sm font-medium text-white hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            >
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
