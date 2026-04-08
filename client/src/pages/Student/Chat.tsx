import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast as sonnerToast } from "sonner";
import { 
  Send, 
  Camera, 
  Image as ImageIcon, 
  Mic, 
  Sparkles, 
  Bot, 
  User,
  Loader2,
  BookOpen,
  HelpCircle,
} from "lucide-react";

type ContentType = "text" | "image" | "audio";

// ✅ FRASES "EM BREVE" CRIATIVAS
const emBreveFrases = [
  "🔧 O PAI tá trabalhando nisso...",
  "😄 Pai tá ON, mas essa função ainda tá OFF!",
  "🧪 Em breve! Estamos testando...",
  "📚 Calma aí! O PAI ainda está aprendendo a lidar com arquivos...",
  "🚀 Funcionalidade em desenvolvimento!"
];

// ✅ FRASES DE "PENSANDO"
const thinkingPhrases = [
  { text: "🤔 Deixa eu pensar nisso...", emoji: "🤔" },
  { text: "🧠 Ligando meus neurônios...", emoji: "🧠" },
  { text: "🔍 Analisando com carinho...", emoji: "🔍" },
  { text: "✨ Preparando uma resposta especial...", emoji: "✨" },
  { text: "🎨 Pintando ideias...", emoji: "🎨" },
  { text: "🚀 Decolando para o conhecimento...", emoji: "🚀" },
  { text: "🌟 Buscando a melhor explicação...", emoji: "🌟" },
  { text: "🎯 Mirando na resposta perfeita...", emoji: "🎯" },
  { text: "💡 Acendendo a lâmpada...", emoji: "💡" },
  { text: "🎭 Ensaiando a explicação...", emoji: "🎭" }
];

