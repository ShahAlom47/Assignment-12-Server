const express = require('express')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000;
var cors = require('cors')
var jwt = require('jsonwebtoken');






app.use(express.json())
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      'https://bistro-boss-final-projec-81261.web.app'

    ],
    credentials: true,
  })
);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r31xce1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
const uri = "mongodb+srv://assignment-12-server:BnYz6dh2IpmoSJkB@cluster0.r31xce1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
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
    // // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

  
    const userCollection = client.db("Assign_12_DB").collection('usersData')
    const propertyCollection = client.db("Assign_12_DB").collection('propertyData')
    const reviewCollection = client.db("Assign_12_DB").collection('reviewData')
    

    // middleware 
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unAuthorize access' })
      }
      const token = req.headers.authorization.split(' ')[1]
      jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
          return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;

        next()
      });
    }

    // const verifyAdmin = async (req, res, next) => {
    //   const tokenEmail = req.decoded.data;
    //   const query = { email: tokenEmail }
    //   const result = await userCollection.findOne(query)
    //   const isAdmin = result?.role === 'admin'

    //   if (!isAdmin) {
    //     return res.status(403).send({ message: 'forbidden access' })
    //   }
    //   next()
    // }

    // jwt related API

    // app.post('/jwt', async (req, res) => {
    //   const userInfo = req.body.userInfo

    //   const token = jwt.sign({
    //     data: userInfo
    //   }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
    //   res.send({ token })


    // })
// jwt releted api 

app.post('/jwt', async (req, res) => {
    const userInfo = req.body.userInfo

    const token = jwt.sign({
      data: userInfo
    }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
    res.send({ token })

  })

app.post('/addUser',async(req,res)=>{
    const userInfo= req.body
    
    const query = { email: userInfo.email }
    const existingUser = await userCollection.findOne(query)
    if (existingUser) {
      return res.send({ message: 'user already exist', insertedId: null })
    }

    const result =await userCollection.insertOne(userInfo)
    res.send(result)

})



// property related data 

app.get('/property',async(req,res)=>{

    const result= await propertyCollection.find().limit(6).toArray()
    res.send(result)
})
app.get('/property/:id',async(req,res)=>{
const id=req.params.id
const query={_id: new ObjectId(id)}
    const result= await propertyCollection.findOne(query)
    res.send(result)
})

// ---------------------
// --Review related API
// --------------------


app.post('/addReview',verifyToken,async(req,res)=>{

  const {reviewData}=req.body
  const result = await reviewCollection.insertOne(reviewData)
  console.log(reviewData);
  res.send(result)
})

 


    


    // // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send(' Server is Running')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})