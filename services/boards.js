const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()

//import board methods
const getBoards = require("./boards/getBoards.js")
const createBoards = require("./boards/createBoards.js")
const updateBoards = require("./boards/updateBoards.js")

app.use('/v1.0/boards', getBoards)
app.use('/v1.0/boards', createBoards)
app.use('/v1.0/boards', updateBoards)

module.exports.handler = serverless(app)