export default function StudentChat() {
  const [messages, setMessages] = useState<Array<{
    id?: number;
    role: "user" | "ai";
    content: string;
    contentType: ContentType;
    imageUrl?: string;
    audioUrl?: string;
  }>>([]);
  
  const [inputText, setInputText] = useState("");
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const [thinkingPhrase, setThinkingPhrase] = useState<{text: string, emoji: string} | null>(null);
  const [personaName] = useState("Prof. Guilherme"); // Valor padrão por enquanto
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Buscar histórico
  const { data: history, isLoading: isLoadingHistory } = trpc.chat.getHistory.useQuery();

  // Buscar dados do usuário
  const { data: userData } = trpc.auth.me.useQuery();

  const getRandomPhrase = () => {
    const index = Math.floor(Math.random() * thinkingPhrases.length);
    return thinkingPhrases[index];
  };

  // Enviar mensagem
  const { mutate: sendMessage, isPending: isSending } = trpc.chat.sendMessage.useMutation({
    onMutate: () => {
      setThinkingPhrase(getRandomPhrase());
    },
    onSuccess: (response) => {
      setThinkingPhrase(null);
      
      if (response.response) {
        setMessages((prev) => [
          ...prev,
          {
            role: "ai",
            content: JSON.stringify(response.response),
            contentType: "text",
          },
        ]);
      }
      
      setInputText("");
    },
    onError: (error) => {
      setThinkingPhrase(null);
      
      if (error.message?.includes("não pode ser discutido") || error.message?.includes("bloqueada")) {
        sonnerToast.error("Ops!", { description: error.message });
      } else {
        sonnerToast.error("Erro ao enviar mensagem", {
          description: "Tente novamente em alguns instantes",
        });
      }
    },
  });

  // Carregar histórico
  useEffect(() => {
    if (history && history.length > 0) {
      const formattedMessages = history.map((msg: any) => ({
        id: msg.id,
        role: (msg.messageType === "student_input" ? "user" : "ai") as "user" | "ai",
        content: msg.content || "",
        contentType: msg.contentType as ContentType,
        imageUrl: msg.imageUrl,
        audioUrl: msg.audioUrl,
      }));
      setMessages(formattedMessages.reverse());
    }
  }, [history]);

  // Scroll automático
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinkingPhrase]);

  // ✅ FUNÇÃO PARA RENDERIZAR RESPOSTA DA IA FORMATADA
  const renderAIResponse = (content: string) => {
    try {
      const data = JSON.parse(content);
      
      return (
        <div className="space-y-3">
          {data.introduction && (
            <p className="font-medium text-indigo-900 text-sm">
              {data.introduction}
            </p>
          )}
          
          {data.summary && (
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {data.summary}
            </div>
          )}
          
          {data.glossary && data.glossary.length > 0 && (
            <div className="bg-indigo-50 rounded-lg p-3 mt-2 border border-indigo-100">
              <p className="text-xs font-semibold text-indigo-700 mb-2 flex items-center gap-1">
                <BookOpen className="w-3 h-3" /> Palavras importantes:
              </p>
              <ul className="space-y-1">
                {data.glossary.map((item: any, idx: number) => (
                  <li key={idx} className="text-xs">
                    <span className="font-medium text-indigo-800">{item.term}:</span>{" "}
                    <span className="text-gray-600">{item.definition}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {data.questions && data.questions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200">
              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                <HelpCircle className="w-3 h-3" /> Para pensar:
              </p>
              <ul className="space-y-2">
                {data.questions.map((q: any, idx: number) => (
                  <li key={idx} className="text-xs text-gray-600 flex gap-2">
                    <span className="font-medium text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                      {idx + 1}
                    </span>
                    <span>{typeof q === 'string' ? q : q.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      );
    } catch {
      return <p className="text-sm whitespace-pre-wrap">{content}</p>;
    }
  };

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMessage = {
      role: "user" as const,
      content: inputText,
      contentType: "text" as ContentType,
    };
    
    setMessages((prev) => [...prev, userMessage]);

    sendMessage({
      contentType: "text",
      content: inputText,
    });
  };

  const handleFileClick = () => {
    const frase = emBreveFrases[Math.floor(Math.random() * emBreveFrases.length)];
    sonnerToast.info("📎 Em breve!", { description: frase });
  };

  const handleAudioRecord = () => {
    const frase = emBreveFrases[Math.floor(Math.random() * emBreveFrases.length)];
    sonnerToast.info("🎤 Áudio", { description: frase });
  };

  const studentName = userData?.name?.split(" ")[0] || "Aluno";
  
  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {/* Header */}
      <div className="bg-indigo-700 text-white p-6 shadow-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">{personaName}</h1>
              <p className="text-indigo-200 text-sm">
                Pergunte sobre qualquer assunto escolar
              </p>
            </div>
          </div>
          <Badge className="bg-white/20 text-white border-white/30">
            <Sparkles className="w-3 h-3 mr-1" /> IA Ativa
          </Badge>
        </div>
      </div>

      {/* Área de Mensagens */}
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        <Card className="shadow-lg border-indigo-50 min-h-[60vh]">
          <CardContent className="p-6">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-40">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-10 h-10 text-indigo-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">
                  Olá, {studentName}!
                </h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Sou o {personaName}. Posso te ajudar com qualquer assunto escolar. 
                  Envie uma mensagem e vamos aprender juntos!
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`flex ${
                      msg.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.role === "user"
                          ? "bg-indigo-600 text-white"
                          : "bg-white border border-gray-200 text-gray-800 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        {msg.role === "ai" ? (
                          <>
                            <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center">
                              <Bot className="w-3 h-3 text-indigo-600" />
                            </div>
                            <span className="text-xs font-medium text-indigo-700">
                              {personaName}
                            </span>
                          </>
                        ) : (
                          <>
                            <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                              <User className="w-3 h-3 text-white" />
                            </div>
                            <span className="text-xs font-medium text-white/80">
                              Você
                            </span>
                          </>
                        )}
                      </div>

                      {msg.content && (
                        msg.role === "ai" 
                          ? renderAIResponse(msg.content)
                          : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                
                {isSending && thinkingPhrase && (
                  <div className="flex justify-start">
                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-2xl px-4 py-3 max-w-xs animate-pulse">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl animate-bounce">{thinkingPhrase.emoji}</span>
                        <div>
                          <p className="text-sm font-medium text-indigo-800">
                            {thinkingPhrase.text}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse" />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-75" />
                            <div className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-pulse delay-150" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg z-20">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSendText} className="flex items-end gap-2">
            <div className="flex gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 opacity-50"
                onClick={handleFileClick}
                title="Em breve!"
              >
                <ImageIcon className="w-5 h-5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 opacity-50"
                onClick={handleFileClick}
                title="Em breve!"
              >
                <Camera className="w-5 h-5" />
              </Button>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-indigo-600 hover:bg-indigo-50"
                onClick={handleAudioRecord}
              >
                <Mic className="w-5 h-5" />
              </Button>
            </div>

            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={isSending}
              className="flex-1 text-base min-h-[44px]"
            />

            <Button
              type="submit"
              disabled={isSending || !inputText.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 px-4"
            >
              {isSending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}