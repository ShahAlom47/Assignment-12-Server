const express = require('express')
require('dotenv').config()
const app = express()
const port = process.env.PORT || 3000;
var cors = require('cors')
var jwt = require('jsonwebtoken');



const stripe = require('stripe')(process.env.STRIPE_KEY);
app.use(express.static('public'));


app.use(express.json())
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      'https://assignment-12-e88ce.web.app',

    ],
    credentials: true,
  })
);


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.r31xce1.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;
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
    const enquiryCollection = client.db("Assign_12_DB").collection('enquiryData')
    const wishListCollection = client.db("Assign_12_DB").collection('wishListData')
    const offerDataCollection = client.db("Assign_12_DB").collection('offerData')
    const paymentDataCollection = client.db("Assign_12_DB").collection('paymentData')
    const advertiseDataCollection = client.db("Assign_12_DB").collection('advertiseData')


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

    const verifyAgent = async (req, res, next) => {
      const tokenEmail = req.decoded.data;
      const query = { email: tokenEmail }
      const result = await userCollection.findOne(query)
      const isAgent = result?.role === 'agent'

      if (!isAgent) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }


    const verifyAdmin = async (req, res, next) => {
      const tokenEmail = req.decoded.data;
      const query = { email: tokenEmail }
      const result = await userCollection.findOne(query)
      const isAdmin = result?.role === 'admin'

      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' })
      }
      next()
    }


    // jwt releted api 

    app.post('/jwt', async (req, res) => {
      const userInfo = req.body.userInfo

      const token = jwt.sign({
        data: userInfo
      }, process.env.ACCESS_TOKEN, { expiresIn: '1h' });
      res.send({ token })

    })



    // user Api start


    app.post('/addUser', async (req, res) => {
      const userInfo = req.body

      const query = { email: userInfo.email }
      const existingUser = await userCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user already exist', insertedId: null })
      }

      const result = await userCollection.insertOne(userInfo)
      res.send(result)

    })

    app.get('/allUser/admin', verifyToken, verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)

    })

    app.get('/user/role/:email', verifyToken, async (req, res) => {
      const userEmail = req.params.email
      const tokenEmail = req.decoded.data;
      if (userEmail !== tokenEmail) {
        return res.status(403).send({ message: 'forbidden user' })
      }
      const query = { email: userEmail }
      const result = await userCollection.findOne(query)
      const userRole = result && result.role ? result.role : 'user';
      res.send({ userRole });
    })

    // change user role by admin 

    app.patch('/user/admin/role/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const { role } = req.body
      const query = { _id: new ObjectId(id) }
      updateDoc = {
        $set: { role: role }
      }
      const result = await userCollection.updateOne(query, updateDoc);
      res.send(result);
    })


    app.delete('/user/admin/delete/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id

      const query = { _id: new ObjectId(id) }

      const result = await userCollection.deleteOne(query);
      res.send(result);
    })

    // user Api end

    // Advertise 


    app.post('/addAdvertise', verifyToken, verifyAdmin, async (req, res) => {
      const property = req.body;
      const { _id, ...rest } = property;
      const modifiedProperty = { ...rest, propertyId: _id };


      const query = { propertyId: property._id };
      const existing = await advertiseDataCollection.findOne(query);
      if (existing) {
        return res.send({ message: 'Property already exists', insertedId: null });
      }


      const result = await advertiseDataCollection.insertOne(modifiedProperty);
      res.send(result);
    });









    // property related data 

    app.post('/addProperty', verifyToken, verifyAgent, async (req, res) => {
      const propertyData = req.body;
      const result = await propertyCollection.insertOne(propertyData)

      res.send(result)
    })

    // 
    app.get('/property', async (req, res) => {
      const result = await advertiseDataCollection.find().limit(6).toArray()
      res.send(result)
    })
    app.get('/allProperty/admin', async (req, res) => {
      const result = await propertyCollection.find().toArray()
      res.send(result)


    })


    app.get('/allProperty', async (req, res) => {
      const { sort, search } = req.query;
      const query = {};
      // console.log(search);
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { property_location: { $regex: search, $options: 'i' } },
          { property_type: { $regex: search, $options: 'i' } }
        ];
      }

      let sortQuery = {};
      if (sort) {
        sortQuery = { max_price_num: sort === 'ase' ? 1 : -1 };
      }

      try {
        const result = await propertyCollection.aggregate([
          { $match: query },
          { $addFields: { max_price_num: { $toInt: "$max_price" } } },
          { $sort: sortQuery }
        ]).toArray();

        res.send(result);
      } catch (error) {
        res.status(500).send({ error: error.message });
      }
    });




    // verified property 
    app.get('/verifiedProperty', verifyToken, async (req, res) => {
      const query = { verification_status: 'verified' }
      const result = await propertyCollection.find(query).toArray()
      res.send(result)
    })




    

    app.get('/property/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
  
     
      const firstResult = await propertyCollection.findOne(query);
      if (firstResult) {
          res.send(firstResult);
      } else {
          const secondResult = await advertiseDataCollection.findOne(query);
     
          res.send(secondResult);
      }
  });


    app.get('/myAddedProperty/:email', verifyToken, async (req, res) => {
      const email = req.params.email
      const query = { agent_email: email }
      const result = await propertyCollection.find(query).toArray()
      res.send(result)
    })

    app.delete('/myAddedProperty/delete/:id', verifyToken, verifyAgent, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await propertyCollection.deleteOne(query)
      res.send(result)
    })


    app.patch('/updateProperty/:id', verifyToken, verifyAgent, async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const newData = req.body
      const updateDoc = {
        $set: newData
      };

      const result = await propertyCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // property verify by admin 
    // ----------------------------
    app.patch('/property/admin/verify/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const { status } = req.body
      const query = { _id: new ObjectId(id) }
      updateDoc = {
        $set: { verification_status: status }
      }
      const result = await propertyCollection.updateOne(query, updateDoc);
      res.send(result);
    })




    // ---------------------
    // --Review related API
    // --------------------

    // add review 
    app.post('/addReview', verifyToken, async (req, res) => {

      const { reviewData } = req.body
      const result = await reviewCollection.insertOne(reviewData)

      res.send(result)
    })

    //  get reviewData

    app.get('/allReview', async (req, res) => {
      const isLatest = req.query.laTest === 'true';

      const options = {};
      if (isLatest) {
        options.sort = { date: -1 };
      }

      console.log(isLatest);
      const result = await reviewCollection.find().sort(options.sort).toArray();
      // const result = await reviewCollection.find().sort(options.sort).limit(3).toArray();
      res.send(result);
    });


    app.get(`/reviews/:id`, async (req, res) => {
      const id = req.params.id;
      const query = { property_id: id }
      const result = await reviewCollection.find(query).sort({ date: -1 }).toArray();
      res.send(result);
    })

    // get user review 
    app.get(`/reviews/user/:email`, verifyToken, async (req, res) => {
      const email = req.params.email;
      const query = { user_email: email }
      const result = await reviewCollection.find(query).toArray();
      res.send(result);
    })

    app.delete(`/reviews/user/delete/:id`, verifyToken, async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const result = await reviewCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result);
    })



    // Wish list related api 

    app.post('/addWishList', verifyToken, async (req, res) => {

      const wishData = req.body
      const { userEmail, property_id } = wishData

      const options = {
        property_id: property_id,
        userEmail: userEmail,

      }
      const existingWish = await wishListCollection.findOne(options);

      console.log(existingWish)

      if (existingWish) {
        res.send({ message: 'Wishlist item already exists' });
        return
      }


      const result = await wishListCollection.insertOne(wishData)

      res.send(result)
    })


    // get user wishlist 

    app.get(`/wishList/:email`, async (req, res) => {
      const email = req.params.email;
      const query = { userEmail: email }
      const result = await wishListCollection.find(query).toArray();
      res.send(result);
    })


    // delete wihList 

    app.delete('/wishList/delete/:id', verifyToken, async (req, res) => {

      const id = req.params.id;
      const result = await wishListCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)

    })


    // offer related api
    app.post('/addOffer', verifyToken, async (req, res) => {

      const offerData = req.body
      const result = await offerDataCollection.insertOne(offerData)

      res.send(result)
    })

    app.get('/offeredProperty', async (req, res) => {

      const result = await offerDataCollection.find().toArray()

      res.send(result)
    })


    app.get('/offeredProperty/:email', verifyToken, async (req, res) => {

      const email = req.params.email
      const query = { buyer_email: email }
      const result = await offerDataCollection.find(query).toArray()

      res.send(result)
    })

    app.get('/offeredProperty/singleData/:id', verifyToken, async (req, res) => {

      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await offerDataCollection.findOne(query)
      console.log(id);
      res.send(result)
    })

    app.delete('/offeredProperty/delete/:id', verifyToken, async (req, res) => {

      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await offerDataCollection.deleteOne(query)

      res.send(result)
    })


    app.get('/offeredProperty/request/:email', verifyToken, verifyAgent, async (req, res) => {

      const email = req.params.email
      const query = { agent_email: email }
      const result = await offerDataCollection.find(query).toArray()

      res.send(result)
    })
    app.patch('/offeredProperty/status/:id', verifyToken, verifyAgent, async (req, res) => {

      const id = req.params.id
      const { verification_status } = req.body
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: { verification_status: verification_status }
      };

      const result = await offerDataCollection.updateOne(query, updateDoc);

      res.send(result)

      console.log(id, verification_status);
    })


    // sold property 
    app.get('/soldProperty/:email', verifyToken, verifyAgent, async (req, res) => {

      const email = req.params.email
      const query = { agent_email: email, verification_status: 'bought' }
      const result = await offerDataCollection.find(query).toArray()
      console.log(email);
      res.send(result)
    })


    // enquiry api 


    app.post('/addEnquiry', async (req, res) => {

      const enquiryData = req.body
      const result = await enquiryCollection.insertOne(enquiryData)
      console.log(enquiryData);
      res.send(result)
    })




    // ---------------------
    // PAYMENT History start
    // ---------------------
    app.post('/paymentHistory', async (req, res) => {
      const paymentData = req.body
      const offerCardId = paymentData.offerCardId;
      const transactionId = paymentData.transactionId;
      console.log(offerCardId, transactionId);
      const session = client.startSession();
      session.startTransaction();

      // const result= await paymentDataCollection.insertOne(paymentData)

      const statusUpdate = await offerDataCollection.updateOne(
        { _id: new ObjectId(offerCardId) },
        {
          $set: { verification_status: 'bought' },
          $push: { transactions: transactionId }
        },
        { session }
      );

      await session.commitTransaction();
      session.endSession();

      res.send(statusUpdate)





    })


    // ---------------------
    // PAYMENT  History end 
    // ---------------------
    // ---------------------
    // PAYMENT 
    // ---------------------


    app.post("/create-payment-intent", async (req, res) => {
      try {
        const { price } = req.body;
        const amount = parseInt(100 * price);
        const MAX_AMOUNT = 99999999; // in the smallest currency unit, for AED this is 999,999.99 AED

        if (amount > MAX_AMOUNT) {
          return res.status(400).send({ error: 'Amount must be no more than 999,999 AED' });
        }

        // Create a PaymentIntent with the order amount and currency
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: "aed",
          payment_method_types: ["card"],
        });

        res.send({
          clientSecret: paymentIntent.client_secret,
        });
      } catch (error) {
        console.error('Error creating payment intent:', error);
        res.status(500).send({ error: 'Failed to create payment intent' });
      }
    });

    // ---------------------
    // PAYMENT 
    // ---------------------


    app.post('/create-checkout-session', async (req, res) => {
      const session = await stripe.checkout.sessions.create({
        line_items: [
          {
            // Provide the exact Price ID (for example, pr_1234) of the product you want to sell
            price: '{{PRICE_ID}}',
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${YOUR_DOMAIN}?success=true`,
        cancel_url: `${YOUR_DOMAIN}?canceled=true`,
      });

      res.redirect(303, session.url);
    });





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