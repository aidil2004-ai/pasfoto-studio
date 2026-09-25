import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
let cachedClient = null;

async function connectToDatabase() {
  if (cachedClient) return cachedClient;
  const client = await MongoClient.connect(uri);
  cachedClient = client;
  return client;
}

export default async function handler(req, res) {
  // Atur CORS agar dapat diakses publik
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const client = await connectToDatabase();
    const db = client.db('pasfoto_db'); // sesuaikan nama database
    const statsCollection = db.collection('stats');

    // 1. GET: Ambil total jumlah penggunaan
    if (req.method === 'GET') {
      let statDoc = await statsCollection.findOne({ _id: 'usage_counter' });
      if (!statDoc) {
        // Jika belum ada dokumen, buat baru dengan nilai 0
        await statsCollection.insertOne({ _id: 'usage_counter', total_usage: 0 });
        return res.status(200).json({ status: 'success', total_usage: 0 });
      }
      return res.status(200).json({ status: 'success', total_usage: statDoc.total_usage || 0 });
    }

    // 2. POST: Tambahkan counter (+1) saat ada unduh/cetak
    if (req.method === 'POST') {
      const result = await statsCollection.findOneAndUpdate(
        { _id: 'usage_counter' },
        { $inc: { total_usage: 1 } },
        { upsert: true, returnDocument: 'after' }
      );

      const updatedUsage = result.value ? result.value.total_usage : (result.total_usage || 1);
      return res.status(200).json({ status: 'success', total_usage: updatedUsage });
    }

    return res.status(405).json({ message: 'Method Not Allowed' });
  } catch (error) {
    console.error('Stats API Error:', error);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
}
