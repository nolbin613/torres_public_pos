const express = require('express');
const app = express();
const PORT = process.env.PORT || 3007;

app.use(express.static('public'));

app.get('/', (req, res) => {
  res.send(`
    <html>
    <head>
      <title>Torres Cigars</title>
      <style>
        body {
          margin: 0;
          font-family: Arial;
          background: #0b0b0b;
          color: white;
        }

        header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 20px;
          background: black;
          border-bottom: 1px solid gold;
        }

        header img {
          height: 60px;
        }

        .btn {
          background: gold;
          border: none;
          padding: 10px 15px;
          border-radius: 5px;
          cursor: pointer;
        }

        .hero {
          text-align: center;
          padding: 50px;
        }

        .hero h1 {
          color: gold;
          font-size: 40px;
        }

        .products {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
          padding: 30px;
        }

        .card {
          background: #111;
          border: 1px solid gold;
          border-radius: 10px;
          padding: 15px;
          text-align: center;
        }

        .card img {
          width: 100%;
          border-radius: 10px;
        }

        .card h3 {
          color: gold;
        }
      </style>
    </head>

    <body>

    <header>
      <img src="/images/logo.png"/>
      <a href="/admin"><button class="btn">Admin / POS</button></a>
    </header>

    <div class="hero">
      <h1>Premium Handmade Cigars</h1>
      <p>Torres Cigars • Dominican Republic</p>
    </div>

    <div class="products">

      <div class="card">
        <img src="/images/maduro.jpg"/>
        <h3>Maduro</h3>
        <p>$14</p>
        <button class="btn">Add to Cart</button>
      </div>

      <div class="card">
        <img src="/images/habano.jpg"/>
        <h3>Habano</h3>
        <p>$14</p>
        <button class="btn">Add to Cart</button>
      </div>

      <div class="card">
        <img src="/images/cameroon.jpg"/>
        <h3>Cameroon</h3>
        <p>$14</p>
        <button class="btn">Add to Cart</button>
      </div>

      <div class="card">
        <img src="/images/corojo.jpg"/>
        <h3>Corojo</h3>
        <p>$14</p>
        <button class="btn">Add to Cart</button>
      </div>

      <div class="card">
        <img src="/images/connecticut.jpg"/>
        <h3>Connecticut</h3>
        <p>$14</p>
        <button class="btn">Add to Cart</button>
      </div>

    </div>

    </body>
    </html>
  `);
});

app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
