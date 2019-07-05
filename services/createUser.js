const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');
const cryptoRandomString = require('crypto-random-string');

const TODO_APP_TABLE = process.env.TODO_APP_TABLE;
const TODO_APP_GSI_1 = process.env.TODO_APP_GSI_1;

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
  console.log(req.body)
  console.log(name, email)
  if (typeof name !== 'string') {
    res.status(400).json({ error: '"name" must be a string' });
  } else if (typeof email !== 'string') {
    res.status(400).json({ error: '"email" must be a string' });
  } else if (ValidateEmail(email) === false) {
    res.status(400).json({ error: 'please enter a valid email' })
  }

// -------This section creates the necessary info to populate the database-----
  // use email to create unique partition key
  const partitionKey = 'USER#' + email
  // assign sort key which for first entry is simply META
  const sortKey = "META"
  // assign Data as member status - allows us to search database to get all current members
  const data = "BASIC"
  const timestamp = Date.now()

// -----------------------------------------------------------------------------


  const createParams = {
    TableName: TODO_APP_TABLE,
    Item: {
      partitionKey: partitionKey,
      sortKey: sortKey,
      data: data,
      joinDate: timestamp,
      name: name
    },
  };

  const checkParams = {
    TableName: TODO_APP_TABLE,
    KeyConditionExpression: "partitionKey = :dKey and sortKey = :sKey",
    ExpressionAttributeValues: {
      ":dKey": partitionKey,
      ":sKey": sortKey
    }
  }

  //check if user already exists in detabase
  dynamoDb.query(checkParams, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not get user' });
    }
    if (result.Items < 1) {
      dynamoDb.put(createParams, (error) => {
        if (error) {
          console.log(error);
          res.status(400).json({ error: 'Could not create user' });
        }
        res.status(201).json({ partitionKey, sortKey, data, name, email, timestamp });
      });
    } else {
      res.status(409).json({ error: 'User with this email already exists in database'})
    }
  })
})

module.exports.handler = serverless(app);
