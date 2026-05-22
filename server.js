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

/* =========================
   PAGE API
========================= */

app.get("/api/pages", async (req, res) => {
  try {
    const [pages] = await db.query(
      "SELECT * FROM pages ORDER BY sort_order ASC, id DESC"
    );

    res.json({
      status: "ok",
      pages
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch pages",
      error: error.message
    });
  }
});

app.post("/api/admin/pages", verifyAdmin, async (req, res) => {
  try {
    const {
      page_name,
      show_on_header,
      show_on_banner,
      banner_image_url,
      banner_subheading,
      create_circular_icon,
      circular_image_url
    } = req.body;

    if (!page_name) {
      return res.status(400).json({
        status: "error",
        message: "Page name is required"
      });
    }

    const slug = createSlug(page_name);

    const [existing] = await db.query(
      "SELECT id FROM pages WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "A page with this name already exists"
      });
    }

    const [maxOrderRows] = await db.query(
      "SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM pages"
    );

    const nextOrder = Number(maxOrderRows[0].max_order || 0) + 1;

    const [result] = await db.query(
      `INSERT INTO pages 
       (page_name, slug, show_on_header, show_on_banner, banner_image_url, banner_subheading, create_circular_icon, circular_image_url, sort_order, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
      [
        page_name,
        slug,
        show_on_header ? 1 : 0,
        show_on_banner ? 1 : 0,
        banner_image_url || null,
        banner_subheading || null,
        create_circular_icon ? 1 : 0,
        circular_image_url || null,
        nextOrder
      ]
    );

    await db.query(
      `INSERT INTO home_layout_sections 
       (section_type, reference_id, sort_order, is_active)
       VALUES ('page', ?, ?, true)`,
      [result.insertId, nextOrder]
    );

    res.json({
      status: "ok",
      message: "Page created successfully",
      page_id: result.insertId,
      slug
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create page",
      error: error.message
    });
  }
});

app.put("/api/admin/pages/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    const {
      page_name,
      show_on_header,
      show_on_banner,
      banner_image_url,
      banner_subheading,
      create_circular_icon,
      circular_image_url,
      is_active
    } = req.body;

    if (!page_name) {
      return res.status(400).json({
        status: "error",
        message: "Page name is required"
      });
    }

    const slug = createSlug(page_name);

    const [existing] = await db.query(
      "SELECT id FROM pages WHERE slug = ? AND id != ? LIMIT 1",
      [slug, id]
    );

    if (existing.length > 0) {
      return res.status(409).json({
        status: "error",
        message: "Another page with this name already exists"
      });
    }

    await db.query(
      `UPDATE pages
       SET page_name = ?,
           slug = ?,
           show_on_header = ?,
           show_on_banner = ?,
           banner_image_url = ?,
           banner_subheading = ?,
           create_circular_icon = ?,
           circular_image_url = ?,
           is_active = ?
       WHERE id = ?`,
      [
        page_name,
        slug,
        show_on_header ? 1 : 0,
        show_on_banner ? 1 : 0,
        banner_image_url || null,
        banner_subheading || null,
        create_circular_icon ? 1 : 0,
        circular_image_url || null,
        is_active === false ? 0 : 1,
        id
      ]
    );

    res.json({
      status: "ok",
      message: "Page updated successfully",
      slug
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update page",
      error: error.message
    });
  }
});

app.delete("/api/admin/pages/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.query(
      "DELETE FROM home_layout_sections WHERE section_type = 'page' AND reference_id = ?",
      [id]
    );

    await db.query(
      "DELETE FROM pages WHERE id = ?",
      [id]
    );

    res.json({
      status: "ok",
      message: "Page deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete page",
      error: error.message
    });
  }
});

/* =========================
   PRODUCT API
========================= */

async function getProductPageIds(productId) {
  const [rows] = await db.query(
    "SELECT page_id FROM product_pages WHERE product_id = ?",
    [productId]
  );

  return rows.map(function(row) {
    return row.page_id;
  });
}

async function replaceProductPages(productId, pageIds) {
  await db.query("DELETE FROM product_pages WHERE product_id = ?", [productId]);

  if (!Array.isArray(pageIds) || pageIds.length === 0) {
    return;
  }

  for (const pageId of pageIds) {
    await db.query(
      "INSERT IGNORE INTO product_pages (product_id, page_id) VALUES (?, ?)",
      [productId, pageId]
    );
  }
}

app.get("/api/products", async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        p.*,
        GROUP_CONCAT(pg.page_name ORDER BY pg.page_name SEPARATOR ', ') AS page_names
      FROM products p
      LEFT JOIN product_pages pp ON p.id = pp.product_id
      LEFT JOIN pages pg ON pp.page_id = pg.id
      WHERE p.is_visible = true
      GROUP BY p.id
      ORDER BY p.id DESC
    `);

    res.json({
      status: "ok",
      products
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch products",
      error: error.message
    });
  }
});

