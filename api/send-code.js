const { Client } = require('pg');
const nodemailer = require('nodemailer');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { email } = req.body;

  if (!process.env.GMAIL_USER || !process.env.GMAIL_PASS) {
    return res.status(500).json({ status: 'error', message: 'GMAIL_USER / GMAIL_PASS belum diatur di Vercel!' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Cek apakah email terdaftar di database
    const userCheck = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userCheck.rows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Email tidak terdaftar!' });
    }

    // 2. Buat kode verifikasi acak 6 huruf kapital
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }

    // 3. Simpan kode verifikasi & waktu kadaluarsa (15 menit)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await client.query(
      'UPDATE users SET reset_code = $1, code_expires = $2 WHERE email = $3',
      [code, expiresAt, email]
    );

    // 4. Konfigurasi Transporter Nodemailer (Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });

    // 5. Kirim Email
    await transporter.sendMail({
      from: `"PasFoto Studio" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: 'Kode Verifikasi Pemulihan Akun PasFoto Studio',
      html: `<div style="font-family: sans-serif; padding: 20px; color: #333;">
              <h2>Pemulihan Akun PasFoto Studio</h2>
              <p>Berikut adalah kode verifikasi Anda untuk memulihkan akun:</p>
              <h1 style="background: #f1f5f9; padding: 10px 20px; display: inline-block; letter-spacing: 4px; color: #4f46e5;">${code}</h1>
              <p>Kode ini berlaku selama 15 menit.</p>
            </div>`
    });

    res.status(200).json({ status: 'success', message: 'Kode verifikasi telah dikirim ke email Anda!' });
  } catch (err) {
    res.status(500).json({ status: 'error', message: `Gagal mengirim email: ${err.message}` });
  } finally {
    await client.end();
  }
};
