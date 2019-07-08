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

router.get('/', (req, res) => {

  //check if minimum required QueryParams are provided
  if (!req.query.boardId) {
    res.status(400).json({message: "boardId required as Query Parameter"})
  } else if (typeof req.query.boardId !== 'string') {
    res.status(400).json({message: "boardId must be of type 'string'"})
  }
  // else if (!req.query.canvasId) {
  //   res.status(400).json({message: "canvasId required as Query Parameter"})
  // } else if (typeof req.query.canvasId !== 'string') {
  //   res.status(400).json({message: "canvasId must be of type 'string'"})
  // }

  //create parameters from QueryParams
  let cardId; if (req.query.cardId) { cardId = "CARD#" + req.query.cardId};
  let boardId; if (req.query.boardId) { boardId = "BOARD#" + req.query.boardId};
  let canvasId; if (req.query.canvasId) { canvasId = "CANVAS#" + req.query.canvasId};

  let params;
  // define params based on request
  if (req.query.cardId) {
    params = {
      TableName: TODO_APP_TABLE,
      KeyConditionExpression: "partitionKey = :dKey and sortKey = :sKey",
      ExpressionAttributeValues: {
        ":dKey": boardId,
        ":sKey": cardId
      }
    }
  } else {
    // get all active board objects on canvas
    params = {
      TableName: TODO_APP_TABLE,
      KeyConditionExpression: "partitionKey = :dKey",
      ExpressionAttributeValues: {
        ":dKey": boardId
        }
      }
    }

  //get Card Objects
  dynamoDb.query(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: 'Could not get card' });
    }
    if (result.Items) {
      res.status(200).json({ result });
    } else {
      res.status(404).json({ error: 'Card Not Found'})
    }
  });
})

module.exports = router
