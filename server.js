import express from "express";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("trust proxy", true);
app.use(express.json());

const MEDIA_DIR = process.env.MEDIA_UPLOAD_PATH || path.join(process.cwd(), "media");
//kgkhkhk
if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

app.use("/media", express.static(MEDIA_DIR));

const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    cb(null, MEDIA_DIR);
  },
  filename: function(req, file, cb) {
    const safeName = file.originalname
      .toLowerCase()
      .replace(/[^a-z0-9.]+/g, "-")
      .replace(/-+/g, "-");

    cb(null, Date.now() + "-" + safeName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: function(req, file, cb) {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed"));
    }

    cb(null, true);
  }
});

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
          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, sans-serif;
            background: #FFF8EC;
            color: #546B41;
          }

          .site-header {
            position: sticky;
            top: 0;
            z-index: 50;
            background: #546B41;
			background: #FFF8EC;
			border-bottom: 1px solid #DCCCAC;
            display: grid;
            grid-template-columns: 70px 1fr auto 38px;
            gap: 8px;
            align-items: center;
          }

          .logo-box {
  height: 38px;
  border-radius: 10px;
  background: #546B41;
  color: #FFF8EC;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  overflow: hidden;
  border: 1px solid #DCCCAC;
}

.logo-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: none;
  background: #FFF8EC;
  padding: 3px;
}

.logo-box span {
  font-size: 13px;
  font-weight: 700;
}
          .search-box {
            display: flex;
            align-items: center;
            gap: 6px;
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 999px;
            padding: 8px 10px;
          }

          .search-box span {
            font-size: 14px;
          }

          .search-box input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            color: #546B41;
            font-size: 13px;
          }

          .list-btn {
  border: 1px solid #DCCCAC;
  background: white;
  color: #546B41;
  border-radius: 999px;
  padding: 9px 10px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
}

.desktop-right-header {
  display: none;
}

.desktop-pages-nav {
  display: none;
}

.desktop-search-btn {
  display: none;
}

.mobile-list-btn {
  display: inline-block;
}

.pages-menu-btn {
  border: 1px solid #DCCCAC;
  background: white;
  color: #546B41;
  border-radius: 10px;
  height: 38px;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}

.pages-menu-panel {
  position: fixed;
  top: 0;
  right: -82%;
  width: 82%;
  max-width: 320px;
  height: 100vh;
  z-index: 100;
  background: white;
  border-left: 1px solid #DCCCAC;
  box-shadow: -14px 0 34px rgba(84, 107, 65, 0.18);
  padding: 14px;
  transition: right 0.28s ease;
  display: block;
}

.pages-menu-panel.show {
  right: 0;
}

.desktop-search-panel {
  display: none;
  position: fixed;
  top: 59px;
  left: 10px;
  right: 10px;
  z-index: 70;
  background: white;
  border: 1px solid #DCCCAC;
  border-radius: 0 0 18px 18px;
  box-shadow: 0 14px 34px rgba(84, 107, 65, 0.18);
  padding: 10px;
}

.desktop-search-panel.show {
  display: grid;
  gap: 8px;
}

.menu-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #546B41;
  color: #FFF8EC;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 12px;
}

.menu-head strong {
  font-size: 15px;
}

.close-menu-btn {
  border: none;
  background: #DCCCAC;
  color: #546B41;
  border-radius: 999px;
  width: 30px;
  height: 30px;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}

.menu-links {
  display: grid;
  gap: 8px;
}

.pages-menu-panel a {
  text-decoration: none;
  background: #FFF8EC;
  color: #546B41;
  border: 1px solid #DCCCAC;
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
  font-weight: 600;
}

.pages-menu-panel a.active {
  background: #546B41;
  color: #FFF8EC;
}

.desktop-search-panel input {
  width: 100%;
  border: 1px solid #DCCCAC;
  background: #FFF8EC;
  color: #546B41;
  border-radius: 12px;
  padding: 12px;
  outline: none;
}

.desktop-search-panel input {
  width: 100%;
  border: 1px solid #DCCCAC;
  background: #FFF8EC;
  color: #546B41;
  border-radius: 12px;
  padding: 12px;
  outline: none;
}

          .page-wrap {
            padding: 14px 10px 28px;
          }

          .hero {
            border-radius: 18px;
            background: linear-gradient(135deg, #546B41, #99AD7A);
            color: #FFF8EC;
            padding: 20px 16px;
            margin-bottom: 16px;
          }

          .hero h1 {
            margin: 0 0 6px;
            font-size: 22px;
            font-weight: 700;
            line-height: 1.15;
          }

          .hero p {
            margin: 0;
            font-size: 14px;
            line-height: 1.45;
            opacity: 0.95;
          }

          .section-head {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin: 14px 2px 10px;
          }

          .section-head h2 {
            margin: 0;
            font-size: 17px;
            font-weight: 700;
          }

          .section-head a {
            color: #546B41;
            font-size: 13px;
            text-decoration: none;
            font-weight: 600;
          }

          .product-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }

          .product-card {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 13px;
            overflow: hidden;
          }

          .product-img {
            width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            display: block;
            background: #DCCCAC;
          }

          .product-info {
            padding: 6px;
          }

          .name-price-row {
            display: flex;
            justify-content: space-between;
            gap: 4px;
            align-items: flex-start;
            min-height: 30px;
          }

          .product-name {
            font-size: 11px;
            line-height: 1.2;
            font-weight: 500;
            color: #38472d;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .product-price {
  font-size: 11px;
  font-weight: 700;
  color: #546B41;
  white-space: nowrap;
}

.price-stack {
  text-align: right;
  line-height: 1.1;
}

.crossed-price {
  font-size: 10px;
  color: #8a8a8a;
  text-decoration: line-through;
  margin-top: 2px;
}

.product-image-wrap {
  position: relative;
}

.product-tag {
  position: absolute;
  top: 5px;
  left: 5px;
  background: #546B41;
  color: #FFF8EC;
  border-radius: 999px;
  padding: 3px 6px;
  font-size: 9px;
  font-weight: 700;
}

          .card-action-row {
            display: grid;
            grid-template-columns: 1fr 38px;
            gap: 4px;
            margin-top: 6px;
            align-items: center;
          }

          .qty-row {
            display: grid;
            grid-template-columns: 18px 1fr 18px;
            gap: 2px;
          }

          .qty-row button {
            border: none;
            background: #DCCCAC;
            color: #546B41;
            border-radius: 6px;
            height: 24px;
            font-size: 12px;
            font-weight: 700;
          }

          .qty-row input {
            width: 100%;
            border: 1px solid #DCCCAC;
            border-radius: 6px;
            text-align: center;
            font-size: 11px;
            color: #546B41;
            height: 24px;
            padding: 0;
          }

          .add-btn {
            border: none;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 7px;
            height: 24px;
            font-size: 10px;
            font-weight: 700;
          }

          .empty {
  background: white;
  border: 1px solid #DCCCAC;
  border-radius: 14px;
  padding: 16px;
  color: #6f7a5f;
  font-size: 14px;
}

.list-btn.active {
  background: #546B41;
  color: #FFF8EC;
  border-color: #546B41;
}

.your-list-panel {
  display: none;
  position: fixed;
  top: 59px;
  left: 10px;
  right: 10px;
  z-index: 60;
  background: white;
  border: 1px solid #DCCCAC;
  border-radius: 0 0 18px 18px;
  box-shadow: 0 14px 34px rgba(84, 107, 65, 0.18);
  max-height: 70vh;
  overflow: auto;
}

.your-list-panel.show {
  display: block;
}

.list-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  background: #546B41;
  color: #FFF8EC;
}

.list-head strong {
  font-size: 15px;
}

.close-list-btn {
  border: none;
  background: #DCCCAC;
  color: #546B41;
  border-radius: 999px;
  width: 28px;
  height: 28px;
  font-weight: 700;
}

.list-body {
  padding: 10px;
}

.list-row {
  display: grid;
  grid-template-columns: 48px 1fr 72px 72px 28px;
  gap: 6px;
  align-items: center;
  border-bottom: 1px solid #f0e4ce;
  padding: 8px 0;
}

.list-row img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #DCCCAC;
}

.list-product-name {
  font-size: 11px;
  line-height: 1.2;
  color: #38472d;
  margin-top: 3px;
}

.list-price {
  font-size: 12px;
  font-weight: 700;
  color: #546B41;
}

.list-mini-qty {
  display: grid;
  grid-template-columns: 20px 1fr 20px;
  gap: 2px;
}

.list-mini-qty button {
  border: none;
  background: #DCCCAC;
  color: #546B41;
  border-radius: 6px;
  height: 24px;
  font-weight: 700;
}

.list-mini-qty input {
  width: 100%;
  border: 1px solid #DCCCAC;
  border-radius: 6px;
  text-align: center;
  font-size: 11px;
  height: 24px;
  padding: 0;
}

.remove-list-btn {
  border: none;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 7px;
  height: 26px;
  font-weight: 700;
}

.list-footer {
  padding: 12px;
  border-top: 1px solid #DCCCAC;
  background: #FFF8EC;
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 700;
  margin-bottom: 10px;
}

.send-wa-btn {
  width: 100%;
  border: none;
  background: #546B41;
  color: #FFF8EC;
  border-radius: 12px;
  padding: 12px;
  font-size: 14px;
  font-weight: 700;
}

.small-message {
  padding: 14px;
  color: #6f7a5f;
  font-size: 14px;
}

.site-footer {
  margin-top: 34px;
  background: #546B41;
color: #FFF8EC;
border-top: 1px solid #546B41;
}

.footer-main {
  display: grid;
  gap: 24px;
  padding: 28px 14px;
}

.footer-logo-box {
  width: 150px;
  height: 56px;
  border-radius: 12px;
  background: #546B41;
  color: #FFF8EC;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  overflow: hidden;
  border: 1px solid #DCCCAC;
  margin-bottom: 12px;
}

.footer-logo-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: none;
  background: #FFF8EC;
  padding: 4px;
}

.footer-logo-box span {
  font-size: 13px;
  font-weight: 800;
}

.footer-brand p {
  margin: 0;
  color: #FFF8EC;
  font-size: 14px;
  line-height: 1.55;
  max-width: 260px;
}

.footer-column h4 {
  margin: 0 0 12px;
  color: #FFF8EC;
  font-size: 18px;
  font-weight: 800;
}

.footer-contact-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #FFF8EC;
  font-size: 14px;
  margin-bottom: 10px;
}

.footer-contact-row a,
.footer-legal-link,
.footer-browse-link {
  color: #FFF8EC;
  text-decoration: none;
}

.footer-legal-list {
  display: grid;
  gap: 12px;
}

.footer-social-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.footer-social-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 10px 16px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 600;
}

.footer-social-btn.instagram {
  background: #f3f4f6;
  color: #FFF8EC;
}

.footer-social-btn.whatsapp {
  background: #16a34a;
  color: white;
}

.footer-whatsapp-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: #16a34a;
  color: white;
  border-radius: 999px;
  padding: 10px 18px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  margin-top: 12px;
}

.footer-browse-link {
  display: inline-block;
  margin-top: 18px;
  font-size: 14px;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 248, 236, 0.35);
  text-align: center;
  padding: 18px 12px;
  color: #FFF8EC;
  font-size: 13px;
}

@media (min-width: 768px) {
  .footer-main {
    grid-template-columns: 1.3fr 1.2fr 1.2fr 1.4fr;
    gap: 34px;
    padding: 40px 24px;
    max-width: 1180px;
    margin: auto;
  }
}

          @media (min-width: 768px) {
            .page-wrap {
              max-width: 1100px;
              margin: auto;
              padding: 24px;
            }

            .site-header {
  grid-template-columns: 140px 1fr;
  padding: 12px 24px;
}

.mobile-list-btn {
  display: none;
}

.mobile-search-box {
  display: none;
}

.pages-menu-btn {
  display: none;
}

.desktop-right-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.desktop-pages-nav {
  display: flex;
  gap: 16px;
  align-items: center;
  overflow-x: auto;
}

.desktop-pages-nav a {
  flex: 0 0 auto;
  text-decoration: none;
  color: #546B41;
  font-size: 14px;
  font-weight: 600;
}

.desktop-pages-nav a.active {
  color: #38472d;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.desktop-search-btn {
  display: block;
  border: none;
  background: transparent;
  color: #546B41;
  width: 32px;
  height: 32px;
  font-size: 18px;
  cursor: pointer;
}
            .logo-box {
              height: 44px;
            }

            .product-grid {
              grid-template-columns: repeat(6, 1fr);
              gap: 12px;
            }

            .product-name,
            .product-price {
              font-size: 13px;
            }

            .card-action-row {
              grid-template-columns: 1fr 52px;
            }
          }
        </style>
      </head>

      <body>
        <header class="site-header">
  <a href="/" class="logo-box">
    <img id="siteLogoImg" src="" alt="Logo" />
    <span id="siteLogoText">LOGO</span>
  </a>

  <div class="desktop-right-header">
    <nav id="desktopPagesNav" class="desktop-pages-nav"></nav>
    <button class="desktop-search-btn" onclick="toggleDesktopSearch()">🔍</button>
    <button class="list-btn" id="yourListBtn" onclick="toggleYourList()">Your List (0)</button>
  </div>

  <div class="search-box mobile-search-box">
    <span>🔍</span>
    <input id="searchInput" placeholder="Search products..." oninput="filterProducts()" />
  </div>

  <button class="list-btn mobile-list-btn" id="yourListBtnMobile" onclick="toggleYourList()">Your List (0)</button>

	<button class="pages-menu-btn" onclick="togglePagesMenu()">☰</button>
</header>

		<div id="pagesMenuPanel" class="pages-menu-panel"></div>
		<div id="desktopSearchPanel" class="desktop-search-panel">
 			 <input id="desktopSearchInput" placeholder="Search products..." oninput="filterProductsFromDesktop()" />
		</div>
		<div id="yourListPanel" class="your-list-panel">
  <div class="list-head">
    <strong>Your List</strong>
    <button class="close-list-btn" onclick="closeYourList()">×</button>
  </div>

  <div id="yourListBody" class="list-body"></div>

  <div class="list-footer">
    <div class="total-line">
      <span>Total</span>
      <span id="yourListTotal">₹0</span>
    </div>

    <button class="send-wa-btn" onclick="sendToWhatsapp()">
  <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;" />
  Send to WhatsApp
</button>
  </div>
</div>

        <main class="page-wrap">
          <section class="hero">
            <h1>Shop quality products easily</h1>
            <p>Select products, add them to Your List, and send your order on WhatsApp.</p>
          </section>

          <section>
  <div id="homeSections"></div>
</section>

<footer class="site-footer">
  <div class="footer-main">
    <div class="footer-brand">
      <a href="/" class="footer-logo-box">
        <img id="footerLogoImg" src="" alt="Logo" />
        <span id="footerLogoText">LOGO</span>
      </a>
      <p>Shop quality products with simple WhatsApp ordering.</p>
    </div>

    <div class="footer-column">
      <h4>Contact</h4>
      <div class="footer-contact-row" id="footerMobile"></div>
      <div class="footer-contact-row" id="footerEmail"></div>
      <div id="footerWhatsapp"></div>
    </div>

    <div class="footer-column">
      <h4>Legal</h4>
      <div class="footer-legal-list">
        <a class="footer-legal-link" href="/legal/terms-condition">Terms & Conditions</a>
        <a class="footer-legal-link" href="/legal/policies">Policies</a>
        <a class="footer-legal-link" href="/legal/privacy-policy">Privacy Policy</a>
        <a class="footer-legal-link" href="/legal/return-refund">Return & Refund Policy</a>
      </div>
    </div>

    <div class="footer-column">
      <h4>Follow</h4>
      <div class="footer-social-row">
        <span id="footerInstagram"></span>
        <span id="footerWhatsappSocial"></span>
      </div>
      <a class="footer-browse-link" href="/page/all-products">Browse all products →</a>
    </div>
  </div>

  <div class="footer-bottom">© 2026. All rights reserved.</div>
