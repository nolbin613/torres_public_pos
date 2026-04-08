const express = require("express");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3007;

const SQUARE_APP_ID = process.env.SQUARE_APP_ID || "";
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN || "";
const SQUARE_ENV = process.env.SQUARE_ENV || "production";

const SQUARE_API_BASE =
  SQUARE_ENV === "sandbox"
    ? "https://connect.squareupsandbox.com"
    : "https://connect.squareup.com";

const SQUARE_WEB_SDK_SRC =
  SQUARE_ENV === "sandbox"
    ? "https://sandbox.web.squarecdn.com/v1/square.js"
    : "https://web.squarecdn.com/v1/square.js";

app.use(express.json());
app.use(express.static("public"));

const products = [
  { id: 1, name: "Maduro", price: 14, image: "/images/maduro.jpg" },
  { id: 2, name: "Habano", price: 14, image: "/images/habano.jpg" },
  { id: 3, name: "Cameroon", price: 14, image: "/images/cameroon.jpg" },
  { id: 4, name: "Corojo", price: 14, image: "/images/corojo.jpg" },
  { id: 5, name: "Connecticut", price: 14, image: "/images/connecticut.jpg" }
];

let cachedLocationId = null;

function getCartTotal(cart) {
  let total = 0;
  for (const item of cart || []) {
    const product = products.find((p) => p.id === Number(item.id));
    if (!product) continue;
    const qty = Math.max(1, Number(item.qty || 1));
    total += product.price * qty;
  }
  return total;
}

