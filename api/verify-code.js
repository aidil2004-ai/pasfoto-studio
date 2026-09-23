const { Client } = require('pg');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');

  const { email, code, type, new_password } = req.body;

  if (!email || !code || !type) {
    return res.status(400).json({ status: 'error', message: 'Data tidak lengkap!' });
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();

    // 1. Cari user berdasarkan email
    const userResult = await client.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(400).json({ status: 'error', message: 'Email tidak ditemukan!' });
    }

    const user = userResult.rows[0];

    // 2. Cek kesesuaian kode & tanggal kadaluarsa (1x Pakai Validasi)
    if (!user.reset_code || user.reset_code.trim().toUpperCase() !== code.trim().toUpperCase()) {
      return res.status(400).json({ status: 'error', message: 'Kode verifikasi salah atau sudah tidak berlaku!' });
    }

    if (new Date() > new Date(user.code_expires)) {
      return res.status(400).json({ status: 'error', message: 'Kode verifikasi telah kadaluarsa!' });
    }

    // 3. Proses berdasarkan jenis pemulihan
    if (type === 'username') {
      // Hapus kode verifikasi setelah 1x pakai (Set reset_code dan code_expires ke NULL)
      await client.query('UPDATE users SET reset_code = NULL, code_expires = NULL WHERE email = $1', [email]);

      // KIRIM RESPOSE SERTAKAN USERNAME USER
      return res.status(200).json({
        status: 'success',
        username: user.username,
        message: `Pemulihan berhasil! Username Anda adalah: ${user.username}`
      });
    } else if (type === 'password') {
      if (!new_password) {
        return res.status(400).json({ status: 'error', message: 'Harap masukkan password baru!' });
      }

      // Hash password baru
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(new_password, salt);

      // Update password & HAPUS KODE VERIFIKASI (1x PAKAI)
      await client.query(
        'UPDATE users SET password = $1, reset_code = NULL, code_expires = NULL WHERE email = $2',
        [hashedPassword, email]
      );

      return res.status(200).json({
        status: 'success',
        message: 'Password berhasil diperbarui! Silakan login dengan password baru Anda.'
      });
    } else {
      return res.status(400).json({ status: 'error', message: 'Tipe pemulihan tidak valid!' });
    }
  } catch (err) {
    res.status(500).json({ status: 'error', message: `Server Error: ${err.message}` });
  } finally {
    await client.end();
  }
};
