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

        // Initialize empty profile for tutors
        if (userData.role === "tutor" && !userData.profile) {
          userData.profile = {
            title: "",
            bio: "",
            location: "",
            phone: "",
            education: [],
            subjects: [],
            experience: [],
            verified: false,
            rating: 0,
            totalReviews: 0,
          };
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

    app.get("/users/email/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const user = await usersCollection.findOne({ email: email });

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.json(user);
      } catch (error) {
        res.status(500).json({ message: error.message });
      }
    });

    // PUT endpoint - Update tutor profile
    app.put("/users/profile", async (req, res) => {
      try {
        const { email, profile } = req.body;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const query = { email: email };
        const user = await usersCollection.findOne(query);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        // Update profile with new data
        const updateData = {
          $set: {
            profile: {
              title: profile.title || "",
              bio: profile.bio || "",
              location: profile.location || "",
              phone: profile.phone || "",
              education: profile.education || [],
              subjects: profile.subjects || [],
              experience: profile.experience || [],
              verified: user.profile?.verified || false,
              rating: user.profile?.rating || 0,
              totalReviews: user.profile?.totalReviews || 0,
            },
            updated_at: new Date().toString(),
          },
        };

        const result = await usersCollection.updateOne(query, updateData);

        if (result.modifiedCount > 0) {
          res.status(200).json({
            message: "Profile updated successfully",
            result,
          });
        } else {
          res.status(400).json({ message: "Failed to update profile" });
        }
      } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ message: error.message });
      }
    });

    // GET endpoint - Fetch tutor profile by email
    app.get("/users/profile/:email", async (req, res) => {
      try {
        const { email } = req.params;

        if (!email) {
          return res.status(400).json({ message: "Email is required" });
        }

        const query = { email: email };
        const user = await usersCollection.findOne(query);

        if (!user) {
          return res.status(404).json({ message: "User not found" });
        }

        res.status(200).json({
          profile: user.profile || {
            title: "",
            bio: "",
            location: "",
            phone: "",
            education: [],
            subjects: [],
            experience: [],
          },
          name: user.name,
          email: user.email,
          image: user.image,
          role: user.role,
        });
      } catch (error) {
        console.error("Error fetching profile:", error);
        res.status(500).json({ message: error.message });
      }
    });

    // GET endpoint - Fetch all tutors (optional - for student view)
    app.get("/users/tutors", async (req, res) => {
      try {
        const tutors = await usersCollection
          .find({ role: "tutor" })
          .project({
            name: 1,
            email: 1,
            image: 1,
            profile: 1,
          })
          .sort({ "profile.rating": -1 })
          .toArray();

        res.status(200).json({ tutors });
      } catch (error) {
        console.error("Error fetching tutors:", error);
        res.status(500).json({ message: error.message });
      }
    });

    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    // console.log(
    //   "Pinged your deployment. You successfully connected to MongoDB!",
    // );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

// app.listen(port, () => {
//   console.log(`Example app listening on port ${port}`);
// });
module.exports = app;