</footer>
        </main>

        <script>
          let allProducts = [];
			let siteSettings = {};

          function productCard(product) {
  const image = product.product_image_url || "https://via.placeholder.com/300x300?text=Product";
  const price = Number(product.show_price || 0).toFixed(0);
  const crossedPrice = Number(product.crossed_price || 0);
  const tag = String(product.tag || "None");

  const tagHtml = tag && tag !== "None"
    ? "<div class='product-tag'>" + tag + "</div>"
    : "";

  const crossedPriceHtml = crossedPrice > 0
    ? "<div class='crossed-price'>₹" + crossedPrice.toFixed(0) + "</div>"
    : "";

  return "" +
    "<div class='product-card'>" +
      "<a href='/product/" + product.slug + "'>" +
        "<div class='product-image-wrap'>" +
          tagHtml +
          "<img class='product-img' src='" + image + "' alt='" + product.product_name + "' />" +
        "</div>" +
      "</a>" +
      "<div class='product-info'>" +
        "<div class='name-price-row'>" +
          "<div class='product-name'>" + product.product_name + "</div>" +
          "<div class='price-stack'>" +
            "<div class='product-price'>₹" + price + "</div>" +
            crossedPriceHtml +
          "</div>" +
        "</div>" +
        "<div class='card-action-row'>" +
          "<div class='qty-row'>" +
            "<button onclick='changeQtyFromCard(this, -1)'>-</button>" +
            "<input class='qty-input-card' type='number' min='1' value='1' />" +
            "<button onclick='changeQtyFromCard(this, 1)'>+</button>" +
          "</div>" +
          "<button class='add-btn' onclick='addToListFromCard(" + product.id + ", this)'>Add</button>" +
        "</div>" +
      "</div>" +
    "</div>";
}

          function renderHomeSections(sections) {
  const wrap = document.getElementById("homeSections");

  if (!sections || sections.length === 0) {
    wrap.innerHTML = '<div class="empty">No products found.</div>';
    return;
  }

  let html = "";

  sections.forEach(function(section) {
    const page = section.page;
    const products = section.products || [];

    html += "<div class='section-head'>";
    html += "<h2>" + page.page_name + "</h2>";
    html += "<a href='/page/" + page.slug + "'>View all</a>";
    html += "</div>";

    html += "<div class='product-grid'>";
    html += products.map(productCard).join("");
    html += "</div>";
  });

  wrap.innerHTML = html;
}

async function loadHeaderPages() {
  const desktopNav = document.getElementById("desktopPagesNav");
  const mobilePanel = document.getElementById("pagesMenuPanel");

  try {
    const res = await fetch("/api/header-pages");
    const data = await res.json();
    const pages = data.pages || [];

    let desktopHtml = "";
    let mobileLinks = "";

    desktopHtml += "<a class='active' href='/'>Home</a>";
    mobileLinks += "<a class='active' href='/'>Home</a>";

    pages.forEach(function(page) {
      desktopHtml += "<a href='/page/" + page.slug + "'>" + page.page_name + "</a>";
      mobileLinks += "<a href='/page/" + page.slug + "'>" + page.page_name + "</a>";
    });

    const mobileHtml =
      "<div class='menu-head'>" +
        "<strong>Pages</strong>" +
        "<button class='close-menu-btn' onclick='closePagesMenu()'>×</button>" +
      "</div>" +
      "<div class='menu-links'>" +
        mobileLinks +
      "</div>";

    if (desktopNav) desktopNav.innerHTML = desktopHtml;
    if (mobilePanel) mobilePanel.innerHTML = mobileHtml;
  } catch (error) {
    if (desktopNav) desktopNav.innerHTML = "";
    if (mobilePanel) mobilePanel.innerHTML = "";
  }
}

function togglePagesMenu() {
  const panel = document.getElementById("pagesMenuPanel");
  if (!panel) return;
  panel.classList.toggle("show");
}

function closePagesMenu() {
  const panel = document.getElementById("pagesMenuPanel");
  if (!panel) return;
  panel.classList.remove("show");
}

function toggleDesktopSearch() {
  const panel = document.getElementById("desktopSearchPanel");
  if (!panel) return;
  panel.classList.toggle("show");
}

function filterProductsFromDesktop() {
  const mobileInput = document.getElementById("searchInput");
  const desktopInput = document.getElementById("desktopSearchInput");

  if (mobileInput && desktopInput) {
    mobileInput.value = desktopInput.value;
  }

  filterProducts();
}

          async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    siteSettings = data.settings || {};

    const logoImg = document.getElementById("siteLogoImg");
    const logoText = document.getElementById("siteLogoText");
    const logoUrl = String(siteSettings.logo_url || "").trim();

    if (logoUrl && logoImg && logoText) {
      logoImg.src = logoUrl;
      logoImg.style.display = "block";
      logoText.style.display = "none";
    } else if (logoImg && logoText) {
      logoImg.style.display = "none";
      logoText.style.display = "block";
    }
const footerLogoImg = document.getElementById("footerLogoImg");
const footerLogoText = document.getElementById("footerLogoText");

if (logoUrl && footerLogoImg && footerLogoText) {
  footerLogoImg.src = logoUrl;
  footerLogoImg.style.display = "block";
  footerLogoText.style.display = "none";
} else if (footerLogoImg && footerLogoText) {
  footerLogoImg.style.display = "none";
  footerLogoText.style.display = "block";
}

const footerMobile = document.getElementById("footerMobile");
const footerEmail = document.getElementById("footerEmail");
const footerInstagram = document.getElementById("footerInstagram");
const footerWhatsapp = document.getElementById("footerWhatsapp");
const footerWhatsappSocial = document.getElementById("footerWhatsappSocial");

const mobileNumber = String(siteSettings.mobile_number || "").trim();
const whatsappNumber = String(siteSettings.whatsapp_number || "").replace(/[^0-9]/g, "");
const email = String(siteSettings.email || "").trim();
const instagram = String(siteSettings.instagram_link || "").trim();

if (footerMobile) {
  footerMobile.innerHTML = mobileNumber
    ? "📞 <a href='tel:" + mobileNumber + "'>" + mobileNumber + "</a>"
    : "";
}

if (footerEmail) {
  footerEmail.innerHTML = email
    ? "✉️ <a href='mailto:" + email + "'>" + email + "</a>"
    : "";
}

if (footerWhatsapp) {
  footerWhatsapp.innerHTML = whatsappNumber
    ? "<a class='footer-whatsapp-btn' href='https://wa.me/" + whatsappNumber + "' target='_blank'>💬 WhatsApp</a>"
    : "";
}

if (footerInstagram) {
  footerInstagram.innerHTML = instagram
    ? "<a class='footer-social-btn instagram' href='" + instagram + "' target='_blank'>📷 Instagram</a>"
    : "";
}

if (footerWhatsappSocial) {
  footerWhatsappSocial.innerHTML = whatsappNumber
    ? "<a class='footer-social-btn whatsapp' href='https://wa.me/" + whatsappNumber + "' target='_blank'>💬 WhatsApp</a>"
    : "";
}
	
  } catch (error) {
    siteSettings = {};
  }
}

async function loadHomeSections() {
  try {
    const res = await fetch("/api/home-sections");
    const data = await res.json();

    const sections = data.sections || [];

    allProducts = [];

    sections.forEach(function(section) {
      (section.products || []).forEach(function(product) {
        allProducts.push(product);
      });
    });

    renderHomeSections(sections);
  } catch (error) {
    document.getElementById("homeSections").innerHTML =
      '<div class="empty">' + error.message + '</div>';
  }
}

          function filterProducts() {
  const q = document.getElementById("searchInput").value.toLowerCase().trim();
  const wrap = document.getElementById("homeSections");

  if (!q) {
    loadHomeSections();
    return;
  }

  const filtered = allProducts.filter(function(product) {
    return (
      String(product.product_name || "").toLowerCase().includes(q) ||
      String(product.sku || "").toLowerCase().includes(q) ||
      String(product.dealer_name || "").toLowerCase().includes(q) ||
      String(product.page_names || "").toLowerCase().includes(q)
    );
  });

  if (filtered.length === 0) {
    wrap.innerHTML = '<div class="empty">No products found.</div>';
    return;
  }

  let html = "";
  html += "<div class='section-head'>";
  html += "<h2>Search Results</h2>";
  html += "</div>";
  html += "<div class='product-grid'>";
  html += filtered.map(productCard).join("");
  html += "</div>";

  wrap.innerHTML = html;
}

          function changeQtyFromCard(button, delta) {
  const card = button.closest(".product-card");
  const input = card.querySelector(".qty-input-card");

  const current = Number(input.value || 1);
  const next = Math.max(1, current + delta);

  input.value = next;
}

function getQtyFromCard(button) {
  const card = button.closest(".product-card");
  const input = card.querySelector(".qty-input-card");

  return Math.max(1, Number(input ? input.value : 1));
}

         function getList() {
  try {
    return JSON.parse(localStorage.getItem("your_list") || "[]");
  } catch (error) {
    return [];
  }
}

function saveList(list) {
  localStorage.setItem("your_list", JSON.stringify(list));
  updateListButton();
  renderYourList();
}

function addToListFromCard(productId, button) {
  const product = allProducts.find(function(item) {
    return String(item.id) === String(productId);
  });

  if (!product) return;

  const qty = getQtyFromCard(button);

  const list = getList();
  const existing = list.find(function(item) {
    return String(item.id) === String(product.id);
  });

  if (existing) {
    existing.qty += qty;
  } else {
    list.push({
      id: product.id,
      name: product.product_name,
      price: Number(product.show_price || 0),
      image: product.product_image_url || "https://via.placeholder.com/300x300?text=Product",
      slug: product.slug,
      qty: qty
    });
  }

  saveList(list);
}

function updateListButton() {
  const list = getList();
  const totalQty = list.reduce(function(sum, item) {
    return sum + Number(item.qty || 0);
  }, 0);

  const buttons = [
    document.getElementById("yourListBtn"),
    document.getElementById("yourListBtnMobile")
  ];

  buttons.forEach(function(btn) {
    if (!btn) return;

    btn.textContent = "Your List (" + totalQty + ")";

    if (totalQty > 0) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

function toggleYourList() {
  const panel = document.getElementById("yourListPanel");
  renderYourList();
  panel.classList.toggle("show");
}

function closeYourList() {
  document.getElementById("yourListPanel").classList.remove("show");
}

function renderYourList() {
  const body = document.getElementById("yourListBody");
  const totalBox = document.getElementById("yourListTotal");

  if (!body || !totalBox) return;

  const list = getList();

  if (list.length === 0) {
    body.innerHTML = '<div class="small-message">You have not added any product yet.</div>';
    totalBox.textContent = "₹0";
    return;
  }

  let total = 0;
  body.innerHTML = "";

  list.forEach(function(item) {
    const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
    total += itemTotal;

    const row = document.createElement("div");
    row.className = "list-row";

    row.innerHTML =
      "<div>" +
        "<img src='" + item.image + "' />" +
        "<div class='list-product-name'>" + item.name + "</div>" +
      "</div>" +
      "<div class='list-price'>₹" + Number(item.price || 0).toFixed(0) + " × " + item.qty + "</div>" +
      "<div class='list-price'>₹" + itemTotal.toFixed(0) + "</div>" +
      "<div class='list-mini-qty'>" +
        "<button onclick='changeListQty(" + item.id + ", -1)'>-</button>" +
        "<input value='" + item.qty + "' onchange='setListQty(" + item.id + ", this.value)' />" +
        "<button onclick='changeListQty(" + item.id + ", 1)'>+</button>" +
      "</div>" +
      "<button class='remove-list-btn' onclick='removeFromList(" + item.id + ")'>×</button>";

    body.appendChild(row);
  });

  totalBox.textContent = "₹" + total.toFixed(0);
}

function changeListQty(productId, delta) {
  const list = getList();

  const item = list.find(function(row) {
    return String(row.id) === String(productId);
  });

  if (!item) return;

  item.qty = Math.max(1, Number(item.qty || 1) + delta);
  saveList(list);
}

function setListQty(productId, value) {
  const list = getList();

  const item = list.find(function(row) {
    return String(row.id) === String(productId);
  });

  if (!item) return;

  item.qty = Math.max(1, Number(value || 1));
  saveList(list);
}

function removeFromList(productId) {
  const list = getList().filter(function(item) {
    return String(item.id) !== String(productId);
  });

  saveList(list);
}

function sendToWhatsapp() {
  const list = getList();

  if (list.length === 0) {
    alert("You have not added any product yet.");
    return;
  }

  const whatsappNumber = String(siteSettings.whatsapp_number || "").replace(/[^0-9]/g, "");

if (!whatsappNumber) {
  alert("WhatsApp number is not set. Please add it from Manage UI > Header & Footer.");
  return;
}

let total = 0;
  let message = "Hello, I want to order these products:" + String.fromCharCode(10) + String.fromCharCode(10);

  list.forEach(function(item) {
    const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
    total += itemTotal;

    message += item.name + " × " + item.qty + " = ₹" + itemTotal.toFixed(0) + String.fromCharCode(10);
  });

  message += String.fromCharCode(10) + "Total = ₹" + total.toFixed(0);

  const url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message);

  window.open(url, "_blank");
}
          loadSettings().then(function() {
  loadHeaderPages();
  loadHomeSections();
  updateListButton();
  renderYourList();
});
        </script>
      </body>
    </html>
  `);
});

app.get("/api/media-debug", async (req, res) => {
  const testFile = path.join(MEDIA_DIR, "test-write.txt");

  let canWrite = false;
  let writeError = "";

  try {
    fs.writeFileSync(testFile, "media test " + new Date().toISOString());
    canWrite = true;
  } catch (error) {
    writeError = error.message;
  }

  res.json({
    status: "ok",
    process_cwd: process.cwd(),
    media_upload_path_env: process.env.MEDIA_UPLOAD_PATH || "",
    final_media_dir_used_by_app: MEDIA_DIR,
    media_dir_exists: fs.existsSync(MEDIA_DIR),
    can_write_to_media_dir: canWrite,
    write_error: writeError
  });
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
   UPLOAD API
========================= */

app.post("/api/admin/upload", verifyAdmin, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No image uploaded"
      });
    }

    const fileUrl = "/media/" + req.file.filename;

    await db.query(
      "INSERT INTO media_uploads (file_url, file_type) VALUES (?, ?)",
      [fileUrl, req.file.mimetype]
    );

    res.json({
      status: "ok",
      message: "Image uploaded successfully",
      file_url: fileUrl
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Image upload failed",
      error: error.message
    });
  }
});

/* =========================
   SETTINGS API
========================= */

app.get("/api/settings", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT setting_key, setting_value FROM site_settings");

    const settings = {};

    rows.forEach(function(row) {
      settings[row.setting_key] = row.setting_value || "";
    });

    res.json({
      status: "ok",
      settings
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to fetch settings",
      error: error.message
    });
  }
});

app.post("/api/admin/settings", verifyAdmin, async (req, res) => {
  try {
    const allowedKeys = [
      "logo_url",
      "email",
      "mobile_number",
      "whatsapp_number",
      "instagram_link",
      "browse_all_products_link",
      "policies",
      "privacy_policy",
      "return_refund",
      "terms_condition"
    ];

    for (const key of allowedKeys) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        await db.query(
          `INSERT INTO site_settings (setting_key, setting_value)
           VALUES (?, ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [key, req.body[key] || ""]
        );
      }
    }

    res.json({
      status: "ok",
      message: "Settings saved successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to save settings",
      error: error.message
    });
  }
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

