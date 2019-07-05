const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()
const AWS = require('aws-sdk');

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

// Get User endpoint
app.get('/users', function (req, res) {

//create parameters from QueryParams
let partitionKey
if (req.query.email) { partitionKey = 'USER#' + req.query.email};

  const params = {
    TableName: TODO_APP_TABLE,
    KeyConditionExpression: "partitionKey = :dKey and sortKey = :sKey",
    ExpressionAttributeValues: {
      ":dKey": partitionKey,
      ":sKey": 'META'
    }
  }


  dynamoDb.query(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(400).json({ error: 'Could not get user' });
    }
    if (result.Items) {
      res.status(200).json({ result });
    } else {
      res.status(404).json({ error: 'User Not Found'})
    }
  });
})

module.exports.handler = serverless(app);
