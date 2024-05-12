const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 8000;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://rococo-kheer-b232e7.netlify.app",
    ],
    credentials: true
  })
)
app.use(express.json());
app.use(cookieParser());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fvwg0tw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const logger = async (req, res, next) => {
  console.log('called: ', req.host, req.originalUrl);
  next();
}

const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token;

  console.log('Value of the middleware: ', token);

  if (!token) {
    return res.status(401).send({ message: 'not authorize' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    //error
    if (err) {
      console.log(err);
      return req.status(401).send({ message: 'unauthorize' })
    }
    req.user = decoded;
    next();
  })

}

const cookieOptions = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  secure: process.env.NODE_ENV === "production" ? true : false,
};

async function run() {
  try {

    const blogsData = client.db('blogs').collection('blogsData');
    const wishlist = client.db('blogs').collection('wishlist');
    const commentCollection = client.db('blogs').collection('commentCollection');

    //creating Token
    app.post("/jwt", logger, async (req, res) => {
      const user = req.body;
      console.log("user for token", user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET);

      res.cookie("token", token, cookieOptions).send({ success: true });
    });

    //clearing Token
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOptions, maxAge: 0 })
        .send({ success: true });
    });

    app.post('/blogs', async (req, res) => {
      const query = req.body;
      const result = await blogsData.insertOne(query);
      res.send(result);
    })


    app.get('/blogs', async (req, res) => {
      const cursor = blogsData.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/allBlogs', async (req, res) => {
      const filter = req.query.filter
      const search = req.query.search
      // let query = {}
      let query = {
        title: { $regex: search, $options: 'i' },
      }
      if (filter) query.category = filter
      // if (filter) query = {category: filter}
      const result = await blogsData
        .find(query)
        .toArray()

      res.send(result)
    })

    app.get('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogsData.findOne(query);
      res.send(result);
    })

    app.put('/blogs/:id', async (req, res) => {
      const id = req.params.id;
      const blogData = req.body;
      const query = { _id: new ObjectId(id) };
      const option = { upsert: true }
      const updateDoc = {
        $set: {
          ...blogData,
        },
      }
      const result = await blogsData.updateOne(query, updateDoc, option);
      res.send(result);
    })

    app.get('/topPost', async (req, res) => {
      try {

          const topTenPosts = await blogsData.aggregate([
              {
                  $project: {
                      _id: 1,
                      title: 1,
                      image: 1,
                      short_description: 1,
                      long_description: 1,
                      wordCount: { $size: { $split: ['$long_description', ' '] } }
                  }
              },
              { $sort: { wordCount: -1 } },
              { $limit: 10 }
          ]).toArray();
  
          res.json(topTenPosts);
  
          // client.close();
      } catch (err) {
          console.error(err);
          res.status(500).json({ message: 'Internal server error' });
      }
  });
  

  //wishlist collection
  app.post('/wishlist', async (req, res) => {
    const query = req.body;
    const result = await wishlist.insertOne(query);
    res.send(result);
  })

  app.get('/wishlist', async (req, res) => {
    const cursor = wishlist.find();
    const result = await cursor.toArray();
    res.send(result);
  })

  app.get('/wishlist/:email', async (req, res) => {
    const emailName = req.params.email;
    const query = { email: emailName };
    const result = await wishlist.find(query).toArray();
    res.send(result);
  })

  app.delete('/wishlist/:id', async (req, res) => {
    const id = req.params.id;
    const query = { _id: new ObjectId(id) };
    const result = await wishlist.deleteOne(query);
    res.send(result);
  })



  //comment collection
  app.post('/comment', async (req, res) => {
    const query = req.body;
    const result = await commentCollection.insertOne(query);
    res.send(result);
  })

  app.get('/comment/:id', async (req, res) => {
    const id = req.params.id;
    const query = { blogID: id };
    // const cursor = commentCollection.find();
    const result = await commentCollection.find(query).toArray();
    res.send(result);
  })



  console.log("Pinged your deployment. You successfully connected to MongoDB!");
} finally {
  // Ensures that the client will close when you finish/error
  // await client.close();
}
}
run().catch(console.dir);

app.get('/', (req, res) => {
  res.send("Hello Dunia");
})

app.listen(port, () => {
  console.log('Port running at ', port);
})
