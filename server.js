import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "temporary_secret_change_later";

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

function createSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function verifyAdmin(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      status: "error",
      message: "No token provided"
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: "Invalid or expired token"
    });
  }
}

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
            max-width: 560px;
            box-shadow: 0 10px 30px rgba(84, 107, 65, 0.12);
          }

          h1 {
            margin: 0 0 10px;
            font-size: 28px;
            font-weight: 700;
          }

          p {
            margin: 0 0 12px;
            color: #546B41;
            line-height: 1.5;
          }

          a {
            color: white;
            background: #546B41;
            padding: 10px 14px;
            border-radius: 10px;
            text-decoration: none;
            display: inline-block;
            margin-top: 8px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Product Showcase V2</h1>
          <p>Fresh backend is working. Database setup and admin login setup are ready.</p>
          <a href="/admin">Go to Admin Login</a>
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

app.get("/api/setup", async (req, res) => {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS site_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        setting_key VARCHAR(120) NOT NULL UNIQUE,
        setting_value LONGTEXT,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        page_name VARCHAR(180) NOT NULL,
        slug VARCHAR(220) NOT NULL UNIQUE,
        show_on_header BOOLEAN DEFAULT false,
        show_on_banner BOOLEAN DEFAULT false,
        banner_image_url TEXT,
        banner_subheading TEXT,
        create_circular_icon BOOLEAN DEFAULT false,
        circular_image_url TEXT,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sku VARCHAR(100) UNIQUE,
        product_name VARCHAR(220) NOT NULL,
        slug VARCHAR(260) NOT NULL UNIQUE,
        product_image_url TEXT,
        show_price DECIMAL(10,2) DEFAULT 0,
        crossed_price DECIMAL(10,2) DEFAULT NULL,
        tag ENUM('On Sale', 'New', 'None') DEFAULT 'None',
        dealer_name VARCHAR(180),
        dealer_price DECIMAL(10,2) DEFAULT 0,
        qty_in_stock INT DEFAULT 0,
        demand_color ENUM('Green', 'Yellow', 'Red') DEFAULT 'Green',
        is_visible BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS product_pages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        product_id INT NOT NULL,
        page_id INT NOT NULL,
        UNIQUE KEY unique_product_page (product_id, page_id),
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (page_id) REFERENCES pages(id) ON DELETE CASCADE
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS home_fixed_banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        banner_name VARCHAR(180) NOT NULL,
        image_url TEXT NOT NULL,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS home_layout_sections (
        id INT AUTO_INCREMENT PRIMARY KEY,
        section_type ENUM('page', 'banner', 'feature_cards') NOT NULL,
        reference_id INT DEFAULT NULL,
        sort_order INT DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_name VARCHAR(150) NOT NULL,
        rating INT NOT NULL,
        review_body TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE IF NOT EXISTS media_uploads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        file_url TEXT NOT NULL,
        file_type VARCHAR(100),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const defaultSettings = [
      ["logo_url", ""],
      ["email", ""],
      ["mobile_number", ""],
      ["whatsapp_number", ""],
      ["instagram_link", ""],
      ["browse_all_products_link", "/page/all-products"],
      ["policies", ""],
      ["privacy_policy", ""],
      ["return_refund", ""],
      ["terms_condition", ""]
    ];

    for (const [key, value] of defaultSettings) {
      await db.query(
        `INSERT INTO site_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = setting_value`,
        [key, value]
      );
    }

    res.json({
      status: "ok",
      message: "Version 2 database tables created successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database setup failed",
      error: error.message
    });
  }
});

app.get("/api/admin/init", async (req, res) => {
  try {
    const name = process.env.ADMIN_NAME;
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!name || !email || !password) {
      return res.status(400).json({
        status: "error",
        message: "ADMIN_NAME, ADMIN_EMAIL, and ADMIN_PASSWORD are required"
      });
    }

    const [existingAdmins] = await db.query(
      "SELECT id FROM admin_users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingAdmins.length > 0) {
      return res.json({
        status: "ok",
        message: "Admin user already exists"
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO admin_users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash]
    );

    res.json({
      status: "ok",
      message: "Admin user created successfully",
      admin_email: email
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Admin creation failed",
      error: error.message
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [users] = await db.query(
      "SELECT * FROM admin_users WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password"
      });
    }

    const admin = users[0];
    const isMatch = await bcrypt.compare(password, admin.password_hash);

    if (!isMatch) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        id: admin.id,
        name: admin.name,
        email: admin.email
      },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.json({
      status: "ok",
      message: "Login successful",
      token,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Login failed",
      error: error.message
    });
  }
});

app.get("/api/auth/me", verifyAdmin, (req, res) => {
  res.json({
    status: "ok",
    admin: req.admin
  });
});

