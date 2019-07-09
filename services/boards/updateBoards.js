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

router.put('/:boardId', (req, res) => {
  const { boardId } = req.params;
  const { canvasId, newTitle } = req.body;
  const canvasReference = "CANVAS#" + canvasId;
  const boardReference = "BOARD#" + boardId;

  //test variables
  if (!boardId) {
    res.status(400).json({ message: "canvasId is a required parameter"})
  } else if (typeof boardId !== "string") {
    res.status(400).json({ message: "canvasId must be of type string"})
  } else if (newTitle && typeof newTitle !== "string") {
    res.status(400).json({ message: "newTitle must be of type string"})
  }

  //create params based on request values
  let canvasParams, boardParams;
  if (newTitle) {
    canvasParams = {
      TableName: TODO_APP_TABLE,
      UpdateExpression: "set boardTitle = :uValue",
      Key: {
        "partitionKey": canvasReference,
        "sortKey": boardReference
      },
      ExpressionAttributeValues: {
        ":uValue": newTitle
      },
      ReturnValues: "UPDATED_NEW"
    }

    boardParams = {
      TableName: TODO_APP_TABLE,
      UpdateExpression: "set boardTitle = :uValue",
      Key: {
        "partitionKey": boardReference,
        "sortKey": "META"
      },
      ExpressionAttributeValues: {
        ":uValue": newTitle
      },
      ReturnValues: "UPDATED_NEW"
    }
  }

  //use params to update item
  dynamoDb.update(canvasParams, (err, data) => {
    if (err) {
      console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
      res.status(500).json({error: "Unable to update board", params})
    } else {
      console.log("Update Item succeeded:", JSON.stringify(data, null, 2));
      dynamoDb.update(boardParams, (err, data) => {
        if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          res.status(500).json({error: "Unable to update board META reference", params})
        } else {
          console.log("Update Item succeeded:", JSON.stringify(data, null, 2));
          res.status(200).json({
            message: 'Board and META Successfully Updated',
            cardObject: data
          })
        }
      });
    }
  });
})

module.exports = router;
