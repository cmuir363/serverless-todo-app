const express = require('express')
const AWS = require('aws-sdk');
const router = express.Router();
const bodyParser = require('body-parser');
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

router.use(bodyParser.json({ strict: false }));

router.post('/', (req, res) => {
  const { boardId, email, canvasId } = req.body;
  let cardDescription='EMPTY'; if (req.body.cardDescription) {cardDescription=req.body.cardDescription};
  const boardReference = "BOARD#" + boardId
  const userId = "USER#" + email
  const canvasReference = "CANVAS#" + canvasId;

  if (!boardId) {
    res.status(400).json({ message: "boardId required in method" })
  } else if (!email) {
    res.status(400).json({ message: "email required in method" })
  } else if (typeof boardId !== "string") {
    res.status(400).json({ message: "boardId must be of type String"})
  } else if (typeof email !== "string") {
    res.status(400).json({ message: "email must be of type string"})
  } else if (!canvasId) {
    res.status(400).json({ message: "canvasId is a required parameter"})
  } else if (typeof canvasId !== "string") {
    res.status(400).json({ message: "canvasId must be of type string"})
  }

  // -------This section creates the necessary info to populate the database-----

  //create the Board Item in DB
  const cardPartitionKey = boardReference
  //assign sort key which for first time is always META
  const cardSortKey = 'CARD#' + cryptoRandomString({length: 24})
  // assign Data as creator of the board
  const cardData = userId
  //get timestamp
  const timestamp = Date.now()

  const cardParams = {
      TableName: TODO_APP_TABLE,
      Item: {
        partitionKey: cardPartitionKey,
        sortKey: cardSortKey,
        data: cardData,
        creationDate: timestamp,
        cardDescription,
        completed: 0
      }
    }

    dynamoDb.put(cardParams, (error) => {
      if (error) {
        console.log(error);
        res.status(500).json({ error: 'Could not create board' });
      }

      //once card is created update the cardListItem in Board Object
      boardParams = {
        TableName: TODO_APP_TABLE,
        UpdateExpression: "set cardIdList = list_append(cardIdList, :uValue)",
        Key: {
          "partitionKey": canvasReference,
          "sortKey": boardReference
        },
        ExpressionAttributeValues: {
          ":uValue": [cardSortKey]
        },
        ReturnValues: "UPDATED_NEW"
      }

      //update the board item with the new card reference
      dynamoDb.update(boardParams, (err, data) => {
        if (err) {
          console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
          res.status(500).json({error: "Unable to add card reference to board"})
        } else {
          console.log("Update Item succeeded:", JSON.stringify(data, null, 2));
          res.status(201).json({
            message: 'Card Successfully Created',
            cardObject: cardParams.Item,
            boardObject: data
          })
        }
      })
    })
  })

module.exports = router