app.get("/api/header-pages", async (req, res) => {
  try {
    const [pages] = await db.query(`
      SELECT id, page_name, slug
      FROM pages
      WHERE is_active = true AND show_on_header = true
      ORDER BY sort_order ASC, id DESC
    `);

    res.json({
      status: "ok",
      pages
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load header pages",
      error: error.message
    });
  }
});

app.get("/api/page/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [pages] = await db.query(
      "SELECT * FROM pages WHERE slug = ? AND is_active = true LIMIT 1",
      [slug]
    );

    if (pages.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Page not found"
      });
    }

    const page = pages[0];

    const [products] = await db.query(`
      SELECT 
        p.*,
        GROUP_CONCAT(pg.page_name ORDER BY pg.page_name SEPARATOR ', ') AS page_names
      FROM products p
      INNER JOIN product_pages pp ON p.id = pp.product_id
      INNER JOIN pages pg ON pp.page_id = pg.id
      WHERE p.is_visible = true AND pp.page_id = ?
      GROUP BY p.id
      ORDER BY p.id DESC
    `, [page.id]);

    res.json({
      status: "ok",
      page,
      products
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load page products",
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

app.get("/api/product/:slug", async (req, res) => {
  try {
    const { slug } = req.params;

    const [products] = await db.query(`
      SELECT 
        p.*,
        GROUP_CONCAT(pg.page_name ORDER BY pg.page_name SEPARATOR ', ') AS page_names
      FROM products p
      LEFT JOIN product_pages pp ON p.id = pp.product_id
      LEFT JOIN pages pg ON pp.page_id = pg.id
      WHERE p.slug = ? AND p.is_visible = true
      GROUP BY p.id
      LIMIT 1
    `, [slug]);

    if (products.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Product not found"
      });
    }

    res.json({
      status: "ok",
      product: products[0]
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load product detail",
      error: error.message
    });
  }
});

app.get("/api/home-sections", async (req, res) => {
  try {
    const [pages] = await db.query(`
      SELECT *
      FROM pages
      WHERE is_active = true
      ORDER BY sort_order ASC, id DESC
    `);

    const sections = [];

    for (const page of pages) {
      const [products] = await db.query(`
        SELECT 
          p.*,
          GROUP_CONCAT(pg.page_name ORDER BY pg.page_name SEPARATOR ', ') AS page_names
        FROM products p
        INNER JOIN product_pages pp ON p.id = pp.product_id
        INNER JOIN pages pg ON pp.page_id = pg.id
        WHERE p.is_visible = true AND pp.page_id = ?
        GROUP BY p.id
        ORDER BY p.id DESC
        LIMIT 12
      `, [page.id]);

      if (products.length > 0) {
        sections.push({
          page,
          products
        });
      }
    }

    res.json({
      status: "ok",
      sections
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load homepage sections",
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

app.put("/api/admin/products/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

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
      is_visible,
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
      "SELECT id FROM products WHERE slug = ? AND id != ? LIMIT 1",
      [slug, id]
    );

    if (existingSlug.length > 0) {
      slug = slugBase + "-" + id;
    }

    if (sku) {
      const [existingSku] = await db.query(
        "SELECT id FROM products WHERE sku = ? AND id != ? LIMIT 1",
        [sku, id]
      );

      if (existingSku.length > 0) {
        return res.status(409).json({
          status: "error",
          message: "Product SKU already exists"
        });
      }
    }

    await db.query(
      `UPDATE products
       SET sku = ?,
           product_name = ?,
           slug = ?,
           product_image_url = ?,
           show_price = ?,
           crossed_price = ?,
           tag = ?,
           dealer_name = ?,
           dealer_price = ?,
           qty_in_stock = ?,
           demand_color = ?,
           is_visible = ?
       WHERE id = ?`,
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
        demand_color || "Green",
        is_visible === false ? 0 : 1,
        id
      ]
    );

    await replaceProductPages(id, page_ids);

    res.json({
      status: "ok",
      message: "Product updated successfully",
      slug
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update product",
      error: error.message
    });
  }
});

app.put("/api/admin/products/:id/quantity", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { qty_in_stock } = req.body;

    await db.query(
      "UPDATE products SET qty_in_stock = ? WHERE id = ?",
      [Number(qty_in_stock || 0), id]
    );

    res.json({
      status: "ok",
      message: "Quantity updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update quantity",
      error: error.message
    });
  }
});

app.put("/api/admin/products/:id/image", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { product_image_url } = req.body;

    if (!product_image_url) {
      return res.status(400).json({
        status: "error",
        message: "Product image URL is required"
      });
    }

    await db.query(
      "UPDATE products SET product_image_url = ? WHERE id = ?",
      [product_image_url, id]
    );

    res.json({
      status: "ok",
      message: "Product image saved successfully",
      product_image_url
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to save product image",
      error: error.message
    });
  }
});

app.put("/api/admin/products/:id/visibility", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { is_visible } = req.body;

    await db.query(
      "UPDATE products SET is_visible = ? WHERE id = ?",
      [is_visible ? 1 : 0, id]
    );

    res.json({
      status: "ok",
      message: "Product visibility updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to update product visibility",
      error: error.message
    });
  }
});

app.delete("/api/admin/products/:id", verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;

    await db.query("DELETE FROM products WHERE id = ?", [id]);

    res.json({
      status: "ok",
      message: "Product deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to delete product",
      error: error.message
    });
  }
});

/* =========================
   DASHBOARD API
========================= */

app.get("/api/admin/dashboard", verifyAdmin, async (req, res) => {
  try {
    const [summaryRows] = await db.query(`
      SELECT
        COUNT(*) AS total_sku,
        COALESCE(SUM(qty_in_stock), 0) AS total_quantity,
        COALESCE(SUM(dealer_price * qty_in_stock), 0) AS total_inventory_cost
      FROM products
    `);

    const [lowStockProducts] = await db.query(`
      SELECT
        id,
        sku,
        product_name,
        product_image_url,
        dealer_name,
        dealer_price,
        qty_in_stock,
        demand_color
      FROM products
      WHERE
        (demand_color = 'Green' AND qty_in_stock < 10)
        OR (demand_color = 'Yellow' AND qty_in_stock < 5)
        OR (demand_color = 'Red' AND qty_in_stock < 2)
      ORDER BY qty_in_stock ASC, product_name ASC
    `);

    const [dealers] = await db.query(`
      SELECT DISTINCT dealer_name
      FROM products
      WHERE dealer_name IS NOT NULL AND dealer_name != ''
      ORDER BY dealer_name ASC
    `);

    res.json({
      status: "ok",
      summary: {
        total_sku: Number(summaryRows[0].total_sku || 0),
        total_quantity: Number(summaryRows[0].total_quantity || 0),
        total_inventory_cost: Number(summaryRows[0].total_inventory_cost || 0)
      },
      low_stock_products: lowStockProducts,
      dealers: dealers.map(function(row) {
        return row.dealer_name;
      })
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Failed to load dashboard",
      error: error.message
    });
  }
});

app.get("/legal/:type", async (req, res) => {
  try {
    const { type } = req.params;

    const legalMap = {
      "policies": {
        key: "policies",
        title: "Policies"
      },
      "privacy-policy": {
        key: "privacy_policy",
        title: "Privacy Policy"
      },
      "return-refund": {
        key: "return_refund",
        title: "Return & Refund Policy"
      },
      "terms-condition": {
        key: "terms_condition",
        title: "Terms & Conditions"
      }
    };

    const selected = legalMap[type];

    if (!selected) {
      return res.status(404).send("Page not found");
    }

    const [rows] = await db.query(
      "SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1",
      [selected.key]
    );

    const content = rows.length > 0 && rows[0].setting_value
      ? rows[0].setting_value
      : "This page will be updated soon.";

    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${selected.title}</title>
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

            .simple-header {
              position: sticky;
              top: 0;
              background: #FFF8EC;
              border-bottom: 1px solid #DCCCAC;
              padding: 12px 14px;
              display: flex;
              justify-content: space-between;
              align-items: center;
              z-index: 50;
            }

            .simple-header a {
              text-decoration: none;
              color: #546B41;
              font-weight: 700;
              font-size: 14px;
            }

            .page-wrap {
              max-width: 850px;
              margin: auto;
              padding: 18px 14px 40px;
            }

            .legal-card {
              background: white;
              border: 1px solid #DCCCAC;
              border-radius: 18px;
              padding: 18px;
              box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
            }

            h1 {
              margin: 0 0 14px;
              font-size: 24px;
              color: #38472d;
            }

            .content {
              white-space: pre-wrap;
              line-height: 1.65;
              font-size: 15px;
              color: #4d5f3d;
            }
          </style>
        </head>

        <body>
          <header class="simple-header">
            <a href="/">← Back to Home</a>
            <a href="/">Home</a>
          </header>

          <main class="page-wrap">
            <div class="legal-card">
              <h1>${selected.title}</h1>
              <div class="content">${content}</div>
            </div>
          </main>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send("Failed to load legal page: " + error.message);
  }
});

