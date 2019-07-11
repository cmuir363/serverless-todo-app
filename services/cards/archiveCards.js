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


router.delete('/:cardId', (req, res) => {
  const { cardId } = req.params;
  const { boardId, canvasId } = req.body;
  const cardReference = "CARD#" + cardId
  const boardReference = "BOARD#" + boardId
  const canvasReference = "CANVAS#" + canvasId;

  //test variables
  if (!boardId) {
    res.status(400).json({ message: "boardId is a required parameter"})
  } else if (typeof boardId !== "string") {
    res.status(400).json({ message: "boardId must be of type string"})
  } if (!canvasId) {
    res.status(400).json({ message: "canvasId is a required parameter"})
  } else if (typeof boardId !== "string") {
    res.status(400).json({ message: "canvasId must be of type string"})
  }

  //params to delete the item
  const params = {
    TableName: TODO_APP_TABLE,
    Key: {
      "partitionKey": boardReference,
      "sortKey": cardReference
    },
    ReturnValues: 'ALL_OLD'
  }

  dynamoDb.delete(params, (error, result) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: 'Could not archive board' });
    } else {

      //after board is successfully archived - update the cardIdList in the board item
      console.log("DeleteItem succeeded:", JSON.stringify(result, null, 2));
      const archivedObject = result.Attributes;
      //params to create new archived board
      const archivedParams = {
        TableName: TODO_APP_TABLE,
        Item: {
          partitionKey: `ARCHIVED#${archivedObject.partitionKey}`,
          sortKey: archivedObject.sortKey,
          data: archivedObject.data,
          creationDate: archivedObject.timestamp,
          cardDescription: archivedObject.cardDescription,
          completed: archivedObject.completed
        }
      }

      dynamoDb.put(archivedParams, (error) => {
        if (error) {
          console.log(error);
          res.status(500).json({ error: 'Could not create board' });
        }

        //once card is created update the cardListItem in Board Object
        //this method needs to fetch thhis object first which is inefficient
        //could introduce sending the entire boiard object list to replace
        //which will increase response times

        //fetch the current board card positions
        fetchBoardParams = {
          TableName: TODO_APP_TABLE,
          KeyConditionExpression: "partitionKey = :dKey and sortKey = :sKey",
          ExpressionAttributeValues: {
            ":dKey": canvasReference,
            ":sKey": boardReference
          }
        }

        dynamoDb.query(fetchBoardParams, (error, result) => {
          if (error) {
            console.log(error);
            res.status(500).json({ error: 'Could not get board' });
          }
          if (result.Items) {
            const { cardIdList } = result.Items[0]
            //calculate the index which needs to be deleted
            let deleteIndex;
            for (let i=0; i<cardIdList.length; i++) {
              if (cardIdList[i] === cardReference) {
                  deleteIndex = i
                  console.log("MESSAGGE 0 - " + deleteIndex)
                  break
                }
              }

            //now use the result from the query to delete the calculated index
            const indexQuery = `remove cardIdList[${deleteIndex}]`
            deleteIndexParams = {
              TableName: TODO_APP_TABLE,
              UpdateExpression: indexQuery,
              Key: {
                "partitionKey": canvasReference,
                "sortKey": boardReference
              },
              ReturnValues: "UPDATED_NEW"
            }

            //now use dynamodb query to delete the card
            dynamoDb.update(deleteIndexParams, (err, data) => {
              if (err) {
                console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                res.status(500).json({error: "Unable to delete item in board list", deleteIndexParams})
              } else {
                res.status(200).json({message: "Card Successfully Archived", updatedCardList: data})
              }
            })
          } else {
            res.status(404).json({ error: 'Board Not Found'})
          }
        });
      })
    }
  })
})

module.exports = router;
