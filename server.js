const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); 
app.use(express.json());

const uri = process.env.MONGODB_URI;
const client = new MongoClient(uri);

async function run() {
  try {
    await client.connect();
    const db = client.db('adobe-forum');
    console.log("Successfully connected to MongoDB cluster: adobe-forum");

    // Endpoint for User Category (Alex • JavaScript)
    app.get('/api/user-info', async (req, res) => {
      const data = await db.collection('metadata').findOne({ type: 'author' });
      res.json(data || { name: "Alex", category: "JavaScript" });
    });

    // Endpoint for Tags (#react #hooks)
    app.get('/api/tags', async (req, res) => {
      const data = await db.collection('metadata').findOne({ type: 'tags' });
      res.json(data || { tags: ["react", "hooks"] });
    });

    // Endpoint for Headings
    app.get('/api/heading', async (req, res) => {
      const data = await db.collection('metadata').findOne({ type: 'heading' });
      res.json(data || { text: "How to fetch data in React" });
    });

    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
  } catch (err) {
    console.error("MongoDB Connection Error:", err);
  }
}

run();