app.get("/product/:slug", (req, res) => {
  const productSlug = req.params.slug;

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Product Detail</title>
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

          .site-header {
            position: sticky;
            top: 0;
            z-index: 50;
            background: #FFF8EC;
			border-bottom: 1px solid #DCCCAC;
            padding: 10px 12px;
            display: grid;
            grid-template-columns: 70px 1fr auto 38px;
            gap: 8px;
            align-items: center;
          }

          .logo-box {
            height: 38px;
            border-radius: 10px;
            background: #546B41;
            color: #FFF8EC;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            overflow: hidden;
            border: 1px solid #DCCCAC;
          }

          .logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: none;
            background: #FFF8EC;
            padding: 3px;
          }

          .logo-box span {
            font-size: 13px;
            font-weight: 700;
          }

          .search-box {
            display: flex;
            align-items: center;
            gap: 6px;
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 999px;
            padding: 8px 10px;
          }

          .search-box input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            color: #546B41;
            font-size: 13px;
          }

          .list-btn {
            border: 1px solid #DCCCAC;
            background: white;
            color: #546B41;
            border-radius: 999px;
            padding: 9px 10px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
            cursor: pointer;
          }

          .list-btn.active {
            background: #546B41;
            color: #FFF8EC;
            border-color: #546B41;
          }

          .desktop-right-header,
          .desktop-pages-nav,
          .desktop-search-btn {
            display: none;
          }

          .mobile-list-btn {
            display: inline-block;
          }

          .pages-menu-btn {
            border: 1px solid #DCCCAC;
            background: white;
            color: #546B41;
            border-radius: 10px;
            height: 38px;
            font-size: 22px;
            font-weight: 700;
            cursor: pointer;
            line-height: 1;
          }

          .pages-menu-panel {
            position: fixed;
            top: 0;
            right: -82%;
            width: 82%;
            max-width: 320px;
            height: 100vh;
            z-index: 100;
            background: white;
            border-left: 1px solid #DCCCAC;
            box-shadow: -14px 0 34px rgba(84, 107, 65, 0.18);
            padding: 14px;
            transition: right 0.28s ease;
            display: block;
          }

          .pages-menu-panel.show {
            right: 0;
          }

          .desktop-search-panel {
            display: none;
            position: fixed;
            top: 59px;
            left: 10px;
            right: 10px;
            z-index: 70;
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 0 0 18px 18px;
            box-shadow: 0 14px 34px rgba(84, 107, 65, 0.18);
            padding: 10px;
          }

          .desktop-search-panel.show {
            display: grid;
            gap: 8px;
          }

          .desktop-search-panel input {
            width: 100%;
            border: 1px solid #DCCCAC;
            background: #FFF8EC;
            color: #546B41;
            border-radius: 12px;
            padding: 12px;
            outline: none;
          }

          .menu-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 14px;
            padding: 12px;
            margin-bottom: 12px;
          }

          .close-menu-btn {
            border: none;
            background: #DCCCAC;
            color: #546B41;
            border-radius: 999px;
            width: 30px;
            height: 30px;
            font-size: 20px;
            font-weight: 700;
            cursor: pointer;
          }

          .menu-links {
            display: grid;
            gap: 8px;
          }

          .pages-menu-panel a {
            text-decoration: none;
            background: #FFF8EC;
            color: #546B41;
            border: 1px solid #DCCCAC;
            border-radius: 12px;
            padding: 11px 12px;
            font-size: 14px;
            font-weight: 600;
          }

          .page-wrap {
            padding: 14px 10px 28px;
          }

          .detail-card {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 18px;
            overflow: hidden;
          }

          .detail-img-wrap {
            position: relative;
            background: #DCCCAC;
          }

          .detail-img {
            width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            display: block;
          }

          .product-tag {
            position: absolute;
            top: 10px;
            left: 10px;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 999px;
            padding: 5px 9px;
            font-size: 11px;
            font-weight: 700;
          }

          .detail-info {
            padding: 14px;
          }

          .detail-name {
            margin: 0 0 8px;
            font-size: 22px;
            line-height: 1.2;
            color: #38472d;
          }

          .price-row {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 12px;
          }

          .detail-price {
            font-size: 22px;
            font-weight: 800;
            color: #546B41;
          }

          .crossed-price {
            font-size: 15px;
            color: #8a8a8a;
            text-decoration: line-through;
          }

          .page-names {
            font-size: 13px;
            color: #6f7a5f;
            margin-bottom: 14px;
          }

          .detail-actions {
            display: grid;
            grid-template-columns: 120px 1fr;
            gap: 10px;
            align-items: center;
          }

          .qty-row {
            display: grid;
            grid-template-columns: 32px 1fr 32px;
            gap: 4px;
          }

          .qty-row button {
            border: none;
            background: #DCCCAC;
            color: #546B41;
            border-radius: 8px;
            height: 38px;
            font-size: 16px;
            font-weight: 800;
          }

          .qty-row input {
            width: 100%;
            border: 1px solid #DCCCAC;
            border-radius: 8px;
            text-align: center;
            font-size: 14px;
            color: #546B41;
            height: 38px;
          }

          .add-btn {
            border: none;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 10px;
            height: 38px;
            font-size: 14px;
            font-weight: 800;
          }

          .empty {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 14px;
            padding: 16px;
            color: #6f7a5f;
            font-size: 14px;
          }

          .your-list-panel {
            display: none;
            position: fixed;
            top: 59px;
            left: 10px;
            right: 10px;
            z-index: 60;
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 0 0 18px 18px;
            box-shadow: 0 14px 34px rgba(84, 107, 65, 0.18);
            max-height: 70vh;
            overflow: auto;
          }

          .your-list-panel.show {
            display: block;
          }

          .list-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #546B41;
            color: #FFF8EC;
          }

          .close-list-btn {
            border: none;
            background: #DCCCAC;
            color: #546B41;
            border-radius: 999px;
            width: 28px;
            height: 28px;
            font-weight: 700;
          }

          .list-body {
            padding: 10px;
          }

          .small-message {
            padding: 14px;
            color: #6f7a5f;
            font-size: 14px;
          }

          .list-row {
            display: grid;
            grid-template-columns: 48px 1fr 72px 72px 28px;
            gap: 6px;
            align-items: center;
            border-bottom: 1px solid #f0e4ce;
            padding: 8px 0;
          }

          .list-row img {
            width: 44px;
            height: 44px;
            border-radius: 8px;
            object-fit: cover;
            border: 1px solid #DCCCAC;
          }

          .list-product-name {
            font-size: 11px;
            line-height: 1.2;
            color: #38472d;
            margin-top: 3px;
          }

          .list-price {
            font-size: 12px;
            font-weight: 700;
            color: #546B41;
          }

          .list-mini-qty {
            display: grid;
            grid-template-columns: 20px 1fr 20px;
            gap: 2px;
          }

          .list-mini-qty button {
            border: none;
            background: #DCCCAC;
            color: #546B41;
            border-radius: 6px;
            height: 24px;
            font-weight: 700;
          }

          .list-mini-qty input {
            width: 100%;
            border: 1px solid #DCCCAC;
            border-radius: 6px;
            text-align: center;
            font-size: 11px;
            height: 24px;
            padding: 0;
          }

          .remove-list-btn {
            border: none;
            background: #fee2e2;
            color: #991b1b;
            border-radius: 7px;
            height: 26px;
            font-weight: 700;
          }

          .list-footer {
            padding: 12px;
            border-top: 1px solid #DCCCAC;
            background: #FFF8EC;
          }

          .total-line {
            display: flex;
            justify-content: space-between;
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 10px;
          }

          .send-wa-btn {
            width: 100%;
            border: none;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 12px;
            padding: 12px;
            font-size: 14px;
            font-weight: 700;
          }

          @media (min-width: 768px) {
            .page-wrap {
              max-width: 900px;
              margin: auto;
              padding: 24px;
            }

            .site-header {
              grid-template-columns: 140px 1fr;
              padding: 12px 24px;
            }

            .mobile-list-btn,
            .mobile-search-box,
            .pages-menu-btn {
              display: none;
            }

            .desktop-right-header {
              display: flex;
              justify-content: flex-end;
              align-items: center;
              gap: 18px;
              min-width: 0;
            }

            .desktop-pages-nav {
              display: flex;
              gap: 16px;
              align-items: center;
              overflow-x: auto;
            }

            .desktop-pages-nav a {
              flex: 0 0 auto;
              text-decoration: none;
              color: #546B41;
              font-size: 14px;
              font-weight: 600;
            }

            .desktop-pages-nav a.active {
              color: #38472d;
              font-weight: 800;
              text-decoration: underline;
              text-underline-offset: 4px;
            }

            .desktop-search-btn {
              display: block;
              border: none;
              background: transparent;
              color: #546B41;
              width: 32px;
              height: 32px;
              font-size: 18px;
              cursor: pointer;
            }

            .logo-box {
              height: 44px;
            }

            .detail-card {
              display: grid;
              grid-template-columns: 380px 1fr;
            }
          }
        </style>
      </head>

      <body>
        <header class="site-header">
          <a href="/" class="logo-box">
            <img id="siteLogoImg" src="" alt="Logo" />
            <span id="siteLogoText">LOGO</span>
          </a>

          <div class="desktop-right-header">
            <nav id="desktopPagesNav" class="desktop-pages-nav"></nav>
            <button class="desktop-search-btn" onclick="toggleDesktopSearch()">🔍</button>
            <button class="list-btn" id="yourListBtn" onclick="toggleYourList()">Your List (0)</button>
          </div>

          <div class="search-box mobile-search-box">
            <span>🔍</span>
            <input id="searchInput" placeholder="Search products..." onkeydown="searchFromInput(event)" />
          </div>

          <button class="list-btn mobile-list-btn" id="yourListBtnMobile" onclick="toggleYourList()">Your List (0)</button>

          <button class="pages-menu-btn" onclick="togglePagesMenu()">☰</button>
        </header>

        <div id="pagesMenuPanel" class="pages-menu-panel"></div>

        <div id="desktopSearchPanel" class="desktop-search-panel">
          <input id="desktopSearchInput" placeholder="Search products..." onkeydown="searchFromInput(event)" />
        </div>

        <div id="yourListPanel" class="your-list-panel">
          <div class="list-head">
            <strong>Your List</strong>
            <button class="close-list-btn" onclick="closeYourList()">×</button>
          </div>

          <div id="yourListBody" class="list-body"></div>

          <div class="list-footer">
            <div class="total-line">
              <span>Total</span>
              <span id="yourListTotal">₹0</span>
            </div>

            <button class="send-wa-btn" onclick="sendToWhatsapp()">Send to WhatsApp</button>
          </div>
        </div>

        <main class="page-wrap">
          <div id="productDetail"></div>
        </main>

        <script>
          const productSlug = ${JSON.stringify(productSlug)};
          let currentProduct = null;
          let siteSettings = {};

          function loadHeaderPages() {
            const desktopNav = document.getElementById("desktopPagesNav");
            const mobilePanel = document.getElementById("pagesMenuPanel");

            fetch("/api/header-pages")
              .then(function(res) { return res.json(); })
              .then(function(data) {
                const pages = data.pages || [];
                let desktopHtml = "";
                let mobileLinks = "";

                desktopHtml += "<a href='/'>Home</a>";
                mobileLinks += "<a href='/'>Home</a>";

                pages.forEach(function(page) {
                  desktopHtml += "<a href='/page/" + page.slug + "'>" + page.page_name + "</a>";
                  mobileLinks += "<a href='/page/" + page.slug + "'>" + page.page_name + "</a>";
                });

                const mobileHtml =
                  "<div class='menu-head'>" +
                    "<strong>Pages</strong>" +
                    "<button class='close-menu-btn' onclick='closePagesMenu()'>×</button>" +
                  "</div>" +
                  "<div class='menu-links'>" +
                    mobileLinks +
                  "</div>";

                if (desktopNav) desktopNav.innerHTML = desktopHtml;
                if (mobilePanel) mobilePanel.innerHTML = mobileHtml;
              });
          }

          function togglePagesMenu() {
            const panel = document.getElementById("pagesMenuPanel");
            if (!panel) return;
            panel.classList.toggle("show");
          }

          function closePagesMenu() {
            const panel = document.getElementById("pagesMenuPanel");
            if (!panel) return;
            panel.classList.remove("show");
          }

          function toggleDesktopSearch() {
            const panel = document.getElementById("desktopSearchPanel");
            if (!panel) return;
            panel.classList.toggle("show");
          }

          function searchFromInput(event) {
            if (event.key !== "Enter") return;

            const value = event.target.value.trim();

            if (value) {
              window.location.href = "/?q=" + encodeURIComponent(value);
            }
          }

          function renderProduct(product) {
            const image = product.product_image_url || "https://via.placeholder.com/600x600?text=Product";
            const price = Number(product.show_price || 0).toFixed(0);
            const crossedPrice = Number(product.crossed_price || 0);
            const tag = String(product.tag || "None");

            const tagHtml = tag && tag !== "None"
              ? "<div class='product-tag'>" + tag + "</div>"
              : "";

            const crossedPriceHtml = crossedPrice > 0
              ? "<div class='crossed-price'>₹" + crossedPrice.toFixed(0) + "</div>"
              : "";

            const pageNamesHtml = product.page_names
              ? "<div class='page-names'>Category: " + product.page_names + "</div>"
              : "";

            document.getElementById("productDetail").innerHTML =
              "<div class='detail-card'>" +
                "<div class='detail-img-wrap'>" +
                  tagHtml +
                  "<img class='detail-img' src='" + image + "' alt='" + product.product_name + "' />" +
                "</div>" +
                "<div class='detail-info'>" +
                  "<h1 class='detail-name'>" + product.product_name + "</h1>" +
                  "<div class='price-row'>" +
                    "<div class='detail-price'>₹" + price + "</div>" +
                    crossedPriceHtml +
                  "</div>" +
                  pageNamesHtml +
                  "<div class='detail-actions'>" +
                    "<div class='qty-row'>" +
                      "<button onclick='changeQty(-1)'>-</button>" +
                      "<input id='detailQty' type='number' min='1' value='1' />" +
                      "<button onclick='changeQty(1)'>+</button>" +
                    "</div>" +
                    "<button class='add-btn' onclick='addToList()'>Add to Your List</button>" +
                  "</div>" +
                "</div>" +
              "</div>";
          }

          function loadProduct() {
            fetch("/api/product/" + productSlug)
              .then(function(res) { return res.json(); })
              .then(function(data) {
                if (data.status !== "ok") {
                  document.getElementById("productDetail").innerHTML =
                    "<div class='empty'>Product not found.</div>";
                  return;
                }

                currentProduct = data.product;
                renderProduct(currentProduct);
              })
              .catch(function(error) {
                document.getElementById("productDetail").innerHTML =
                  "<div class='empty'>" + error.message + "</div>";
              });
          }

          function changeQty(delta) {
            const input = document.getElementById("detailQty");
            const current = Number(input.value || 1);
            input.value = Math.max(1, current + delta);
          }

          function getList() {
            try {
              return JSON.parse(localStorage.getItem("your_list") || "[]");
            } catch (error) {
              return [];
            }
          }

          function saveList(list) {
            localStorage.setItem("your_list", JSON.stringify(list));
            updateListButton();
            renderYourList();
          }

          function addToList() {
            if (!currentProduct) return;

            const qty = Math.max(1, Number(document.getElementById("detailQty").value || 1));
            const list = getList();

            const existing = list.find(function(item) {
              return String(item.id) === String(currentProduct.id);
            });

            if (existing) {
              existing.qty += qty;
            } else {
              list.push({
                id: currentProduct.id,
                name: currentProduct.product_name,
                price: Number(currentProduct.show_price || 0),
                image: currentProduct.product_image_url || "https://via.placeholder.com/300x300?text=Product",
                slug: currentProduct.slug,
                qty: qty
              });
            }

            saveList(list);
          }

          function updateListButton() {
            const list = getList();
            const totalQty = list.reduce(function(sum, item) {
              return sum + Number(item.qty || 0);
            }, 0);

            const buttons = [
              document.getElementById("yourListBtn"),
              document.getElementById("yourListBtnMobile")
            ];

            buttons.forEach(function(btn) {
              if (!btn) return;

              btn.textContent = "Your List (" + totalQty + ")";

              if (totalQty > 0) {
                btn.classList.add("active");
              } else {
                btn.classList.remove("active");
              }
            });
          }

          function toggleYourList() {
            const panel = document.getElementById("yourListPanel");
            renderYourList();
            panel.classList.toggle("show");
          }

          function closeYourList() {
            document.getElementById("yourListPanel").classList.remove("show");
          }

          function renderYourList() {
            const body = document.getElementById("yourListBody");
            const totalBox = document.getElementById("yourListTotal");

            if (!body || !totalBox) return;

            const list = getList();

            if (list.length === 0) {
              body.innerHTML = "<div class='small-message'>You have not added any product yet.</div>";
              totalBox.textContent = "₹0";
              return;
            }

            let total = 0;
            body.innerHTML = "";

            list.forEach(function(item) {
              const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
              total += itemTotal;

              const row = document.createElement("div");
              row.className = "list-row";

              row.innerHTML =
                "<div>" +
                  "<img src='" + item.image + "' />" +
                  "<div class='list-product-name'>" + item.name + "</div>" +
                "</div>" +
                "<div class='list-price'>₹" + Number(item.price || 0).toFixed(0) + " × " + item.qty + "</div>" +
                "<div class='list-price'>₹" + itemTotal.toFixed(0) + "</div>" +
                "<div class='list-mini-qty'>" +
                  "<button onclick='changeListQty(" + item.id + ", -1)'>-</button>" +
                  "<input value='" + item.qty + "' onchange='setListQty(" + item.id + ", this.value)' />" +
                  "<button onclick='changeListQty(" + item.id + ", 1)'>+</button>" +
                "</div>" +
                "<button class='remove-list-btn' onclick='removeFromList(" + item.id + ")'>×</button>";

              body.appendChild(row);
            });

            totalBox.textContent = "₹" + total.toFixed(0);
          }

          function changeListQty(productId, delta) {
            const list = getList();

            const item = list.find(function(row) {
              return String(row.id) === String(productId);
            });

            if (!item) return;

            item.qty = Math.max(1, Number(item.qty || 1) + delta);
            saveList(list);
          }

          function setListQty(productId, value) {
            const list = getList();

            const item = list.find(function(row) {
              return String(row.id) === String(productId);
            });

            if (!item) return;

            item.qty = Math.max(1, Number(value || 1));
            saveList(list);
          }

          function removeFromList(productId) {
            const list = getList().filter(function(item) {
              return String(item.id) !== String(productId);
            });

            saveList(list);
          }

          function loadSettings() {
            fetch("/api/settings")
              .then(function(res) { return res.json(); })
              .then(function(data) {
                siteSettings = data.settings || {};

                const logoImg = document.getElementById("siteLogoImg");
                const logoText = document.getElementById("siteLogoText");
                const logoUrl = String(siteSettings.logo_url || "").trim();

                if (logoUrl && logoImg && logoText) {
                  logoImg.src = logoUrl;
                  logoImg.style.display = "block";
                  logoText.style.display = "none";
                } else if (logoImg && logoText) {
                  logoImg.style.display = "none";
                  logoText.style.display = "block";
                }
              });
          }

          function sendToWhatsapp() {
            const list = getList();

            if (list.length === 0) {
              alert("You have not added any product yet.");
              return;
            }

            const whatsappNumber = String(siteSettings.whatsapp_number || "").replace(/[^0-9]/g, "");

            if (!whatsappNumber) {
              alert("WhatsApp number is not set. Please add it from Manage UI > Header & Footer.");
              return;
            }

            let total = 0;
            let message = "Hello, I want to order these products:" + String.fromCharCode(10) + String.fromCharCode(10);

            list.forEach(function(item) {
              const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
              total += itemTotal;

              message += item.name + " × " + item.qty + " = ₹" + itemTotal.toFixed(0) + String.fromCharCode(10);
            });

            message += String.fromCharCode(10) + "Total = ₹" + total.toFixed(0);

            const url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message);

            window.open(url, "_blank");
          }

          loadSettings();
          loadHeaderPages();
          loadProduct();
          updateListButton();
          renderYourList();
        </script>
      </body>
    </html>
  `);
});

app.get("/page/:slug", (req, res) => {
  const pageSlug = req.params.slug;

  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Category Page</title>
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

          .site-header {
  position: sticky;
  top: 0;
  z-index: 50;
  background: #FFF8EC;
  border-bottom: 1px solid #DCCCAC;
  padding: 10px 12px;
  display: grid;
  grid-template-columns: 70px 1fr auto 38px;
  gap: 8px;
  align-items: center;
}

          .logo-box {
            height: 38px;
            border-radius: 10px;
            background: #546B41;
            color: #FFF8EC;
            display: flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            overflow: hidden;
            border: 1px solid #DCCCAC;
          }

          .logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            display: none;
            background: #FFF8EC;
            padding: 3px;
          }

          .logo-box span {
            font-size: 13px;
            font-weight: 700;
          }

          .search-box {
            display: flex;
            align-items: center;
            gap: 6px;
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 999px;
            padding: 8px 10px;
          }

          .search-box input {
            width: 100%;
            border: none;
            outline: none;
            background: transparent;
            color: #546B41;
            font-size: 13px;
          }

          .list-btn {
            border: 1px solid #DCCCAC;
            background: white;
            color: #546B41;
            border-radius: 999px;
            padding: 9px 10px;
            font-size: 12px;
            font-weight: 600;
            white-space: nowrap;
          }

          .list-btn.active {
            background: #546B41;
            color: #FFF8EC;
            border-color: #546B41;
          }

		  .desktop-right-header {
  display: none;
}

.desktop-pages-nav {
  display: none;
}

.desktop-search-btn {
  display: none;
}

.mobile-list-btn {
  display: inline-block;
}

.pages-menu-btn {
  border: 1px solid #DCCCAC;
  background: white;
  color: #546B41;
  border-radius: 10px;
  height: 38px;
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  line-height: 1;
}

.pages-menu-panel {
  position: fixed;
  top: 0;
  right: -82%;
  width: 82%;
  max-width: 320px;
  height: 100vh;
  z-index: 100;
  background: white;
  border-left: 1px solid #DCCCAC;
  box-shadow: -14px 0 34px rgba(84, 107, 65, 0.18);
  padding: 14px;
  transition: right 0.28s ease;
  display: block;
}

.pages-menu-panel.show {
  right: 0;
}

.desktop-search-panel {
  display: none;
  position: fixed;
  top: 59px;
  left: 10px;
  right: 10px;
  z-index: 70;
  background: white;
  border: 1px solid #DCCCAC;
  border-radius: 0 0 18px 18px;
  box-shadow: 0 14px 34px rgba(84, 107, 65, 0.18);
  padding: 10px;
}

.desktop-search-panel.show {
  display: grid;
  gap: 8px;
}

.menu-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #546B41;
  color: #FFF8EC;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 12px;
}

.menu-head strong {
  font-size: 15px;
}

.close-menu-btn {
  border: none;
  background: #DCCCAC;
  color: #546B41;
  border-radius: 999px;
  width: 30px;
  height: 30px;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}

.menu-links {
  display: grid;
  gap: 8px;
}

.pages-menu-panel a {
  text-decoration: none;
  background: #FFF8EC;
  color: #546B41;
  border: 1px solid #DCCCAC;
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
  font-weight: 600;
}

.pages-menu-panel a.active {
  background: #546B41;
  color: #FFF8EC;
}

.desktop-search-panel input {
  width: 100%;
  border: 1px solid #DCCCAC;
  background: #FFF8EC;
  color: #546B41;
  border-radius: 12px;
  padding: 12px;
  outline: none;
}

          .page-wrap {
            padding: 14px 10px 28px;
          }

          .page-title-box {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 16px;
            padding: 14px;
            margin-bottom: 14px;
          }

          .page-title-box h1 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
          }

          .page-title-box p {
            margin: 5px 0 0;
            color: #6f7a5f;
            font-size: 14px;
          }

          .product-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 8px;
          }

          .product-card {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 13px;
            overflow: hidden;
          }

          .product-img {
            width: 100%;
            aspect-ratio: 1 / 1;
            object-fit: cover;
            display: block;
            background: #DCCCAC;
          }

          .product-info {
            padding: 6px;
          }

          .name-price-row {
            display: flex;
            justify-content: space-between;
            gap: 4px;
            align-items: flex-start;
            min-height: 30px;
          }

          .product-name {
            font-size: 11px;
            line-height: 1.2;
            font-weight: 500;
            color: #38472d;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
          }

          .product-price {
  font-size: 11px;
  font-weight: 700;
  color: #546B41;
  white-space: nowrap;
}

.price-stack {
  text-align: right;
  line-height: 1.1;
}

.crossed-price {
  font-size: 10px;
  color: #8a8a8a;
  text-decoration: line-through;
  margin-top: 2px;
}

.product-image-wrap {
  position: relative;
}

.product-tag {
  position: absolute;
  top: 5px;
  left: 5px;
  background: #546B41;
  color: #FFF8EC;
  border-radius: 999px;
  padding: 3px 6px;
  font-size: 9px;
  font-weight: 700;
}

          .card-action-row {
            display: grid;
            grid-template-columns: 1fr 38px;
            gap: 4px;
            margin-top: 6px;
            align-items: center;
          }

          .qty-row {
            display: grid;
            grid-template-columns: 18px 1fr 18px;
            gap: 2px;
          }

          .qty-row button {
            border: none;
            background: #DCCCAC;
            color: #546B41;
            border-radius: 6px;
            height: 24px;
            font-size: 12px;
            font-weight: 700;
          }

          .qty-row input {
            width: 100%;
            border: 1px solid #DCCCAC;
            border-radius: 6px;
            text-align: center;
            font-size: 11px;
            color: #546B41;
            height: 24px;
            padding: 0;
          }

          .add-btn {
            border: none;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 7px;
            height: 24px;
            font-size: 10px;
            font-weight: 700;
          }

          .empty {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 14px;
            padding: 16px;
            color: #6f7a5f;
            font-size: 14px;
          }

          .your-list-panel {
            display: none;
            position: fixed;
            top: 59px;
            left: 10px;
            right: 10px;
            z-index: 60;
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 0 0 18px 18px;
            box-shadow: 0 14px 34px rgba(84, 107, 65, 0.18);
            max-height: 70vh;
            overflow: auto;
          }

          .your-list-panel.show {
            display: block;
          }

          .list-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 12px;
            background: #546B41;
            color: #FFF8EC;
          }

          .close-list-btn {
            border: none;
            background: #DCCCAC;
            color: #546B41;
            border-radius: 999px;
            width: 28px;
            height: 28px;
            font-weight: 700;
          }

          .list-body {
            padding: 10px;
          }

          .list-row {
            display: grid;
            grid-template-columns: 48px 1fr 72px 72px 28px;
            gap: 6px;
            align-items: center;
            border-bottom: 1px solid #f0e4ce;
            padding: 8px 0;
          }

          .list-row img {
            width: 44px;
            height: 44px;
            border-radius: 8px;
            object-fit: cover;
            border: 1px solid #DCCCAC;
          }

          .list-product-name {
            font-size: 11px;
            line-height: 1.2;
            color: #38472d;
            margin-top: 3px;
          }

          .list-price {
            font-size: 12px;
            font-weight: 700;
            color: #546B41;
          }

          .list-mini-qty {
            display: grid;
            grid-template-columns: 20px 1fr 20px;
            gap: 2px;
          }

          .list-mini-qty button {
            border: none;
            background: #DCCCAC;
            color: #546B41;
            border-radius: 6px;
            height: 24px;
            font-weight: 700;
          }

          .list-mini-qty input {
            width: 100%;
            border: 1px solid #DCCCAC;
            border-radius: 6px;
            text-align: center;
            font-size: 11px;
            height: 24px;
            padding: 0;
          }

          .remove-list-btn {
            border: none;
            background: #fee2e2;
            color: #991b1b;
            border-radius: 7px;
            height: 26px;
            font-weight: 700;
          }

          .list-footer {
            padding: 12px;
            border-top: 1px solid #DCCCAC;
            background: #FFF8EC;
          }

          .total-line {
            display: flex;
            justify-content: space-between;
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 10px;
          }

          .send-wa-btn {
            width: 100%;
            border: none;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 12px;
            padding: 12px;
            font-size: 14px;
            font-weight: 700;
          }

          .small-message {
            padding: 14px;
            color: #6f7a5f;
            font-size: 14px;
          }

          @media (min-width: 768px) {
            .page-wrap {
              max-width: 1100px;
              margin: auto;
              padding: 24px;
            }

            .site-header {
  grid-template-columns: 140px 1fr;
  padding: 12px 24px;
}

.mobile-list-btn {
  display: none;
}

.mobile-search-box {
  display: none;
}

.pages-menu-btn {
  display: none;
}

.desktop-right-header {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 18px;
  min-width: 0;
}

.desktop-pages-nav {
  display: flex;
  gap: 16px;
  align-items: center;
  overflow-x: auto;
}

.desktop-pages-nav a {
  flex: 0 0 auto;
  text-decoration: none;
  color: #546B41;
  font-size: 14px;
  font-weight: 600;
}

.desktop-pages-nav a.active {
  color: #38472d;
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 4px;
}

.desktop-search-btn {
  display: block;
  border: none;
  background: transparent;
  color: #546B41;
  width: 32px;
  height: 32px;
  font-size: 18px;
  cursor: pointer;
}

            .logo-box {
              height: 44px;
            }

            .product-grid {
              grid-template-columns: repeat(6, 1fr);
              gap: 12px;
            }

            .product-name,
            .product-price {
              font-size: 13px;
            }

            .card-action-row {
              grid-template-columns: 1fr 52px;
            }
          }
        </style>
      </head>

      <body>
        <header class="site-header">
  <a href="/" class="logo-box">
    <img id="siteLogoImg" src="" alt="Logo" />
    <span id="siteLogoText">LOGO</span>
  </a>

  <div class="desktop-right-header">
    <nav id="desktopPagesNav" class="desktop-pages-nav"></nav>
    <button class="desktop-search-btn" onclick="toggleDesktopSearch()">🔍</button>
    <button class="list-btn" id="yourListBtn" onclick="toggleYourList()">Your List (0)</button>
  </div>

  <div class="search-box mobile-search-box">
    <span>🔍</span>
    <input id="searchInput" placeholder="Search products..." oninput="filterProducts()" />
  </div>

  <button class="list-btn mobile-list-btn" id="yourListBtnMobile" onclick="toggleYourList()">Your List (0)</button>

  <button class="pages-menu-btn" onclick="togglePagesMenu()">☰</button>
</header>

<div id="pagesMenuPanel" class="pages-menu-panel"></div>

<div id="desktopSearchPanel" class="desktop-search-panel">
  <input id="desktopSearchInput" placeholder="Search products..." oninput="filterProductsFromDesktop()" />
</div>

        <div id="yourListPanel" class="your-list-panel">
          <div class="list-head">
            <strong>Your List</strong>
            <button class="close-list-btn" onclick="closeYourList()">×</button>
          </div>

          <div id="yourListBody" class="list-body"></div>

          <div class="list-footer">
            <div class="total-line">
              <span>Total</span>
              <span id="yourListTotal">₹0</span>
            </div>

            <button class="send-wa-btn" onclick="sendToWhatsapp()">
              <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style="width:18px;height:18px;vertical-align:middle;margin-right:6px;" />
              Send to WhatsApp
            </button>
          </div>
        </div>

        <main class="page-wrap">
          <section class="page-title-box">
            <h1 id="pageTitle">Loading...</h1>
            <p id="pageSubheading"></p>
          </section>

          <section>
            <div id="productsGrid" class="product-grid"></div>
          </section>
        </main>

        <script>
          const pageSlug = ${JSON.stringify(pageSlug)};
          let allProducts = [];
          let siteSettings = {};

          function productCard(product) {
  const image = product.product_image_url || "https://via.placeholder.com/300x300?text=Product";
  const price = Number(product.show_price || 0).toFixed(0);
  const crossedPrice = Number(product.crossed_price || 0);
  const tag = String(product.tag || "None");

  const tagHtml = tag && tag !== "None"
    ? "<div class='product-tag'>" + tag + "</div>"
    : "";

  const crossedPriceHtml = crossedPrice > 0
    ? "<div class='crossed-price'>₹" + crossedPrice.toFixed(0) + "</div>"
    : "";

  return "" +
    "<div class='product-card'>" +
      "<a href='/product/" + product.slug + "'>" +
        "<div class='product-image-wrap'>" +
          tagHtml +
          "<img class='product-img' src='" + image + "' alt='" + product.product_name + "' />" +
        "</div>" +
      "</a>" +
      "<div class='product-info'>" +
        "<div class='name-price-row'>" +
          "<div class='product-name'>" + product.product_name + "</div>" +
          "<div class='price-stack'>" +
            "<div class='product-price'>₹" + price + "</div>" +
            crossedPriceHtml +
          "</div>" +
        "</div>" +
        "<div class='card-action-row'>" +
          "<div class='qty-row'>" +
            "<button onclick='changeQtyFromCard(this, -1)'>-</button>" +
            "<input class='qty-input-card' type='number' min='1' value='1' />" +
            "<button onclick='changeQtyFromCard(this, 1)'>+</button>" +
          "</div>" +
          "<button class='add-btn' onclick='addToListFromCard(" + product.id + ", this)'>Add</button>" +
        "</div>" +
      "</div>" +
    "</div>";
}

          function renderProducts(products) {
            const grid = document.getElementById("productsGrid");

            if (!products || products.length === 0) {
              grid.className = "";
              grid.innerHTML = '<div class="empty">No products found in this category.</div>';
              return;
            }

            grid.className = "product-grid";
            grid.innerHTML = products.map(productCard).join("");
          }

		  async function loadHeaderPages() {
  const desktopNav = document.getElementById("desktopPagesNav");
  const mobilePanel = document.getElementById("pagesMenuPanel");

  try {
    const res = await fetch("/api/header-pages");
    const data = await res.json();
    const pages = data.pages || [];

    let desktopHtml = "";
    let mobileLinks = "";

    desktopHtml += "<a href='/'>Home</a>";
    mobileLinks += "<a href='/'>Home</a>";

    pages.forEach(function(page) {
      const activeClass = page.slug === pageSlug ? " class='active'" : "";
      desktopHtml += "<a" + activeClass + " href='/page/" + page.slug + "'>" + page.page_name + "</a>";
      mobileLinks += "<a" + activeClass + " href='/page/" + page.slug + "'>" + page.page_name + "</a>";
    });

    const mobileHtml =
      "<div class='menu-head'>" +
        "<strong>Pages</strong>" +
        "<button class='close-menu-btn' onclick='closePagesMenu()'>×</button>" +
      "</div>" +
      "<div class='menu-links'>" +
        mobileLinks +
      "</div>";

    if (desktopNav) desktopNav.innerHTML = desktopHtml;
    if (mobilePanel) mobilePanel.innerHTML = mobileHtml;
  } catch (error) {
    if (desktopNav) desktopNav.innerHTML = "";
    if (mobilePanel) mobilePanel.innerHTML = "";
  }
}

function togglePagesMenu() {
  const panel = document.getElementById("pagesMenuPanel");
  if (!panel) return;
  panel.classList.toggle("show");
}

function closePagesMenu() {
  const panel = document.getElementById("pagesMenuPanel");
  if (!panel) return;
  panel.classList.remove("show");
}

function toggleDesktopSearch() {
  const panel = document.getElementById("desktopSearchPanel");
  if (!panel) return;
  panel.classList.toggle("show");
}

function filterProductsFromDesktop() {
  const mobileInput = document.getElementById("searchInput");
  const desktopInput = document.getElementById("desktopSearchInput");

  if (mobileInput && desktopInput) {
    mobileInput.value = desktopInput.value;
  }

  filterProducts();
}

          async function loadSettings() {
            try {
              const res = await fetch("/api/settings");
              const data = await res.json();
              siteSettings = data.settings || {};

              const logoImg = document.getElementById("siteLogoImg");
              const logoText = document.getElementById("siteLogoText");
              const logoUrl = String(siteSettings.logo_url || "").trim();

              if (logoUrl && logoImg && logoText) {
                logoImg.src = logoUrl;
                logoImg.style.display = "block";
                logoText.style.display = "none";
              } else if (logoImg && logoText) {
                logoImg.style.display = "none";
                logoText.style.display = "block";
              }
            } catch (error) {
              siteSettings = {};
            }
          }

          async function loadPageProducts() {
            try {
              const res = await fetch("/api/page/" + pageSlug);
              const data = await res.json();

              if (!res.ok) {
                document.getElementById("pageTitle").textContent = "Page not found";
                document.getElementById("productsGrid").innerHTML =
                  '<div class="empty">' + (data.message || "Page not found") + '</div>';
                return;
              }

              document.title = data.page.page_name;
              document.getElementById("pageTitle").textContent = data.page.page_name;
              document.getElementById("pageSubheading").textContent = data.page.banner_subheading || "";

              allProducts = data.products || [];
              renderProducts(allProducts);
            } catch (error) {
              document.getElementById("productsGrid").innerHTML =
                '<div class="empty">' + error.message + '</div>';
            }
          }

          function filterProducts() {
            const q = document.getElementById("searchInput").value.toLowerCase().trim();

            if (!q) {
              renderProducts(allProducts);
              return;
            }

            const filtered = allProducts.filter(function(product) {
              return (
                String(product.product_name || "").toLowerCase().includes(q) ||
                String(product.sku || "").toLowerCase().includes(q) ||
                String(product.dealer_name || "").toLowerCase().includes(q) ||
                String(product.page_names || "").toLowerCase().includes(q)
              );
            });

            renderProducts(filtered);
          }

          function changeQtyFromCard(button, delta) {
  const card = button.closest(".product-card");
  const input = card.querySelector(".qty-input-card");

  const current = Number(input.value || 1);
  const next = Math.max(1, current + delta);

  input.value = next;
}

function getQtyFromCard(button) {
  const card = button.closest(".product-card");
  const input = card.querySelector(".qty-input-card");

  return Math.max(1, Number(input ? input.value : 1));
}

          function getList() {
            try {
              return JSON.parse(localStorage.getItem("your_list") || "[]");
            } catch (error) {
              return [];
            }
          }

          function saveList(list) {
            localStorage.setItem("your_list", JSON.stringify(list));
            updateListButton();
            renderYourList();
          }

          function addToListFromCard(productId, button) {
  const product = allProducts.find(function(item) {
    return String(item.id) === String(productId);
  });

  if (!product) return;

  const qty = getQtyFromCard(button);

  const list = getList();
  const existing = list.find(function(item) {
    return String(item.id) === String(product.id);
  });

  if (existing) {
    existing.qty += qty;
  } else {
    list.push({
      id: product.id,
      name: product.product_name,
      price: Number(product.show_price || 0),
      image: product.product_image_url || "https://via.placeholder.com/300x300?text=Product",
      slug: product.slug,
      qty: qty
    });
  }

  saveList(list);
}

          function updateListButton() {
  const list = getList();
  const totalQty = list.reduce(function(sum, item) {
    return sum + Number(item.qty || 0);
  }, 0);

  const buttons = [
    document.getElementById("yourListBtn"),
    document.getElementById("yourListBtnMobile")
  ];

  buttons.forEach(function(btn) {
    if (!btn) return;

    btn.textContent = "Your List (" + totalQty + ")";

    if (totalQty > 0) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });
}

          function toggleYourList() {
            const panel = document.getElementById("yourListPanel");
            renderYourList();
            panel.classList.toggle("show");
          }

          function closeYourList() {
            document.getElementById("yourListPanel").classList.remove("show");
          }

          function renderYourList() {
            const body = document.getElementById("yourListBody");
            const totalBox = document.getElementById("yourListTotal");

            if (!body || !totalBox) return;

            const list = getList();

            if (list.length === 0) {
              body.innerHTML = '<div class="small-message">You have not added any product yet.</div>';
              totalBox.textContent = "₹0";
              return;
            }

            let total = 0;
            body.innerHTML = "";

            list.forEach(function(item) {
              const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
              total += itemTotal;

              const row = document.createElement("div");
              row.className = "list-row";

              row.innerHTML =
                "<div>" +
                  "<img src='" + item.image + "' />" +
                  "<div class='list-product-name'>" + item.name + "</div>" +
                "</div>" +
                "<div class='list-price'>₹" + Number(item.price || 0).toFixed(0) + " × " + item.qty + "</div>" +
                "<div class='list-price'>₹" + itemTotal.toFixed(0) + "</div>" +
                "<div class='list-mini-qty'>" +
                  "<button onclick='changeListQty(" + item.id + ", -1)'>-</button>" +
                  "<input value='" + item.qty + "' onchange='setListQty(" + item.id + ", this.value)' />" +
                  "<button onclick='changeListQty(" + item.id + ", 1)'>+</button>" +
                "</div>" +
                "<button class='remove-list-btn' onclick='removeFromList(" + item.id + ")'>×</button>";

              body.appendChild(row);
            });

            totalBox.textContent = "₹" + total.toFixed(0);
          }

          function changeListQty(productId, delta) {
            const list = getList();

            const item = list.find(function(row) {
              return String(row.id) === String(productId);
            });

            if (!item) return;

            item.qty = Math.max(1, Number(item.qty || 1) + delta);
            saveList(list);
          }

          function setListQty(productId, value) {
            const list = getList();

            const item = list.find(function(row) {
              return String(row.id) === String(productId);
            });

            if (!item) return;

            item.qty = Math.max(1, Number(value || 1));
            saveList(list);
          }

          function removeFromList(productId) {
            const list = getList().filter(function(item) {
              return String(item.id) !== String(productId);
            });

            saveList(list);
          }

          function sendToWhatsapp() {
            const list = getList();

            if (list.length === 0) {
              alert("You have not added any product yet.");
              return;
            }

            const whatsappNumber = String(siteSettings.whatsapp_number || "").replace(/[^0-9]/g, "");

            if (!whatsappNumber) {
              alert("WhatsApp number is not set. Please add it from Manage UI > Header & Footer.");
              return;
            }

            let total = 0;
            let message = "Hello, I want to order these products:" + String.fromCharCode(10) + String.fromCharCode(10);

            list.forEach(function(item) {
              const itemTotal = Number(item.price || 0) * Number(item.qty || 1);
              total += itemTotal;

              message += item.name + " × " + item.qty + " = ₹" + itemTotal.toFixed(0) + String.fromCharCode(10);
            });

            message += String.fromCharCode(10) + "Total = ₹" + total.toFixed(0);

            const url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent(message);

            window.open(url, "_blank");
          }

          loadSettings().then(function() {
				  loadHeaderPages();
				  loadPageProducts();
				  updateListButton();
				  renderYourList();
				});
        </script>
      </body>
    </html>
  `);
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
<div style="display:flex;gap:8px;align-items:center;">
  <input id="bannerImageFile" type="file" accept="image/*" />
  <button type="button" onclick="uploadImageFile('bannerImageFile', 'bannerImageUrl', 'bannerUploadStatus')" style="width:auto;margin-top:0;background:#546B41;color:#FFF8EC;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Upload</button>
