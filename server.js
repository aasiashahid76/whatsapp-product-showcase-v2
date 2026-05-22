import express from "express";
import mysql from "mysql2/promise";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Product Showcase V2</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #FFF8EC;
            color: #546B41;
            display: flex;
            min-height: 100vh;
            justify-content: center;
            align-items: center;
            text-align: center;
            padding: 20px;
          }

          .card {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 18px;
            padding: 28px;
            max-width: 520px;
            box-shadow: 0 10px 30px rgba(84, 107, 65, 0.12);
          }

          h1 {
            margin: 0 0 10px;
            font-size: 28px;
            font-weight: 700;
          }

          p {
            margin: 0;
            color: #546B41;
            line-height: 1.5;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Product Showcase V2</h1>
          <p>Fresh setup is working. Database test is now available.</p>
        </div>
      </body>
    </html>
  `);
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Version 2 backend is working"
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT 1 + 1 AS result");

    res.json({
      status: "ok",
      message: "Database connected successfully",
      result: rows[0].result
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database connection failed",
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
