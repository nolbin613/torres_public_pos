const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3007;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "torres123";

const DATA_DIR = path.join(__dirname, "data");
const inventoryFile = path.join(DATA_DIR, "inventory.json");
const salesFile = path.join(DATA_DIR, "sales.json");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function ensureFile(file, fallback) {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
  }
}
ensureFile(inventoryFile, [
  { id: 1, name: "Maduro", price: 10, stock: 50 },
  { id: 2, name: "Habano", price: 10, stock: 50 },
  { id: 3, name: "Corojo", price: 10, stock: 50 },
  { id: 4, name: "Connecticut", price: 10, stock: 50 },
  { id: 5, name: "Cameroon", price: 10, stock: 50 }
]);
ensureFile(salesFile, []);

function readJson(file, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function publicPage() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Torres Cigars</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#0d0d0d;color:#fff}
.wrap{max-width:1100px;margin:0 auto;padding:24px}
.hero{padding:40px 20px;border-radius:18px;background:linear-gradient(135deg,#111,#1b1b1b);border:1px solid #2d2d2d}
h1,h2{color:#d4af37}
.btn{display:inline-block;background:#d4af37;color:#111;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:24px}
.card{background:#171717;border:1px solid #2d2d2d;border-radius:16px;padding:18px}
.small{color:#d3d3d3}
.topnav{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px}
</style>
</head>
<body>
<div class="wrap">
  <div class="topnav">
    <h2>Torres Cigars</h2>
    <a class="btn" href="/admin">Admin / POS</a>
  </div>

  <div class="hero">
    <h1>Premium Handmade Cigars</h1>
    <p class="small">Torres Cigars offers Maduro, Habano, Corojo, Connecticut, and Cameroon blends.</p>
    <a class="btn" href="#shop">View Products</a>
  </div>

  <div id="shop" class="grid" style="margin-top:28px;">
    ${readJson(inventoryFile, []).map(item => `
      <div class="card">
        <h3>${item.name}</h3>
        <p class="small">Price: $${item.price}</p>
        <p class="small">Available now</p>
      </div>
    `).join("")}
  </div>
</div>
</body>
</html>`;
}

function loginPage(msg = "") {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Torres Admin Login</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#0d0d0d;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh}
.box{width:100%;max-width:420px;background:#171717;padding:24px;border-radius:16px;border:1px solid #2d2d2d}
input,button{width:100%;padding:12px;border-radius:10px;border:1px solid #444;margin-top:12px}
button{background:#d4af37;color:#111;font-weight:700;border:none}
h1{color:#d4af37}
.err{color:#ff8e8e;margin-top:10px}
</style>
</head>
<body>
  <form class="box" method="POST" action="/admin-login">
    <h1>Admin / POS Login</h1>
    <input type="password" name="password" placeholder="Enter password" required />
    <button type="submit">Login</button>
    ${msg ? `<div class="err">${msg}</div>` : ""}
  </form>
</body>
</html>`;
}

function adminPage() {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Torres POS</title>
<style>
body{margin:0;font-family:Arial,sans-serif;background:#0d0d0d;color:#fff}
.wrap{max-width:1100px;margin:0 auto;padding:24px}
.card{background:#171717;border:1px solid #2d2d2d;border-radius:16px;padding:20px;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px}
button{background:#d4af37;color:#111;border:none;padding:10px 14px;border-radius:10px;font-weight:700;cursor:pointer}
h1,h2{color:#d4af37}
.row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #2d2d2d}
.small{color:#cfcfcf}
input{width:100%;padding:10px;border-radius:8px;border:1px solid #444;margin-top:8px}
</style>
</head>
<body>
<div class="wrap">
  <h1>Torres Cigars Admin / POS</h1>

  <div class="card">
    <h2>Products</h2>
    <div id="products" class="grid"></div>
  </div>

  <div class="card">
    <h2>Cart</h2>
    <div id="cart"></div>
    <h3>Total: $<span id="total">0</span></h3>
    <button onclick="checkout()">Checkout</button>
    <button onclick="clearCart()">Clear</button>
  </div>

  <div class="card">
    <h2>Sales Count</h2>
    <div id="salesCount" class="small">0 sales</div>
  </div>
</div>

<script>
let inventory = [];
let cart = [];

async function loadInventory() {
  const res = await fetch('/api/inventory');
  inventory = await res.json();
  renderProducts();
}

async function loadSales() {
  const res = await fetch('/api/sales');
  const sales = await res.json();
  document.getElementById('salesCount').textContent = sales.length + ' sales';
}

function renderProducts() {
  const box = document.getElementById('products');
  box.innerHTML = '';
  inventory.forEach(item => {
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = '<h3>' + item.name + '</h3>' +
                    '<div class="small">Price: $' + item.price + '</div>' +
                    '<div class="small">Stock: ' + item.stock + '</div>' +
                    '<button onclick="addToCart(' + item.id + ')">Add</button>';
    box.appendChild(div);
  });
}

function addToCart(id) {
  const found = inventory.find(i => i.id === id);
  if (!found || found.stock < 1) return alert('Out of stock');
  const existing = cart.find(i => i.id === id);
  if (existing) existing.qty += 1;
  else cart.push({ id: found.id, name: found.name, price: found.price, qty: 1 });
  renderCart();
}

function renderCart() {
  const box = document.getElementById('cart');
  box.innerHTML = '';
  let total = 0;
  if (!cart.length) {
    box.innerHTML = '<div class="small">Cart is empty</div>';
    document.getElementById('total').textContent = '0';
    return;
  }
  cart.forEach(item => {
    total += item.price * item.qty;
    const row = document.createElement('div');
    row.className = 'row';
    row.innerHTML = '<div>' + item.name + ' x ' + item.qty + '</div><div>$' + (item.price * item.qty) + '</div>';
    box.appendChild(row);
  });
  document.getElementById('total').textContent = total;
}

function clearCart() {
  cart = [];
  renderCart();
}

async function checkout() {
  if (!cart.length) return alert('Cart empty');
  const sendCart = cart.map(i => ({ id: i.id, qty: i.qty }));
  const res = await fetch('/api/sale', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cart: sendCart, paymentMethod: 'cash' })
  });
  const data = await res.json();
  if (data.error) return alert(data.error);
  alert('Sale completed');
  cart = [];
  await loadInventory();
  await loadSales();
  renderCart();
}

loadInventory();
loadSales();
renderCart();
</script>
</body>
</html>`;
}

app.get("/", (_req, res) => res.send(publicPage()));
app.get("/admin", (_req, res) => res.send(loginPage()));

app.post("/admin-login", (req, res) => {
  const { password } = req.body;
  if (password !== ADMIN_PASSWORD) return res.send(loginPage("Wrong password"));
  res.send(adminPage());
});

app.get("/api/inventory", (_req, res) => {
  res.json(readJson(inventoryFile, []));
});

app.get("/api/sales", (_req, res) => {
  res.json(readJson(salesFile, []));
});

app.post("/api/sale", (req, res) => {
  const { cart = [], paymentMethod = "cash" } = req.body;
  if (!Array.isArray(cart) || !cart.length) {
    return res.status(400).json({ error: "Cart empty" });
  }

  const inventory = readJson(inventoryFile, []);
  let total = 0;
  const soldItems = [];

  for (const item of cart) {
    const found = inventory.find(p => p.id === Number(item.id));
    const qty = Number(item.qty || 1);
    if (!found) return res.status(400).json({ error: "Product not found" });
    if (found.stock < qty) return res.status(400).json({ error: "Not enough stock for " + found.name });
  }

  for (const item of cart) {
    const found = inventory.find(p => p.id === Number(item.id));
    const qty = Number(item.qty || 1);
    found.stock -= qty;
    total += found.price * qty;
    soldItems.push({ id: found.id, name: found.name, price: found.price, qty });
  }

  writeJson(inventoryFile, inventory);

  const sales = readJson(salesFile, []);
  sales.push({
    id: Date.now(),
    date: new Date().toISOString(),
    items: soldItems,
    total,
    paymentMethod
  });
  writeJson(salesFile, sales);

  res.json({ ok: true, total });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log("Torres app running on http://127.0.0.1:" + PORT);
});