</div>
<input id="bannerImageUrl" type="hidden" />
<div id="bannerUploadStatus" style="font-size:13px;color:#6f7a5f;margin-top:6px;">No banner image uploaded yet.</div>

                <label>Banner Subheading</label>
                <input id="bannerSubheading" placeholder="Example: Fresh collection available now" />

                <div class="check-row">
                  <input id="createCircularIcon" type="checkbox" />
                  <span>Create Circular Icon</span>
                </div>

                <label>Circular Image</label>
<div style="display:flex;gap:8px;align-items:center;">
  <input id="circularImageFile" type="file" accept="image/*" />
  <button type="button" onclick="uploadImageFile('circularImageFile', 'circularImageUrl', 'circularUploadStatus')" style="width:auto;margin-top:0;background:#546B41;color:#FFF8EC;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Upload</button>
</div>
<input id="circularImageUrl" type="hidden" />
<div id="circularUploadStatus" style="font-size:13px;color:#6f7a5f;margin-top:6px;">No circular image uploaded yet.</div>

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

    <label>Product SKU</label>
    <input id="productSku" placeholder="Example: SKU001" />

    <label>Product Name</label>
    <input id="productName" placeholder="Example: Kitchen Bottle" />

    <label>Product Image</label>
<div style="display:flex;gap:8px;align-items:center;">
  <input id="productImageFile" type="file" accept="image/*" />
  <button type="button" onclick="uploadImageFile('productImageFile', 'productImageUrl', 'productImageUploadStatus')" style="width:auto;margin-top:0;background:#546B41;color:#FFF8EC;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Upload</button>
