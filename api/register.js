const { Client } = require('pg');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  
  const { email, username, password } = req.body;

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ status: 'error', message: 'DATABASE_URL belum diatur di Vercel!' });
  }

  const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });
  
  try {
    await client.connect();
    
    // Cek ketersediaan email atau username
    const checkUser = await client.query('SELECT * FROM users WHERE email = $1 OR username = $2', [email, username]);
    if (checkUser.rows.length > 0) {
      const existing = checkUser.rows[0];
      if (existing.email === email) {
        return res.status(400).json({ status: 'error', message: 'Email sudah terdaftar!' });
      }
      if (existing.username === username) {
        return res.status(400).json({ status: 'error', message: 'Username sudah terdaftar!' });
      }
    }

    // Hash password & simpan data baru
    const hashedPassword = await bcrypt.hash(password, 10);
    await client.query('INSERT INTO users (email, username, password) VALUES ($1, $2, $3)', [email, username, hashedPassword]);
    
    res.status(200).json({ status: 'success', message: 'Registrasi berhasil!' });
  } catch (err) {
    // Menampilkan pesan error asli jika koneksi/query gagal
    res.status(500).json({ status: 'error', message: `Database Error: ${err.message}` });
  } finally {
    await client.end();
  }
};
