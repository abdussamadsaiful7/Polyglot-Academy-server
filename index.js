const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;

//polyglotAcademy
//1fpSQkJQ56HN1D0g

//middleware 
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('Language academy is running')
})



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

        //users api
        app.post('/users', async (req, res)=>{
            const user = req.body;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        //Instructors
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

        // app.get('/classes/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = { _id: new ObjectId(id) };
        //     const result = await classCollection.findOne(query);
        //     res.send(result);

        // })

        app.post('/classes', async (req, res) => {
            const newClass = req.body;
            const result = await classCollection.insertOne(newClass);
            res.send(result);
        })


        //select collection api


        app.get('/selects', async (req, res) => {
            const email = req.query.email;
            if (!email) {
                res.send([])
            }
            const query = { email: email };
            const result = await selectCollection.find(query).toArray();
            res.send(result);
        });

        app.post('/selects', async (req, res) => {
            const item = req.body;
            console.log(item);
            const result = await selectCollection.insertOne(item);
            res.send(result);
        })

        //delete
        app.delete('/selects/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id)}
            const result = await selectCollection.deleteOne(query)
            res.send(result);
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