async function squareRequest(path, options = {}) {
  const response = await fetch(`${SQUARE_API_BASE}${path}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${SQUARE_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    body: options.body
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const detail =
      data?.errors?.[0]?.detail ||
      data?.message ||
      `Square request failed (${response.status})`;
    throw new Error(detail);
  }

  return data;
}

async function getLocationId() {
  if (cachedLocationId) return cachedLocationId;

  const data = await squareRequest("/v2/locations");
  const active =
    (data.locations || []).find((loc) => loc.status === "ACTIVE") ||
    (data.locations || [])[0];

  if (!active?.id) {
    throw new Error("Could not find an active Square location.");
  }

  cachedLocationId = active.id;
  return cachedLocationId;
}

app.get("/api/config", async (_req, res) => {
  try {
    if (!SQUARE_APP_ID || !SQUARE_ACCESS_TOKEN) {
      return res.status(500).json({
        error:
          "Missing Square environment variables. Set SQUARE_APP_ID and SQUARE_ACCESS_TOKEN."
      });
    }

    const locationId = await getLocationId();

    res.json({
      appId: SQUARE_APP_ID,
      locationId,
      env: SQUARE_ENV
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/payments", async (req, res) => {
  try {
    const { sourceId, cart, customer } = req.body || {};

    if (!sourceId) {
      return res.status(400).json({ error: "Missing payment token." });
    }

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: "Cart is empty." });
    }

    const total = getCartTotal(cart);
    if (total <= 0) {
      return res.status(400).json({ error: "Invalid cart total." });
    }

    const locationId = await getLocationId();

    const payload = {
      source_id: sourceId,
      idempotency_key: crypto.randomUUID(),
      amount_money: {
        amount: Math.round(total * 100),
        currency: "USD"
      },
      location_id: locationId,
      autocomplete: true,
      note: "Torres Cigars website order"
    };

    if (customer?.email) {
      payload.buyer_email_address = customer.email;
    }

    const payment = await squareRequest("/v2/payments", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    res.json({
      success: true,
      payment
    });
  } catch (err) {
    res.status(500).json({ error: err.message || "Payment failed." });
  }
});

app.get("/", (_req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Torres Cigars</title>
<style>
*{box-sizing:border-box}
:root{
  --gold:#d4af37;
  --gold-soft:rgba(212,175,55,.35);
  --panel:rgba(10,10,10,.82);
  --text:#f5f1e8;
  --muted:#d7d2c8;
}
body{
  margin:0;
  font-family:Arial,sans-serif;
  color:var(--text);
  background:
    linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.80)),
    url('https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1600&q=80') center/cover fixed no-repeat;
}
header{
  position:sticky; top:0; z-index:1000;
  display:flex; justify-content:space-between; align-items:center; gap:14px;
  padding:14px 22px; background:rgba(0,0,0,.86);
  border-bottom:1px solid var(--gold-soft); backdrop-filter:blur(6px);
}
.brand{display:flex; align-items:center; gap:12px}
.brand img{height:58px; width:auto; object-fit:contain; border-radius:10px}
.brand-text strong{display:block; color:var(--gold); font-size:24px}
.brand-text span{color:#efe6cb; font-size:12px; text-transform:uppercase; letter-spacing:2px}
.nav-actions{display:flex; gap:10px; flex-wrap:wrap}
.btn{
  background:var(--gold); color:#111; border:none; border-radius:10px;
  padding:11px 16px; font-weight:700; cursor:pointer;
}
.btn.secondary{
  background:#181818; color:#fff; border:1px solid var(--gold);
}
.hero{
  min-height:78vh; display:flex; align-items:center; justify-content:center; padding:50px 20px;
}
.hero-card{
  width:100%; max-width:980px; background:rgba(10,10,10,.62);
  border:1px solid rgba(212,175,55,.35); border-radius:24px;
  padding:38px 28px; text-align:center; box-shadow:0 18px 50px rgba(0,0,0,.35);
}
.hero h1{margin:0 0 12px; color:var(--gold); font-size:48px; line-height:1.08}
.hero p{margin:8px auto; max-width:760px; line-height:1.7; color:var(--muted); font-size:17px}
.hero-actions{display:flex; justify-content:center; gap:12px; flex-wrap:wrap; margin-top:22px}
.section{max-width:1220px; margin:28px auto; padding:0 18px}
.panel{
  background:var(--panel); border:1px solid rgba(212,175,55,.28);
  border-radius:22px; padding:24px; box-shadow:0 14px 40px rgba(0,0,0,.24);
}
h2{color:var(--gold); margin-top:0; margin-bottom:16px}
.products{display:grid; grid-template-columns:repeat(auto-fit,minmax(230px,1fr)); gap:18px}
.card{
  background:#101010; border:1px solid #3d3320; border-radius:18px;
  overflow:hidden; box-shadow:0 8px 20px rgba(0,0,0,.25);
}
.card img{width:100%; height:290px; object-fit:cover; display:block; background:#000}
.card-body{padding:16px; display:flex; flex-direction:column; gap:10px}
.card h3{margin:0; color:var(--gold); font-size:24px}
.price{font-size:22px; font-weight:700; color:#f0cf65}
.small{font-size:14px; color:var(--muted); line-height:1.6}
.card-actions{display:flex; gap:8px; flex-wrap:wrap; margin-top:auto}
.notice{
  font-size:13px; line-height:1.65; color:#ddd; background:#121212;
  border-left:4px solid var(--gold); padding:14px; border-radius:10px;
}
.warning-list p{margin:9px 0; color:#e8e1d2; line-height:1.6; font-size:14px}
.cart-fab{
  position:fixed; right:18px; bottom:18px; z-index:1050;
  border-radius:999px; box-shadow:0 10px 30px rgba(0,0,0,.35);
}
.overlay{position:fixed; inset:0; background:rgba(0,0,0,.56); display:none; z-index:1100}
.overlay.show{display:block}
.cart-drawer{
  position:fixed; top:0; right:-430px; width:100%; max-width:430px; height:100%;
  background:#0b0b0b; border-left:1px solid rgba(212,175,55,.32);
  z-index:1200; transition:.25s ease; overflow-y:auto; padding:20px;
}
.cart-drawer.open{right:0}
.cart-item{
  display:flex; gap:12px; justify-content:space-between; padding:14px 0; border-bottom:1px solid #262626;
}
.cart-left{display:flex; gap:10px; align-items:center; min-width:0}
.cart-left img{
  width:54px; height:54px; object-fit:cover; border-radius:10px;
  border:1px solid #41361d; background:#000;
}
.cart-name{font-weight:700; color:#f1d98a}
.qty-controls{display:flex; align-items:center; gap:8px; margin-top:8px}
.qty-btn{
  width:30px; height:30px; border:none; border-radius:8px;
  background:#262626; color:#fff; cursor:pointer; font-weight:700;
}
.total-box{margin-top:18px; font-size:26px; font-weight:700; color:var(--gold)}
.checkout-box{margin-top:18px; display:grid; gap:12px}
.field{
  width:100%; padding:12px; border-radius:10px; border:1px solid #3f3f3f;
  background:#111; color:#fff; font-size:14px;
}
.age-check{
  display:flex; align-items:flex-start; gap:10px; font-size:14px; color:var(--muted); line-height:1.5;
}
.age-check input{margin-top:4px; transform:scale(1.2)}
#card-container{
  min-height:90px; background:#fff; border-radius:12px; padding:12px;
}
#cash-app-pay{
  min-height:54px;
}
footer{max-width:1220px; margin:28px auto 42px; padding:0 18px}
.age-gate{
  position:fixed; inset:0; z-index:2000; background:rgba(0,0,0,.94);
  display:flex; align-items:center; justify-content:center; padding:18px;
}
.age-box{
  width:100%; max-width:580px; background:#101010; border:1px solid var(--gold);
  border-radius:20px; padding:28px; text-align:center; box-shadow:0 18px 50px rgba(0,0,0,.45);
}
.age-box img{height:84px; max-width:100%; object-fit:contain; margin-bottom:10px; border-radius:12px}
.status{font-size:13px; color:#ddd; min-height:18px}
@media (max-width:760px){
  .hero h1{font-size:36px}
  .hero-card{padding:28px 18px}
  header{padding:12px 14px}
  .brand img{height:50px}
  .brand-text strong{font-size:20px}
  .card img{height:250px}
}
</style>
</head>
<body>

<div id="ageGate" class="age-gate">
  <div class="age-box">
    <img src="/images/logo.jpg" alt="Torres Cigars">
    <h2>Welcome to Torres Cigars</h2>
    <p class="small">This website is intended only for adults 21+.</p>
    <div class="notice" style="text-align:left; margin:18px 0;">
      By entering, you certify that you are at least 21 years old and legally permitted to purchase tobacco products.
    </div>
    <div style="display:flex; justify-content:center; gap:10px; flex-wrap:wrap; margin-top:18px;">
      <button class="btn" onclick="enterSite()">I am 21+</button>
      <button class="btn secondary" onclick="leaveSite()">Exit</button>
    </div>
  </div>
</div>

<header>
  <div class="brand">
    <img src="/images/logo.jpg" alt="Torres Cigars">
    <div class="brand-text">
      <strong>Torres Cigars</strong>
      <span>Premium Handmade Cigars</span>
    </div>
  </div>
  <div class="nav-actions">
    <button class="btn secondary" onclick="openCart()">Cart (<span id="cartCount">0</span>)</button>
    <a class="btn" href="#products">Shop Now</a>
  </div>
</header>

<section class="hero">
  <div class="hero-card">
    <h1>Luxury Cigars With A Warm, Welcoming Experience</h1>
    <p>Explore Torres Cigars in a premium storefront inspired by tobacco fields, tradition, and handcrafted cigar culture.</p>
    <p>Maduro, Habano, Corojo, Connecticut, and Cameroon — all available now at <strong style="color:#f0cf65;">$14 each</strong>.</p>
    <div class="hero-actions">
      <a class="btn" href="#products">Browse Cigars</a>
      <button class="btn secondary" onclick="openCart()">View Cart</button>
    </div>
  </div>
</section>

<section class="section" id="products">
  <div class="panel">
    <h2>Shop Our Cigars</h2>
    <div class="products" id="productGrid"></div>
  </div>
</section>

<section class="section">
  <div class="panel">
    <h2>Age Verification & Purchase Policy</h2>
    <div class="notice">
      You must be at least 21 years old to purchase tobacco products. By placing an order, you confirm that you are 21+ and legally permitted to purchase tobacco in your area. Orders may be cancelled if age verification cannot be completed.
    </div>
  </div>
</section>

<section class="section">
  <div class="panel">
    <h2>Federal Advisory</h2>
    <div class="warning-list">
      <p><strong>WARNING:</strong> Cigar smoking can cause cancers of the mouth and throat, even if you do not inhale.</p>
      <p><strong>WARNING:</strong> Cigar smoking can cause lung cancer and heart disease.</p>
      <p><strong>WARNING:</strong> Cigars are not a safe alternative to cigarettes.</p>
      <p><strong>WARNING:</strong> Tobacco smoke increases the risk of lung cancer and heart disease, even in nonsmokers.</p>
      <p><strong>WARNING:</strong> Cigar use while pregnant can harm you and your baby.</p>
      <p><strong>WARNING:</strong> This product contains nicotine. Nicotine is an addictive chemical.</p>
    </div>
  </div>
</section>

<button class="btn cart-fab" onclick="openCart()">Cart (<span id="cartFabCount">0</span>)</button>
<div id="overlay" class="overlay" onclick="closeCart()"></div>

<div id="cartDrawer" class="cart-drawer">
  <div style="display:flex; justify-content:space-between; align-items:center; gap:12px;">
    <h2 style="margin-bottom:6px;">Your Cart</h2>
    <button class="btn secondary" onclick="closeCart()">Close</button>
  </div>

  <div id="cartItems" class="small" style="margin-top:10px;"></div>

  <div class="total-box">
    Total: $<span id="cartTotal">0.00</span>
  </div>

  <div class="checkout-box">
    <input id="customerName" class="field" placeholder="Full name" />
    <input id="customerPhone" class="field" placeholder="Phone number" />
    <input id="customerEmail" class="field" placeholder="Email address" />
    <textarea id="orderNote" class="field" rows="4" placeholder="Optional order note"></textarea>

    <label class="age-check">
      <input type="checkbox" id="ageConfirm" />
      <span>I confirm that I am at least 21 years old and legally permitted to purchase tobacco products.</span>
    </label>

    <div id="cash-app-pay"></div>
    <div id="card-container"></div>

    <button class="btn" id="payCardButton">Pay by Card</button>
    <button class="btn secondary" onclick="clearCart()">Clear Cart</button>

    <div id="paymentStatus" class="status"></div>

    <div class="notice">
      Payment is processed securely through Square. Cash App Pay appears when available.
    </div>
  </div>
</div>

<footer>
  <div class="panel">
    <h2>About Torres Cigars</h2>
    <p class="small">
      Torres Cigars offers a refined premium cigar experience centered on elegance, craftsmanship, and welcoming presentation.
    </p>
  </div>
</footer>

<script src="${SQUARE_WEB_SDK_SRC}"></script>
<script>
const products = ${JSON.stringify(products)};
let cart = JSON.parse(localStorage.getItem("torresCart") || "[]");

let squareConfig = null;
let payments = null;
let card = null;
let cashAppPay = null;

function currentTotal() {
  return cart.reduce((sum, item) => {
    const p = products.find(x => x.id === item.id);
    return sum + ((p ? p.price : 0) * item.qty);
  }, 0);
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";
  products.forEach(p => {
    const cardEl = document.createElement("div");
    cardEl.className = "card";
    cardEl.innerHTML = \`
      <img src="\${p.image}" alt="\${p.name}">
      <div class="card-body">
        <h3>\${p.name}</h3>
        <div class="price">$\${p.price}</div>
        <div class="small">Handmade premium cigar.</div>
        <div class="card-actions">
          <button class="btn" onclick="addToCart(\${p.id})">Add to Cart</button>
        </div>
      </div>
    \`;
    grid.appendChild(cardEl);
  });
}

function saveCart() {
  localStorage.setItem("torresCart", JSON.stringify(cart));
}

function addToCart(id) {
  const found = cart.find(i => i.id === id);
  if (found) found.qty += 1;
  else cart.push({ id, qty: 1 });
  saveCart();
  renderCart();
  refreshCashApp();
  openCart();
}

function renderCart() {
  const wrap = document.getElementById("cartItems");
  const count = document.getElementById("cartCount");
  const fab = document.getElementById("cartFabCount");
  const totalEl = document.getElementById("cartTotal");

  if (!cart.length) {
    wrap.innerHTML = "<p>Cart is empty.</p>";
    count.textContent = "0";
    fab.textContent = "0";
    totalEl.textContent = "0.00";
    return;
  }

  let total = 0;
  let qtyCount = 0;

  wrap.innerHTML = cart.map(item => {
    const p = products.find(x => x.id === item.id);
    const line = p.price * item.qty;
    total += line;
    qtyCount += item.qty;
    return \`
      <div class="cart-item">
        <div class="cart-left">
          <img src="\${p.image}" alt="\${p.name}">
          <div>
            <div class="cart-name">\${p.name}</div>
            <div class="small">$\${p.price} each</div>
            <div class="qty-controls">
              <button class="qty-btn" onclick="changeQty(\${item.id}, -1)">-</button>
              <span>\${item.qty}</span>
              <button class="qty-btn" onclick="changeQty(\${item.id}, 1)">+</button>
            </div>
          </div>
        </div>
        <div style="font-weight:700;color:#f0cf65;">$\${line}</div>
      </div>
    \`;
  }).join("");

  count.textContent = qtyCount;
  fab.textContent = qtyCount;
  totalEl.textContent = total.toFixed(2);
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(i => i.id !== id);
  }
  saveCart();
  renderCart();
  refreshCashApp();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
  refreshCashApp();
}

function openCart() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("overlay").classList.add("show");
}

function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("overlay").classList.remove("show");
}

function enterSite() {
  localStorage.setItem("torresAgeVerified", "yes");
  document.getElementById("ageGate").style.display = "none";
}

function leaveSite() {
  window.location.href = "https://www.google.com";
}

(function initAgeGate() {
  const ok = localStorage.getItem("torresAgeVerified");
  if (ok === "yes") {
    document.getElementById("ageGate").style.display = "none";
  }
})();

async function loadSquareConfig() {
  const res = await fetch("/api/config");
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load Square config.");
  return data;
}

function buildPaymentRequest() {
  return payments.paymentRequest({
    countryCode: "US",
    currencyCode: "USD",
    total: {
      amount: currentTotal().toFixed(2),
      label: "Total"
    }
  });
}

async function initializeCard() {
  card = await payments.card();
  await card.attach("#card-container");
}

async function refreshCashApp() {
  const container = document.getElementById("cash-app-pay");
  container.innerHTML = "";

  if (!payments || currentTotal() <= 0) return;

  try {
    const paymentRequest = buildPaymentRequest();
    cashAppPay = await payments.cashAppPay(paymentRequest, {
      redirectURL: window.location.origin + "/",
      referenceId: "torres-" + Date.now()
    });

    await cashAppPay.attach("#cash-app-pay");

    cashAppPay.addEventListener("ontokenization", async function (event) {
      const { tokenResult, error } = event.detail || {};
      if (error) {
        setStatus("Cash App tokenization failed.");
        return;
      }
      if (tokenResult && tokenResult.status === "OK") {
        await submitPayment(tokenResult.token);
      }
    });
  } catch (err) {
    console.warn("Cash App Pay not available:", err);
  }
}

function setStatus(message) {
  document.getElementById("paymentStatus").textContent = message || "";
}

async function tokenizeCard() {
  const result = await card.tokenize();
  if (result.status === "OK") return result.token;
  throw new Error("Card details could not be tokenized.");
}

function getCustomerPayload() {
  return {
    name: document.getElementById("customerName").value.trim(),
    phone: document.getElementById("customerPhone").value.trim(),
    email: document.getElementById("customerEmail").value.trim(),
    note: document.getElementById("orderNote").value.trim()
  };
}

function validateCheckout() {
  if (!cart.length) {
    setStatus("Your cart is empty.");
    return false;
  }
  if (!document.getElementById("ageConfirm").checked) {
    setStatus("Please confirm you are 21+ before checkout.");
    return false;
  }
  return true;
}

async function submitPayment(sourceId) {
  if (!validateCheckout()) return;

  setStatus("Processing payment...");

  const response = await fetch("/api/payments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceId,
      cart,
      customer: getCustomerPayload()
    })
  });

  const data = await response.json();

  if (!response.ok) {
    setStatus(data.error || "Payment failed.");
    return;
  }

  setStatus("Payment successful.");
  cart = [];
  saveCart();
  renderCart();
  refreshCashApp();
  setTimeout(() => closeCart(), 1200);
}

document.getElementById("payCardButton").addEventListener("click", async () => {
  try {
    if (!validateCheckout()) return;
    const token = await tokenizeCard();
    await submitPayment(token);
  } catch (err) {
    setStatus(err.message || "Payment error.");
  }
});

(async function init() {
  try {
    renderProducts();
    renderCart();

    squareConfig = await loadSquareConfig();
    payments = window.Square.payments(squareConfig.appId, squareConfig.locationId);

    await initializeCard();
    await refreshCashApp();
  } catch (err) {
    setStatus(err.message || "Checkout initialization failed.");
  }
})();
</script>
</body>
</html>`);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Torres site running on port " + PORT);
});
