const express = require('express')
const AWS = require('aws-sdk');
const router = express.Router();
const bodyParser = require('body-parser');

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

router.put('/:cardId', (req, res) => {
  const { cardId } = req.params;
  const { boardId, newDescription, completed } = req.body;
  const cardReference = "CARD#" + cardId
  const boardReference = "BOARD#" + boardId

  //test variables
  if (!boardId) {
    res.status(400).json({ message: "boardId is a required parameter"})
  } else if (typeof boardId !== "string") {
    res.status(400).json({ message: "boardId must be of type string"})
  } else if (newDescription && typeof newDescription !== "string") {
    res.status(400).json({ message: "newDescription must be of type string"})
  } else if (completed && typeof completed !== "number") {
    res.status(400).json({ message: "completed must be of type number"})
  } else if (!newDescription && typeof completed === undefined) {
    res.status(400).json({ message: "please provide at least one update parameter"})
  }

  //create params based on request values
  let params;
  if (newDescription && typeof completed === "number") {
    params = {
      TableName: TODO_APP_TABLE,
      UpdateExpression: "set cardDescription = :uValue, completed = :u1Value",
      Key: {
        "partitionKey": boardReference,
        "sortKey": cardReference
      },
      ExpressionAttributeValues: {
        ":uValue": newDescription,
        ":u1Value": completed
      },
      ReturnValues: "UPDATED_NEW"
    }
  } else if (typeof completed !== "undefined") {
    params = {
      TableName: TODO_APP_TABLE,
      UpdateExpression: "set completed = :uValue",
      Key: {
        "partitionKey": boardReference,
        "sortKey": cardReference
      },
      ExpressionAttributeValues: {
        ":uValue": completed
      },
      ReturnValues: "UPDATED_NEW"
    }
  } else if (newDescription) {
    params = {
      TableName: TODO_APP_TABLE,
      UpdateExpression: "set cardDescription = :uValue",
      Key: {
        "partitionKey": boardReference,
        "sortKey": cardReference
      },
      ExpressionAttributeValues: {
        ":uValue": newDescription
      },
      ReturnValues: "UPDATED_NEW"
    }
  }

  //use params to update item
  dynamoDb.update(params, (err, data) => {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      res.status(500).json({error: "Unable to add card reference to board", params})
    } else {
      console.log("Update Item succeeded:", JSON.stringify(data, null, 2));
      res.status(200).json({
        message: 'Card Successfully Updated',
        cardObject: data
      })
    }
  });
})

module.exports = router;
