import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export default function StudentChat() {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [inputText, setInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { mutate: sendMessage, isPending } = trpc.chat.sendMessage.useMutation({
    onSuccess: (response: any) => {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: inputText },
        { role: "ai", content: response.content || "Resposta da IA" },
      ]);
      setInputText("");
    },
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    sendMessage({
      content: inputText,
      contentType: "text",
    });
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <div className="bg-blue-500 text-white p-4 sticky top-0">
        <h1 className="text-xl font-bold">💙 PAI - Seu Tutor Pessoal</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p>Olá! Sou seu tutor pessoal. Como posso te ajudar hoje?</p>
          </div>
        )}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card
              className={`max-w-xs px-4 py-3 rounded-lg ${
                msg.role === "user"
                  ? "bg-blue-500 text-white"
                  : "bg-gray-100 text-black"
              }`}
            >
              {msg.content}
            </Card>
          </div>
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
        <Input
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Envie uma mensagem..."
          disabled={isPending}
          className="text-base"
        />
        <Button type="submit" disabled={isPending} className="bg-blue-500 hover:bg-blue-600">
          {isPending ? "..." : "Enviar"}
        </Button>
      </form>
    </div>
  );
}
