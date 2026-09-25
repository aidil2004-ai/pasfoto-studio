// Variabel penyimpan total unduhan sementara di server
let totalUsage = 12; // Kamu bisa menentukan angka awal di sini (misal: 12)

export default function handler(req, res) {
  // Atur Header CORS agar dapat diakses dari domain Vercel mana saja
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 1. Jika browser meminta data angka terbaru (GET)
  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'success',
      total_usage: totalUsage
    });
  }

  // 2. Jika tombol unduh/cetak diklik (POST) -> Angka otomatis +1
  if (req.method === 'POST') {
    totalUsage += 1;
    return res.status(200).json({
      status: 'success',
      total_usage: totalUsage
    });
  }

  return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
}
