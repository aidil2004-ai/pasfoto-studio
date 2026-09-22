const { Client } = require("pg");
const bcrypt = require("bcryptjs");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { email, username, password } = req.body;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const hashedPassword = await bcrypt.hash(password, 10);
    await client.query(
      "INSERT INTO users (email, username, password) VALUES ($1, $2, $3)",
      [email, username, hashedPassword],
    );
    res
      .status(200)
      .json({ status: "success", message: "Registrasi berhasil!" });
  } catch (err) {
    res
      .status(400)
      .json({
        status: "error",
        message: "Email atau Username sudah terdaftar!",
      });
  } finally {
    await client.end();
  }
};