app.get("/api/admin/products", verifyAdmin, async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        p.*,
        GROUP_CONCAT(pg.page_name ORDER BY pg.page_name SEPARATOR ', ') AS page_names,
        GROUP_CONCAT(pg.id ORDER BY pg.id SEPARATOR ',') AS page_ids
      FROM products p
      LEFT JOIN product_pages pp ON p.id = pp.product_id
      LEFT JOIN pages pg ON pp.page_id = pg.id
      GROUP BY p.id
      ORDER BY p.id DESC
    `);

    res.json({
      status: "ok",
      products
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch admin products",
      error: error.message
    });
  }
});

app.post("/api/admin/products", verifyAdmin, async (req, res) => {
  try {
    const {
      sku,
      product_name,
      product_image_url,
      show_price,
      crossed_price,
      tag,
      dealer_name,
      dealer_price,
      qty_in_stock,
      demand_color,
      page_ids
    } = req.body;

    if (!product_name) {
      return res.status(400).json({
        status: "error",
        message: "Product name is required"
      });
    }

    const slugBase = createSlug(product_name);
    let slug = slugBase;

    const [existingSlug] = await db.query(
      "SELECT id FROM products WHERE slug = ? LIMIT 1",
      [slug]
    );

    if (existingSlug.length > 0) {
      slug = slugBase + "-" + Date.now();
    }

    if (sku) {
      const [existingSku] = await db.query(
        "SELECT id FROM products WHERE sku = ? LIMIT 1",
        [sku]
      );

      if (existingSku.length > 0) {
        return res.status(409).json({
          status: "error",
          message: "Product SKU already exists"
        });
      }
    }

    const [result] = await db.query(
      `INSERT INTO products 
       (sku, product_name, slug, product_image_url, show_price, crossed_price, tag, dealer_name, dealer_price, qty_in_stock, demand_color, is_visible)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, true)`,
      [
        sku || null,
        product_name,
        slug,
        product_image_url || null,
        show_price || 0,
        crossed_price || null,
        tag || "None",
        dealer_name || null,
        dealer_price || 0,
        qty_in_stock || 0,
        demand_color || "Green"
      ]
    );

    await replaceProductPages(result.insertId, page_ids);

    res.json({
      status: "ok",
      message: "Product created successfully",
      product_id: result.insertId,
      slug
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to create product",
      error: error.message
    });
  }
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
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #FFF8EC;
            color: #546B41;
          }

          .topbar {
            background: #546B41;
            color: #FFF8EC;
            padding: 14px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 20px;
            position: sticky;
            top: 0;
            z-index: 50;
          }

          .topbar h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
          }

          .admin-nav {
            display: flex;
            gap: 10px;
            align-items: center;
          }

          .admin-nav a,
          .admin-nav button {
            background: #99AD7A;
            color: #FFF8EC;
            border: none;
            border-radius: 10px;
            padding: 9px 13px;
            text-decoration: none;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }

          .admin-nav a.active {
            background: #DCCCAC;
            color: #546B41;
          }

          .container {
            max-width: 1200px;
            margin: auto;
            padding: 24px;
          }

          .tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 18px;
            flex-wrap: wrap;
          }

          .tab-btn {
            border: 1px solid #DCCCAC;
            background: white;
            color: #546B41;
            border-radius: 12px;
            padding: 11px 15px;
            font-size: 14px;
            font-weight: 600;
            cursor: pointer;
          }

          .tab-btn.active {
            background: #546B41;
            color: #FFF8EC;
            border-color: #546B41;
          }

          .tab-content {
            display: none;
          }

          .tab-content.active {
            display: block;
          }

          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }

          .card {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 18px;
            padding: 20px;
            box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
          }

          h2 {
            margin: 0 0 14px;
            font-size: 20px;
            font-weight: 700;
          }

          p {
            color: #6f7a5f;
            line-height: 1.5;
          }

          label {
            display: block;
            margin: 12px 0 6px;
            font-size: 14px;
            font-weight: 600;
          }

          input,
          select,
          textarea {
            width: 100%;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid #DCCCAC;
            background: #FFF8EC;
            color: #546B41;
            font-size: 14px;
            outline: none;
          }

          textarea {
            min-height: 110px;
            resize: vertical;
          }

          .check-row {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-top: 12px;
            font-size: 14px;
          }

          .check-row input {
            width: auto;
          }

          button.primary {
            background: #546B41;
            color: #FFF8EC;
            border: none;
            border-radius: 12px;
            padding: 12px 15px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
            margin-top: 14px;
          }

          .placeholder {
            background: #FFF8EC;
            border: 1px dashed #DCCCAC;
            border-radius: 14px;
            padding: 16px;
            color: #6f7a5f;
          }
        </style>
      </head>

      <body>
        <div class="topbar">
          <h1>Manage UI</h1>

          <div class="admin-nav">
            <a class="active" href="/manage-ui">Manage UI</a>
            <a href="/all-products">All Products</a>
            <a href="/dashboard">Dashboard</a>
            <button onclick="logoutAdmin()">Logout</button>
          </div>
        </div>

        <div class="container">
          <div class="tabs">
            <button class="tab-btn active" onclick="showTab('pagesTab', this)">Create & Manage Page</button>
            <button class="tab-btn" onclick="showTab('productsTab', this)">Add Product</button>
            <button class="tab-btn" onclick="showTab('logoBannerTab', this)">Logo & Banner</button>
            <button class="tab-btn" onclick="showTab('reviewsTab', this)">Reviews</button>
            <button class="tab-btn" onclick="showTab('settingsTab', this)">Header & Footer</button>
          </div>

          <div id="pagesTab" class="tab-content active">
            <div class="grid">
              <div class="card">
                <h2>Create Page</h2>

                <label>Page Name</label>
                <input id="pageName" placeholder="Example: Home & Kitchen" />

                <div class="check-row">
                  <input id="showOnHeader" type="checkbox" />
                  <span>Show on Header</span>
                </div>

                <div class="check-row">
                  <input id="showOnBanner" type="checkbox" />
                  <span>Show on Banner</span>
                </div>

                <label>Banner Image</label>
                <input type="file" accept="image/*" />

                <label>Banner Image URL</label>
                <input id="bannerImageUrl" placeholder="Banner image URL" />

                <label>Banner Subheading</label>
                <input id="bannerSubheading" placeholder="Example: Fresh collection available now" />

                <div class="check-row">
                  <input id="createCircularIcon" type="checkbox" />
                  <span>Create Circular Icon</span>
                </div>

                <label>Circular Image</label>
                <input type="file" accept="image/*" />

                <label>Circular Image URL</label>
                <input id="circularImageUrl" placeholder="Circular image URL" />

                <button class="primary" onclick="createPage()">Create Page</button>
              </div>

              <div class="card">
                <h2>Manage Pages</h2>
                <div id="pagesList" class="placeholder">
				Loading pages...
				</div>
              </div>
            </div>
          </div>

          <div id="productsTab" class="tab-content">
            <div class="card">
              <h2>Add Product</h2>
              <p>This tab will contain product creation form with SKU, name, image, price, dealer, stock, demand color, and page selection.</p>
            </div>
          </div>

          <div id="logoBannerTab" class="tab-content">
            <div class="card">
              <h2>Logo & Banner</h2>
              <p>This tab will manage homepage fixed banners and homepage layout order. Logo upload will be inside Header & Footer only.</p>
            </div>
          </div>

          <div id="reviewsTab" class="tab-content">
            <div class="card">
              <h2>Reviews</h2>
              <p>This tab will manage customer reviews.</p>
            </div>
          </div>

          <div id="settingsTab" class="tab-content">
            <div class="card">
              <h2>Header & Footer</h2>
              <p>This tab will manage logo, email, mobile number, WhatsApp number, Instagram link, browse all products link, and policy content.</p>
            </div>
          </div>
        </div>

<div id="editPageOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:100;"></div>

<div id="editPageBox" style="display:none;position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);width:520px;max-width:92%;max-height:90vh;overflow:auto;background:white;border:1px solid #DCCCAC;border-radius:18px;padding:20px;z-index:101;box-shadow:0 16px 44px rgba(0,0,0,0.25);">
  <h2>Edit Page</h2>

  <input id="editPageId" type="hidden" />

  <label>Page Name</label>
  <input id="editPageName" />

  <div class="check-row">
    <input id="editShowOnHeader" type="checkbox" />
    <span>Show on Header</span>
  </div>

  <div class="check-row">
    <input id="editShowOnBanner" type="checkbox" />
    <span>Show on Banner</span>
  </div>

  <label>Banner Image URL</label>
  <input id="editBannerImageUrl" />

  <label>Banner Subheading</label>
  <input id="editBannerSubheading" />

  <div class="check-row">
    <input id="editCreateCircularIcon" type="checkbox" />
    <span>Create Circular Icon</span>
  </div>

  <label>Circular Image URL</label>
  <input id="editCircularImageUrl" />

  <div class="check-row">
    <input id="editIsActive" type="checkbox" />
    <span>Page Active</span>
  </div>

  <div style="display:flex;gap:10px;margin-top:14px;">
    <button class="primary" onclick="updatePage()">Save Changes</button>
    <button onclick="closeEditPageBox()" style="background:#DCCCAC;color:#546B41;border:none;border-radius:12px;padding:12px 15px;font-weight:700;cursor:pointer;">Cancel</button>
  </div>
</div>

        <script>
          function showTab(tabId, clickedButton) {
            document.querySelectorAll(".tab-content").forEach(function(tab) {
              tab.classList.remove("active");
            });

            document.querySelectorAll(".tab-btn").forEach(function(btn) {
              btn.classList.remove("active");
            });

            document.getElementById(tabId).classList.add("active");
            clickedButton.classList.add("active");
          }

          function logoutAdmin() {
            localStorage.removeItem("admin_token");
            window.location.href = "/admin";
          }
		  
		  async function createPage() {
  const page_name = document.getElementById("pageName").value.trim();
  const show_on_header = document.getElementById("showOnHeader").checked;
  const show_on_banner = document.getElementById("showOnBanner").checked;
  const banner_image_url = document.getElementById("bannerImageUrl").value.trim();
  const banner_subheading = document.getElementById("bannerSubheading").value.trim();
  const create_circular_icon = document.getElementById("createCircularIcon").checked;
  const circular_image_url = document.getElementById("circularImageUrl").value.trim();

  if (!page_name) {
    alert("Please enter page name");
    return;
  }

  try {
    const res = await fetch("/api/admin/pages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("admin_token")
      },
      body: JSON.stringify({
        page_name,
        show_on_header,
        show_on_banner,
        banner_image_url,
        banner_subheading,
        create_circular_icon,
        circular_image_url
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Page creation failed");
      return;
    }

    document.getElementById("pageName").value = "";
    document.getElementById("showOnHeader").checked = false;
    document.getElementById("showOnBanner").checked = false;
    document.getElementById("bannerImageUrl").value = "";
    document.getElementById("bannerSubheading").value = "";
    document.getElementById("createCircularIcon").checked = false;
    document.getElementById("circularImageUrl").value = "";

    alert("Page created successfully");
    loadPages();
  } catch (error) {
    alert(error.message);
  }
}

async function loadPages() {
  const list = document.getElementById("pagesList");

  if (!list) return;

  try {
    const res = await fetch("/api/pages");
    const data = await res.json();

    const pages = data.pages || [];

    if (pages.length === 0) {
      list.innerHTML = "No pages created yet.";
      return;
    }

    list.className = "";
    list.innerHTML = "";

    pages.forEach(function(page) {
  const div = document.createElement("div");
  div.style.border = "1px solid #DCCCAC";
  div.style.borderRadius = "14px";
  div.style.padding = "12px";
  div.style.marginBottom = "10px";
  div.style.background = "#FFF8EC";

  const title = document.createElement("strong");
  title.textContent = page.page_name;

  const slug = document.createElement("div");
  slug.style.fontSize = "13px";
  slug.style.marginTop = "5px";
  slug.style.color = "#6f7a5f";
  slug.textContent = "Slug: " + page.slug;

  const meta = document.createElement("div");
  meta.style.fontSize = "13px";
  meta.style.color = "#6f7a5f";
  meta.textContent =
    "Header: " + (page.show_on_header ? "Yes" : "No") +
    " | Banner: " + (page.show_on_banner ? "Yes" : "No") +
    " | Circular: " + (page.create_circular_icon ? "Yes" : "No");

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.marginTop = "10px";

  const editBtn = document.createElement("button");
  editBtn.textContent = "Edit";
  editBtn.style.background = "#546B41";
  editBtn.style.color = "white";
  editBtn.style.border = "none";
  editBtn.style.borderRadius = "10px";
  editBtn.style.padding = "8px 10px";
  editBtn.style.cursor = "pointer";
  editBtn.onclick = function() {
    openEditPageBox(page);
  };

  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "Delete";
  deleteBtn.style.background = "#991b1b";
  deleteBtn.style.color = "white";
  deleteBtn.style.border = "none";
  deleteBtn.style.borderRadius = "10px";
  deleteBtn.style.padding = "8px 10px";
  deleteBtn.style.cursor = "pointer";
  deleteBtn.onclick = function() {
    deletePage(page.id, page.page_name);
  };

  actions.appendChild(editBtn);
  actions.appendChild(deleteBtn);

  div.appendChild(title);
  div.appendChild(slug);
  div.appendChild(meta);
  div.appendChild(actions);

  list.appendChild(div);
});
  } catch (error) {
    list.innerHTML = error.message;
  }
}

function openEditPageBox(page) {
  document.getElementById("editPageId").value = page.id;
  document.getElementById("editPageName").value = page.page_name || "";
  document.getElementById("editShowOnHeader").checked = Boolean(page.show_on_header);
  document.getElementById("editShowOnBanner").checked = Boolean(page.show_on_banner);
  document.getElementById("editBannerImageUrl").value = page.banner_image_url || "";
  document.getElementById("editBannerSubheading").value = page.banner_subheading || "";
  document.getElementById("editCreateCircularIcon").checked = Boolean(page.create_circular_icon);
  document.getElementById("editCircularImageUrl").value = page.circular_image_url || "";
  document.getElementById("editIsActive").checked = page.is_active !== 0;

  document.getElementById("editPageOverlay").style.display = "block";
  document.getElementById("editPageBox").style.display = "block";
}

function closeEditPageBox() {
  document.getElementById("editPageOverlay").style.display = "none";
  document.getElementById("editPageBox").style.display = "none";
}

async function updatePage() {
  const id = document.getElementById("editPageId").value;

  const page_name = document.getElementById("editPageName").value.trim();
  const show_on_header = document.getElementById("editShowOnHeader").checked;
  const show_on_banner = document.getElementById("editShowOnBanner").checked;
  const banner_image_url = document.getElementById("editBannerImageUrl").value.trim();
  const banner_subheading = document.getElementById("editBannerSubheading").value.trim();
  const create_circular_icon = document.getElementById("editCreateCircularIcon").checked;
  const circular_image_url = document.getElementById("editCircularImageUrl").value.trim();
  const is_active = document.getElementById("editIsActive").checked;

  if (!page_name) {
    alert("Please enter page name");
    return;
  }

  try {
    const res = await fetch("/api/admin/pages/" + id, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("admin_token")
      },
      body: JSON.stringify({
        page_name,
        show_on_header,
        show_on_banner,
        banner_image_url,
        banner_subheading,
        create_circular_icon,
        circular_image_url,
        is_active
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Page update failed");
      return;
    }

    alert("Page updated successfully");
    closeEditPageBox();
    loadPages();
  } catch (error) {
    alert(error.message);
  }
}

async function deletePage(pageId, pageName) {
  const ok = confirm("Delete this page permanently? Page: " + pageName);

  if (!ok) return;

  try {
    const res = await fetch("/api/admin/pages/" + pageId, {
      method: "DELETE",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("admin_token")
      }
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Page delete failed");
      return;
    }

    alert("Page deleted successfully");
    loadPages();
  } catch (error) {
    alert(error.message);
  }
}

          const token = localStorage.getItem("admin_token");

          if (!token) {
			window.location.href = "/admin";
						} else {
								loadPages();
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
