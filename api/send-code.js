const { Client } = require("pg");
const { Resend } = require("resend");

const resend = new Resend(process.env.RESEND_API_KEY);

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const { email } = req.body;
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  // Generate 6 Kode Huruf Kapital Acak
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  try {
    await client.connect();
    await client.query("UPDATE users SET reset_code = $1 WHERE email = $2", [
      code,
      email,
    ]);

    // Kirim Email via Resend
    await resend.emails.send({
      from: "PasFoto Studio <onboarding@resend.dev>",
      to: email,
      subject: "Kode Verifikasi Akun PasFoto Studio",
      html: `<p>Kode verifikasi huruf Anda adalah: <strong>${code}</strong></p>`,
    });

    res
      .status(200)
      .json({
        status: "success",
        message: "Kode verifikasi huruf telah dikirim ke email!",
      });
  } catch (err) {
    res
      .status(500)
      .json({
        status: "error",
        message: "Gagal mengirim email atau email tidak terdaftar.",
      });
  } finally {
    await client.end();
  }
};
