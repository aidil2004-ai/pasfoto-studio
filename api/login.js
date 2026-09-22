const { Client } = require('pg');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  // Atur header CORS dan JSON Response
  res.setHeader('Content-Type', 'application/json');

  if (req.method !== 'POST') {
    return res.status(405).json({ status: 'error', message: 'Method Not Allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const { username, password } = body || {};

  if (!username || !password) {
    return res.status(400).json({ status: 'error', message: 'Username dan Password wajib diisi!' });
  }

  if (!process.env.DATABASE_URL) {
    return res.status(500).json({ status: 'error', message: 'DATABASE_URL belum diatur di Vercel!' });
  }

  const client = new Client({ 
    connectionString: process.env.DATABASE_URL, 
    ssl: { rejectUnauthorized: false } 
  });

  try {
    await client.connect();

    // Cari user berdasarkan username
    const result = await client.query('SELECT * FROM users WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Username tidak ditemukan!' });
    }

    const user = result.rows[0];

    // Cek password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ status: 'error', message: 'Password salah!' });
    }

    // Login sukses
    return res.status(200).json({
      status: 'success',
      message: 'Login berhasil!',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (err) {
    return res.status(500).json({ status: 'error', message: `Server Error: ${err.message}` });
  } finally {
    await client.end();
  }
};
