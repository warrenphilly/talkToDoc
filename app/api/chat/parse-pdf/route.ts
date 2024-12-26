import { NextApiRequest, NextApiResponse } from 'next';
import pdf from 'pdf-parse';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const file = req.body.file; // Assuming the file is sent in the request body
    const dataBuffer = Buffer.from(file, 'base64'); // Convert base64 to Buffer
    const data = await pdf(dataBuffer);
    res.status(200).json({ text: data.text });
  } catch (error) {
    console.error('Error parsing PDF:', error);
    res.status(500).json({ error: 'Failed to parse PDF' });
  }
}
