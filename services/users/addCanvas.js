// This file allows a user to be added to an existing canvas
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

router.put('/canvas/:canvasId', (req, res) => {
  const { canvasId } = req.params;
  const { userId, adderUserId } = req.body; // user to be added to canvas
  const canvasReference = "CANVAS#" + canvasId;
  const userReference = "USER#" + userId;
  const adderUserReference = "USER#" + adderUserId;

  if (!userId) {
    res.status(400).json({ message: "userId is a required parameter"})
  } else if (typeof userId !== "string") {
    res.status(400).json({ message: "userId must be of type string"})
  } else if (!adderUserId) {
    res.status(400).json({ message: "adderUserId is a required parameter"})
  } else if (typeof adderUserId !== "string") {
    res.status(400).json({ message: "adderUserId must be of type string"})
  }

  //create params to add user to the canvas META user list
  const canvasPartitionKey = canvasReference;
  const canvasSortKey = "META";

  //first retrieve the meta file of the card and check user list to see if any matches
  const queryParams = {
    TableName: TODO_APP_TABLE,
    KeyConditionExpression: "partitionKey = :dKey and sortKey = :sKey",
      ExpressionAttributeValues: {
        ":dKey": canvasReference,
        ":sKey": canvasSortKey
      }
  }

  dynamoDb.query(queryParams, (error, result) => {
    if (error) {
      console.log(error);
      res.status(500).json({ error: 'Could not get canvas META object' });
    }
    if (result.Items) {
      const { userIdList } = result.Items[0]

      for (let i=0; i<userIdList.length; i++) {
        //check to see if the adding user is a member of the canvas
        let userAuthorised = false;
        if (adderUserReference === userIdList[i]) {
          // adder is confirmed as member of the current canvas
          userAuthorised = true;
          for (let j=0; j<userIdList.length; j++) {
            //check if user to be added is already part of list
            if (userReference === userIdList[j]) {

              res.status(400).json({ error: 'User to be added is already a member of target canvas'})
              console.error("UPDATE NOT AUTHORISED. Error JSON:", JSON.stringify(userIdList[j], null, 2));
              //end both loops
              userAuthorised = false;
              i=j=userIdList.length;
            }
          }
          if (userAuthorised === true) {
            // this section the adding user is a member of target canvas and the
            // user to be added is not already a member

            //create params for adding canvas to user object
            const userPartitionKey = userReference;
            const userSortKey = canvasReference;
            const userData = adderUserReference;
            const timestamp = Date.now();

            const userParams = {
              TableName: TODO_APP_TABLE,
                Item: {
                  partitionKey: userPartitionKey,
                  sortKey: userSortKey,
                  data: userData,
                  creationDate: timestamp
                }
            }

            const canvasParams = {
                  TableName: TODO_APP_TABLE,
                  UpdateExpression: "set userIdList = list_append(userIdList, :uValue)",
                  Key: {
                    "partitionKey": canvasPartitionKey,
                    "sortKey": canvasSortKey
                  },
                  ExpressionAttributeValues: {
                    ":uValue": [userReference]
                  },
                  ReturnValues: "UPDATED_NEW"
                }

            // adding the canvas object to the user object
            dynamoDb.put(userParams, (error) => {
                if (error) {
                  console.log(error);
                  res.status(500).json({ error: 'Could not add user to canvas!' });
                }

                //update the canvas user list
                dynamoDb.update(canvasParams, (err, data) => {
                  if (err) {
                    console.error("Unable to update item. Error JSON:", JSON.stringify(err, null, 2));
                    res.status(500).json({error: "Unable to add user reference to canvas!"})
                  } else {
                    console.log("Update Item succeeded:", JSON.stringify(data, null, 2));
                    res.status(201).json({
                      message: 'User successfully added to canvas!',
                      canvasObject: data
                    })
                  }
                })
              })
            }
          } else {
            if ((i === userIdList.length - 1) && userAuthorised === false) {
              res.status(400).json({ error: 'User not authorised to add to canvas'})
            }
          }
        }
    } else {
      res.status(404).json({ error: 'Canvas Not Found'})
    }
  });
})

module.exports = router;