</div>
<input id="productImageUrl" type="hidden" />
<div id="productImageUploadStatus" style="font-size:13px;color:#6f7a5f;margin-top:6px;">No product image uploaded yet.</div>

    <label>Show Price</label>
    <input id="showPrice" type="number" placeholder="Example: 499" />

    <label>Crossed Price</label>
    <input id="crossedPrice" type="number" placeholder="Optional. Example: 699" />

    <label>Tag</label>
    <select id="productTag">
      <option value="None">None</option>
      <option value="New">New</option>
      <option value="On Sale">On Sale</option>
    </select>

    <label>Dealer Name</label>
    <input id="dealerName" placeholder="Dealer name" />

    <label>Dealer Price</label>
    <input id="dealerPrice" type="number" placeholder="Example: 300" />

    <label>Quantity in Stock</label>
    <input id="qtyInStock" type="number" placeholder="Example: 25" />

    <label>Demand Color</label>
    <select id="demandColor">
      <option value="Green">Green - High Demand</option>
      <option value="Yellow">Yellow - Moderate Demand</option>
      <option value="Red">Red - Less Demand</option>
    </select>

    <label>Pages to be shown</label>
    <div id="productPagesBox" class="placeholder">
      Loading pages...
    </div>

    <button class="primary" onclick="createProduct()">Create Product</button>
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

    <label>Logo</label>
<div style="display:flex;gap:8px;align-items:center;">
  <input id="settingLogoFile" type="file" accept="image/*" />
  <button type="button" onclick="uploadImageFile('settingLogoFile', 'settingLogoUrl', 'logoUploadStatus')" style="width:auto;margin-top:0;background:#546B41;color:#FFF8EC;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Upload</button>
</div>
<input id="settingLogoUrl" type="hidden" />
<div id="logoUploadStatus" style="font-size:13px;color:#6f7a5f;margin-top:6px;">No logo uploaded yet.</div>

    <label>Email</label>
    <input id="settingEmail" placeholder="Example: hello@example.com" />

    <label>Mobile Number</label>
    <input id="settingMobileNumber" placeholder="Example: +91 9999999999" />

    <label>WhatsApp Number</label>
    <input id="settingWhatsappNumber" placeholder="Example: 918802884309" />

    <label>Instagram Link</label>
    <input id="settingInstagramLink" placeholder="Instagram page link" />

    <label>Browse All Products Link</label>
    <input id="settingBrowseAllProductsLink" placeholder="/page/all-products" />

    <label>Policies</label>
    <textarea id="settingPolicies" placeholder="Write policies content"></textarea>

    <label>Privacy Policy</label>
    <textarea id="settingPrivacyPolicy" placeholder="Write privacy policy content"></textarea>

    <label>Return & Refund</label>
    <textarea id="settingReturnRefund" placeholder="Write return and refund content"></textarea>

    <label>Terms & Condition</label>
    <textarea id="settingTermsCondition" placeholder="Write terms and condition content"></textarea>

    <button class="primary" onclick="saveSettings()">Save Header & Footer Settings</button>
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

  <label>Banner Image</label>
<div style="display:flex;gap:8px;align-items:center;">
  <input id="editBannerImageFile" type="file" accept="image/*" />
  <button type="button" onclick="uploadImageFile('editBannerImageFile', 'editBannerImageUrl', 'editBannerUploadStatus')" style="width:auto;margin-top:0;background:#546B41;color:#FFF8EC;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Upload</button>
</div>
<input id="editBannerImageUrl" type="hidden" />
<div id="editBannerUploadStatus" style="font-size:13px;color:#6f7a5f;margin-top:6px;">No banner image uploaded yet.</div>

  <label>Banner Subheading</label>
  <input id="editBannerSubheading" />

  <div class="check-row">
    <input id="editCreateCircularIcon" type="checkbox" />
    <span>Create Circular Icon</span>
  </div>

  <label>Circular Image</label>
<div style="display:flex;gap:8px;align-items:center;">
  <input id="editCircularImageFile" type="file" accept="image/*" />
  <button type="button" onclick="uploadImageFile('editCircularImageFile', 'editCircularImageUrl', 'editCircularUploadStatus')" style="width:auto;margin-top:0;background:#546B41;color:#FFF8EC;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Upload</button>
</div>
<input id="editCircularImageUrl" type="hidden" />
<div id="editCircularUploadStatus" style="font-size:13px;color:#6f7a5f;margin-top:6px;">No circular image uploaded yet.</div>

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
	document.getElementById("bannerImageFile").value = "";
document.getElementById("circularImageFile").value = "";
document.getElementById("bannerUploadStatus").textContent = "No banner image uploaded yet.";
document.getElementById("circularUploadStatus").textContent = "No circular image uploaded yet.";

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
document.getElementById("editBannerUploadStatus").textContent = page.banner_image_url ? "Banner image already uploaded" : "No banner image uploaded yet.";  
document.getElementById("editBannerSubheading").value = page.banner_subheading || "";
  document.getElementById("editCreateCircularIcon").checked = Boolean(page.create_circular_icon);
  document.getElementById("editCircularImageUrl").value = page.circular_image_url || "";
document.getElementById("editCircularUploadStatus").textContent = page.circular_image_url ? "Circular image already uploaded" : "No circular image uploaded yet.";
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

async function loadProductPageCheckboxes() {
  const box = document.getElementById("productPagesBox");

  if (!box) return;

  try {
    const res = await fetch("/api/pages");
    const data = await res.json();

    const pages = data.pages || [];

    if (pages.length === 0) {
      box.innerHTML = "No pages created yet. Create a page first.";
      return;
    }

    box.className = "";
    box.innerHTML = "";

    pages.forEach(function(page) {
      const label = document.createElement("label");
      label.className = "check-row";

      label.innerHTML =
        "<input type='checkbox' class='productPageCheckbox' value='" + page.id + "' />" +
        "<span>" + page.page_name + "</span>";

      box.appendChild(label);
    });
  } catch (error) {
    box.innerHTML = error.message;
  }
}

function getSelectedProductPageIds() {
  const checked = document.querySelectorAll(".productPageCheckbox:checked");

  return Array.from(checked).map(function(input) {
    return Number(input.value);
  });
}

