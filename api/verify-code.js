const { Client } = require("pg");
const bcrypt = require("bcryptjs");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { email, code, type, new_password } = req.body;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query(
      "SELECT * FROM users WHERE email = $1 AND reset_code = $2",
      [email, code.toUpperCase()],
    );

    if (result.rows.length === 0) {
      return res
        .status(400)
        .json({
          status: "error",
          message: "Kode verifikasi salah atau tidak berlaku!",
        });
    }

    const user = result.rows[0];

    if (type === "password") {
      const hashedPassword = await bcrypt.hash(new_password, 10);
      await client.query(
        "UPDATE users SET password = $1, reset_code = NULL WHERE email = $2",
        [hashedPassword, email],
      );
      res
        .status(200)
        .json({ status: "success", message: "Password berhasil diperbarui!" });
    } else {
      await client.query(
        "UPDATE users SET reset_code = NULL WHERE email = $1",
        [email],
      );
      res
        .status(200)
        .json({
          status: "success",
          message: `Username Anda adalah: ${user.username}`,
        });
    }
  } catch (err) {
    res
      .status(500)
      .json({ status: "error", message: "Terjadi kesalahan server." });
  } finally {
    await client.end();
  }
};
