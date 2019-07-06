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

router.get('/', (req, res) => {

  //check if minimum required QueryParams are provided
  if (!req.query.boardId) {
    res.status(400).json({ message: "boardId required as Query Parameter"})
  }

  //create parameters from Query Params
  let boardId; if (req.query.boardId) { boardId = "BOARD#" + req.query.boardId};
  let canvasId; if (req.query.canvasId) { canvasId = "CANVAS#" + req.query.canvasId};

  let params;
  // define params based on query params in request
  if (req.query.canvasId) {
    params = {
      TableName: TODO_APP_TABLE,
      KeyConditionExpression: "partitionKey = :dKey and sortKey = :sKey",
      ExpressionAttributeValues: {
        ":dKey": canvasId,
        ":sKey": boardId
      }
    }
  } else {
    //get all active object on board
    params = {
      TableName: TODO_APP_TABLE,
      KeyConditionExpression: "partitionKey = :dKey",
      ExpressionAttributeValues: {
        ":dKey": boardId
      }
    }
  }

  //fetch objects from DB
  dynamoDb.query(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: 'Could not get board' });
    }
    if (result.Items) {
      console.log(req.query.canvasId)
      res.status(200).json({ result });
    } else {
      res.status(404).json({ error: 'Board Not Found'})
    }
  });
})

module.exports = router;
