const express = require('express')
const app = express()
const cors = require('cors')
const bodyParser = require('body-parser')
require('dotenv').config()

const { MongoClient, ObjectId } = require("mongodb");

const client = new MongoClient(process.env.URI);

(async function connectDB() {
  try {
    await client.connect();
    console.log("Connected");
  } catch (error) {
    console.log(error);
  }
})();

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.use(bodyParser.urlencoded({extended: false}));

app.post("/api/users", async (req, res) => {
  const username = req.body.username;

  try {
    const db = await client.db("exercise");
    const users = await db.createCollection("users");

    await users.insertOne({username: username});

    const user = await users.findOne({username: username});

    const id = user._id;

    return res.json({username: username, _id: id});
  } catch (error) {
    res.send(error);
  }
});

app.get("/api/users", async (req, res) => {
  try {
    const db = await client.db("exercise");
    const users = await db.createCollection("users");

    let usersList = await users.find().toArray();

    usersList = usersList.map(list => JSON.parse(JSON.stringify(list, ["username","_id"] , 3)));

    res.json(usersList);
  } catch (error) {
    res.send(error);
  }
});


app.post('/api/users/:_id/exercises', async (req, res) => {
  try {
    const db = await client.db("exercise");
    const users = await db.createCollection("users");

    const id = req.params._id;

    const user = await users.findOne({_id: new ObjectId(id)});

    if (user) {
      const description = req.body.description;
      const duration = parseInt(req.body.duration);
      const date = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();
      const username = user.username;
      const _id = user._id;

      const exercises = await db.createCollection("exercises");

      await exercises.insertOne({
        username,
        description,
        duration,
        date
      });

      return res.json({username, description, duration, date, _id});
    }

    return res.json({error: "Invalid ID"});
  } catch (error) {
    res.send(error);
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  try {
    const _id = req.params._id;

    const db = await client.db("exercise");
    const users = await db.createCollection("users");
    const exercises = await db.createCollection("exercises");

    const user = await users.findOne({ _id: new ObjectId(_id)});

    const username = user.username;

    if (username) {
      let logs = await exercises.find({username}, {projection: {username: 0, _id: 0}}).toArray();

      if (req.query.from) {
        logs = logs.filter(log => new Date(log.date).getTime() >= new Date(req.query.from).getTime())
      }

      if (req.query.to) {
        logs = logs.filter(log => new Date(log.date).getTime() <= new Date(req.query.to).getTime())
      }

      if (req.query.limit && logs.length > Number(req.query.limit)) {
        logs = logs.slice(0, parseInt(req.query.limit));
      }

      const count = logs.length;

      return res.json({username, count, _id, log: logs});
    }

    return res.json({error: "Invalid ID"});
  } catch (error) {
    res.send(error);
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