async function createProduct() {
  const sku = document.getElementById("productSku").value.trim();
  const product_name = document.getElementById("productName").value.trim();
  const product_image_url = document.getElementById("productImageUrl").value.trim();
  const show_price = document.getElementById("showPrice").value;
  const crossed_price = document.getElementById("crossedPrice").value;
  const tag = document.getElementById("productTag").value;
  const dealer_name = document.getElementById("dealerName").value.trim();
  const dealer_price = document.getElementById("dealerPrice").value;
  const qty_in_stock = document.getElementById("qtyInStock").value;
  const demand_color = document.getElementById("demandColor").value;
  const page_ids = getSelectedProductPageIds();

  if (!product_name) {
    alert("Please enter product name");
    return;
  }

  try {
    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("admin_token")
      },
      body: JSON.stringify({
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
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Product creation failed");
      return;
    }

    document.getElementById("productSku").value = "";
    document.getElementById("productName").value = "";
    document.getElementById("productImageUrl").value = "";
	document.getElementById("productImageFile").value = "";
document.getElementById("productImageUploadStatus").textContent = "No product image uploaded yet.";
    document.getElementById("showPrice").value = "";
    document.getElementById("crossedPrice").value = "";
    document.getElementById("productTag").value = "None";
    document.getElementById("dealerName").value = "";
    document.getElementById("dealerPrice").value = "";
    document.getElementById("qtyInStock").value = "";
    document.getElementById("demandColor").value = "Green";

    document.querySelectorAll(".productPageCheckbox").forEach(function(input) {
      input.checked = false;
    });

    alert("Product created successfully");
  } catch (error) {
    alert(error.message);
  }
}

async function uploadImageFile(fileInputId, hiddenInputId, statusId) {
  const fileInput = document.getElementById(fileInputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const statusBox = document.getElementById(statusId);

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("Please choose an image first.");
    return;
  }

  const formData = new FormData();
  formData.append("image", fileInput.files[0]);

  if (statusBox) {
    statusBox.textContent = "Uploading...";
  }

  try {
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("admin_token")
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      if (statusBox) {
        statusBox.textContent = data.message || "Upload failed";
      }
      alert(data.message || "Upload failed");
      return;
    }

    hiddenInput.value = data.file_url;

    if (statusBox) {
      statusBox.textContent = "Uploaded successfully";
    }

    alert("Image uploaded successfully");
  } catch (error) {
    if (statusBox) {
      statusBox.textContent = error.message;
    }
    alert(error.message);
  }
}

async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();
    const settings = data.settings || {};

    document.getElementById("settingLogoUrl").value = settings.logo_url || "";
document.getElementById("logoUploadStatus").textContent = settings.logo_url ? "Logo already uploaded" : "No logo uploaded yet.";
    document.getElementById("settingEmail").value = settings.email || "";
    document.getElementById("settingMobileNumber").value = settings.mobile_number || "";
    document.getElementById("settingWhatsappNumber").value = settings.whatsapp_number || "";
    document.getElementById("settingInstagramLink").value = settings.instagram_link || "";
    document.getElementById("settingBrowseAllProductsLink").value = settings.browse_all_products_link || "/page/all-products";
    document.getElementById("settingPolicies").value = settings.policies || "";
    document.getElementById("settingPrivacyPolicy").value = settings.privacy_policy || "";
    document.getElementById("settingReturnRefund").value = settings.return_refund || "";
    document.getElementById("settingTermsCondition").value = settings.terms_condition || "";
  } catch (error) {
    alert(error.message);
  }
}

async function saveSettings() {
  try {
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("admin_token")
      },
      body: JSON.stringify({
        logo_url: document.getElementById("settingLogoUrl").value.trim(),
        email: document.getElementById("settingEmail").value.trim(),
        mobile_number: document.getElementById("settingMobileNumber").value.trim(),
        whatsapp_number: document.getElementById("settingWhatsappNumber").value.trim(),
        instagram_link: document.getElementById("settingInstagramLink").value.trim(),
        browse_all_products_link: document.getElementById("settingBrowseAllProductsLink").value.trim(),
        policies: document.getElementById("settingPolicies").value.trim(),
        privacy_policy: document.getElementById("settingPrivacyPolicy").value.trim(),
        return_refund: document.getElementById("settingReturnRefund").value.trim(),
        terms_condition: document.getElementById("settingTermsCondition").value.trim()
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Settings save failed");
      return;
    }

    alert("Settings saved successfully");
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
  loadProductPageCheckboxes();
  loadSettings();
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
            max-width: 1280px;
            margin: auto;
            padding: 24px;
          }

          .toolbar {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 16px;
            padding: 16px;
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
            align-items: center;
            box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
          }

          .toolbar input {
            flex: 1;
            padding: 12px;
            border-radius: 12px;
            border: 1px solid #DCCCAC;
            background: #FFF8EC;
            color: #546B41;
            font-size: 14px;
            outline: none;
          }

          .toolbar button {
            border: none;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 12px;
            padding: 12px 15px;
            font-size: 14px;
            font-weight: 700;
            cursor: pointer;
          }

          .products-table-wrap {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 18px;
            overflow: hidden;
            box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            background: #DCCCAC;
            color: #546B41;
            text-align: left;
            font-size: 13px;
            padding: 12px;
            font-weight: 700;
          }

          td {
            border-top: 1px solid #f0e4ce;
            padding: 11px 12px;
            font-size: 13px;
            vertical-align: middle;
          }

          .product-img-small {
            width: 48px;
            height: 48px;
            border-radius: 10px;
            object-fit: cover;
            border: 1px solid #DCCCAC;
            background: #FFF8EC;
          }

          .product-title {
            font-weight: 700;
            color: #38472d;
            margin-bottom: 4px;
          }

          .muted {
            color: #6f7a5f;
            font-size: 12px;
          }

          .badge {
            display: inline-block;
            border-radius: 999px;
            padding: 5px 9px;
            font-size: 12px;
            font-weight: 700;
          }

          .badge-visible {
            background: #dcfce7;
            color: #166534;
          }

          .badge-hidden {
            background: #fee2e2;
            color: #991b1b;
          }

          .empty {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 16px;
            padding: 18px;
            color: #6f7a5f;
          }

          .loading {
  padding: 18px;
  color: #6f7a5f;
}

.qty-input {
  width: 70px;
  padding: 8px;
  border: 1px solid #DCCCAC;
  border-radius: 9px;
  background: #FFF8EC;
  color: #546B41;
}

.action-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.action-btn {
  border: none;
  border-radius: 9px;
  padding: 7px 9px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
}

.update-btn {
  background: #546B41;
  color: #FFF8EC;
}

.hide-btn {
  background: #fef3c7;
  color: #92400e;
}

.show-btn {
  background: #dcfce7;
  color: #166534;
}

.delete-btn {
  background: #fee2e2;
  color: #991b1b;
}

.edit-btn {
  background: #DCCCAC;
  color: #546B41;
}

.modal-overlay {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 100;
}

.modal-box {
  display: none;
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: white;
  width: 640px;
  max-width: 92%;
  max-height: 90vh;
  overflow: auto;
  border-radius: 18px;
  border: 1px solid #DCCCAC;
  padding: 20px;
  z-index: 101;
  box-shadow: 0 16px 44px rgba(0,0,0,0.25);
}

.modal-box h2 {
  margin: 0 0 14px;
  font-size: 20px;
}

.modal-box label {
  display: block;
  margin: 12px 0 6px;
  font-size: 14px;
  font-weight: 600;
}

.modal-box input,
.modal-box select {
  width: 100%;
  padding: 11px;
  border-radius: 11px;
  border: 1px solid #DCCCAC;
  background: #FFF8EC;
  color: #546B41;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}

.check-row input {
  width: auto;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.modal-save {
  background: #546B41;
  color: #FFF8EC;
  border: none;
  border-radius: 12px;
  padding: 12px 15px;
  font-weight: 700;
  cursor: pointer;
}

.modal-cancel {
  background: #DCCCAC;
  color: #546B41;
  border: none;
  border-radius: 12px;
  padding: 12px 15px;
  font-weight: 700;
  cursor: pointer;
}
        </style>
      </head>

      <body>
        <div class="topbar">
          <h1>All Products</h1>

          <div class="admin-nav">
            <a href="/manage-ui">Manage UI</a>
            <a class="active" href="/all-products">All Products</a>
            <a href="/dashboard">Dashboard</a>
            <button onclick="logoutAdmin()">Logout</button>
          </div>
        </div>

        <div class="container">
          <div class="toolbar">
            <input id="productSearchInput" placeholder="Search by product name, SKU, dealer, page..." oninput="filterAdminProducts()" />
            <button onclick="loadAdminProducts()">Refresh</button>
          </div>

          <div id="productsBox" class="products-table-wrap">
            <div class="loading">Loading products...</div>
          </div>
        </div>

		<div id="editProductOverlay" class="modal-overlay"></div>

<div id="editProductBox" class="modal-box">
  <h2>Edit Product</h2>

  <input id="editProductId" type="hidden" />
  <input id="editProductImageUrl" type="hidden" />

  <label>Product SKU</label>
  <input id="editProductSku" placeholder="SKU" />

  <label>Product Name</label>
  <input id="editProductName" placeholder="Product name" />

  <label>Product Image</label>
  <div style="display:flex;gap:8px;align-items:center;">
    <input id="editProductImageFile" type="file" accept="image/*" />
    <button type="button" onclick="uploadImageFile('editProductImageFile', 'editProductImageUrl', 'editProductImageUploadStatus')" style="width:auto;background:#546B41;color:#FFF8EC;border:none;border-radius:10px;padding:11px 14px;font-weight:700;cursor:pointer;">Upload</button>
  </div>
  <div id="editProductImageUploadStatus" style="font-size:13px;color:#6f7a5f;margin-top:6px;">No product image uploaded yet.</div>

  <label>Show Price</label>
  <input id="editShowPrice" type="number" />

  <label>Crossed Price</label>
  <input id="editCrossedPrice" type="number" />

  <label>Tag</label>
  <select id="editProductTag">
    <option value="None">None</option>
    <option value="New">New</option>
    <option value="On Sale">On Sale</option>
  </select>

  <label>Dealer Name</label>
  <input id="editDealerName" />

  <label>Dealer Price</label>
  <input id="editDealerPrice" type="number" />

  <label>Quantity in Stock</label>
  <input id="editQtyInStock" type="number" />

  <label>Demand Color</label>
  <select id="editDemandColor">
    <option value="Green">Green</option>
    <option value="Yellow">Yellow</option>
    <option value="Red">Red</option>
  </select>

  <label>Pages to be shown</label>
  <div id="editProductPagesBox" style="background:#FFF8EC;border:1px dashed #DCCCAC;border-radius:12px;padding:12px;">
    Loading pages...
  </div>

  <div class="check-row">
    <input id="editProductVisible" type="checkbox" />
    <span>Product Visible</span>
  </div>

  <div class="modal-actions">
    <button class="modal-save" onclick="saveEditedProduct()">Save Changes</button>
    <button class="modal-cancel" onclick="closeEditProductBox()">Cancel</button>
  </div>
</div>

        <script>
          const token = localStorage.getItem("admin_token");
          let adminProducts = [];

          if (!token) {
            window.location.href = "/admin";
          }

          function logoutAdmin() {
            localStorage.removeItem("admin_token");
            window.location.href = "/admin";
          }

          async function loadAdminProducts() {
            const box = document.getElementById("productsBox");
            box.innerHTML = '<div class="loading">Loading products...</div>';

            try {
              const res = await fetch("/api/admin/products", {
                headers: {
                  "Authorization": "Bearer " + localStorage.getItem("admin_token")
                }
              });

              const data = await res.json();

              if (!res.ok) {
                box.innerHTML = '<div class="empty">' + (data.message || "Failed to load products") + '</div>';
                return;
              }

              adminProducts = data.products || [];
              renderAdminProducts(adminProducts);
            } catch (error) {
              box.innerHTML = '<div class="empty">' + error.message + '</div>';
            }
          }

          function renderAdminProducts(products) {
            const box = document.getElementById("productsBox");

            if (!products || products.length === 0) {
              box.className = "";
              box.innerHTML = '<div class="empty">No products found.</div>';
              return;
            }

            box.className = "products-table-wrap";

            let html = "";
            html += "<table>";
            html += "<thead>";
            html += "<tr>";
            html += "<th>Image</th>";
            html += "<th>Product</th>";
            html += "<th>Price</th>";
            html += "<th>Dealer</th>";
            html += "<th>Stock</th>";
            html += "<th>Pages</th>";
			html += "<th>Status</th>";
			html += "<th>Actions</th>";
			html += "</tr>";
            html += "</thead>";
            html += "<tbody>";

            products.forEach(function(product) {
              const image = product.product_image_url || "https://via.placeholder.com/100x100?text=Product";
              const visibleBadge = product.is_visible ? "badge-visible" : "badge-hidden";
              const visibleText = product.is_visible ? "Visible" : "Hidden";

              html += "<tr>";
              html += "<td><img class='product-img-small' src='" + image + "' /></td>";
              html += "<td>";
              html += "<div class='product-title'>" + (product.product_name || "") + "</div>";
              html += "<div class='muted'>SKU: " + (product.sku || "-") + "</div>";
              html += "<div class='muted'>Tag: " + (product.tag || "None") + "</div>";
              html += "</td>";
              html += "<td>";
              html += "<div>₹" + Number(product.show_price || 0).toFixed(0) + "</div>";
              html += "<div class='muted'>Crossed: ₹" + Number(product.crossed_price || 0).toFixed(0) + "</div>";
              html += "</td>";
              html += "<td>";
              html += "<div>" + (product.dealer_name || "-") + "</div>";
              html += "<div class='muted'>Dealer Price: ₹" + Number(product.dealer_price || 0).toFixed(0) + "</div>";
              html += "</td>";
              html += "<td>";
				html += "<input class='qty-input' id='qty-admin-" + product.id + "' type='number' value='" + Number(product.qty_in_stock || 0) + "' />";
				html += "</td>";
				
				html += "<td>" + (product.page_names || "-") + "</td>";
				
				html += "<td><span class='badge " + visibleBadge + "'>" + visibleText + "</span></td>";

				html += "<td>";
				html += "<div class='action-row'>";
				html += "<button class='action-btn edit-btn' onclick='openEditProductById(" + product.id + ")'>Edit</button>";				
				html += "<button class='action-btn update-btn' onclick='updateProductQty(" + product.id + ")'>Update Qty</button>";
				html += "<button class='action-btn " + (product.is_visible ? "hide-btn" : "show-btn") + "' onclick='toggleProductVisibility(" + product.id + ", " + (product.is_visible ? "false" : "true") + ")'>" + (product.is_visible ? "Hide" : "Show") + "</button>";
				html += "<button class='action-btn delete-btn' onclick='deleteProduct(" + product.id + ", " + JSON.stringify(product.product_name || "") + ")'>Delete</button>";
				html += "</div>";
				html += "</td>";
				html += "</tr>";
            });

            html += "</tbody>";
            html += "</table>";

            box.innerHTML = html;
          }

					  async function updateProductQty(productId) {
			  const input = document.getElementById("qty-admin-" + productId);
			  const qty = Number(input ? input.value : 0);
			
			  try {
			    const res = await fetch("/api/admin/products/" + productId + "/quantity", {
			      method: "PUT",
			      headers: {
			        "Content-Type": "application/json",
			        "Authorization": "Bearer " + localStorage.getItem("admin_token")
			      },
			      body: JSON.stringify({
			        qty_in_stock: qty
			      })
			    });
			
			    const data = await res.json();
			
			    if (!res.ok) {
			      alert(data.message || "Quantity update failed");
			      return;
			    }
			
			    alert("Quantity updated successfully");
			    loadAdminProducts();
			  } catch (error) {
			    alert(error.message);
			  }
			}
			
			async function toggleProductVisibility(productId, nextVisible) {
			  try {
			    const res = await fetch("/api/admin/products/" + productId + "/visibility", {
			      method: "PUT",
			      headers: {
			        "Content-Type": "application/json",
			        "Authorization": "Bearer " + localStorage.getItem("admin_token")
			      },
			      body: JSON.stringify({
			        is_visible: nextVisible
			      })
			    });
			
			    const data = await res.json();
			
			    if (!res.ok) {
			      alert(data.message || "Visibility update failed");
			      return;
			    }
			
			    alert("Product visibility updated");
			    loadAdminProducts();
			  } catch (error) {
			    alert(error.message);
			  }
			}
			
			async function deleteProduct(productId, productName) {
			  const ok = confirm("Delete this product permanently? Product: " + productName);
			
			  if (!ok) return;
			
			  try {
			    const res = await fetch("/api/admin/products/" + productId, {
			      method: "DELETE",
			      headers: {
			        "Authorization": "Bearer " + localStorage.getItem("admin_token")
			      }
			    });
			
			    const data = await res.json();
			
			    if (!res.ok) {
			      alert(data.message || "Product delete failed");
			      return;
			    }
			
			    alert("Product deleted successfully");
			    loadAdminProducts();
			  } catch (error) {
			    alert(error.message);
			  }
			}

			async function uploadImageFile(fileInputId, hiddenInputId, statusId) {
  const fileInput = document.getElementById(fileInputId);
  const hiddenInput = document.getElementById(hiddenInputId);
  const statusBox = document.getElementById(statusId);

  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("Please choose an image first.");
    return;
  }

  const formData = new FormData();
  formData.append("image", fileInput.files[0]);

  if (statusBox) {
    statusBox.textContent = "Uploading...";
  }

  try {
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      headers: {
        "Authorization": "Bearer " + localStorage.getItem("admin_token")
      },
      body: formData
    });

    const data = await res.json();

    if (!res.ok) {
      if (statusBox) statusBox.textContent = data.message || "Upload failed";
      alert(data.message || "Upload failed");
      return;
    }

    hiddenInput.value = data.file_url;

    if (hiddenInputId === "editProductImageUrl") {
      const productIdInput = document.getElementById("editProductId");
      const productId = productIdInput ? productIdInput.value : "";

      if (productId) {
        if (statusBox) {
          statusBox.textContent = "Saving image to product...";
        }

        const saveRes = await fetch("/api/admin/products/" + productId + "/image", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("admin_token")
          },
          body: JSON.stringify({
            product_image_url: data.file_url
          })
        });

        const saveData = await saveRes.json();

        if (!saveRes.ok) {
          if (statusBox) statusBox.textContent = saveData.message || "Image uploaded but not saved";
          alert(saveData.message || "Image uploaded but not saved");
          return;
        }

        if (statusBox) {
          statusBox.textContent = "Uploaded and saved successfully";
        }

        alert("Image uploaded and saved successfully");
        loadAdminProducts();
        return;
      }
    }

    if (statusBox) {
      statusBox.textContent = "Uploaded successfully";
    }

    alert("Image uploaded successfully");
  } catch (error) {
    if (statusBox) statusBox.textContent = error.message;
    alert(error.message);
  }
}

