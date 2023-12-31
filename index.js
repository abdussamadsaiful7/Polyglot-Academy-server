const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

//console.log(process.env.PAYMENT_SECRET_KEY)

//middleware 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Language academy is running')
})

//jwt middleware
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;
    if (!authorization) {
        return res.status(401).send({ error: true, message: 'Unauthorized access' });
    }
    //bearer token
    const token = authorization.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).send({ error: true, message: 'Unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.nrvy6gz.mongodb.net/?retryWrites=true&w=majority`;

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

        const userCollection = client.db('polyglotDB').collection('users');
        const instructorCollection = client.db('polyglotDB').collection('instructors');
        const classCollection = client.db('polyglotDB').collection('classes');
        const selectCollection = client.db('polyglotDB').collection('selects');
        const paymentCollection = client.db('polyglotDB').collection('payments');

        app.post('/jwt', (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1hr' })
            res.send({ token });
        })

        // admin middleware
        //warning: use verifyJWT before using verifyAdmin
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next();
        }
        const verifyInstructor = async (req, res, next) => {
            const email = req.decoded.email;
            const query = { email: email }
            const user = await userCollection.findOne(query);
            if (user?.role !== 'instructor') {
                return res.status(403).send({ error: true, message: 'forbidden message' })
            }
            next();
        }

        //users api
        app.get('/users', verifyJWT, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({ message: 'user already exists' })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })


        //admin
        app.get('/users/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ admin: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { admin: user?.role === 'admin' }
            res.send(result);
        })

        // make admin
        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'admin'
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        });


        //approved and denied
        app.put('/approved/:id', async (req, res) => {
            const id = req.params.id;
            const filterData = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: "approved" } };

            const result = await classCollection.updateOne(filterData, updateDoc);
            res.send(result);
        })

        app.put('/denied/:id', async (req, res) => {
            const id = req.params.id;
            const filterData = { _id: new ObjectId(id) };
            const updateDoc = { $set: { status: "denied" } };
            const result = await classCollection.updateOne(filterData, updateDoc);
            res.send(result);

        })



        //instructor
        app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;

            if (req.decoded.email !== email) {
                res.send({ instructor: false })
            }

            const query = { email: email }
            const user = await userCollection.findOne(query);
            const result = { instructor: user?.role === 'instructor' }
            res.send(result);
        })

        // user make instructors
        app.patch('/users/instructor/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: 'instructor'
                }
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        //user delete
        app.delete('/users/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result);
        })


        //Instructors api
        app.get('/instructors', async (req, res) => {
            const result = await instructorCollection.find().toArray();
            res.send(result);
        })

        app.post('/instructors', async (req, res) => {
            const newInstructor = req.body;
            const result = await instructorCollection.insertOne(newInstructor);
            res.send(result);
        })


        //classes
        app.get('/classes', async (req, res) => {
            const result = await classCollection.find().toArray();
            res.send(result);
        })

        app.get('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await classCollection.findOne(query);
            res.send(result);

        })

        app.post('/classes', async (req, res) => {
            const newClass = req.body;
            const result = await classCollection.insertOne(newClass);
            res.send(result);
        })

        app.put('/classes/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true }
            const updatedCourse = req.body;
            const course = {
                $set: {
                    ClassName: updatedCourse.ClassName,
                    instructorName: updatedCourse.instructorName,
                    email: updatedCourse.email,
                    price: updatedCourse.price,
                    seats: updatedCourse.seats,
                    student: updatedCourse.student,
                }
            }
            const result = await classCollection.updateOne(filter, course, options)
            res.send(result);
        })



        //select collection api
        app.get('/selects', verifyJWT, async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }

            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ error: true, message: 'forbidden access' })
            }

            const query = { email: email };
            const result = await selectCollection.find(query).toArray();
            res.send(result);
        });

        app.get('/selects/:id', async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await selectCollection.findOne(query);
            res.send(result)
        })

        app.post('/selects', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await selectCollection.insertOne(item);
            res.send(result);
        })

        //delete
        app.delete('/selects/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await selectCollection.deleteOne(query)
            res.send(result);
        })



        app.get('/admin-stats', verifyJWT, verifyAdmin, async (req, res) => {
            const users = await userCollection.estimatedDocumentCount();
            const classes = await classCollection.estimatedDocumentCount();
            const pays = await paymentCollection.estimatedDocumentCount();

            //best way to get sum of a the price field is to use group and sum operator

            const totalPayments = await paymentCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        total: { $sum: { $toInt: "$price" } } // Convert price field to integer if it's stored as a string
                    }
                }
            ]).toArray();

            const revenue = totalPayments.length > 0 ? totalPayments[0].total : 0;

           // const payments = await paymentCollection.find().toArray();
           // const revenue = payments.reduce((sum, payment) => sum + payment.price, 0)

            res.send({
                users,
                classes,
                pays,
                revenue
            })
        })




        //create payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"]
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })


        //payment related api
        // app.post('/payments',  async (req, res) => {
        //     const payment = req.body;
        //     console.log(payment)
        //     const insertResult = await paymentCollection.insertOne(payment);

        //     const query = { _id: { $in: payment.selectItems.map(id => new ObjectId(id)) } }
        //     const deleteResult = await selectCollection.deleteOne(query)

        //     res.send({ insertResult, deleteResult });
        // })

        app.post('/payments', verifyJWT, async (req, res) => {
            const payment = req.body
            payment.date = new Date()
            const id = payment.selectedId
            const insertResult = await paymentCollection.insertOne(payment)

            const query = { _id: new ObjectId(id) }
            const deleteResult = await selectCollection.deleteOne(query)

            res.send({ insertResult, deleteResult })
        })




        app.get('/payments', async (req, res) => {
            const query = {};
            const options = {
                sort: { "date": -1 }
            }
            const result = await paymentCollection.find(query, options).toArray();
            res.send(result);
        })




        //update
        app.put('/updateClass/:id', async(req, res)=>{
            const id = req.params.id;
            const {seats, student} = req.body;
            const filter = {_id: new ObjectId(id)}
            const updateDoc = {
                $set:{
                    seats: seats,
                    student: student,
                },
            }

            const result = await classCollection.updateOne(filter, updateDoc )
            res.send(result)
        })






        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.listen(port, () => {
    console.log(`Polyglot Academy is sitting on port ${port}`);
})
