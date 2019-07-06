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

// Create Canvas Endpoint
app.post('/canvas', function (req, res) {
  const { email } = req.body;
  let canvasTitle='EMPTY'; if (req.body.canvasTitle) {canvasTitle=req.body.canvasTitle};

  function ValidateEmail(mail) {
   if (/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(mail))
    {
      return (true)
    }
      return (false)
  }

  if (typeof email !== 'string') {
    res.status(400).json({ error: '"email" must be a string' });
  } else if (ValidateEmail(email) === false) {
    res.status(400).json({ error: 'please enter a valid email' })
  }

// -------This section creates the necessary info to populate the database-----

//create the Canvas Item in DB
  // use randomString to create unique partition key
  const canvasPartitionKey = 'CANVAS#' + cryptoRandomString({length: 24})
  // assign sort key which for first entry is simply META
  const canvasSortKey = "META"
  // assign Data as member status - allows us to search database to get all current members
  const canvasData = email
  const timestamp = Date.now()

  const canvasParams = {
    TableName: TODO_APP_TABLE,
    Item: {
      partitionKey: canvasPartitionKey,
      sortKey: canvasSortKey,
      data: canvasData,
      creationDate: timestamp,
      canvasTitle: canvasTitle,
      users: [email]
    },
  };

  const referencePartitionKey = "USER#" + email
  // assign canvas as sort key for the user
  const userSortKey = canvasPartitionKey
  // assign Data as member status - allows us to search database to get all current members
  const userData = referencePartitionKey

  // Create the Reference Canvas Item in User DB
  // create user referenceKey

  const canvasReferenceParams = {
    TableName: TODO_APP_TABLE,
    Item: {
      partitionKey: referencePartitionKey,
      sortKey: userSortKey,
      data: userData,
      creationDate: timestamp,
      canvasTitle: canvasTitle,
      users: [email],
      boards: []
    },
  };

  dynamoDb.put(canvasParams, (error) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not create canvas' });
    }

    dynamoDb.put(canvasReferenceParams, (error) => {
      if (error) {
        console.log(error);
        res.status(400).json({ error: 'Could not create canvas' });
      }
      res.status(201).json({
        canvasReferenceMessage: 'Canvas Reference Successfully Created',
        canvasReferenceObject: { referencePartitionKey, userSortKey, userData, timestamp },
        canvasObjectMessage: 'Canvas Object Successfully Created',
        canvasObject: { canvasPartitionKey, canvasSortKey, canvasData, email, timestamp }
      });
    });
  });


// -----------------------------------------------------------------------------
})

module.exports.handler = serverless(app);
