const bodyParser = require('body-parser');
const express = require('express')
const AWS = require('aws-sdk');
const router = express.Router();

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

router.use(bodyParser.json({ strict: false }));

// Get User endpoint
router.get('/', function (req, res) {

//check if minimum required QueryParams are provided
if (!req.query.canvasId) {
  res.status(400).json({message: "canvasId required as Query Parameter"})
} else if (typeof req.query.canvasId !== 'string') {
  res.status(400).json({message: "canvasId must be of type 'string'"})
}

//create parameters from QueryParams
let canvasId; if (req.query.canvasId) { canvasId = "CANVAS#" + req.query.canvasId};
let userId; if (req.query.email) {userId = "USER#" + req.query.email};

let params;
// define params based on request
if (req.query.email) {
  params = {
    TableName: TODO_APP_TABLE,
    KeyConditionExpression: "partitionKey = :dKey and sortKey = :sKey",
    ExpressionAttributeValues: {
      ":dKey": userId,
      ":sKey": canvasId
    }
  }
} else {
  // get all canvas objects
  params = {
    TableName: TODO_APP_TABLE,
    KeyConditionExpression: "partitionKey = :dKey",
    ExpressionAttributeValues: {
      ":dKey": canvasId
    }
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

module.exports = router;
