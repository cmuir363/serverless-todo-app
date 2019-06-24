const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');
const cryptoRandomString = require('crypto-random-string');

const USERS_TABLE = process.env.USERS_TABLE;

const IS_OFFLINE = process.env.IS_OFFLINE;
let dynamoDb;
if (IS_OFFLINE === 'true') {
  dynamoDb = new AWS.DynamoDB.DocumentClient({
    region: 'localhost',
    endpoint: 'http://localhost:8000'
  })
  console.log(dynamoDb);
} else {
  dynamoDb = new AWS.DynamoDB.DocumentClient();
};

app.use(bodyParser.json({ strict: false }));

//validate email functions
function ValidateEmail(mail) {
 if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail))
  {
    return (true)
  }
    return (false)
}

// Create User endpoint
app.post('/users', function (req, res) {
  const { name, email } = req.body;

  if (typeof name !== 'string') {
    res.status(400).json({ error: '"name" must be a string' });
  } else if (typeof email !== 'string') {
    res.status(400).json({ error: '"email" must be a string' });
  } else if (ValidateEmail(email) === false) {
    res.status(400).json({ error: 'please enter a valid email' })
  }

  // assign a random userId value
  const userId = cryptoRandomString({length: 32});

  //assign timestamp for user creation
  const timestamp = Date.now();

  //create a canvas which will be this users first

  const params = {
    TableName: USERS_TABLE,
    Item: {
      userId: userId,
      name: name,
      email: email,
      joinDate: timestamp
    },
  };


  dynamoDb.put(params, (error) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create user' });
    }
    res.json({ userId, name, email, timestamp });
  });
})

module.exports.handler = serverless(app);