app.get("/admin", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Admin Login</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            min-height: 100vh;
            font-family: Arial, sans-serif;
            background: #FFF8EC;
            color: #546B41;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .login-card {
            width: 100%;
            max-width: 420px;
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 20px;
            padding: 26px;
            box-shadow: 0 12px 32px rgba(84, 107, 65, 0.14);
          }

          h1 {
            margin: 0 0 6px;
            font-size: 26px;
            font-weight: 700;
          }

          p {
            margin: 0 0 20px;
            color: #6f7a5f;
            line-height: 1.5;
          }

          label {
            display: block;
            margin: 12px 0 6px;
            font-size: 14px;
            font-weight: 600;
          }

          input {
            width: 100%;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid #DCCCAC;
            background: #FFF8EC;
            font-size: 15px;
            outline: none;
          }

          button {
            width: 100%;
            border: none;
            border-radius: 12px;
            padding: 13px;
            margin-top: 16px;
            background: #546B41;
            color: #FFF8EC;
            font-size: 15px;
            font-weight: 700;
            cursor: pointer;
          }

          .message {
            margin-top: 12px;
            font-size: 14px;
            color: #991b1b;
            min-height: 20px;
          }
        </style>
      </head>
      <body>
        <div class="login-card">
          <h1>Admin Login</h1>
          <p>Login to manage website UI, products, and dashboard.</p>

          <label>Email</label>
          <input id="email" type="email" placeholder="Admin email" />

          <label>Password</label>
          <input id="password" type="password" placeholder="Admin password" />

          <button onclick="loginAdmin()">Login</button>

          <div class="message" id="message"></div>
        </div>

        <script>
          async function loginAdmin() {
            const messageBox = document.getElementById("message");
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;

            messageBox.textContent = "";

            if (!email || !password) {
              messageBox.textContent = "Please enter email and password.";
              return;
            }

            try {
              const res = await fetch("/api/auth/login", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, password })
              });

              const data = await res.json();

              if (!res.ok) {
                messageBox.textContent = data.message || "Login failed.";
                return;
              }

              localStorage.setItem("admin_token", data.token);
              window.location.href = "/manage-ui";
            } catch (error) {
              messageBox.textContent = error.message;
            }
          }
        </script>
      </body>
    </html>
  `);
});

app.get("/manage-ui", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Manage UI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #FFF8EC;
            color: #546B41;
          }

          .topbar {
            background: #546B41;
            color: #FFF8EC;
            padding: 16px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }

          .topbar h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
          }

          .nav {
            display: flex;
            gap: 10px;
          }

          .nav a,
          .nav button {
            background: #99AD7A;
            color: #FFF8EC;
            border: none;
            border-radius: 10px;
            padding: 9px 12px;
            text-decoration: none;
            font-weight: 600;
            cursor: pointer;
          }

          .container {
            max-width: 1100px;
            margin: auto;
            padding: 24px;
          }

          .card {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 18px;
            padding: 22px;
            box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
          }
        </style>
      </head>
      <body>
        <div class="topbar">
          <h1>Manage UI</h1>
          <div class="nav">
            <a href="/manage-ui">Manage UI</a>
            <a href="/all-products">All Products</a>
            <a href="/dashboard">Dashboard</a>
            <button onclick="logoutAdmin()">Logout</button>
          </div>
        </div>

        <div class="container">
          <div class="card">
            <h2>Manage UI Panel</h2>
            <p>This is the fresh Version 2 Manage UI panel. Next, we will add tabs and management features here.</p>
          </div>
        </div>

        <script>
          function logoutAdmin() {
            localStorage.removeItem("admin_token");
            window.location.href = "/admin";
          }

          const token = localStorage.getItem("admin_token");
          if (!token) {
            window.location.href = "/admin";
          }
        </script>
      </body>
    </html>
  `);
});

app.get("/all-products", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>All Products</title>
      </head>
      <body>
        <script>
          const token = localStorage.getItem("admin_token");
          if (!token) {
            window.location.href = "/admin";
          } else {
            document.body.innerHTML = "<h1>All Products Panel</h1><p>Fresh Version 2 panel placeholder.</p><p><a href='/manage-ui'>Manage UI</a> | <a href='/dashboard'>Dashboard</a></p>";
          }
        </script>
      </body>
    </html>
  `);
});

app.get("/dashboard", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Dashboard</title>
      </head>
      <body>
        <script>
          const token = localStorage.getItem("admin_token");
          if (!token) {
            window.location.href = "/admin";
          } else {
            document.body.innerHTML = "<h1>Dashboard Panel</h1><p>Fresh Version 2 dashboard placeholder.</p><p><a href='/manage-ui'>Manage UI</a> | <a href='/all-products'>All Products</a></p>";
          }
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
