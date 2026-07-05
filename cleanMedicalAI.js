import client from "./openaiClient.js";

export async function cleanMedicalAI(rawText) {
  const prompt = `
Tu es un expert en nettoyage de documents médicaux.

Nettoie le texte suivant.

Supprime complètement :
- noms des professeurs
- auteurs
- universités
- facultés
- hôpitaux
- établissements
- titres décoratifs
- numéros de pages
- sommaires
- références bibliographiques
- remerciements
- répétitions
- texte non médical

Garde uniquement :
- définitions
- physiopathologie
- étiologies
- facteurs de risque
- signes cliniques
- diagnostic
- examens complémentaires
- classifications
- complications
- traitement
- indications
- contre-indications

Réponds uniquement par le texte médical nettoyé, sans commentaire.

TEXTE BRUT :
${rawText}
`;

  const response = await client.chat.completions.create({
    model: "gpt-5.5",
    messages: [
      { role: "user", content: prompt }
    ]
  });

  return response.choices[0].message.content.trim();
}