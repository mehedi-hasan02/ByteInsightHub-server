const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const express = require('express');
const cors = require('cors');
require('dotenv').config();
const app = express();
const port = process.env.PORT || 8000;

app.use(
    cors({
        origin: [
            "http://localhost:5173",
        ]
    })
)
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fvwg0tw.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });

    const blogsData = client.db('blogs').collection('blogsData');
    const wishlist = client.db('blogs').collection('wishlist');

    app.post('/blogs', async(req,res)=>{
      const query = req.body;
      console.log(query);
      const result = await blogsData.insertOne(query);
      res.send(result);
    })
    app.post('/wishlist', async(req,res)=>{

    })

    app.get('/blogs', async(req,res)=>{
      const cursor = blogsData.find();
      const result = await cursor.toArray();
      res.send(result);
    })
    app.get('/allBlogs', async(req,res)=>{
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

    app.get('/blogs/:id',async(req,res)=>{
      const id = req.params.id;
      const query = {_id: new ObjectId(id)};
      const result = await blogsData.findOne(query);
      res.send(result);
    })



    

    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get('/', (req,res)=>{
    res.send("Hello Dunia");
})

app.listen(port, ()=>{
    console.log('Port running at ', port);
})