function openEditProductById(productId) {
  const product = adminProducts.find(function(item) {
    return Number(item.id) === Number(productId);
  });

  if (!product) {
    alert("Product not found. Please refresh and try again.");
    return;
  }

  openEditProductBox(product);
}

async function openEditProductBox(product) {
  document.getElementById("editProductId").value = product.id;
  document.getElementById("editProductSku").value = product.sku || "";
  document.getElementById("editProductName").value = product.product_name || "";
  document.getElementById("editProductImageUrl").value = product.product_image_url || "";
  document.getElementById("editProductImageUploadStatus").textContent = product.product_image_url ? "Product image already uploaded" : "No product image uploaded yet.";
  document.getElementById("editShowPrice").value = product.show_price || 0;
  document.getElementById("editCrossedPrice").value = product.crossed_price || "";
  document.getElementById("editProductTag").value = product.tag || "None";
  document.getElementById("editDealerName").value = product.dealer_name || "";
  document.getElementById("editDealerPrice").value = product.dealer_price || 0;
  document.getElementById("editQtyInStock").value = product.qty_in_stock || 0;
  document.getElementById("editDemandColor").value = product.demand_color || "Green";
  document.getElementById("editProductVisible").checked = Boolean(product.is_visible);

  await loadEditProductPageCheckboxes(product.page_ids || "");

  document.getElementById("editProductOverlay").style.display = "block";
  document.getElementById("editProductBox").style.display = "block";
}

function closeEditProductBox() {
  document.getElementById("editProductOverlay").style.display = "none";
  document.getElementById("editProductBox").style.display = "none";
}

async function loadEditProductPageCheckboxes(selectedPageIdsText) {
  const box = document.getElementById("editProductPagesBox");
  const selectedIds = String(selectedPageIdsText || "")
    .split(",")
    .map(function(id) {
      return Number(id);
    })
    .filter(Boolean);

  try {
    const res = await fetch("/api/pages");
    const data = await res.json();
    const pages = data.pages || [];

    if (pages.length === 0) {
      box.innerHTML = "No pages created yet.";
      return;
    }

    box.innerHTML = "";

    pages.forEach(function(page) {
      const label = document.createElement("label");
      label.className = "check-row";

      const checked = selectedIds.includes(Number(page.id)) ? "checked" : "";

      label.innerHTML =
        "<input type='checkbox' class='editProductPageCheckbox' value='" + page.id + "' " + checked + " />" +
        "<span>" + page.page_name + "</span>";

      box.appendChild(label);
    });
  } catch (error) {
    box.innerHTML = error.message;
  }
}

function getSelectedEditProductPageIds() {
  const checked = document.querySelectorAll(".editProductPageCheckbox:checked");

  return Array.from(checked).map(function(input) {
    return Number(input.value);
  });
}

async function saveEditedProduct() {
  const productId = document.getElementById("editProductId").value;

  const sku = document.getElementById("editProductSku").value.trim();
  const product_name = document.getElementById("editProductName").value.trim();
  const product_image_url = document.getElementById("editProductImageUrl").value.trim();
  const show_price = document.getElementById("editShowPrice").value;
  const crossed_price = document.getElementById("editCrossedPrice").value;
  const tag = document.getElementById("editProductTag").value;
  const dealer_name = document.getElementById("editDealerName").value.trim();
  const dealer_price = document.getElementById("editDealerPrice").value;
  const qty_in_stock = document.getElementById("editQtyInStock").value;
  const demand_color = document.getElementById("editDemandColor").value;
  const is_visible = document.getElementById("editProductVisible").checked;
  const page_ids = getSelectedEditProductPageIds();

  if (!product_name) {
    alert("Please enter product name");
    return;
  }

  try {
    const res = await fetch("/api/admin/products/" + productId, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + localStorage.getItem("admin_token")
      },
      body: JSON.stringify({
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
        is_visible,
        page_ids
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Product update failed");
      return;
    }

    alert("Product updated successfully");
    closeEditProductBox();
    loadAdminProducts();
  } catch (error) {
    alert(error.message);
  }
}

          function filterAdminProducts() {
            const q = document.getElementById("productSearchInput").value.toLowerCase().trim();

            if (!q) {
              renderAdminProducts(adminProducts);
              return;
            }

            const filtered = adminProducts.filter(function(product) {
              return (
                String(product.product_name || "").toLowerCase().includes(q) ||
                String(product.sku || "").toLowerCase().includes(q) ||
                String(product.dealer_name || "").toLowerCase().includes(q) ||
                String(product.page_names || "").toLowerCase().includes(q)
              );
            });

            renderAdminProducts(filtered);
          }

          loadAdminProducts();
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
            max-width: 1280px;
            margin: auto;
            padding: 24px;
          }

          .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 18px;
          }

          .summary-card {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 18px;
            padding: 18px;
            box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
          }

          .summary-card .label {
            color: #6f7a5f;
            font-size: 14px;
            margin-bottom: 8px;
          }

          .summary-card .value {
            color: #546B41;
            font-size: 26px;
            font-weight: 700;
          }

          .panel {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 18px;
            padding: 18px;
            box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
          }

          .panel-head {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 12px;
            margin-bottom: 14px;
          }

          .panel-head h2 {
            margin: 0;
            font-size: 20px;
            font-weight: 700;
          }

          .filters {
            display: flex;
            gap: 10px;
            align-items: center;
          }

          select {
            padding: 10px;
            border-radius: 11px;
            border: 1px solid #DCCCAC;
            background: #FFF8EC;
            color: #546B41;
            outline: none;
          }

          .copy-btn {
            border: none;
            background: #546B41;
            color: #FFF8EC;
            border-radius: 11px;
            padding: 10px 13px;
            font-weight: 700;
            cursor: pointer;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            background: #DCCCAC;
            color: #546B41;
            text-align: left;
            font-size: 13px;
            padding: 12px;
            font-weight: 700;
          }

          td {
            border-top: 1px solid #f0e4ce;
            padding: 11px 12px;
            font-size: 13px;
            vertical-align: middle;
          }

          .product-img-small {
            width: 46px;
            height: 46px;
            border-radius: 10px;
            object-fit: cover;
            border: 1px solid #DCCCAC;
            background: #FFF8EC;
          }

          .product-title {
            font-weight: 700;
            color: #38472d;
            margin-bottom: 4px;
          }

          .muted {
            color: #6f7a5f;
            font-size: 12px;
          }

          .empty {
            background: #FFF8EC;
            border: 1px dashed #DCCCAC;
            border-radius: 14px;
            padding: 16px;
            color: #6f7a5f;
          }

          .loading {
            padding: 18px;
            color: #6f7a5f;
          }
        </style>
      </head>

      <body>
        <div class="topbar">
          <h1>Dashboard</h1>

          <div class="admin-nav">
            <a href="/manage-ui">Manage UI</a>
            <a href="/all-products">All Products</a>
            <a class="active" href="/dashboard">Dashboard</a>
            <button onclick="logoutAdmin()">Logout</button>
          </div>
        </div>

        <div class="container">
          <div class="summary-grid">
            <div class="summary-card">
              <div class="label">Total SKU Count</div>
              <div class="value" id="totalSku">0</div>
            </div>

            <div class="summary-card">
              <div class="label">Total Quantity</div>
              <div class="value" id="totalQuantity">0</div>
            </div>

            <div class="summary-card">
              <div class="label">Total Inventory Cost</div>
              <div class="value" id="totalCost">₹0</div>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">
              <h2>Low Stock Products</h2>

              <div class="filters">
                <select id="dealerFilter" onchange="renderLowStockProducts()">
                  <option value="">All Dealers</option>
                </select>

                <button class="copy-btn" onclick="copyLowStockForExcel()">Copy for Excel</button>
              </div>
            </div>

            <div id="lowStockBox">
              <div class="loading">Loading dashboard...</div>
            </div>
          </div>
        </div>

        <script>
          const token = localStorage.getItem("admin_token");
          let dashboardData = {
            summary: {},
            low_stock_products: [],
            dealers: []
          };

          if (!token) {
            window.location.href = "/admin";
          }

          function logoutAdmin() {
            localStorage.removeItem("admin_token");
            window.location.href = "/admin";
          }

          async function loadDashboard() {
            try {
              const res = await fetch("/api/admin/dashboard", {
                headers: {
                  "Authorization": "Bearer " + localStorage.getItem("admin_token")
                }
              });

              const data = await res.json();

              if (!res.ok) {
                document.getElementById("lowStockBox").innerHTML =
                  '<div class="empty">' + (data.message || "Dashboard load failed") + '</div>';
                return;
              }

              dashboardData = data;

              document.getElementById("totalSku").textContent = data.summary.total_sku || 0;
              document.getElementById("totalQuantity").textContent = data.summary.total_quantity || 0;
              document.getElementById("totalCost").textContent = "₹" + Number(data.summary.total_inventory_cost || 0).toFixed(0);

              renderDealerFilter();
              renderLowStockProducts();
            } catch (error) {
              document.getElementById("lowStockBox").innerHTML =
                '<div class="empty">' + error.message + '</div>';
            }
          }

          function renderDealerFilter() {
            const select = document.getElementById("dealerFilter");
            const currentValue = select.value;

            select.innerHTML = '<option value="">All Dealers</option>';

            (dashboardData.dealers || []).forEach(function(dealer) {
              const option = document.createElement("option");
              option.value = dealer;
              option.textContent = dealer;
              select.appendChild(option);
            });

            select.value = currentValue;
          }

          function getFilteredLowStockProducts() {
            const dealer = document.getElementById("dealerFilter").value;

            let products = dashboardData.low_stock_products || [];

            if (dealer) {
              products = products.filter(function(product) {
                return String(product.dealer_name || "") === dealer;
              });
            }

            return products;
          }

          function renderLowStockProducts() {
            const box = document.getElementById("lowStockBox");
            const products = getFilteredLowStockProducts();

            if (!products || products.length === 0) {
              box.innerHTML = '<div class="empty">No low stock products found.</div>';
              return;
            }

            let html = "";
            html += "<table>";
            html += "<thead>";
            html += "<tr>";
            html += "<th>Image</th>";
            html += "<th>Product</th>";
            html += "<th>SKU</th>";
            html += "<th>Dealer</th>";
            html += "<th>Dealer Price</th>";
            html += "<th>Stock Qty</th>";
            html += "<th>Demand Color</th>";
            html += "</tr>";
            html += "</thead>";
            html += "<tbody>";

            products.forEach(function(product) {
              const image = product.product_image_url || "https://via.placeholder.com/100x100?text=Product";

              html += "<tr>";
              html += "<td><img class='product-img-small' src='" + image + "' /></td>";
              html += "<td>";
              html += "<div class='product-title'>" + (product.product_name || "") + "</div>";
              html += "</td>";
              html += "<td>" + (product.sku || "-") + "</td>";
              html += "<td>" + (product.dealer_name || "-") + "</td>";
              html += "<td>₹" + Number(product.dealer_price || 0).toFixed(0) + "</td>";
              html += "<td>" + Number(product.qty_in_stock || 0) + "</td>";
              html += "<td>" + (product.demand_color || "-") + "</td>";
              html += "</tr>";
            });

            html += "</tbody>";
            html += "</table>";

            box.innerHTML = html;
          }

          function copyLowStockForExcel() {
            const products = getFilteredLowStockProducts();

            if (!products || products.length === 0) {
              alert("No low stock products to copy.");
              return;
            }

            let text = "Product Name\\tSKU\\tDealer Name\\tDealer Price\\tQuantity\\tDemand Color\\n";

            products.forEach(function(product) {
              text +=
                (product.product_name || "") + "\\t" +
                (product.sku || "") + "\\t" +
                (product.dealer_name || "") + "\\t" +
                Number(product.dealer_price || 0).toFixed(0) + "\\t" +
                Number(product.qty_in_stock || 0) + "\\t" +
                (product.demand_color || "") + "\\n";
            });

            navigator.clipboard.writeText(text).then(function() {
              alert("Low stock list copied. You can paste it into Excel.");
            }).catch(function(error) {
              alert(error.message);
            });
          }

          loadDashboard();
        </script>
      </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
