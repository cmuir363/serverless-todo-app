const bodyParser = require('body-parser');
const express = require('express')
const AWS = require('aws-sdk');
const router = express.Router();
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
  const { canvasId, email } = req.body;
  let boardTitle='EMPTY'; if (req.body.boardTitle) {boardTitle=req.body.boardTitle};
  const canvasReference = "CANVAS#" + canvasId
  const userId = "USER#" + email

  if (!canvasId) {
    res.status(400).json({ message: "canvasId required in method" })
  } else if (!email) {
    res.status(400).json({ message: "email required in method" })
  } else if (typeof canvasId !== "string") {
    res.status(400).json({ message: "canvasId must be of type String"})
  } else if (typeof email !== "string") {
    res.status(400).json({ message: "email must be of type string"})
  }

  // -------This section creates the necessary info to populate the database-----

  //create the Board Item in DB
  const boardPartitionKey = 'BOARD#' + cryptoRandomString({length: 24})
  //assign sort key which for first time is always META
  const boardSortKey = 'META'
  // assign Data as creator of the board
  const boardData = userId
  //get timestamp
  const timestamp = Date.now()

  const boardParams = {
    TableName: TODO_APP_TABLE,
    Item: {
      partitionKey: boardPartitionKey,
      sortKey: boardSortKey,
      data: boardData,
      creationDate: timestamp,
      canvasId: canvasReference,
      boardTitle,
      cardIdList: []
    }
  }

  // create the Board Reference Item in Canvas Partition Key
  const referencePartitionKey = canvasReference
  //assign board as sort key for the canvas
  const referenceSortKey = boardPartitionKey
  //assign creator of the board as meta data
  const referenceData = userId

  //create the Board Reference in the Canvas Partition Key
  const boardReferenceParams = {
    TableName: TODO_APP_TABLE,
    Item: {
      partitionKey: referencePartitionKey,
      sortKey: referenceSortKey,
      data: referenceData,
      creationDate: timestamp,
      boardTitle,
      cardIdList: []
    }
  }

  //put items in the DB
  dynamoDb.put(boardParams, (error) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: 'Could not create board' });
    }

    dynamoDb.put(boardReferenceParams, (error) => {
      if (error) {
        console.log(error);
        res.status(500).json({ error: 'Could not create board reference' });
      }
      res.status(201).json({
        canvasReferenceMessage: 'Board Reference Successfully Created',
        canvasReferenceObject: { referencePartitionKey, referenceSortKey, referenceData, timestamp },
        canvasObjectMessage: 'Board Object Successfully Created',
        canvasObject: { boardPartitionKey, boardSortKey, boardData, email, timestamp }
      });
    });
   });

// -----------------------------------------------------------------------------


})

module.exports = router;
