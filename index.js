require("dotenv").config();
const express = require("express");
const app = express();
const port = 5000;
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});
app.use(express.json());
app.use(cors());

async function run() {
  try {
    const db = client.db("eduNextGen");
    const usersCollection = db.collection("users");

    app.post("/users", async (req, res) => {
      try {
        const userData = req.body;
        userData.created_at = new Date().toString();
        userData.last_loggedIn = new Date().toString();

        if (!userData.role) {
          userData.role = "student";
        }

        const query = { email: userData.email };
        const alreadyExists = await usersCollection.findOne(query);

        if (alreadyExists) {
          const result = await usersCollection.updateOne(query, {
            $set: { last_loggedIn: new Date().toString() },
          });
          return res.send(result);
        }

        const result = await usersCollection.insertOne(userData);
        res.send(result);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
