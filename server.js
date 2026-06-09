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

if (!fs.existsSync(MEDIA_DIR)) {
  fs.mkdirSync(MEDIA_DIR, { recursive: true });
}

app.use("/media", express.static(MEDIA_DIR));

app.get("/api/media-path-test", (req, res) => {
  let files = [];

  try {
    files = fs.readdirSync(MEDIA_DIR).slice(0, 20);
  } catch (error) {
    files = ["Cannot read media folder: " + error.message];
  }

  res.json({
    status: "ok",
    media_dir: MEDIA_DIR,
    files
  });
});

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, MEDIA_DIR);
  },
  filename(req, file, cb) {
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
  fileFilter(req, file, cb) {
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

/* =========================
   HELPERS
========================= */

function createSlug(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
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

/* =========================
   GLOBAL PUBLIC CSS
========================= */

function globalPublicCss() {
  return `
* {
  box-sizing: border-box;
}

:root {
  --qc-bg: #f6f7f2;
  --qc-card: #ffffff;
  --qc-primary: #0c831f;
  --qc-primary-dark: #086516;
  --qc-accent: #f8cb46;
  --qc-text: #111827;
  --qc-muted: #667085;
  --qc-border: #e7e9df;
  --qc-soft: #f1f5ea;
  --qc-shadow: 0 10px 24px rgba(16, 24, 40, 0.08);
  --qc-radius: 18px;
}

body {
  margin: 0;
  background: var(--qc-bg);
  color: var(--qc-text);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
}

a {
  color: inherit;
}

button,
input,
select,
textarea {
  font-family: inherit;
}

button {
  cursor: pointer;
}

.page-wrap {
  width: 100%;
  max-width: 1180px;
  margin: auto;
  padding: 14px 10px 28px;
}

@media (min-width: 768px) {
  .page-wrap {
    padding: 24px;
  }
}

.empty,
.small-message {
  background: white;
  border: 1px solid var(--qc-border);
  border-radius: 14px;
  padding: 16px;
  color: var(--qc-muted);
  font-size: 14px;
}

/* =========================
   HEADER
========================= */

.site-header {
  position: sticky;
  top: 0;
  z-index: 80;
  display: grid;
  grid-template-columns: 86px 1fr 38px;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.96);
  border-bottom: 1px solid var(--qc-border);
  box-shadow: 0 4px 18px rgba(16, 24, 40, 0.06);
  backdrop-filter: blur(14px);
}

.home-page .site-header {
  display: none;
}

.logo-box {
  height: 42px;
  width: 86px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  color: var(--qc-primary);
  text-decoration: none;
  overflow: visible;
}

.logo-box img {
  width: 100%;
  height: 100%;
  object-fit: contain;
  display: none;
}

.logo-box span {
  color: var(--qc-primary);
  font-size: 15px;
  font-weight: 900;
  letter-spacing: -0.3px;
}

.search-shell {
  position: relative;
}

.search-box,
.home-mobile-search-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #f4f6f0;
  border: 1px solid #e2e6d8;
  border-radius: 14px;
  padding: 10px 12px;
}

.search-box input,
.home-mobile-search-box input {
  width: 100%;
  border: none;
  outline: none;
  background: transparent;
  color: var(--qc-text);
  font-size: 14px;
  font-weight: 500;
}

.search-box input::placeholder,
.home-mobile-search-box input::placeholder {
  color: #8a9382;
}

.search-icon-btn {
  border: none;
  background: transparent;
  color: var(--qc-primary);
  font-size: 17px;
  padding: 0;
}

.search-suggestions-box {
  display: none;
  position: absolute;
  top: calc(100% + 7px);
  left: 0;
  right: 0;
  z-index: 140;
  background: white;
  border: 1px solid var(--qc-border);
  border-radius: 18px;
  box-shadow: 0 16px 42px rgba(16, 24, 40, 0.16);
  overflow: hidden;
  max-height: 320px;
  overflow-y: auto;
}

.search-suggestions-box.show {
  display: block;
}

.search-suggestion-item {
  display: grid;
  grid-template-columns: 42px 1fr auto;
  gap: 8px;
  align-items: center;
  padding: 9px 10px;
  border-bottom: 1px solid #f0f2ea;
  text-decoration: none;
  color: var(--qc-text);
}

.search-suggestion-item img {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  object-fit: cover;
  border: 1px solid var(--qc-border);
}

.search-suggestion-name {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
}

.search-suggestion-price {
  font-size: 12px;
  font-weight: 900;
  color: var(--qc-primary);
  white-space: nowrap;
}

.search-no-result {
  padding: 12px;
  font-size: 13px;
  color: var(--qc-muted);
}

.search-view-all-btn {
  width: 100%;
  border: none;
  background: var(--qc-bg);
  color: var(--qc-primary);
  padding: 11px;
  font-size: 13px;
  font-weight: 900;
}

.pages-menu-btn,
.list-btn {
  background: #ffffff;
  color: var(--qc-text);
  border: 1px solid var(--qc-border);
  border-radius: 10px;
  height: 38px;
  box-shadow: 0 4px 12px rgba(16, 24, 40, 0.06);
  font-weight: 800;
}

.pages-menu-btn {
  display: block;
  width: 38px;
  justify-self: end;
  font-size: 22px;
  line-height: 1;
}

.list-btn {
  border-radius: 999px;
  padding: 9px 12px;
  font-size: 13px;
  white-space: nowrap;
}

.list-btn.active {
  background: var(--qc-primary);
  color: white;
  border-color: var(--qc-primary);
}

.desktop-right-header,
.desktop-pages-nav {
  display: none;
}

.pages-menu-panel {
  position: fixed;
  top: 0;
  right: -82%;
  width: 82%;
  max-width: 320px;
  height: 100vh;
  z-index: 130;
  background: white;
  border-left: 1px solid var(--qc-border);
  box-shadow: -14px 0 34px rgba(84, 107, 65, 0.18);
  padding: 14px;
  transition: right 0.28s ease;
}

.pages-menu-panel.show {
  right: 0;
}

.menu-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: var(--qc-primary);
  color: white;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 12px;
}

.close-menu-btn,
.close-list-btn {
  border: none;
  background: #dcefd9;
  color: var(--qc-primary);
  border-radius: 999px;
  width: 30px;
  height: 30px;
  font-size: 20px;
  font-weight: 900;
}

.menu-links {
  display: grid;
  gap: 8px;
}

.pages-menu-panel a {
  text-decoration: none;
  background: var(--qc-bg);
  color: var(--qc-primary);
  border: 1px solid var(--qc-border);
  border-radius: 12px;
  padding: 11px 12px;
  font-size: 14px;
  font-weight: 700;
}

.pages-menu-panel a.active {
  background: var(--qc-primary);
  color: white;
}

/* =========================
   DESKTOP SEARCH MODAL
========================= */

.desktop-search-overlay {
  display: none;
  position: fixed;
  inset: 0;
  z-index: 300;
  background: rgba(84, 107, 65, 0.35);
  align-items: flex-start;
  justify-content: center;
  padding-top: 86px;
}

.desktop-search-overlay.show {
  display: flex;
}

.desktop-search-modal {
  position: relative;
  width: min(620px, calc(100vw - 40px));
  background: white;
  border: 1px solid var(--qc-border);
  border-radius: 20px;
  padding: 18px;
  box-shadow: 0 18px 48px rgba(84, 107, 65, 0.25);
}

.desktop-search-close {
  position: absolute;
  top: -14px;
  right: -14px;
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 999px;
  background: var(--qc-primary);
  color: white;
  font-size: 22px;
  font-weight: 900;
}

.desktop-search-modal .search-suggestions-box {
  position: static;
  display: none;
  margin-top: 12px;
  max-height: 360px;
}

.desktop-search-modal .search-suggestions-box.show {
  display: block;
}

/* =========================
   YOUR LIST
========================= */

.your-list-panel {
  display: none;
  position: fixed;
  left: 10px;
  right: 10px;
  bottom: 72px;
  z-index: 120;
  background: white;
  border: 1px solid var(--qc-border);
  border-radius: 22px 22px 0 0;
  box-shadow: 0 -18px 42px rgba(16, 24, 40, 0.18);
  max-height: 55vh;
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
  background: var(--qc-primary);
  color: white;
}

.list-head strong {
  font-size: 15px;
}

.list-body {
  padding: 10px;
}

.list-row {
  display: grid;
  grid-template-columns: 48px 1fr 72px 72px 28px;
  gap: 6px;
  align-items: center;
  border-bottom: 1px solid #f0f2ea;
  padding: 8px 0;
}

.list-row img {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid var(--qc-border);
}

.list-product-name {
  font-size: 11px;
  line-height: 1.2;
  color: var(--qc-text);
  margin-top: 3px;
  font-weight: 700;
}

.list-price {
  font-size: 12px;
  font-weight: 800;
  color: var(--qc-primary);
}

.list-mini-qty {
  display: grid;
  grid-template-columns: 20px 1fr 20px;
  gap: 2px;
}

.list-mini-qty button {
  border: none;
  background: var(--qc-primary);
  color: white;
  border-radius: 6px;
  height: 24px;
  font-weight: 900;
}

.list-mini-qty input {
  width: 100%;
  border: 1px solid #9ee6ae;
  border-radius: 6px;
  text-align: center;
  font-size: 11px;
  height: 24px;
  padding: 0;
  color: var(--qc-primary);
  font-weight: 900;
}

.remove-list-btn {
  border: none;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 7px;
  height: 26px;
  font-weight: 900;
}

.list-footer {
  padding: 12px;
  border-top: 1px solid var(--qc-border);
  background: var(--qc-bg);
}

.total-line {
  display: flex;
  justify-content: space-between;
  font-size: 15px;
  font-weight: 900;
  margin-bottom: 10px;
}

.send-wa-btn,
.mobile-bottom-whatsapp-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: none;
  background: var(--qc-primary);
  color: white;
  border-radius: 14px;
  padding: 12px;
  font-size: 14px;
  font-weight: 900;
  box-shadow: 0 8px 20px rgba(12, 131, 31, 0.25);
}

.send-wa-btn {
  width: 100%;
}

.whatsapp-btn-icon {
  width: 18px;
  height: 18px;
  display: inline-block;
}

.mobile-bottom-list-bar {
  display: none;
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 110;
  background: white;
  border-top: 1px solid var(--qc-border);
  box-shadow: 0 -10px 30px rgba(16, 24, 40, 0.14);
  border-radius: 20px 20px 0 0;
  padding: 11px 12px 12px;
  grid-template-columns: 1fr 1.2fr;
  gap: 10px;
  align-items: center;
}

.mobile-bottom-list-bar.show {
  display: grid;
}

.mobile-bottom-list-left {
  border: none;
  background: transparent;
  color: var(--qc-primary);
  display: grid;
  grid-template-columns: auto auto;
  gap: 2px 14px;
  text-align: left;
  align-items: center;
  justify-content: start;
  padding: 4px 0;
}

.mobile-bottom-title {
  font-size: 12px;
  font-weight: 900;
  color: var(--qc-muted);
}

#mobileBottomTotal {
  font-size: 19px;
  font-weight: 950;
  color: var(--qc-text);
}

#mobileBottomCount {
  font-size: 12px;
  color: var(--qc-muted);
}

.mobile-bottom-arrow {
  font-size: 18px;
  color: var(--qc-muted);
  grid-row: span 2;
}

.floating-whatsapp-btn {
  position: fixed;
  right: 16px;
  bottom: 86px;
  z-index: 105;
  width: 54px;
  height: 54px;
  border-radius: 999px;
  background: #25d366;
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  box-shadow: 0 10px 26px rgba(37, 211, 102, 0.35);
  border: 2px solid white;
}

.floating-whatsapp-icon {
  width: 32px;
  height: 32px;
}

/* =========================
   FOOTER
========================= */

.site-footer {
  margin-top: 34px;
  background: #101828;
  color: white;
}

.footer-main {
  display: grid;
  gap: 24px;
  padding: 28px 14px;
}

.footer-logo-box {
  width: 150px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  text-decoration: none;
  margin-bottom: 12px;
}

.footer-logo-box img {
  width: auto;
  max-width: 100%;
  height: 100%;
  object-fit: contain;
  display: none;
}

.footer-logo-box span {
  color: white;
  font-size: 15px;
  font-weight: 900;
}

.footer-brand p {
  margin: 0;
  color: white;
  font-size: 14px;
  line-height: 1.55;
  max-width: 260px;
}

.footer-column h4 {
  margin: 0 0 12px;
  color: white;
  font-size: 18px;
  font-weight: 900;
}

.footer-contact-row {
  display: flex;
  align-items: center;
  gap: 8px;
  color: white;
  font-size: 14px;
  margin-bottom: 10px;
}

.footer-contact-row a,
.footer-legal-link,
.footer-browse-link {
  color: white;
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

.footer-social-btn,
.footer-whatsapp-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border-radius: 999px;
  padding: 10px 16px;
  text-decoration: none;
  font-size: 14px;
  font-weight: 800;
  width: fit-content;
}

.footer-social-btn.instagram {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.footer-whatsapp-btn,
.footer-social-btn.whatsapp {
  background: #16a34a;
  color: white;
}

.footer-social-icon {
  width: 18px;
  height: 18px;
  display: inline-block;
  flex: 0 0 auto;
}

.instagram-real-icon {
  width: 20px;
  height: 20px;
}

.footer-browse-link {
  display: inline-block;
  margin-top: 18px;
  font-size: 14px;
}

.footer-bottom {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  text-align: center;
  padding: 18px 12px;
  color: #d0d5dd;
  font-size: 13px;
}

/* =========================
   PRODUCT CARD GLOBAL
========================= */

.product-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.product-card {
  background: white;
  border: 1px solid #edf0e6;
  border-radius: 15px;
  overflow: hidden;
  box-shadow: 0 4px 14px rgba(16, 24, 40, 0.06);
  transition: transform 0.18s ease, box-shadow 0.18s ease;
}

.product-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 26px rgba(16, 24, 40, 0.12);
}

.product-image-link {
  display: block;
  text-decoration: none;
  color: inherit;
}

.product-image-wrap {
  position: relative;
  background: linear-gradient(180deg, #f8faf4, #f1f5ea);
  padding: 6px;
}

.product-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  border-radius: 12px;
  background: #f5f6f2;
  display: block;
}

.discount-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 3;
  background: #2563eb;
  color: white;
  border-radius: 8px;
  padding: 3px 5px;
  font-size: 8px;
  font-weight: 900;
  line-height: 1;
  box-shadow: 0 5px 12px rgba(37, 99, 235, 0.28);
}

.product-tag {
  position: absolute;
  top: 8px;
  right: 8px;
  z-index: 3;
  background: var(--qc-accent);
  color: #1f2937;
  border-radius: 8px;
  padding: 3px 5px;
  font-size: 8px;
  font-weight: 900;
}

.product-info {
  padding: 7px;
}

.delivery-chip {
  width: fit-content;
  background: #ecfdf3;
  color: #087020;
  border-radius: 7px;
  padding: 3px 5px;
  font-size: 8.5px;
  font-weight: 900;
  margin-bottom: 6px;
}

.product-name {
  color: var(--qc-text);
  font-size: 11px;
  line-height: 1.25;
  font-weight: 800;
  min-height: 29px;
  margin-bottom: 5px;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.product-unit {
  color: var(--qc-muted);
  font-size: 9.5px;
  font-weight: 700;
  margin-bottom: 7px;
}

.product-bottom-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 4px;
  align-items: end;
}

.price-stack {
  text-align: left;
  min-width: 0;
}

.product-price {
  color: var(--qc-text);
  font-size: 12px;
  font-weight: 950;
  line-height: 1.05;
}

.crossed-price {
  display: inline-block;
  color: #98a2b3;
  font-size: 10px;
  text-decoration: line-through;
  margin-top: 2px;
}

.card-action-row {
  margin-top: 0;
  display: flex;
  justify-content: flex-end;
}

.add-btn {
  min-width: 48px;
  height: 28px;
  border-radius: 9px;
  background: white;
  color: var(--qc-primary);
  border: 1.5px solid var(--qc-primary);
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  box-shadow: 0 4px 10px rgba(12, 131, 31, 0.08);
}

.card-qty-control {
  width: 76px;
  display: grid;
  grid-template-columns: 22px 1fr 22px;
  gap: 3px;
}

.card-qty-control button {
  height: 28px;
  border: none;
  border-radius: 9px;
  background: var(--qc-primary);
  color: white;
  font-size: 14px;
  font-weight: 900;
}

.card-qty-control input {
  height: 28px;
  border: 1px solid #9ee6ae;
  border-radius: 8px;
  color: var(--qc-primary);
  text-align: center;
  font-size: 11px;
  font-weight: 900;
  padding: 0;
  width: 100%;
}

/* =========================
   MOBILE SEARCH FULLSCREEN
========================= */

@media (max-width: 767px) {
  body {
    padding-bottom: 72px;
  }

  body.mobile-search-focus {
    overflow: hidden;
  }

  body.mobile-search-focus::before {
    content: "";
    position: fixed;
    inset: 0;
    background: var(--qc-bg);
    z-index: 220;
  }

  body.mobile-search-focus::after {
    content: "Type product name...";
    position: fixed;
    top: 92px;
    left: 20px;
    right: 20px;
    z-index: 221;
    text-align: center;
    color: var(--qc-muted);
    font-size: 15px;
    font-weight: 800;
  }

  body.mobile-search-focus.mobile-search-has-text::after {
    display: none;
  }

  body.mobile-search-focus .site-header {
    z-index: 240;
    background: transparent;
    border-bottom: none;
    box-shadow: none;
  }

  body.mobile-search-focus .site-header .logo-box,
  body.mobile-search-focus .site-header .pages-menu-btn,
  body.mobile-search-focus .site-header .desktop-right-header {
    display: none !important;
  }

  body.mobile-search-focus .search-shell.mobile-search-active {
    position: fixed !important;
    top: 12px;
    left: 10px;
    right: 10px;
    z-index: 250;
    width: auto !important;
    max-width: none !important;
    margin: 0 !important;
    box-shadow: 0 10px 24px rgba(84, 107, 65, 0.18);
  }

  body.mobile-search-focus .search-shell.mobile-search-active .search-suggestions-box {
    position: fixed;
    top: 66px;
    left: 10px;
    right: 10px;
    z-index: 251;
    max-height: var(--mobile-search-results-height, 320px);
    overflow-y: auto;
    border-radius: 14px;
  }

  body.mobile-search-focus .mobile-bottom-list-bar,
  body.mobile-search-focus .floating-whatsapp-btn {
    display: none !important;
  }
}

/* =========================
   DESKTOP
========================= */

@media (min-width: 768px) {
  .site-header {
    display: grid;
    grid-template-columns: 150px minmax(280px, 420px) minmax(0, 1fr);
    padding: 12px 24px;
  }

  .home-page .site-header {
    display: grid;
  }

  .logo-box {
    height: 52px;
    width: 150px;
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
    overflow: hidden;
  }

  .desktop-pages-nav {
    display: flex;
    gap: 16px;
    align-items: center;
    overflow-x: auto;
    min-width: 0;
    flex: 1;
    justify-content: flex-end;
  }

  .desktop-pages-nav a {
    flex: 0 0 auto;
    text-decoration: none;
    color: var(--qc-primary);
    font-size: 14px;
    font-weight: 700;
  }

  .desktop-pages-nav a.active {
    color: var(--qc-text);
    font-weight: 900;
    text-decoration: underline;
    text-underline-offset: 4px;
  }

  .your-list-panel {
    top: 68px;
    bottom: auto;
    left: auto;
    right: 24px;
    width: 430px;
    max-width: calc(100vw - 48px);
    z-index: 100;
    border-radius: 0 0 18px 18px;
    box-shadow: 0 14px 34px rgba(84, 107, 65, 0.18);
    max-height: 62vh;
  }

  .mobile-bottom-list-bar {
    display: none !important;
  }

  .your-list-panel .list-footer {
    display: block;
  }

  .floating-whatsapp-btn {
    right: 24px;
    bottom: 24px;
    width: 58px;
    height: 58px;
  }

  .product-grid {
    grid-template-columns: repeat(6, 1fr);
    gap: 14px;
  }

  .product-image-wrap {
    padding: 8px;
  }

  .product-img {
    border-radius: 14px;
  }

  .product-info {
    padding: 9px;
  }

  .product-name {
    font-size: 12.5px;
    min-height: 32px;
  }

  .product-price {
    font-size: 13px;
  }

  .add-btn {
    min-width: 54px;
    height: 30px;
    border-radius: 10px;
    font-size: 12px;
  }

  .card-qty-control {
    width: 82px;
    grid-template-columns: 24px 1fr 24px;
  }

  .card-qty-control button,
  .card-qty-control input {
    height: 30px;
  }

  .footer-main {
    grid-template-columns: 1.3fr 1.2fr 1.2fr 1.4fr;
    gap: 34px;
    padding: 40px 24px;
    max-width: 1180px;
    margin: auto;
  }
}
`;
}

/* =========================
   GLOBAL HTML BLOCKS
========================= */

function whatsappSvg(className) {
  return `
<svg class="${className}" viewBox="0 0 32 32" aria-hidden="true">
  <path fill="currentColor" d="M16.02 3C8.86 3 3.04 8.82 3.04 15.98c0 2.29.6 4.52 1.74 6.49L3 29l6.69-1.75a12.9 12.9 0 0 0 6.33 1.61C23.18 28.86 29 23.04 29 15.98S23.18 3 16.02 3Zm0 23.66c-2.03 0-4.02-.55-5.75-1.6l-.41-.24-3.97 1.04 1.06-3.86-.27-.43a10.68 10.68 0 0 1-1.44-5.59c0-5.95 4.84-10.79 10.79-10.79s10.79 4.84 10.79 10.79-4.85 10.68-10.8 10.68Zm5.92-8.08c-.32-.16-1.91-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.6-1.91-1.79-2.23-.19-.32-.02-.5.14-.66.14-.14.32-.38.48-.56.16-.19.21-.32.32-.54.11-.21.05-.4-.03-.56-.08-.16-.73-1.76-1-2.41-.26-.63-.53-.54-.73-.55h-.62c-.21 0-.56.08-.86.4-.3.32-1.13 1.1-1.13 2.69s1.16 3.12 1.32 3.34c.16.21 2.28 3.48 5.52 4.88.77.33 1.37.53 1.84.68.77.24 1.48.21 2.04.13.62-.09 1.91-.78 2.18-1.54.27-.75.27-1.4.19-1.54-.08-.13-.3-.21-.62-.37Z"/>
</svg>`;
}

function instagramSvg() {
  return `
<svg class="footer-social-icon instagram-real-icon" viewBox="0 0 24 24" aria-hidden="true">
  <rect x="2" y="2" width="20" height="20" rx="6" fill="#E4405F"/>
  <circle cx="12" cy="12" r="4.2" fill="none" stroke="white" stroke-width="2"/>
  <circle cx="17.3" cy="6.7" r="1.3" fill="white"/>
</svg>`;
}

function globalHeaderHtml() {
  return `
<header class="site-header">
  <a href="/" class="logo-box">
    <img id="siteLogoImg" src="" alt="Logo" />
    <span id="siteLogoText">LOGO</span>
  </a>

  <div class="search-box mobile-search-box search-shell">
    <button class="search-icon-btn" type="button" onclick="runSearchInPage('searchInput', 'searchSuggestionsBox')">🔍</button>
    <input id="searchInput" placeholder="Search products..." onfocus="delayMobileSearchFocus(this)" oninput="showSearchSuggestions('searchInput', 'searchSuggestionsBox')" onkeydown="handleSearchKey(event, 'searchInput', 'searchSuggestionsBox')" />
    <div id="searchSuggestionsBox" class="search-suggestions-box"></div>
  </div>

  <div class="desktop-right-header">
    <button class="list-btn desktop-search-open-btn" onclick="openDesktopSearchBox()">Search</button>
    <nav id="desktopPagesNav" class="desktop-pages-nav"></nav>
    <button class="list-btn" id="yourListBtn" onclick="toggleYourList()">Your List (0)</button>
  </div>

  <button class="pages-menu-btn" onclick="togglePagesMenu()">☰</button>
</header>

<div id="desktopSearchOverlay" class="desktop-search-overlay">
  <div class="desktop-search-modal search-shell">
    <button class="desktop-search-close" onclick="closeDesktopSearchBox()">×</button>

    <div class="search-box desktop-search-popup-box">
      <button class="search-icon-btn" type="button" onclick="runSearchInPage('desktopSearchInput', 'desktopSearchSuggestionsBox')">🔍</button>
      <input id="desktopSearchInput" placeholder="Search products..." oninput="showSearchSuggestions('desktopSearchInput', 'desktopSearchSuggestionsBox')" onkeydown="handleSearchKey(event, 'desktopSearchInput', 'desktopSearchSuggestionsBox')" />
    </div>

    <div id="desktopSearchSuggestionsBox" class="search-suggestions-box"></div>
  </div>
</div>

<div id="pagesMenuPanel" class="pages-menu-panel"></div>

<div id="yourListPanel" class="your-list-panel">
  <div class="list-head">
    <strong>Your List</strong>
    <button class="close-list-btn" onclick="closeYourList()">×</button>
  </div>

  <div id="yourListBody" class="list-body"></div>

  <div class="list-footer">
    <div class="total-line">
      <span>Total</span>
      <strong id="yourListTotal">₹0</strong>
    </div>

    <button class="send-wa-btn" onclick="sendToWhatsapp()">
      ${whatsappSvg("whatsapp-btn-icon")}
      Send on WhatsApp
    </button>
  </div>
</div>

<div id="mobileBottomListBar" class="mobile-bottom-list-bar">
  <button class="mobile-bottom-list-left" onclick="toggleYourList()">
    <span class="mobile-bottom-title">Your List</span>
    <strong id="mobileBottomTotal">₹0</strong>
    <span id="mobileBottomCount">0 items</span>
    <span id="mobileBottomArrow" class="mobile-bottom-arrow">⌃</span>
  </button>

  <button class="mobile-bottom-whatsapp-btn" onclick="sendToWhatsapp()">
    ${whatsappSvg("whatsapp-btn-icon")}
    Send to WhatsApp
  </button>
</div>

<a href="#" class="floating-whatsapp-btn" onclick="openFloatingWhatsapp(event)" aria-label="Chat on WhatsApp">
  ${whatsappSvg("floating-whatsapp-icon")}
</a>
`;
}

function globalFooterHtml() {
  return `
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
      </div>
      <a class="footer-browse-link" id="footerBrowseAllProducts" href="/page/all-products">Browse all products →</a>
    </div>
  </div>

  <div class="footer-bottom">© 2026. All rights reserved.</div>
</footer>
`;
}
/* =========================
   GLOBAL PUBLIC JAVASCRIPT
========================= */

function globalPublicJs(options = {}) {
  const activePageSlug = options.activePageSlug || "";
  const pageType = options.pageType || "home";

  return `
window.globalSearchProducts = window.globalSearchProducts || [];
window.siteSettings = window.siteSettings || {};
window.allProducts = window.allProducts || [];
window.currentPageType = ${JSON.stringify(pageType)};
window.activePageSlug = ${JSON.stringify(activePageSlug)};

/* =========================
   SETTINGS + HEADER + FOOTER
========================= */

async function loadSettings() {
  try {
    const res = await fetch("/api/settings");
    const data = await res.json();

    window.siteSettings = data.settings || {};
    const settings = window.siteSettings;

    const logoUrl = String(settings.logo_url || "").trim();

    const logoImg = document.getElementById("siteLogoImg");
    const logoText = document.getElementById("siteLogoText");
    const footerLogoImg = document.getElementById("footerLogoImg");
    const footerLogoText = document.getElementById("footerLogoText");

    if (logoUrl && logoImg && logoText) {
      logoImg.src = logoUrl;
      logoImg.style.display = "block";
      logoText.style.display = "none";
    } else if (logoImg && logoText) {
      logoImg.style.display = "none";
      logoText.style.display = "block";
    }

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
    const footerWhatsapp = document.getElementById("footerWhatsapp");
    const footerInstagram = document.getElementById("footerInstagram");
    const footerBrowseAllProducts = document.getElementById("footerBrowseAllProducts");

    const mobileNumber = String(settings.mobile_number || "").trim();
    const whatsappNumber = String(settings.whatsapp_number || "").replace(/[^0-9]/g, "");
    const email = String(settings.email || "").trim();
    const instagram = String(settings.instagram_link || "").trim();
    const browseLink = String(settings.browse_all_products_link || "/page/all-products").trim();

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
        ? "<a class='footer-whatsapp-btn' href='https://wa.me/" + whatsappNumber + "?text=Hello' target='_blank'>" +
            ${JSON.stringify(whatsappSvg("footer-social-icon"))} +
            "WhatsApp us" +
          "</a>"
        : "";
    }

    if (footerInstagram) {
      footerInstagram.innerHTML = instagram
        ? "<a class='footer-social-btn instagram' href='" + instagram + "' target='_blank'>" +
            ${JSON.stringify(instagramSvg())} +
            "Instagram" +
          "</a>"
        : "";
    }

    if (footerBrowseAllProducts) {
      footerBrowseAllProducts.href = browseLink || "/page/all-products";
    }
  } catch (error) {
    window.siteSettings = {};
  }
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

    const homeActive = window.currentPageType === "home" ? " class='active'" : "";

    desktopHtml += "<a" + homeActive + " href='/'>Home</a>";
    mobileLinks += "<a" + homeActive + " href='/'>Home</a>";

    pages.forEach(function(page) {
      const activeClass = page.slug === window.activePageSlug ? " class='active'" : "";

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

/* =========================
   SEARCH
========================= */

function openDesktopSearchBox() {
  const overlay = document.getElementById("desktopSearchOverlay");
  const input = document.getElementById("desktopSearchInput");

  if (!overlay) return;

  overlay.classList.add("show");

  setTimeout(function() {
    if (input) input.focus();
  }, 80);
}

function closeDesktopSearchBox() {
  const overlay = document.getElementById("desktopSearchOverlay");
  const input = document.getElementById("desktopSearchInput");
  const box = document.getElementById("desktopSearchSuggestionsBox");

  if (input) input.value = "";

  if (box) {
    box.innerHTML = "";
    box.classList.remove("show");
  }

  if (overlay) {
    overlay.classList.remove("show");
  }
}

async function loadGlobalSearchProducts() {
  if (window.globalSearchProducts.length > 0) {
    return window.globalSearchProducts;
  }

  try {
    const res = await fetch("/api/products");
    const data = await res.json();

    window.globalSearchProducts = data.products || [];
    return window.globalSearchProducts;
  } catch (error) {
    window.globalSearchProducts = [];
    return [];
  }
}

function getSearchProductsForBox() {
  return window.globalSearchProducts || [];
}

function syncSearchValue(inputId) {
  const input = document.getElementById(inputId);
  if (!input) return "";

  const value = input.value || "";

  const headerInput = document.getElementById("searchInput");
  const homeInput = document.getElementById("homeSearchInput");
  const desktopInput = document.getElementById("desktopSearchInput");

  if (inputId !== "searchInput" && headerInput) {
    headerInput.value = value;
  }

  if (inputId !== "homeSearchInput" && homeInput) {
    homeInput.value = value;
  }

  if (inputId !== "desktopSearchInput" && desktopInput) {
    desktopInput.value = value;
  }

  if (
    typeof isMobileSearchScreen === "function" &&
    isMobileSearchScreen() &&
    document.body.classList.contains("mobile-search-focus")
  ) {
    document.body.classList.toggle("mobile-search-has-text", !!value.trim());
  }

  return value.toLowerCase().trim();
}

function getSearchMatches(q) {
  const products = getSearchProductsForBox();
  const seen = {};

  return products.filter(function(product) {
    const productKey = String(product.id);

    if (seen[productKey]) return false;

    const matched =
      String(product.product_name || "").toLowerCase().includes(q) ||
      String(product.sku || "").toLowerCase().includes(q) ||
      String(product.dealer_name || "").toLowerCase().includes(q) ||
      String(product.page_names || "").toLowerCase().includes(q);

    if (matched) {
      seen[productKey] = true;
      return true;
    }

    return false;
  }).slice(0, 8);
}

async function showSearchSuggestions(inputId, boxId) {
  const q = syncSearchValue(inputId);
  const box = document.getElementById(boxId);

  if (!box) return;

  if (!q) {
    box.innerHTML = "";
    box.classList.remove("show");
    return;
  }

  await loadGlobalSearchProducts();

  const matches = getSearchMatches(q);

  if (matches.length === 0) {
    box.innerHTML = "<div class='search-no-result'>No result found</div>";
    box.classList.add("show");
    return;
  }

  let html = "";

  matches.forEach(function(product) {
    const image = product.product_image_url || "https://via.placeholder.com/80x80?text=Product";
    const price = Number(product.show_price || 0).toFixed(0);

    html +=
      "<a class='search-suggestion-item' href='/product/" + product.slug + "'>" +
        "<img src='" + image + "' alt='" + product.product_name + "' />" +
        "<div class='search-suggestion-name'>" + product.product_name + "</div>" +
        "<div class='search-suggestion-price'>₹" + price + "</div>" +
      "</a>";
  });

  html += "<button class='search-view-all-btn' onclick='runSearchInPage(\\\"" + inputId + "\\\", \\\"" + boxId + "\\\")'>View all results</button>";

  box.innerHTML = html;
  box.classList.add("show");
}

function handleSearchKey(event, inputId, boxId) {
  if (event.key === "Enter") {
    event.preventDefault();
    runSearchInPage(inputId, boxId);
  }
}

async function runSearchInPage(inputId, boxId) {
  const input = document.getElementById(inputId);
  const q = input ? input.value.trim() : "";

  if (!q) return;

  syncSearchValue(inputId);

  const box = document.getElementById(boxId);
  if (box) {
    box.innerHTML = "";
    box.classList.remove("show");
  }

  if (inputId === "desktopSearchInput") {
    closeDesktopSearchBox();
  }

  if (window.location.pathname !== "/") {
    window.location.href = "/?search=" + encodeURIComponent(q);
    return;
  }

  const globalProducts = await loadGlobalSearchProducts();
  window.allProducts = globalProducts;

  if (typeof filterProducts === "function") {
    filterProducts();
  }

  const wrap = document.getElementById("homeSections");
  if (wrap) {
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function getCurrentSearchQuery() {
  const headerInput = document.getElementById("searchInput");
  const homeInput = document.getElementById("homeSearchInput");
  const desktopInput = document.getElementById("desktopSearchInput");

  const headerValue = headerInput ? headerInput.value.trim() : "";
  const homeValue = homeInput ? homeInput.value.trim() : "";
  const desktopValue = desktopInput ? desktopInput.value.trim() : "";

  return desktopValue || homeValue || headerValue;
}

function syncSearchInputs(value) {
  const headerInput = document.getElementById("searchInput");
  const homeInput = document.getElementById("homeSearchInput");
  const desktopInput = document.getElementById("desktopSearchInput");

  if (headerInput) headerInput.value = value;
  if (homeInput) homeInput.value = value;
  if (desktopInput) desktopInput.value = value;
}

function isMobileSearchScreen() {
  return window.matchMedia && window.matchMedia("(max-width: 767px)").matches;
}

function updateMobileSearchResultsHeight() {
  if (!isMobileSearchScreen()) return;

  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const safeHeight = Math.max(180, height - 80);

  document.documentElement.style.setProperty("--mobile-search-results-height", safeHeight + "px");
}

function delayMobileSearchFocus(input) {
  if (!isMobileSearchScreen() || !input) return;

  setTimeout(function() {
    if (document.activeElement === input) {
      openMobileSearchFocus(input);
    }
  }, 220);
}

function openMobileSearchFocus(input) {
  if (!isMobileSearchScreen() || !input) return;

  const shell = input.closest(".search-shell");
  if (!shell) return;

  document.querySelectorAll(".search-shell.mobile-search-active").forEach(function(item) {
    item.classList.remove("mobile-search-active");
  });

  document.body.classList.add("mobile-search-focus");
  document.body.classList.toggle("mobile-search-has-text", !!input.value.trim());
  shell.classList.add("mobile-search-active");

  updateMobileSearchResultsHeight();

  setTimeout(function() {
    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }, 80);
}

function closeMobileSearchFocus(forceClose) {
  if (!isMobileSearchScreen()) return;

  const activeShell = document.querySelector(".search-shell.mobile-search-active");
  if (!activeShell) return;

  const input = activeShell.querySelector("input");
  const value = input ? input.value.trim() : "";

  if (!forceClose && value) return;

  document.querySelectorAll(".search-suggestions-box").forEach(function(box) {
    box.innerHTML = "";
    box.classList.remove("show");
  });

  document.body.classList.remove("mobile-search-focus");
  document.body.classList.remove("mobile-search-has-text");
  activeShell.classList.remove("mobile-search-active");
}

function closeMobileSearchFocusIfEmpty() {
  closeMobileSearchFocus(false);
}

function closeMobileSearchFocusAlways() {
  closeMobileSearchFocus(true);
}

let lastMobileViewportHeight = 0;

function handleMobileViewportResize() {
  updateMobileSearchResultsHeight();

  if (!isMobileSearchScreen()) return;

  const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
  const activeShell = document.querySelector(".search-shell.mobile-search-active");
  const input = activeShell ? activeShell.querySelector("input") : null;

  if (lastMobileViewportHeight && height > lastMobileViewportHeight + 120 && input) {
    closeMobileSearchFocusAlways();

    if (document.activeElement === input) {
      input.blur();
    }
  }

  lastMobileViewportHeight = height;
}

if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", handleMobileViewportResize);
}

document.addEventListener("focusin", function(event) {
  if (event.target && event.target.matches(".search-shell input")) {
    delayMobileSearchFocus(event.target);
  }
});

document.addEventListener("focusout", function(event) {
  if (event.target && event.target.matches(".search-shell input")) {
    setTimeout(closeMobileSearchFocusIfEmpty, 180);
  }
});

document.addEventListener("click", function(event) {
  if (!event.target.closest(".search-shell")) {
    document.querySelectorAll(".search-suggestions-box").forEach(function(box) {
      box.innerHTML = "";
      box.classList.remove("show");
    });

    closeMobileSearchFocusIfEmpty();
  }
});

/* =========================
   PRODUCT CARD
========================= */

function productCardActionHtml(productId) {
  const list = getList();
  const existing = list.find(function(item) {
    return String(item.id) === String(productId);
  });

  if (!existing) {
    return "<button class='add-btn' onclick='addOneToListFromCard(" + productId + ")'>Add</button>";
  }

  const qty = Math.max(1, Number(existing.qty || 1));

  return "" +
    "<div class='card-qty-control'>" +
      "<button onclick='changeCardListQty(" + productId + ", -1)'>-</button>" +
      "<input type='number' min='1' value='" + qty + "' onchange='setCardListQty(" + productId + ", this.value)' />" +
      "<button onclick='changeCardListQty(" + productId + ", 1)'>+</button>" +
    "</div>";
}

function productCard(product) {
  const image = product.product_image_url || "https://via.placeholder.com/300x300?text=Product";
  const price = Number(product.show_price || 0);
  const crossedPrice = Number(product.crossed_price || 0);
  const tag = String(product.tag || "None");

  let discountPercent = 0;

  if (crossedPrice > price && price > 0) {
    discountPercent = Math.round(((crossedPrice - price) / crossedPrice) * 100);
  }

  const tagHtml = tag && tag !== "None"
    ? "<div class='product-tag'>" + tag + "</div>"
    : "";

  const discountHtml = discountPercent > 0
    ? "<div class='discount-badge'>" + discountPercent + "% OFF</div>"
    : "";

  const crossedPriceHtml = crossedPrice > price
    ? "<span class='crossed-price'>₹" + crossedPrice.toFixed(0) + "</span>"
    : "";

  return "" +
    "<div class='product-card' data-product-id='" + product.id + "'>" +
      "<a class='product-image-link' href='/product/" + product.slug + "'>" +
        "<div class='product-image-wrap'>" +
          discountHtml +
          tagHtml +
          "<img class='product-img' src='" + image + "' alt='" + product.product_name + "' onerror=\"this.onerror=null;this.src='https://via.placeholder.com/300x300?text=Product';\" />" +
        "</div>" +
      "</a>" +

      "<div class='product-info'>" +
        "<div class='delivery-chip'>⚡ 10 min</div>" +
        "<div class='product-name'>" + product.product_name + "</div>" +
        "<div class='product-unit'>1 pack</div>" +

        "<div class='product-bottom-row'>" +
          "<div class='price-stack'>" +
            "<div class='product-price'>₹" + price.toFixed(0) + "</div>" +
            crossedPriceHtml +
          "</div>" +

          "<div class='card-action-row' data-product-id='" + product.id + "'>" +
            productCardActionHtml(product.id) +
          "</div>" +
        "</div>" +
      "</div>" +
    "</div>";
}

function renderProductGrid(targetId, products, emptyMessage) {
  const grid = document.getElementById(targetId);

  if (!grid) return;

  if (!products || products.length === 0) {
    grid.className = "";
    grid.innerHTML = "<div class='empty'>" + (emptyMessage || "No products found.") + "</div>";
    return;
  }

  grid.className = "product-grid";
  grid.innerHTML = products.map(productCard).join("");
}

/* =========================
   YOUR LIST
========================= */

function findProductById(productId) {
  return (window.allProducts || []).find(function(item) {
    return String(item.id) === String(productId);
  });
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
  syncProductCardButtons();
}

function syncProductCardButtons() {
  const rows = document.querySelectorAll(".card-action-row[data-product-id]");

  rows.forEach(function(row) {
    const productId = row.getAttribute("data-product-id");
    row.innerHTML = productCardActionHtml(productId);
  });
}

function addOneToListFromCard(productId) {
  const product = findProductById(productId);

  if (!product) return;

  const list = getList();

  const existing = list.find(function(item) {
    return String(item.id) === String(product.id);
  });

  if (existing) {
    existing.qty = Number(existing.qty || 1) + 1;
  } else {
    list.push({
      id: product.id,
      name: product.product_name,
      price: Number(product.show_price || 0),
      image: product.product_image_url || "https://via.placeholder.com/300x300?text=Product",
      slug: product.slug,
      qty: 1
    });
  }

  saveList(list);
}

function changeCardListQty(productId, delta) {
  changeListQty(productId, delta);
}

function setCardListQty(productId, value) {
  setListQty(productId, value);
}

function updateListButton() {
  const list = getList();

  const totalQty = list.reduce(function(sum, item) {
    return sum + Number(item.qty || 0);
  }, 0);

  const totalAmount = list.reduce(function(sum, item) {
    return sum + (Number(item.price || 0) * Number(item.qty || 1));
  }, 0);

  const desktopBtn = document.getElementById("yourListBtn");

  if (desktopBtn) {
    desktopBtn.textContent = "Your List (" + totalQty + ")";

    if (totalQty > 0) {
      desktopBtn.classList.add("active");
    } else {
      desktopBtn.classList.remove("active");
    }
  }

  const bottomBar = document.getElementById("mobileBottomListBar");
  const bottomTotal = document.getElementById("mobileBottomTotal");
  const bottomCount = document.getElementById("mobileBottomCount");

  if (bottomTotal) {
    bottomTotal.textContent = "₹" + totalAmount.toFixed(0);
  }

  if (bottomCount) {
    bottomCount.textContent = totalQty + (totalQty === 1 ? " item" : " items");
  }

  if (bottomBar) {
    if (totalQty > 0) {
      bottomBar.classList.add("show");
    } else {
      bottomBar.classList.remove("show");

      const panel = document.getElementById("yourListPanel");
      if (panel) panel.classList.remove("show");
    }
  }

  updateMobileBottomArrow();
}

function updateMobileBottomArrow() {
  const panel = document.getElementById("yourListPanel");
  const arrow = document.getElementById("mobileBottomArrow");

  if (!panel || !arrow) return;

  arrow.textContent = panel.classList.contains("show") ? "⌄" : "⌃";
}

function toggleYourList() {
  const panel = document.getElementById("yourListPanel");
  if (!panel) return;

  renderYourList();
  panel.classList.toggle("show");
  updateMobileBottomArrow();
}

function closeYourList() {
  const panel = document.getElementById("yourListPanel");
  if (!panel) return;

  panel.classList.remove("show");
  updateMobileBottomArrow();
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

  const nextQty = Number(item.qty || 1) + Number(delta || 0);

  if (nextQty < 1) {
    removeFromList(productId);
    return;
  }

  item.qty = nextQty;
  saveList(list);
}

function setListQty(productId, value) {
  const list = getList();

  const item = list.find(function(row) {
    return String(row.id) === String(productId);
  });

  if (!item) return;

  const qty = Number(value || 0);

  if (qty < 1) {
    removeFromList(productId);
    return;
  }

  item.qty = qty;
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

  const whatsappNumber = String(window.siteSettings.whatsapp_number || "").replace(/[^0-9]/g, "");

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

  localStorage.removeItem("your_list");
  updateListButton();
  renderYourList();
  syncProductCardButtons();
  closeYourList();
}

function openFloatingWhatsapp(event) {
  if (event) {
    event.preventDefault();
  }

  const whatsappNumber = String(window.siteSettings.whatsapp_number || "").replace(/[^0-9]/g, "");

  if (!whatsappNumber) {
    alert("WhatsApp number is not set. Please add it from Manage UI > Header & Footer.");
    return;
  }

  const url = "https://wa.me/" + whatsappNumber + "?text=" + encodeURIComponent("Hello");
  window.open(url, "_blank");
}

/* =========================
   INIT
========================= */

async function initPublicBase() {
  await loadSettings();
  await loadHeaderPages();
  updateListButton();
  renderYourList();
}
`;
}

/* =========================
   HOME PAGE CSS + JS
========================= */

function homePageCss() {
  return `
.home-banner-slider {
  position: relative;
  border-radius: 24px;
  overflow: hidden;
  margin-bottom: 12px;
  height: 190px;
  background: linear-gradient(135deg, #0c831f, #b4e197);
  box-shadow: var(--qc-shadow);
}

.home-banner-slide {
  position: absolute;
  inset: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.7s ease;
}

.home-banner-slide.active {
  opacity: 1;
  pointer-events: auto;
}

.home-banner-slide img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  filter: brightness(0.76) saturate(1.08);
}

.home-banner-content {
  position: absolute;
  left: 14px;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  color: white;
  max-width: 560px;
}

.home-banner-content h1 {
  margin: 0 0 8px;
  font-size: 24px;
  line-height: 1.15;
  font-weight: 900;
  letter-spacing: -0.7px;
  text-shadow: 0 2px 8px rgba(0,0,0,0.35);
}

.home-banner-content p {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.45;
  max-width: 420px;
  font-weight: 600;
  text-shadow: 0 2px 8px rgba(0,0,0,0.35);
}

.banner-shop-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--qc-accent);
  color: #1f2937;
  border-radius: 999px;
  padding: 9px 15px;
  font-size: 12px;
  font-weight: 900;
  text-decoration: none;
  box-shadow: 0 8px 18px rgba(248, 203, 70, 0.35);
}

.banner-dots {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 10px;
  display: flex;
  justify-content: center;
  gap: 6px;
}

.banner-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.55);
}

.banner-dot.active {
  background: white;
  width: 18px;
}

.home-mobile-search-wrap {
  margin: 0 0 10px;
}

.circular-pages-wrap {
  display: flex;
  justify-content: flex-start;
  gap: 14px;
  overflow-x: auto;
  padding: 8px 2px 12px;
  margin-bottom: 0;
  text-align: center;
  scroll-behavior: smooth;
  -webkit-overflow-scrolling: touch;
}

.circular-pages-wrap::-webkit-scrollbar {
  display: none;
}

.circular-page-item {
  flex: 0 0 auto;
  width: 74px;
  text-align: center;
  text-decoration: none;
  color: var(--qc-text);
}

.circular-img {
  width: 66px;
  height: 66px;
  border-radius: 999px;
  object-fit: cover;
  border: 1px solid var(--qc-border);
  background: white;
  padding: 4px;
  box-shadow: 0 6px 16px rgba(16, 24, 40, 0.08);
}

.circular-page-name {
  margin-top: 6px;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.2;
  color: #344054;
}

.fixed-banners-wrap {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  margin: 6px 0 18px;
  width: 100%;
}

.fixed-banner-card {
  display: block;
  width: 100%;
  border-radius: 22px;
  overflow: hidden;
  background: white;
  box-shadow: var(--qc-shadow);
}

.fixed-banner-card img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: cover;
}

.section-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 18px 2px 10px;
}

.section-head h2,
.reviews-head h2 {
  margin: 0;
  font-size: 19px;
  font-weight: 900;
  color: var(--qc-text);
  letter-spacing: -0.3px;
}

.section-head a {
  color: var(--qc-primary);
  font-size: 13px;
  text-decoration: none;
  font-weight: 900;
}

.reviews-section {
  margin: 26px 0 24px;
}

.reviews-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.reviews-grid {
  display: grid;
  gap: 12px;
}

.review-card,
.feature-card {
  background: white;
  border: 1px solid var(--qc-border);
  border-radius: 20px;
  padding: 14px;
  box-shadow: var(--qc-shadow);
}

.review-stars {
  color: var(--qc-primary);
  font-size: 14px;
  margin-bottom: 8px;
}

.review-text {
  color: var(--qc-text);
  font-size: 14px;
  line-height: 1.5;
  margin-bottom: 10px;
}

.review-name {
  color: var(--qc-primary);
  font-size: 13px;
  font-weight: 900;
}

.feature-strip {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 16px;
}

.feature-card {
  padding: 10px 6px;
  text-align: center;
}

.feature-card strong {
  display: block;
  font-size: 11px;
  margin-top: 4px;
}

.feature-card span {
  font-size: 18px;
}

@media (min-width: 768px) {
  .home-mobile-search-wrap {
    display: none;
  }

  .home-banner-slider {
    height: 360px;
    margin-bottom: 16px;
  }

  .home-banner-content {
    left: 42px;
    right: 42px;
  }

  .home-banner-content h1 {
    font-size: 42px;
  }

  .home-banner-content p {
    font-size: 16px;
  }

  .circular-pages-wrap {
    justify-content: center;
    gap: 22px;
  }

  .circular-page-item {
    width: 96px;
  }

  .circular-img {
    width: 86px;
    height: 86px;
  }

  .fixed-banner-card img {
    height: 260px;
  }

  .reviews-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
`;
}

function homePageJs() {
  return `
let currentBannerIndex = 0;
let bannerTimer = null;
let circularRailTimer = null;
let circularRailDirection = 1;
let circularRailUserPaused = false;
let circularRailPauseTimer = null;

function renderHomeSections(sections) {
  const wrap = document.getElementById("homeSections");

  if (!wrap) return;

  if (!sections || sections.length === 0) {
    wrap.innerHTML = "<div class='empty'>No products found.</div>";
    return;
  }

  let html = "";

  sections.forEach(function(section) {
    if (section.section_type === "banner") {
      const banner = section.banner;

      if (banner && banner.image_url) {
        html += "<div class='fixed-banner-card' style='margin:6px 0 18px;'>";
        html += "<img src='" + banner.image_url + "' alt='" + banner.banner_name + "' />";
        html += "</div>";
      }

      return;
    }

    const page = section.page;
    const products = section.products || [];

    if (!page || products.length === 0) return;

    html += "<div class='section-head'>";
    html += "<h2>" + page.page_name + "</h2>";
    html += "<a href='/page/" + page.slug + "'>View all</a>";
    html += "</div>";

    html += "<div class='product-grid'>";
    html += products.map(productCard).join("");
    html += "</div>";
  });

  wrap.innerHTML = html || "<div class='empty'>No products found.</div>";
}

async function loadHomeTopDesign() {
  try {
    const res = await fetch("/api/pages");
    const data = await res.json();
    const pages = data.pages || [];

    const activePages = pages.filter(function(page) {
      return page.is_active === 1 || page.is_active === true;
    });

    const bannerPages = activePages.filter(function(page) {
      return (page.show_on_banner === 1 || page.show_on_banner === true) && page.banner_image_url;
    });

    const bannerWrap = document.getElementById("homeBannerWrap");

    if (bannerWrap) {
      if (bannerPages.length > 0) {
        let slidesHtml = "";

        bannerPages.forEach(function(page, index) {
          const activeClass = index === 0 ? " active" : "";

          slidesHtml +=
            "<div class='home-banner-slide" + activeClass + "'>" +
              "<img src='" + page.banner_image_url + "' alt='" + page.page_name + "' />" +
              "<div class='home-banner-content'>" +
                "<h1>" + page.page_name + "</h1>" +
                "<p>" + (page.banner_subheading || "Explore our latest products") + "</p>" +
                "<a class='banner-shop-btn' href='/page/" + page.slug + "'>Shop Now</a>" +
              "</div>" +
            "</div>";
        });

        let dotsHtml = "<div class='banner-dots'>";
        bannerPages.forEach(function(page, index) {
          dotsHtml += "<span class='banner-dot" + (index === 0 ? " active" : "") + "'></span>";
        });
        dotsHtml += "</div>";

        bannerWrap.innerHTML =
          "<div class='home-banner-slider'>" +
            slidesHtml +
            dotsHtml +
          "</div>";

        startBannerSlider();
      } else {
        bannerWrap.innerHTML =
          "<div class='home-banner-slider'>" +
            "<div class='home-banner-slide active'>" +
              "<div class='home-banner-content'>" +
                "<h1>Shop quality products easily</h1>" +
                "<p>Select products, add them to Your List, and send your order on WhatsApp.</p>" +
              "</div>" +
            "</div>" +
          "</div>";
      }
    }

    const circularPages = activePages.filter(function(page) {
      return (page.create_circular_icon === 1 || page.create_circular_icon === true) && page.circular_image_url;
    });

    const circularWrap = document.getElementById("circularPagesWrap");

    if (circularWrap) {
      if (circularPages.length === 0) {
        circularWrap.style.display = "none";
        stopCircularRailMovement();
      } else {
        circularWrap.style.display = "flex";
        circularWrap.innerHTML = circularPages.map(function(page) {
          return "" +
            "<a class='circular-page-item' href='/page/" + page.slug + "'>" +
              "<img class='circular-img' src='" + page.circular_image_url + "' alt='" + page.page_name + "' />" +
              "<div class='circular-page-name'>" + page.page_name + "</div>" +
            "</a>";
        }).join("");

        startCircularRailMovement();
      }
    }
  } catch (error) {
    console.log(error.message);
  }
}

function startBannerSlider() {
  const slides = document.querySelectorAll(".home-banner-slide");
  const dots = document.querySelectorAll(".banner-dot");

  if (!slides || slides.length <= 1) return;

  if (bannerTimer) {
    clearInterval(bannerTimer);
  }

  bannerTimer = setInterval(function() {
    slides[currentBannerIndex].classList.remove("active");
    if (dots[currentBannerIndex]) dots[currentBannerIndex].classList.remove("active");

    currentBannerIndex = (currentBannerIndex + 1) % slides.length;

    slides[currentBannerIndex].classList.add("active");
    if (dots[currentBannerIndex]) dots[currentBannerIndex].classList.add("active");
  }, 3500);
}

function stopCircularRailMovement() {
  if (circularRailTimer) {
    clearInterval(circularRailTimer);
    circularRailTimer = null;
  }
}

function startCircularRailMovement() {
  const wrap = document.getElementById("circularPagesWrap");

  if (!wrap) return;

  stopCircularRailMovement();

  if (window.innerWidth >= 768) {
    return;
  }

  function pauseCircularRail() {
    circularRailUserPaused = true;

    if (circularRailPauseTimer) {
      clearTimeout(circularRailPauseTimer);
    }

    circularRailPauseTimer = setTimeout(function() {
      circularRailUserPaused = false;
    }, 1500);
  }

  if (!wrap.dataset.railListenersAdded) {
    wrap.addEventListener("touchstart", pauseCircularRail);
    wrap.addEventListener("mousedown", pauseCircularRail);
    wrap.addEventListener("wheel", pauseCircularRail);
    wrap.dataset.railListenersAdded = "true";
  }

  setTimeout(function() {
    if (!wrap || wrap.scrollWidth <= wrap.clientWidth + 2) return;

    circularRailTimer = setInterval(function() {
      if (window.innerWidth >= 768) {
        stopCircularRailMovement();
        return;
      }

      if (circularRailUserPaused) return;

      const maxScroll = wrap.scrollWidth - wrap.clientWidth;

      if (wrap.scrollLeft >= maxScroll - 2) {
        circularRailDirection = -1;
      }

      if (wrap.scrollLeft <= 2) {
        circularRailDirection = 1;
      }

      wrap.scrollLeft += circularRailDirection;
    }, 35);
  }, 700);
}

async function loadFixedBanners() {
  const wrap = document.getElementById("fixedBannersWrap");

  if (!wrap) return;

  try {
    const res = await fetch("/api/fixed-banners");
    const data = await res.json();
    const banners = data.banners || [];

    if (banners.length === 0) {
      wrap.style.display = "none";
      return;
    }

    wrap.style.display = "grid";

    wrap.innerHTML = banners.map(function(banner) {
      return "" +
        "<div class='fixed-banner-card'>" +
          "<img src='" + banner.image_url + "' alt='" + banner.banner_name + "' />" +
        "</div>";
    }).join("");
  } catch (error) {
    wrap.style.display = "none";
  }
}

async function loadReviewsSection() {
  const section = document.getElementById("reviewsSection");
  const grid = document.getElementById("reviewsGrid");

  if (!section || !grid) return;

  try {
    const res = await fetch("/api/reviews");
    const data = await res.json();
    const reviews = data.reviews || [];

    if (reviews.length === 0) {
      section.style.display = "none";
      return;
    }

    section.style.display = "block";

    grid.innerHTML = reviews.map(function(review) {
      const rating = Math.max(1, Math.min(5, Number(review.rating || 5)));
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating);

      return "" +
        "<div class='review-card'>" +
          "<div class='review-stars'>" + stars + "</div>" +
          "<div class='review-text'>" + review.review_body + "</div>" +
          "<div class='review-name'>— " + review.customer_name + "</div>" +
        "</div>";
    }).join("");
  } catch (error) {
    section.style.display = "none";
  }
}

async function loadHomeSections() {
  try {
    const res = await fetch("/api/home-sections");
    const data = await res.json();

    const sections = data.sections || [];

    window.allProducts = [];

    sections.forEach(function(section) {
      (section.products || []).forEach(function(product) {
        window.allProducts.push(product);
      });
    });

    renderHomeSections(sections);
  } catch (error) {
    const wrap = document.getElementById("homeSections");
    if (wrap) {
      wrap.innerHTML = "<div class='empty'>" + error.message + "</div>";
    }
  }
}

function setHomeSearchMode(isSearchMode) {
  const idsToHide = [
    "homeBannerWrap",
    "circularPagesWrap",
    "fixedBannersWrap",
    "reviewsSection"
  ];

  idsToHide.forEach(function(id) {
    const el = document.getElementById(id);
    if (el) {
      el.style.display = isSearchMode ? "none" : "";
    }
  });

  document.querySelectorAll(".feature-strip").forEach(function(el) {
    el.style.display = isSearchMode ? "none" : "";
  });

  document.querySelectorAll(".home-mobile-search-wrap").forEach(function(el) {
    el.style.display = isSearchMode ? "none" : "";
  });
}

function filterProducts() {
  const q = getCurrentSearchQuery().toLowerCase().trim();
  const wrap = document.getElementById("homeSections");

  if (!wrap) return;

  if (!q) {
    setHomeSearchMode(false);
    loadHomeTopDesign();
    loadHomeSections();
    loadReviewsSection();
    return;
  }

  setHomeSearchMode(true);

  const matchedProducts = (window.allProducts || []).filter(function(product) {
    return (
      String(product.product_name || "").toLowerCase().includes(q) ||
      String(product.sku || "").toLowerCase().includes(q) ||
      String(product.dealer_name || "").toLowerCase().includes(q) ||
      String(product.page_names || "").toLowerCase().includes(q)
    );
  });

  const seenProductIds = {};

  const filtered = matchedProducts.filter(function(product) {
    const productKey = String(product.id);

    if (seenProductIds[productKey]) {
      return false;
    }

    seenProductIds[productKey] = true;
    return true;
  });

  if (filtered.length === 0) {
    wrap.innerHTML = "<div class='empty'>No result found.</div>";
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

async function applySearchFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const q = params.get("search");

  if (!q) return;

  syncSearchInputs(q);

  const globalProducts = await loadGlobalSearchProducts();
  window.allProducts = globalProducts;

  filterProducts();
}

async function initHomePage() {
  await initPublicBase();
  loadHomeTopDesign();
  await loadHomeSections();
  loadReviewsSection();
  await applySearchFromUrl();
}

initHomePage();
`;
}
/* =========================
   CATEGORY PAGE CSS + JS
========================= */

function categoryPageCss() {
  return `
.page-title-box {
  background: white;
  border: 1px solid var(--qc-border);
  border-radius: 20px;
  padding: 16px;
  margin-bottom: 14px;
  box-shadow: var(--qc-shadow);
}

.page-title-box h1 {
  margin: 0;
  font-size: 22px;
  font-weight: 900;
  color: var(--qc-text);
  letter-spacing: -0.4px;
}

.page-title-box p {
  margin: 6px 0 0;
  color: var(--qc-muted);
  font-size: 14px;
  line-height: 1.45;
}
`;
}

function categoryPageJs(pageSlug) {
  return `
async function loadPageProducts() {
  try {
    const res = await fetch("/api/page/" + ${JSON.stringify(pageSlug)});
    const data = await res.json();

    if (!res.ok) {
      document.getElementById("pageTitle").textContent = "Page not found";
      document.getElementById("productsGrid").innerHTML =
        "<div class='empty'>" + (data.message || "Page not found") + "</div>";
      return;
    }

    document.title = data.page.page_name;
    document.getElementById("pageTitle").textContent = data.page.page_name;
    document.getElementById("pageSubheading").textContent = data.page.banner_subheading || "";

    window.allProducts = data.products || [];
    renderProductGrid("productsGrid", window.allProducts, "No products found in this category.");
  } catch (error) {
    document.getElementById("productsGrid").innerHTML =
      "<div class='empty'>" + error.message + "</div>";
  }
}

async function initCategoryPage() {
  await initPublicBase();
  await loadPageProducts();
}

initCategoryPage();
`;
}

/* =========================
   PRODUCT DETAIL CSS + JS
========================= */

function productDetailCss() {
  return `
.detail-card {
  background: white;
  border: 1px solid var(--qc-border);
  border-radius: 22px;
  overflow: hidden;
  box-shadow: var(--qc-shadow);
}

.detail-img-wrap {
  position: relative;
  background: #f5f6f2;
  padding: 12px;
}

.detail-img {
  width: 100%;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  display: block;
  border-radius: 18px;
  background: #f5f6f2;
}

.detail-info {
  padding: 16px;
}

.detail-name {
  margin: 0 0 10px;
  font-size: 24px;
  line-height: 1.2;
  color: var(--qc-text);
  font-weight: 900;
  letter-spacing: -0.4px;
}

.price-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.detail-price {
  font-size: 24px;
  font-weight: 950;
  color: var(--qc-text);
}

.detail-crossed-price {
  font-size: 15px;
  color: #98a2b3;
  text-decoration: line-through;
}

.page-names {
  font-size: 13px;
  color: var(--qc-muted);
  margin-bottom: 14px;
}

.detail-delivery-chip {
  width: fit-content;
  background: #ecfdf3;
  color: #087020;
  border-radius: 9px;
  padding: 5px 8px;
  font-size: 12px;
  font-weight: 900;
  margin-bottom: 12px;
}

.detail-actions {
  display: grid;
  grid-template-columns: 120px 1fr;
  gap: 10px;
  align-items: center;
}

.qty-row {
  display: grid;
  grid-template-columns: 34px 1fr 34px;
  gap: 4px;
}

.qty-row button {
  border: none;
  background: var(--qc-primary);
  color: white;
  border-radius: 10px;
  height: 40px;
  font-size: 16px;
  font-weight: 900;
  cursor: pointer;
}

.qty-row input {
  width: 100%;
  border: 1px solid #9ee6ae;
  border-radius: 10px;
  text-align: center;
  font-size: 14px;
  color: var(--qc-primary);
  height: 40px;
  font-weight: 900;
}

.detail-add-btn {
  border: none;
  background: var(--qc-primary);
  color: white;
  border-radius: 12px;
  height: 40px;
  font-size: 14px;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(12, 131, 31, 0.25);
}

@media (min-width: 768px) {
  .detail-card {
    display: grid;
    grid-template-columns: 420px 1fr;
  }

  .detail-info {
    padding: 26px;
  }

  .detail-name {
    font-size: 30px;
  }
}
`;
}

function productDetailJs(productSlug) {
  return `
let currentProduct = null;

function renderProductDetail(product) {
  const image = product.product_image_url || "https://via.placeholder.com/600x600?text=Product";
  const price = Number(product.show_price || 0);
  const crossedPrice = Number(product.crossed_price || 0);
  const tag = String(product.tag || "None");

  let discountPercent = 0;

  if (crossedPrice > price && price > 0) {
    discountPercent = Math.round(((crossedPrice - price) / crossedPrice) * 100);
  }

  const tagHtml = tag && tag !== "None"
    ? "<div class='product-tag'>" + tag + "</div>"
    : "";

  const discountHtml = discountPercent > 0
    ? "<div class='discount-badge'>" + discountPercent + "% OFF</div>"
    : "";

  const crossedPriceHtml = crossedPrice > price
    ? "<div class='detail-crossed-price'>₹" + crossedPrice.toFixed(0) + "</div>"
    : "";

  const pageNamesHtml = product.page_names
    ? "<div class='page-names'>Category: " + product.page_names + "</div>"
    : "";

  document.getElementById("productDetail").innerHTML =
    "<div class='detail-card'>" +
      "<div class='detail-img-wrap'>" +
        discountHtml +
        tagHtml +
        "<img class='detail-img' src='" + image + "' alt='" + product.product_name + "' />" +
      "</div>" +

      "<div class='detail-info'>" +
        "<div class='detail-delivery-chip'>⚡ 10 min delivery</div>" +
        "<h1 class='detail-name'>" + product.product_name + "</h1>" +

        "<div class='price-row'>" +
          "<div class='detail-price'>₹" + price.toFixed(0) + "</div>" +
          crossedPriceHtml +
        "</div>" +

        pageNamesHtml +

        "<div class='detail-actions'>" +
          "<div class='qty-row'>" +
            "<button onclick='changeDetailQty(-1)'>-</button>" +
            "<input id='detailQty' type='number' min='1' value='1' />" +
            "<button onclick='changeDetailQty(1)'>+</button>" +
          "</div>" +
          "<button class='detail-add-btn' onclick='addDetailProductToList()'>Add to List</button>" +
        "</div>" +
      "</div>" +
    "</div>";
}

async function loadProductDetail() {
  try {
    const res = await fetch("/api/product/" + ${JSON.stringify(productSlug)});
    const data = await res.json();

    if (!res.ok || data.status !== "ok") {
      document.getElementById("productDetail").innerHTML =
        "<div class='empty'>Product not found.</div>";
      return;
    }

    currentProduct = data.product;
    window.allProducts = [currentProduct];

    document.title = currentProduct.product_name;
    renderProductDetail(currentProduct);
  } catch (error) {
    document.getElementById("productDetail").innerHTML =
      "<div class='empty'>" + error.message + "</div>";
  }
}

function changeDetailQty(delta) {
  const input = document.getElementById("detailQty");
  if (!input) return;

  const current = Number(input.value || 1);
  input.value = Math.max(1, current + Number(delta || 0));
}

function addDetailProductToList() {
  if (!currentProduct) return;

  const qtyInput = document.getElementById("detailQty");
  const qty = Math.max(1, Number(qtyInput ? qtyInput.value : 1));

  const list = getList();

  const existing = list.find(function(item) {
    return String(item.id) === String(currentProduct.id);
  });

  if (existing) {
    existing.qty = Number(existing.qty || 1) + qty;
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

async function initProductDetailPage() {
  await initPublicBase();
  await loadProductDetail();
}

initProductDetailPage();
`;
}

/* =========================
   LEGAL PAGE CSS
========================= */

function legalPageCss() {
  return `
.legal-card {
  background: white;
  border: 1px solid var(--qc-border);
  border-radius: 22px;
  padding: 18px;
  box-shadow: var(--qc-shadow);
}

.legal-card h1 {
  margin: 0 0 14px;
  font-size: 26px;
  color: var(--qc-text);
  font-weight: 900;
  letter-spacing: -0.4px;
}

.legal-content {
  white-space: pre-wrap;
  line-height: 1.65;
  font-size: 15px;
  color: #344054;
}
`;
}

/* =========================
   TEST API
========================= */

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

/* =========================
   DATABASE TABLE SETUP
========================= */

let tablesReady = false;

async function ensureAppTables() {
  if (tablesReady) return;

  await db.query(`
    CREATE TABLE IF NOT EXISTS pages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      page_name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      show_on_header TINYINT(1) DEFAULT 0,
      show_on_banner TINYINT(1) DEFAULT 0,
      banner_image_url TEXT,
      banner_subheading TEXT,
      create_circular_icon TINYINT(1) DEFAULT 0,
      circular_image_url TEXT,
      is_active TINYINT(1) DEFAULT 1,
      sort_order INT DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      sku VARCHAR(100),
      product_name VARCHAR(255) NOT NULL,
      slug VARCHAR(255) NOT NULL UNIQUE,
      product_image_url TEXT,
      show_price DECIMAL(10,2) DEFAULT 0,
      crossed_price DECIMAL(10,2) DEFAULT 0,
      tag VARCHAR(50) DEFAULT 'None',
      dealer_name VARCHAR(255),
      dealer_price DECIMAL(10,2) DEFAULT 0,
      qty_in_stock INT DEFAULT 0,
      demand_color VARCHAR(50) DEFAULT 'Green',
      is_visible TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS product_pages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      product_id INT NOT NULL,
      page_id INT NOT NULL,
      UNIQUE KEY unique_product_page (product_id, page_id)
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS site_settings (
      setting_key VARCHAR(100) PRIMARY KEY,
      setting_value LONGTEXT
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS fixed_banners (
      id INT AUTO_INCREMENT PRIMARY KEY,
      banner_name VARCHAR(255) NOT NULL,
      image_url TEXT NOT NULL,
      sort_order INT DEFAULT 0,
      is_active TINYINT(1) DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS homepage_layout (
      id INT AUTO_INCREMENT PRIMARY KEY,
      section_type ENUM('page','banner') NOT NULL,
      page_id INT NULL,
      banner_id INT NULL,
      sort_order INT DEFAULT 0
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      rating INT DEFAULT 5,
      review_body TEXT NOT NULL,
      is_active TINYINT(1) DEFAULT 1,
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
      "INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)",
      [key, value]
    );
  }

  tablesReady = true;
}

app.use(async (req, res, next) => {
  try {
    await ensureAppTables();
    next();
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Database table setup failed",
      error: error.message
    });
  }
});

/* =========================
   COMMON API HELPERS
========================= */

async function getSettingsObject() {
  const [rows] = await db.query("SELECT setting_key, setting_value FROM site_settings");

  const settings = {};

  rows.forEach(function(row) {
    settings[row.setting_key] = row.setting_value || "";
  });

  return settings;
}

async function saveSetting(key, value) {
  await db.query(
    `
    INSERT INTO site_settings (setting_key, setting_value)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)
    `,
    [key, value || ""]
  );
}

async function getProductRows(whereSql = "", params = []) {
  const [rows] = await db.query(
    `
    SELECT
      p.*,
      GROUP_CONCAT(pg.page_name ORDER BY pg.page_name SEPARATOR ', ') AS page_names,
      GROUP_CONCAT(pg.id ORDER BY pg.id SEPARATOR ',') AS page_ids
    FROM products p
    LEFT JOIN product_pages pp ON pp.product_id = p.id
    LEFT JOIN pages pg ON pg.id = pp.page_id
    ${whereSql}
    GROUP BY p.id
    ORDER BY p.id DESC
    `,
    params
  );

  return rows;
}

/* =========================
   PUBLIC API ROUTES
========================= */

app.get("/api/settings", async (req, res) => {
  try {
    const settings = await getSettingsObject();

    res.json({
      status: "ok",
      settings
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.get("/api/pages", async (req, res) => {
  try {
    const [pages] = await db.query(
      "SELECT * FROM pages ORDER BY sort_order ASC, id ASC"
    );

    res.json({
      status: "ok",
      pages
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.get("/api/header-pages", async (req, res) => {
  try {
    const [pages] = await db.query(
      `
      SELECT *
      FROM pages
      WHERE is_active = 1 AND show_on_header = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    res.json({
      status: "ok",
      pages
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await getProductRows("WHERE p.is_visible = 1");

    res.json({
      status: "ok",
      products
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.get("/api/page/:slug", async (req, res) => {
  try {
    const [pageRows] = await db.query(
      "SELECT * FROM pages WHERE slug = ? AND is_active = 1 LIMIT 1",
      [req.params.slug]
    );

    if (pageRows.length === 0) {
      return res.status(404).json({
        status: "error",
        message: "Page not found"
      });
    }

    const page = pageRows[0];

    const products = await getProductRows(
      `
      INNER JOIN product_pages page_map ON page_map.product_id = p.id
      WHERE page_map.page_id = ? AND p.is_visible = 1
      `,
      [page.id]
    );

    res.json({
      status: "ok",
      page,
      products
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.get("/api/product/:slug", async (req, res) => {
  try {
    const products = await getProductRows(
      "WHERE p.slug = ? AND p.is_visible = 1",
      [req.params.slug]
    );

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
      message: error.message
    });
  }
});

app.get("/api/fixed-banners", async (req, res) => {
  try {
    const [banners] = await db.query(
      `
      SELECT *
      FROM fixed_banners
      WHERE is_active = 1
      ORDER BY sort_order ASC, id ASC
      `
    );

    res.json({
      status: "ok",
      banners
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.get("/api/reviews", async (req, res) => {
  try {
    const [reviews] = await db.query(
      `
      SELECT *
      FROM reviews
      WHERE is_active = 1
      ORDER BY id DESC
      `
    );

    res.json({
      status: "ok",
      reviews
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.get("/api/home-sections", async (req, res) => {
  try {
    const [layoutRows] = await db.query(
      `
      SELECT
        hl.id AS layout_id,
        hl.section_type,
        hl.page_id,
        hl.banner_id,
        hl.sort_order,
        p.page_name,
        p.slug,
        p.banner_subheading,
        b.banner_name,
        b.image_url
      FROM homepage_layout hl
      LEFT JOIN pages p ON p.id = hl.page_id
      LEFT JOIN fixed_banners b ON b.id = hl.banner_id
      ORDER BY hl.sort_order ASC, hl.id ASC
      `
    );

    let layout = layoutRows;

    if (layout.length === 0) {
      const [pages] = await db.query(
        "SELECT * FROM pages WHERE is_active = 1 ORDER BY sort_order ASC, id ASC"
      );

      layout = pages.map(function(page) {
        return {
          section_type: "page",
          page_id: page.id,
          page_name: page.page_name,
          slug: page.slug,
          banner_subheading: page.banner_subheading
        };
      });
    }

    const sections = [];

    for (const item of layout) {
      if (item.section_type === "banner" && item.banner_id) {
        sections.push({
          section_type: "banner",
          banner: {
            id: item.banner_id,
            banner_name: item.banner_name,
            image_url: item.image_url
          }
        });

        continue;
      }

      if (item.section_type === "page" && item.page_id) {
        const [pageRows] = await db.query(
          "SELECT * FROM pages WHERE id = ? AND is_active = 1 LIMIT 1",
          [item.page_id]
        );

        if (pageRows.length === 0) continue;

        const page = pageRows[0];

        const products = await getProductRows(
          `
          INNER JOIN product_pages page_map ON page_map.product_id = p.id
          WHERE page_map.page_id = ? AND p.is_visible = 1
          `,
          [page.id]
        );

        sections.push({
          section_type: "page",
          page,
          products: products.slice(0, 12)
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
      message: error.message
    });
  }
});

/* =========================
   AUTH API
========================= */

app.post("/api/auth/login", async (req, res) => {
  try {
    const email = String(req.body.email || "").trim();
    const password = String(req.body.password || "");

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Admin";

    if (!adminEmail || !adminPassword) {
      return res.status(500).json({
        status: "error",
        message: "Admin environment variables are missing"
      });
    }

    if (email !== adminEmail) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password"
      });
    }

    let passwordOk = false;

    if (adminPassword.startsWith("$2a$") || adminPassword.startsWith("$2b$")) {
      passwordOk = await bcrypt.compare(password, adminPassword);
    } else {
      passwordOk = password === adminPassword;
    }

    if (!passwordOk) {
      return res.status(401).json({
        status: "error",
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      {
        email,
        name: adminName,
        role: "admin"
      },
      JWT_SECRET,
      {
        expiresIn: "7d"
      }
    );

    res.json({
      status: "ok",
      token,
      admin: {
        email,
        name: adminName
      }
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

/* =========================
   ADMIN UPLOAD API
========================= */

app.post("/api/admin/upload", verifyAdmin, (req, res) => {
  upload.single("image")(req, res, function(error) {
    if (error) {
      return res.status(400).json({
        status: "error",
        message: error.message || "Upload failed"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No image uploaded"
      });
    }

    return res.json({
      status: "ok",
      file_url: "/media/" + req.file.filename
    });
  });
});

/* =========================
   ADMIN SETTINGS API
========================= */

app.post("/api/admin/settings", verifyAdmin, async (req, res) => {
  try {
    const keys = [
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

    for (const key of keys) {
      await saveSetting(key, req.body[key] || "");
    }

    res.json({
      status: "ok",
      message: "Settings saved successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

/* =========================
   ADMIN PAGES API
========================= */

app.post("/api/admin/pages", verifyAdmin, async (req, res) => {
  try {
    const pageName = String(req.body.page_name || "").trim();

    if (!pageName) {
      return res.status(400).json({
        status: "error",
        message: "Page name is required"
      });
    }

    let slug = createSlug(pageName);
    let finalSlug = slug;
    let count = 1;

    while (true) {
      const [existing] = await db.query(
        "SELECT id FROM pages WHERE slug = ? LIMIT 1",
        [finalSlug]
      );

      if (existing.length === 0) break;

      count += 1;
      finalSlug = slug + "-" + count;
    }

    const [maxRows] = await db.query(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM pages"
    );

    const sortOrder = maxRows[0].next_order || 1;

    const [result] = await db.query(
      `
      INSERT INTO pages
      (
        page_name,
        slug,
        show_on_header,
        show_on_banner,
        banner_image_url,
        banner_subheading,
        create_circular_icon,
        circular_image_url,
        is_active,
        sort_order
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `,
      [
        pageName,
        finalSlug,
        req.body.show_on_header ? 1 : 0,
        req.body.show_on_banner ? 1 : 0,
        req.body.banner_image_url || "",
        req.body.banner_subheading || "",
        req.body.create_circular_icon ? 1 : 0,
        req.body.circular_image_url || "",
        sortOrder
      ]
    );

    await db.query(
      "INSERT INTO homepage_layout (section_type, page_id, sort_order) VALUES ('page', ?, ?)",
      [result.insertId, sortOrder]
    );

    res.json({
      status: "ok",
      message: "Page created successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.put("/api/admin/pages/:id", verifyAdmin, async (req, res) => {
  try {
    const pageId = Number(req.params.id);
    const pageName = String(req.body.page_name || "").trim();

    if (!pageName) {
      return res.status(400).json({
        status: "error",
        message: "Page name is required"
      });
    }

    await db.query(
      `
      UPDATE pages
      SET
        page_name = ?,
        show_on_header = ?,
        show_on_banner = ?,
        banner_image_url = ?,
        banner_subheading = ?,
        create_circular_icon = ?,
        circular_image_url = ?,
        is_active = ?
      WHERE id = ?
      `,
      [
        pageName,
        req.body.show_on_header ? 1 : 0,
        req.body.show_on_banner ? 1 : 0,
        req.body.banner_image_url || "",
        req.body.banner_subheading || "",
        req.body.create_circular_icon ? 1 : 0,
        req.body.circular_image_url || "",
        req.body.is_active ? 1 : 0,
        pageId
      ]
    );

    res.json({
      status: "ok",
      message: "Page updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.delete("/api/admin/pages/:id", verifyAdmin, async (req, res) => {
  try {
    const pageId = Number(req.params.id);

    await db.query("DELETE FROM product_pages WHERE page_id = ?", [pageId]);
    await db.query("DELETE FROM homepage_layout WHERE page_id = ?", [pageId]);
    await db.query("DELETE FROM pages WHERE id = ?", [pageId]);

    res.json({
      status: "ok",
      message: "Page deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

/* =========================
   ADMIN PRODUCTS API
========================= */

app.get("/api/admin/products", verifyAdmin, async (req, res) => {
  try {
    const products = await getProductRows("");

    res.json({
      status: "ok",
      products
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.post("/api/admin/products", verifyAdmin, async (req, res) => {
  try {
    const productName = String(req.body.product_name || "").trim();

    if (!productName) {
      return res.status(400).json({
        status: "error",
        message: "Product name is required"
      });
    }

    let slug = createSlug(productName);
    let finalSlug = slug;
    let count = 1;

    while (true) {
      const [existing] = await db.query(
        "SELECT id FROM products WHERE slug = ? LIMIT 1",
        [finalSlug]
      );

      if (existing.length === 0) break;

      count += 1;
      finalSlug = slug + "-" + count;
    }

    const [result] = await db.query(
      `
      INSERT INTO products
      (
        sku,
        product_name,
        slug,
        product_image_url,
        show_price,
        crossed_price,
        tag,
        dealer_name,
        dealer_price,
        qty_in_stock,
        demand_color,
        is_visible
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
      `,
      [
        req.body.sku || "",
        productName,
        finalSlug,
        req.body.product_image_url || "",
        Number(req.body.show_price || 0),
        Number(req.body.crossed_price || 0),
        req.body.tag || "None",
        req.body.dealer_name || "",
        Number(req.body.dealer_price || 0),
        Number(req.body.qty_in_stock || 0),
        req.body.demand_color || "Green"
      ]
    );

    const productId = result.insertId;
    const pageIds = Array.isArray(req.body.page_ids) ? req.body.page_ids : [];

    for (const pageId of pageIds) {
      await db.query(
        "INSERT IGNORE INTO product_pages (product_id, page_id) VALUES (?, ?)",
        [productId, Number(pageId)]
      );
    }

    res.json({
      status: "ok",
      message: "Product created successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.put("/api/admin/products/:id", verifyAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const productName = String(req.body.product_name || "").trim();

    if (!productName) {
      return res.status(400).json({
        status: "error",
        message: "Product name is required"
      });
    }

    await db.query(
      `
      UPDATE products
      SET
        sku = ?,
        product_name = ?,
        product_image_url = ?,
        show_price = ?,
        crossed_price = ?,
        tag = ?,
        dealer_name = ?,
        dealer_price = ?,
        qty_in_stock = ?,
        demand_color = ?,
        is_visible = ?
      WHERE id = ?
      `,
      [
        req.body.sku || "",
        productName,
        req.body.product_image_url || "",
        Number(req.body.show_price || 0),
        Number(req.body.crossed_price || 0),
        req.body.tag || "None",
        req.body.dealer_name || "",
        Number(req.body.dealer_price || 0),
        Number(req.body.qty_in_stock || 0),
        req.body.demand_color || "Green",
        req.body.is_visible ? 1 : 0,
        productId
      ]
    );

    await db.query("DELETE FROM product_pages WHERE product_id = ?", [productId]);

    const pageIds = Array.isArray(req.body.page_ids) ? req.body.page_ids : [];

    for (const pageId of pageIds) {
      await db.query(
        "INSERT IGNORE INTO product_pages (product_id, page_id) VALUES (?, ?)",
        [productId, Number(pageId)]
      );
    }

    res.json({
      status: "ok",
      message: "Product updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.put("/api/admin/products/:id/quantity", verifyAdmin, async (req, res) => {
  try {
    await db.query(
      "UPDATE products SET qty_in_stock = ? WHERE id = ?",
      [Number(req.body.qty_in_stock || 0), Number(req.params.id)]
    );

    res.json({
      status: "ok",
      message: "Quantity updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.put("/api/admin/products/:id/visibility", verifyAdmin, async (req, res) => {
  try {
    await db.query(
      "UPDATE products SET is_visible = ? WHERE id = ?",
      [req.body.is_visible ? 1 : 0, Number(req.params.id)]
    );

    res.json({
      status: "ok",
      message: "Visibility updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.put("/api/admin/products/:id/image", verifyAdmin, async (req, res) => {
  try {
    await db.query(
      "UPDATE products SET product_image_url = ? WHERE id = ?",
      [req.body.product_image_url || "", Number(req.params.id)]
    );

    res.json({
      status: "ok",
      message: "Image updated successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.delete("/api/admin/products/:id", verifyAdmin, async (req, res) => {
  try {
    const productId = Number(req.params.id);

    await db.query("DELETE FROM product_pages WHERE product_id = ?", [productId]);
    await db.query("DELETE FROM products WHERE id = ?", [productId]);

    res.json({
      status: "ok",
      message: "Product deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

/* =========================
   ADMIN FIXED BANNERS API
========================= */

app.post("/api/admin/fixed-banners", verifyAdmin, async (req, res) => {
  try {
    const bannerName = String(req.body.banner_name || "").trim();
    const imageUrl = String(req.body.image_url || "").trim();

    if (!bannerName || !imageUrl) {
      return res.status(400).json({
        status: "error",
        message: "Banner name and image are required"
      });
    }

    const [maxRows] = await db.query(
      "SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM fixed_banners"
    );

    const sortOrder = maxRows[0].next_order || 1;

    const [result] = await db.query(
      `
      INSERT INTO fixed_banners (banner_name, image_url, sort_order, is_active)
      VALUES (?, ?, ?, 1)
      `,
      [bannerName, imageUrl, sortOrder]
    );

    await db.query(
      "INSERT INTO homepage_layout (section_type, banner_id, sort_order) VALUES ('banner', ?, ?)",
      [result.insertId, sortOrder]
    );

    res.json({
      status: "ok",
      message: "Fixed banner added successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.delete("/api/admin/fixed-banners/:id", verifyAdmin, async (req, res) => {
  try {
    const bannerId = Number(req.params.id);

    await db.query("DELETE FROM homepage_layout WHERE banner_id = ?", [bannerId]);
    await db.query("DELETE FROM fixed_banners WHERE id = ?", [bannerId]);

    res.json({
      status: "ok",
      message: "Fixed banner deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

/* =========================
   ADMIN PAGE + BANNER POSITION API
========================= */

app.get("/api/admin/page-banner-position", verifyAdmin, async (req, res) => {
  try {
    const [rows] = await db.query(
      `
      SELECT
        hl.id AS layout_id,
        hl.section_type,
        hl.sort_order,
        p.page_name,
        b.banner_name
      FROM homepage_layout hl
      LEFT JOIN pages p ON p.id = hl.page_id
      LEFT JOIN fixed_banners b ON b.id = hl.banner_id
      ORDER BY hl.sort_order ASC, hl.id ASC
      `
    );

    res.json({
      status: "ok",
      items: rows
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.post("/api/admin/page-banner-position/reorder", verifyAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body.items) ? req.body.items : [];

    for (let i = 0; i < items.length; i++) {
      await db.query(
        "UPDATE homepage_layout SET sort_order = ? WHERE id = ?",
        [i + 1, Number(items[i].layout_id)]
      );
    }

    res.json({
      status: "ok",
      message: "Position saved successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

/* =========================
   ADMIN REVIEWS API
========================= */

app.get("/api/admin/reviews", verifyAdmin, async (req, res) => {
  try {
    const [reviews] = await db.query("SELECT * FROM reviews ORDER BY id DESC");

    res.json({
      status: "ok",
      reviews
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.post("/api/admin/reviews", verifyAdmin, async (req, res) => {
  try {
    const customerName = String(req.body.customer_name || "").trim();
    const reviewBody = String(req.body.review_body || "").trim();

    if (!customerName || !reviewBody) {
      return res.status(400).json({
        status: "error",
        message: "Customer name and review text are required"
      });
    }

    await db.query(
      `
      INSERT INTO reviews (customer_name, rating, review_body, is_active)
      VALUES (?, ?, ?, 1)
      `,
      [
        customerName,
        Math.max(1, Math.min(5, Number(req.body.rating || 5))),
        reviewBody
      ]
    );

    res.json({
      status: "ok",
      message: "Review added successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

app.delete("/api/admin/reviews/:id", verifyAdmin, async (req, res) => {
  try {
    await db.query("DELETE FROM reviews WHERE id = ?", [Number(req.params.id)]);

    res.json({
      status: "ok",
      message: "Review deleted successfully"
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

/* =========================
   ADMIN DASHBOARD API
========================= */

app.get("/api/admin/dashboard", verifyAdmin, async (req, res) => {
  try {
    const [summaryRows] = await db.query(
      `
      SELECT
        COUNT(*) AS total_sku,
        COALESCE(SUM(qty_in_stock), 0) AS total_quantity,
        COALESCE(SUM(qty_in_stock * dealer_price), 0) AS total_inventory_cost
      FROM products
      `
    );

    const [lowStockProducts] = await db.query(
      `
      SELECT *
      FROM products
      WHERE qty_in_stock <= 5
      ORDER BY qty_in_stock ASC, product_name ASC
      `
    );

    const [dealerRows] = await db.query(
      `
      SELECT DISTINCT dealer_name
      FROM products
      WHERE dealer_name IS NOT NULL AND dealer_name != ''
      ORDER BY dealer_name ASC
      `
    );

    res.json({
      status: "ok",
      summary: summaryRows[0],
      low_stock_products: lowStockProducts,
      dealers: dealerRows.map(function(row) {
        return row.dealer_name;
      })
    });
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: error.message
    });
  }
});

/* =========================
   PUBLIC ROUTES
========================= */

app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Product Showcase</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          ${globalPublicCss()}
          ${homePageCss()}
        </style>
      </head>

      <body class="home-page">
        ${globalHeaderHtml()}

        <main class="page-wrap">
          <section id="homeBannerWrap"></section>

          <section class="home-mobile-search-wrap">
            <div class="search-box home-mobile-search-box search-shell">
              <button class="search-icon-btn" type="button" onclick="runSearchInPage('homeSearchInput', 'homeSearchSuggestionsBox')">🔍</button>
              <input
                id="homeSearchInput"
                placeholder="Search products..."
                onfocus="delayMobileSearchFocus(this)"
                oninput="showSearchSuggestions('homeSearchInput', 'homeSearchSuggestionsBox')"
                onkeydown="handleSearchKey(event, 'homeSearchInput', 'homeSearchSuggestionsBox')"
              />
              <div id="homeSearchSuggestionsBox" class="search-suggestions-box"></div>
            </div>
          </section>

          <section id="circularPagesWrap" class="circular-pages-wrap"></section>

          <section id="fixedBannersWrap" class="fixed-banners-wrap"></section>

          <section>
            <div id="homeSections"></div>
          </section>

          <section id="reviewsSection" class="reviews-section">
            <div class="reviews-head">
              <h2>Customer Reviews</h2>
            </div>
            <div id="reviewsGrid" class="reviews-grid"></div>
          </section>

          <section class="feature-strip">
            <div class="feature-card">
              <span>✅</span>
              <strong>Best Quality</strong>
            </div>

            <div class="feature-card">
              <span>⚡</span>
              <strong>Easy Order</strong>
            </div>

            <div class="feature-card">
              <span>💰</span>
              <strong>Best Price</strong>
            </div>
          </section>
        </main>

        ${globalFooterHtml()}

        <script>
          ${globalPublicJs({ pageType: "home" })}
          ${homePageJs()}
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
          ${globalPublicCss()}
          ${categoryPageCss()}
        </style>
      </head>

      <body>
        ${globalHeaderHtml()}

        <main class="page-wrap">
          <section class="page-title-box">
            <h1 id="pageTitle">Loading...</h1>
            <p id="pageSubheading"></p>
          </section>

          <section>
            <div id="productsGrid" class="product-grid"></div>
          </section>
        </main>

        ${globalFooterHtml()}

        <script>
          ${globalPublicJs({ pageType: "category", activePageSlug: pageSlug })}
          ${categoryPageJs(pageSlug)}
        </script>
      </body>
    </html>
  `);
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
          ${globalPublicCss()}
          ${productDetailCss()}
        </style>
      </head>

      <body>
        ${globalHeaderHtml()}

        <main class="page-wrap">
          <div id="productDetail"></div>
        </main>

        ${globalFooterHtml()}

        <script>
          ${globalPublicJs({ pageType: "product" })}
          ${productDetailJs(productSlug)}
        </script>
      </body>
    </html>
  `);
});

app.get("/legal/:type", async (req, res) => {
  try {
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

    const selected = legalMap[req.params.type];

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
            ${globalPublicCss()}
${legalPageCss()}
          </style>
        </head>

        <body>
          ${globalHeaderHtml()}

          <main class="page-wrap">
            <div class="legal-card">
              <h1>${selected.title}</h1>
              <div class="legal-content">${content}</div>
            </div>
          </main>

          ${globalFooterHtml()}

          <script>
            ${globalPublicJs({ pageType: "legal" })}
            initPublicBase();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    res.status(500).send("Failed to load legal page: " + error.message);
  }
});
/* =========================
   ADMIN COMMON CSS
========================= */

function adminCommonCss() {
  return `
* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
  background: #F7F8F3;
  color: #111827;
  -webkit-font-smoothing: antialiased;
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
  font-weight: 800;
}

.admin-nav {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
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
  font-weight: 700;
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

.card {
  background: white;
  border: 1px solid #DCCCAC;
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
}

.grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 18px;
}

h2 {
  margin: 0 0 14px;
  font-size: 20px;
  font-weight: 800;
}

p {
  color: #6f7a5f;
  line-height: 1.5;
}

label {
  display: block;
  margin: 12px 0 6px;
  font-size: 14px;
  font-weight: 700;
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

button.primary {
  background: #546B41;
  color: #FFF8EC;
  border: none;
  border-radius: 12px;
  padding: 12px 15px;
  font-size: 14px;
  font-weight: 800;
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

.upload-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.upload-row button {
  width: auto;
  margin-top: 0;
  background: #546B41;
  color: #FFF8EC;
  border: none;
  border-radius: 10px;
  padding: 11px 14px;
  font-weight: 800;
  cursor: pointer;
}

.upload-status {
  font-size: 13px;
  color: #6f7a5f;
  margin-top: 6px;
}

.admin-item {
  border: 1px solid #DCCCAC;
  border-radius: 14px;
  padding: 12px;
  margin-bottom: 10px;
  background: #FFF8EC;
}

.admin-item-title {
  font-weight: 800;
  color: #38472d;
}

.admin-item-meta {
  font-size: 13px;
  color: #6f7a5f;
  margin-top: 5px;
}

.admin-actions {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  flex-wrap: wrap;
}

.small-btn {
  border: none;
  border-radius: 10px;
  padding: 8px 10px;
  font-weight: 800;
  cursor: pointer;
}

.edit-small-btn {
  background: #546B41;
  color: white;
}

.delete-small-btn {
  background: #fee2e2;
  color: #991b1b;
}

.neutral-small-btn {
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
  font-weight: 800;
  cursor: pointer;
}

.modal-cancel {
  background: #DCCCAC;
  color: #546B41;
  border: none;
  border-radius: 12px;
  padding: 12px 15px;
  font-weight: 800;
  cursor: pointer;
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
  font-weight: 800;
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

@media (max-width: 767px) {
  .topbar {
    align-items: flex-start;
    flex-direction: column;
    padding: 14px;
  }

  .container {
    padding: 14px;
  }

  .grid {
    grid-template-columns: 1fr;
  }

  .admin-nav {
    width: 100%;
  }

  .admin-nav a,
  .admin-nav button {
    font-size: 12px;
    padding: 8px 10px;
  }
}
`;
}

/* =========================
   ADMIN LOGIN ROUTE
========================= */

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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
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
            font-weight: 800;
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
            font-weight: 700;
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
            font-weight: 800;
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

/* =========================
   MANAGE UI ROUTE
========================= */

app.get("/manage-ui", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Manage UI</title>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <style>
          ${adminCommonCss()}
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
            <button class="tab-btn" onclick="showTab('fixedBannersTab', this)">Fixed Banners</button>
            <button class="tab-btn" onclick="showTab('pageBannerPositionTab', this)">Page & Banners Position</button>
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
                <div class="upload-row">
                  <input id="bannerImageFile" type="file" accept="image/*" />
                  <button type="button" onclick="uploadImageFile('bannerImageFile', 'bannerImageUrl', 'bannerUploadStatus')">Upload</button>
                </div>
                <input id="bannerImageUrl" type="hidden" />
                <div id="bannerUploadStatus" class="upload-status">No banner image uploaded yet.</div>

                <label>Banner Subheading</label>
                <input id="bannerSubheading" placeholder="Example: Fresh collection available now" />

                <div class="check-row">
                  <input id="createCircularIcon" type="checkbox" />
                  <span>Create Circular Icon</span>
                </div>

                <label>Circular Image</label>
                <div class="upload-row">
                  <input id="circularImageFile" type="file" accept="image/*" />
                  <button type="button" onclick="uploadImageFile('circularImageFile', 'circularImageUrl', 'circularUploadStatus')">Upload</button>
                </div>
                <input id="circularImageUrl" type="hidden" />
                <div id="circularUploadStatus" class="upload-status">No circular image uploaded yet.</div>

                <button class="primary" onclick="createPage()">Create Page</button>
              </div>

              <div class="card">
                <h2>Manage Pages</h2>
                <div id="pagesList" class="placeholder">Loading pages...</div>
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
              <div class="upload-row">
                <input id="productImageFile" type="file" accept="image/*" />
                <button type="button" onclick="uploadImageFile('productImageFile', 'productImageUrl', 'productImageUploadStatus')">Upload</button>
              </div>
              <input id="productImageUrl" type="hidden" />
              <div id="productImageUploadStatus" class="upload-status">No product image uploaded yet.</div>

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
              <div id="productPagesBox" class="placeholder">Loading pages...</div>

              <button class="primary" onclick="createProduct()">Create Product</button>
            </div>
          </div>

          <div id="fixedBannersTab" class="tab-content">
            <div class="grid">
              <div class="card">
                <h2>Add Fixed Promotional Banner</h2>

                <label>Banner Name</label>
                <input id="fixedBannerName" placeholder="Example: Festival Offer" />

                <label>Banner Image</label>
                <div class="upload-row">
                  <input id="fixedBannerImageFile" type="file" accept="image/*" />
                  <button type="button" onclick="uploadImageFile('fixedBannerImageFile', 'fixedBannerImageUrl', 'fixedBannerUploadStatus')">Upload</button>
                </div>

                <input id="fixedBannerImageUrl" type="hidden" />
                <div id="fixedBannerUploadStatus" class="upload-status">No fixed banner image uploaded yet.</div>

                <button class="primary" onclick="addFixedBanner()">Add Fixed Banner</button>
              </div>

              <div class="card">
                <h2>Manage Fixed Banners</h2>
                <div id="fixedBannersList">Loading fixed banners...</div>
              </div>
            </div>
          </div>

          <div id="pageBannerPositionTab" class="tab-content">
            <div class="card">
              <h2>Page & Banners Position</h2>
              <p style="font-size:14px;margin-top:0;">
                Set the homepage order of product pages and fixed banners together.
              </p>

              <div id="pageBannerPositionList">Loading position list...</div>

              <button class="primary" onclick="savePageBannerPosition()">Save Position</button>
            </div>
          </div>

          <div id="reviewsTab" class="tab-content">
            <div class="grid">
              <div class="card">
                <h2>Add Review</h2>

                <label>Customer Name</label>
                <input id="reviewCustomerName" placeholder="Example: Aasia" />

                <label>Rating out of 5</label>
                <input id="reviewRating" type="number" min="1" max="5" placeholder="Example: 5" />

                <label>Review Text</label>
                <textarea id="reviewBody" placeholder="Write customer review here"></textarea>

                <button class="primary" onclick="addReview()">Add Review</button>
              </div>

              <div class="card">
                <h2>Manage Reviews</h2>
                <div id="reviewsList">Loading reviews...</div>
              </div>
            </div>
          </div>

          <div id="settingsTab" class="tab-content">
            <div class="card">
              <h2>Header & Footer</h2>

              <label>Logo</label>
              <div class="upload-row">
                <input id="settingLogoFile" type="file" accept="image/*" />
                <button type="button" onclick="uploadImageFile('settingLogoFile', 'settingLogoUrl', 'logoUploadStatus')">Upload</button>
              </div>
              <input id="settingLogoUrl" type="hidden" />
              <div id="logoUploadStatus" class="upload-status">No logo uploaded yet.</div>

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

        <div id="editPageOverlay" class="modal-overlay"></div>

        <div id="editPageBox" class="modal-box">
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
          <div class="upload-row">
            <input id="editBannerImageFile" type="file" accept="image/*" />
            <button type="button" onclick="uploadImageFile('editBannerImageFile', 'editBannerImageUrl', 'editBannerUploadStatus')">Upload</button>
          </div>
          <input id="editBannerImageUrl" type="hidden" />
          <div id="editBannerUploadStatus" class="upload-status">No banner image uploaded yet.</div>

          <label>Banner Subheading</label>
          <input id="editBannerSubheading" />

          <div class="check-row">
            <input id="editCreateCircularIcon" type="checkbox" />
            <span>Create Circular Icon</span>
          </div>

          <label>Circular Image</label>
          <div class="upload-row">
            <input id="editCircularImageFile" type="file" accept="image/*" />
            <button type="button" onclick="uploadImageFile('editCircularImageFile', 'editCircularImageUrl', 'editCircularUploadStatus')">Upload</button>
          </div>
          <input id="editCircularImageUrl" type="hidden" />
          <div id="editCircularUploadStatus" class="upload-status">No circular image uploaded yet.</div>

          <div class="check-row">
            <input id="editIsActive" type="checkbox" />
            <span>Page Active</span>
          </div>

          <div class="modal-actions">
            <button class="modal-save" onclick="updatePage()">Save Changes</button>
            <button class="modal-cancel" onclick="closeEditPageBox()">Cancel</button>
          </div>
        </div>

        <script>
          const token = localStorage.getItem("admin_token");

          if (!token) {
            window.location.href = "/admin";
          }

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
                  "Authorization": "Bearer " + token
                },
                body: formData
              });

              const data = await res.json();

              if (!res.ok) {
                if (statusBox) statusBox.textContent = data.message || "Upload failed";
                alert(data.message || "Upload failed");
                return;
              }

              if (hiddenInput) {
                hiddenInput.value = data.file_url;
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
                  "Authorization": "Bearer " + token
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
              loadProductPageCheckboxes();
              loadPageBannerPosition();
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
                div.className = "admin-item";

                div.innerHTML =
                  "<div class='admin-item-title'>" + page.page_name + "</div>" +
                  "<div class='admin-item-meta'>Slug: " + page.slug + "</div>" +
                  "<div class='admin-item-meta'>" +
                    "Header: " + (page.show_on_header ? "Yes" : "No") +
                    " | Banner: " + (page.show_on_banner ? "Yes" : "No") +
                    " | Circular: " + (page.create_circular_icon ? "Yes" : "No") +
                  "</div>" +
                  "<div class='admin-actions'>" +
                    "<button class='small-btn edit-small-btn'>Edit</button>" +
                    "<button class='small-btn delete-small-btn'>Delete</button>" +
                  "</div>";

                div.querySelector(".edit-small-btn").onclick = function() {
                  openEditPageBox(page);
                };

                div.querySelector(".delete-small-btn").onclick = function() {
                  deletePage(page.id, page.page_name);
                };

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
                  "Authorization": "Bearer " + token
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
              loadProductPageCheckboxes();
              loadPageBannerPosition();
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
                  "Authorization": "Bearer " + token
                }
              });

              const data = await res.json();

              if (!res.ok) {
                alert(data.message || "Page delete failed");
                return;
              }

              alert("Page deleted successfully");
              loadPages();
              loadProductPageCheckboxes();
              loadPageBannerPosition();
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
                  "Authorization": "Bearer " + token
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
                  "Authorization": "Bearer " + token
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

                    async function loadFixedBannersAdmin() {
            const box = document.getElementById("fixedBannersList");

            if (!box) return;

            try {
              const res = await fetch("/api/fixed-banners");
              const data = await res.json();
              const banners = data.banners || [];

              if (banners.length === 0) {
                box.innerHTML = "<div style='color:#6f7a5f;font-size:14px;'>No fixed banners added yet.</div>";
                return;
              }

              let html = "";

              banners.forEach(function(banner) {
                html += "<div class='admin-item'>";
                html += "<img src='" + banner.image_url + "' style='width:100%;max-height:150px;object-fit:cover;border-radius:10px;border:1px solid #DCCCAC;' />";
                html += "<div class='admin-item-title' style='margin-top:8px;'>" + banner.banner_name + "</div>";
                html += "<div class='admin-item-meta'>Sort Order: " + banner.sort_order + "</div>";
                html += "<div class='admin-actions'>";
                html += "<button class='small-btn delete-small-btn' onclick='deleteFixedBanner(" + banner.id + ")'>Delete</button>";
                html += "</div>";
                html += "</div>";
              });

              box.innerHTML = html;
            } catch (error) {
              box.innerHTML = error.message;
            }
          }

          async function addFixedBanner() {
            const bannerName = document.getElementById("fixedBannerName").value.trim();
            const imageUrl = document.getElementById("fixedBannerImageUrl").value.trim();

            if (!bannerName) {
              alert("Banner name is required");
              return;
            }

            if (!imageUrl) {
              alert("Please upload fixed banner image first");
              return;
            }

            try {
              const res = await fetch("/api/admin/fixed-banners", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                  banner_name: bannerName,
                  image_url: imageUrl
                })
              });

              const data = await res.json();

              if (!res.ok) {
                alert(data.message || "Fixed banner add failed");
                return;
              }

              alert("Fixed banner added successfully");

              document.getElementById("fixedBannerName").value = "";
              document.getElementById("fixedBannerImageFile").value = "";
              document.getElementById("fixedBannerImageUrl").value = "";
              document.getElementById("fixedBannerUploadStatus").textContent = "No fixed banner image uploaded yet.";

              loadFixedBannersAdmin();
              loadPageBannerPosition();
            } catch (error) {
              alert(error.message);
            }
          }

          async function deleteFixedBanner(bannerId) {
            const ok = confirm("Delete this fixed banner?");

            if (!ok) return;

            try {
              const res = await fetch("/api/admin/fixed-banners/" + bannerId, {
                method: "DELETE",
                headers: {
                  "Authorization": "Bearer " + token
                }
              });

              const data = await res.json();

              if (!res.ok) {
                alert(data.message || "Fixed banner delete failed");
                return;
              }

              alert("Fixed banner deleted successfully");
              loadFixedBannersAdmin();
              loadPageBannerPosition();
            } catch (error) {
              alert(error.message);
            }
          }

          let pageBannerPositionItems = [];

          async function loadPageBannerPosition() {
            const box = document.getElementById("pageBannerPositionList");

            if (!box) return;

            try {
              const res = await fetch("/api/admin/page-banner-position", {
                headers: {
                  "Authorization": "Bearer " + token
                }
              });

              const data = await res.json();

              if (!res.ok) {
                box.innerHTML = data.message || "Failed to load position list.";
                return;
              }

              pageBannerPositionItems = data.items || [];
              renderPageBannerPositionList();
            } catch (error) {
              box.innerHTML = error.message;
            }
          }

          function renderPageBannerPositionList() {
            const box = document.getElementById("pageBannerPositionList");

            if (!box) return;

            if (pageBannerPositionItems.length === 0) {
              box.innerHTML = "<div style='color:#6f7a5f;font-size:14px;'>No pages or banners found.</div>";
              return;
            }

            let html = "";

            pageBannerPositionItems.forEach(function(item, index) {
              const isPage = item.section_type === "page";
              const title = isPage ? item.page_name : item.banner_name;
              const label = isPage ? "Page" : "Fixed Banner";
              const bg = isPage ? "#FFF8EC" : "#f3f4f6";

              html += "<div style='display:grid;grid-template-columns:42px 1fr auto;gap:10px;align-items:center;border:1px solid #DCCCAC;border-radius:14px;padding:10px;margin-bottom:10px;background:" + bg + ";'>";
              html += "<div style='font-weight:800;color:#546B41;text-align:center;'>" + (index + 1) + "</div>";
              html += "<div>";
              html += "<div style='font-size:12px;color:#6f7a5f;font-weight:800;'>" + label + "</div>";
              html += "<div style='font-size:15px;color:#38472d;font-weight:900;'>" + title + "</div>";
              html += "</div>";
              html += "<div style='display:flex;gap:6px;'>";
              html += "<button type='button' onclick='movePageBannerItem(" + index + ", -1)' class='small-btn neutral-small-btn'>↑</button>";
              html += "<button type='button' onclick='movePageBannerItem(" + index + ", 1)' class='small-btn neutral-small-btn'>↓</button>";
              html += "</div>";
              html += "</div>";
            });

            box.innerHTML = html;
          }

          function movePageBannerItem(index, direction) {
            const newIndex = index + direction;

            if (newIndex < 0 || newIndex >= pageBannerPositionItems.length) {
              return;
            }

            const temp = pageBannerPositionItems[index];
            pageBannerPositionItems[index] = pageBannerPositionItems[newIndex];
            pageBannerPositionItems[newIndex] = temp;

            renderPageBannerPositionList();
          }

          async function savePageBannerPosition() {
            try {
              const res = await fetch("/api/admin/page-banner-position/reorder", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                  items: pageBannerPositionItems.map(function(item) {
                    return {
                      layout_id: item.layout_id
                    };
                  })
                })
              });

              const data = await res.json();

              if (!res.ok) {
                alert(data.message || "Position save failed");
                return;
              }

              alert("Page & Banners Position saved successfully");
              loadPageBannerPosition();
            } catch (error) {
              alert(error.message);
            }
          }

          function renderStars(rating) {
            const safeRating = Math.max(1, Math.min(5, Number(rating || 5)));
            return "★".repeat(safeRating) + "☆".repeat(5 - safeRating);
          }

          async function loadReviewsAdmin() {
            const box = document.getElementById("reviewsList");

            if (!box) return;

            try {
              const res = await fetch("/api/admin/reviews", {
                headers: {
                  "Authorization": "Bearer " + token
                }
              });

              const data = await res.json();
              const reviews = data.reviews || [];

              if (reviews.length === 0) {
                box.innerHTML = "<div style='color:#6f7a5f;font-size:14px;'>No reviews added yet.</div>";
                return;
              }

              let html = "";

              reviews.forEach(function(review) {
                html += "<div class='admin-item'>";
                html += "<div class='admin-item-title'>" + review.customer_name + "</div>";
                html += "<div class='admin-item-meta'>Rating: " + review.rating + "/5 " + renderStars(review.rating) + "</div>";
                html += "<div style='font-size:14px;color:#38472d;line-height:1.4;margin-top:7px;'>" + review.review_body + "</div>";
                html += "<div class='admin-actions'>";
                html += "<button class='small-btn delete-small-btn' onclick='deleteReview(" + review.id + ")'>Delete</button>";
                html += "</div>";
                html += "</div>";
              });

              box.innerHTML = html;
            } catch (error) {
              box.innerHTML = error.message;
            }
          }

          async function addReview() {
            const customerName = document.getElementById("reviewCustomerName").value.trim();
            const rating = document.getElementById("reviewRating").value.trim();
            const reviewBody = document.getElementById("reviewBody").value.trim();

            if (!customerName) {
              alert("Customer name is required");
              return;
            }

            if (!reviewBody) {
              alert("Review text is required");
              return;
            }

            try {
              const res = await fetch("/api/admin/reviews", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": "Bearer " + token
                },
                body: JSON.stringify({
                  customer_name: customerName,
                  rating: rating || 5,
                  review_body: reviewBody
                })
              });

              const data = await res.json();

              if (!res.ok) {
                alert(data.message || "Review add failed");
                return;
              }

              alert("Review added successfully");

              document.getElementById("reviewCustomerName").value = "";
              document.getElementById("reviewRating").value = "";
              document.getElementById("reviewBody").value = "";

              loadReviewsAdmin();
            } catch (error) {
              alert(error.message);
            }
          }

          async function deleteReview(reviewId) {
            const ok = confirm("Delete this review?");

            if (!ok) return;

            try {
              const res = await fetch("/api/admin/reviews/" + reviewId, {
                method: "DELETE",
                headers: {
                  "Authorization": "Bearer " + token
                }
              });

              const data = await res.json();

              if (!res.ok) {
                alert(data.message || "Review delete failed");
                return;
              }

              alert("Review deleted successfully");
              loadReviewsAdmin();
            } catch (error) {
              alert(error.message);
            }
          }

          loadPages();
          loadProductPageCheckboxes();
          loadSettings();
          loadFixedBannersAdmin();
          loadPageBannerPosition();
          loadReviewsAdmin();
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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: #F7F8F3;
            color: #111827;
            -webkit-font-smoothing: antialiased;
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
            font-weight: 800;
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
            font-weight: 700;
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
            font-weight: 800;
            cursor: pointer;
          }

          .products-table-wrap {
            background: white;
            border: 1px solid #DCCCAC;
            border-radius: 18px;
            overflow: auto;
            box-shadow: 0 8px 24px rgba(84, 107, 65, 0.08);
          }

          table {
            width: 100%;
            border-collapse: collapse;
            min-width: 980px;
          }

          th {
            background: #DCCCAC;
            color: #546B41;
            text-align: left;
            font-size: 13px;
            padding: 12px;
            font-weight: 800;
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
            font-weight: 800;
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
            font-weight: 800;
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
            width: 76px;
            padding: 8px;
            border: 1px solid #DCCCAC;
            border-radius: 9px;
            background: #FFF8EC;
            color: #546B41;
            outline: none;
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
            font-weight: 800;
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
            font-weight: 700;
          }

          .modal-box input,
          .modal-box select {
            width: 100%;
            padding: 11px;
            border-radius: 11px;
            border: 1px solid #DCCCAC;
            background: #FFF8EC;
            color: #546B41;
            outline: none;
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
            font-weight: 800;
            cursor: pointer;
          }

          .modal-cancel {
            background: #DCCCAC;
            color: #546B41;
            border: none;
            border-radius: 12px;
            padding: 12px 15px;
            font-weight: 800;
            cursor: pointer;
          }

          @media (max-width: 767px) {
            .topbar {
              padding: 12px;
              align-items: flex-start;
              flex-direction: column;
            }

            .admin-nav {
              width: 100%;
              overflow-x: auto;
              padding-bottom: 2px;
            }

            .admin-nav a,
            .admin-nav button {
              white-space: nowrap;
            }

            .container {
              padding: 14px;
            }

            .toolbar {
              flex-direction: column;
              align-items: stretch;
            }
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
            <button type="button" onclick="uploadImageFile('editProductImageFile', 'editProductImageUrl', 'editProductImageUploadStatus')" style="width:auto;background:#546B41;color:#FFF8EC;border:none;border-radius:10px;padding:11px 14px;font-weight:800;cursor:pointer;">Upload</button>
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

              html += "<td>";
              html += "<img class='product-img-small' src='" + image + "' onerror=\"this.onerror=null;this.src='https://via.placeholder.com/100x100?text=Product';\" />";
              html += "</td>";

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

              html += "<td>";
              html += "<span class='badge " + visibleBadge + "'>" + visibleText + "</span>";
              html += "</td>";

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

          function filterAdminProducts() {
            const input = document.getElementById("productSearchInput");
            const q = input ? input.value.toLowerCase().trim() : "";

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
                if (statusBox) {
                  statusBox.textContent = data.message || "Upload failed";
                }

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
                    if (statusBox) {
                      statusBox.textContent = saveData.message || "Image uploaded but not saved";
                    }

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
              if (statusBox) {
                statusBox.textContent = error.message;
              }

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
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            background: #F7F8F3;
            color: #111827;
            -webkit-font-smoothing: antialiased;
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

          @media (max-width: 767px) {
            .topbar {
              align-items: flex-start;
              flex-direction: column;
              padding: 14px;
            }

            .admin-nav {
              width: 100%;
              overflow-x: auto;
              padding-bottom: 4px;
            }

            .container {
              padding: 14px;
            }

            .summary-grid {
              grid-template-columns: 1fr;
            }

            .panel-head {
              align-items: flex-start;
              flex-direction: column;
            }

            .filters {
              width: 100%;
              flex-direction: column;
              align-items: stretch;
            }

            table {
              min-width: 760px;
            }

            #lowStockBox {
              overflow-x: auto;
            }
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

              html += "<td>";
              html += "<img class='product-img-small' src='" + image + "' onerror=\"this.onerror=null;this.src='https://via.placeholder.com/100x100?text=Product';\" />";
              html += "</td>";

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

            navigator.clipboard.writeText(text)
              .then(function() {
                alert("Low stock list copied. You can paste it into Excel.");
              })
              .catch(function(error) {
                alert(error.message);
              });
          }

          loadDashboard();
        </script>
      </body>
    </html>
  `);
});

ensureAppTables()
  .then(() => {
    app.listen(PORT, () => {
      console.log("Server running on port " + PORT);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
