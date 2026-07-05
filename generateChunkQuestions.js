import client from "./openaiClient.js";

function extractJson(text) {
  const cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  return JSON.parse(cleaned);
}

function buildBatchPrompt(chunk, previousQuestions, batchNumber) {
  const previousTitles = previousQuestions
    .map((q, i) => `${i + 1}. ${q.question}`)
    .slice(-120)
    .join("\n");

  return `
Tu es professeur de médecine et concepteur de QCM pour le concours du Résidanat en Algérie.

Génère exactement :
- 14 QCM
- 6 QCS

Batch numéro : ${batchNumber}/10.

Règles strictes :
- Niveau Résidanat Algérie.
- Français médical clair.
- Questions difficiles et utiles.
- Chaque question doit avoir exactement 4 propositions.
- QCM = plusieurs bonnes réponses possibles.
- QCS = une seule bonne réponse.
- Ne crée jamais une question sur l’auteur, l’université, l’hôpital, la faculté, le titre ou la pagination.
- Ne crée pas d’information absente du texte.
- Interdiction absolue de répéter une question déjà générée.
- Chaque nouvelle question doit tester une notion différente.
- Varier les angles : définition, physiopathologie, clinique, diagnostic, complications, traitement, pièges.

Questions déjà générées à éviter :
${previousTitles || "Aucune question précédente."}

Format JSON strict uniquement :

{
  "questions": [
    {
      "type": "QCM",
      "question": "...",
      "choices": ["...", "...", "...", "..."],
      "answers": [0, 2],
      "explanation": "..."
    },
    {
      "type": "QCS",
      "question": "...",
      "choices": ["...", "...", "...", "..."],
      "answers": [1],
      "explanation": "..."
    }
  ]
}

Texte médical :
${chunk}
`;
}

export async function generateChunkQuestions(chunk, previousQuestions = [], batchNumber = 1) {
  const prompt = buildBatchPrompt(chunk, previousQuestions, batchNumber);

  const response = await client.chat.completions.create({
    model: "gpt-5.5",
    messages: [
      {
        role: "user",
        content: prompt
      }
    ]
  });

  const content = response.choices[0].message.content;
  const parsed = extractJson(content);

  if (!parsed.questions || !Array.isArray(parsed.questions)) {
    throw new Error("Format JSON invalide");
  }

  return parsed.questions;
}