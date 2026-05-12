import { GoogleGenerativeAI } from '@google/generative-ai';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '4mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Image manquante' });
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `Voici une photo d'un menu de restaurant ou d'une carte.
    Extrais tous les plats, boissons, et menus avec leurs prix.
    Renvoie UNIQUEMENT le résultat STRICTEMENT au format JSON. Ne mets aucun texte avant ou après.
    Le format attendu est un tableau d'objets avec ces clés exactes :
    "name" (nom du produit), "price" (prix en nombre, ex: 12.5), "category" (catégorie du produit, ex: 'Boissons', 'Plats'), "desc" (description du plat si présente, sinon vide).`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageBase64.split(',')[1] || imageBase64,
          mimeType: mimeType
        }
      }
    ]);

    const text = result.response.text();
    // Nettoyer les backticks markdown si l'IA en renvoie
    const cleanedText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    let products = [];
    try {
      products = JSON.parse(cleanedText);
    } catch (e) {
      console.error('Erreur parsing JSON IA:', cleanedText);
      throw new Error('Format JSON invalide renvoyé par l\'IA');
    }

    res.status(200).json({ products });
  } catch (error) {
    console.error('Erreur IA:', error);
    res.status(500).json({ error: error.message });
  }
}
