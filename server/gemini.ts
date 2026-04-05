import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Analyzes student content (text, image, audio) and generates adapted educational response
 * Respects student preferences and prohibited themes
 */
export async function analyzeStudentContent({
  content,
  imageUrl,
  audioTranscription,
  studentPreferences,
  prohibitedThemes,
  readingLevel,
  writingLevel,
  series,
  personaName,
  subject,
  enemEnabled,
}: {
  content?: string;
  imageUrl?: string;
  audioTranscription?: string;
  studentPreferences: {
    favoriteMovies?: string;
    favoriteMusic?: string;
    favoriteSports?: string;
    favoriteFoods?: string;
    favoriteAnimations?: string;
    otherInterests?: string;
  };
  prohibitedThemes: string[];
  readingLevel: "non_reader" | "reads_with_difficulty" | "reads_well";
  writingLevel: "non_writer" | "writes_with_difficulty" | "writes_well";
  series: "1º_ano" | "2º_ano" | "3º_ano";
  personaName: string;
  subject: string;
  enemEnabled: boolean;
}): Promise<{
  introduction: string;
  summary: string;
  glossary: Array<{ term: string; definition: string }>;
  questions: string[];
  enemQuestion?: string;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  // Build the prompt with student context
  const systemPrompt = `Você é ${personaName}, um tutor educacional inclusivo especializado em adaptar conteúdo para alunos com TEA, TDAH e deficiência intelectual.

REGRAS IMPORTANTES:
1. NUNCA use estes temas: ${prohibitedThemes.join(", ")}
2. NUNCA opine sobre: sexualidade, religião, política ou outros temas sensíveis
3. NUNCA use palavras de baixo escalão ou violência
4. Adapte o conteúdo para o nível de leitura: ${readingLevel}
5. Adapte o conteúdo para o nível de escrita: ${writingLevel}
6. Use exemplos das preferências do aluno: ${Object.values(studentPreferences).filter(Boolean).join(", ")}
7. Série do aluno: ${series}
8. Matéria: ${subject}

ESTRUTURA DA RESPOSTA (JSON):
{
  "introduction": "Introdução divertida e interessante que prepare o aluno para o conteúdo (máx 100 palavras)",
  "summary": "Resumo adaptado ao nível de leitura (máx 200 palavras)",
  "glossary": [
    { "term": "palavra difícil", "definition": "explicação simples" }
  ],
  "questions": [
    "Pergunta 1 sobre o conteúdo",
    "Pergunta 2 sobre o conteúdo",
    "Pergunta 3 sobre o conteúdo"
  ]
  ${enemEnabled ? ', "enemQuestion": "Questão estilo ENEM sobre o tema"' : ""}
}

Responda APENAS com JSON válido, sem markdown ou explicações adicionais.`;

  let userContent = content || "";

  if (audioTranscription) {
    userContent += `\n\nTranscrição de áudio: ${audioTranscription}`;
  }

  const parts: any[] = [
    {
      text: userContent,
    },
  ];

  if (imageUrl) {
    parts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageUrl.split(",")[1] || imageUrl,
      },
    });
  }

  const response = await model.generateContent({
    contents: [
      {
        role: "user",
        parts,
      },
    ],
    systemInstruction: systemPrompt,
  });

  const responseText = response.response.text();

  try {
    const parsed = JSON.parse(responseText);
    return {
      introduction: parsed.introduction || "",
      summary: parsed.summary || "",
      glossary: parsed.glossary || [],
      questions: parsed.questions || [],
      enemQuestion: parsed.enemQuestion,
    };
  } catch {
    console.error("Failed to parse Gemini response:", responseText);
    throw new Error("Failed to parse AI response");
  }
}

/**
 * Checks if student response demonstrates comprehension
 */
export async function checkComprehension({
  originalContent,
  studentResponse,
  questions,
  personaName,
}: {
  originalContent: string;
  studentResponse: string;
  questions: string[];
  personaName: string;
}): Promise<{
  isComprehended: boolean;
  score: number;
  feedback: string;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  const prompt = `Você é ${personaName}, um tutor educacional.

Conteúdo original: ${originalContent}

Perguntas feitas: ${questions.join("\n")}

Resposta do aluno: ${studentResponse}

Analise se o aluno compreendeu o conteúdo. Retorne um JSON com:
{
  "isComprehended": true/false,
  "score": 0.0 a 1.0,
  "feedback": "Mensagem encorajadora para o aluno"
}

Responda APENAS com JSON válido.`;

  const response = await model.generateContent(prompt);
  const responseText = response.response.text();

  try {
    const parsed = JSON.parse(responseText);
    return {
      isComprehended: parsed.isComprehended || false,
      score: parsed.score || 0,
      feedback: parsed.feedback || "Ótimo trabalho!",
    };
  } catch {
    console.error("Failed to parse comprehension response:", responseText);
    throw new Error("Failed to parse comprehension check");
  }
}

/**
 * Checks if content is appropriate using Gemini's safety features
 */
export async function checkContentSafety(imageUrl: string): Promise<{
  isSafe: boolean;
  violationType?: string;
  confidence: number;
}> {
  const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  try {
    const response = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Analise esta imagem e identifique se contém conteúdo inapropriado (nudez, pornografia, violência). Retorne JSON: {\"isSafe\": true/false, \"violationType\": \"tipo\" ou null, \"confidence\": 0-1}",
            },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: imageUrl.split(",")[1] || imageUrl,
              },
            },
          ],
        },
      ],
    });

    const responseText = response.response.text();
    const parsed = JSON.parse(responseText);

    return {
      isSafe: parsed.isSafe !== false,
      violationType: parsed.violationType,
      confidence: parsed.confidence || 0.5,
    };
  } catch (error) {
    console.error("Content safety check failed:", error);
    // Default to safe if check fails
    return { isSafe: true, confidence: 0 };
  }
}
