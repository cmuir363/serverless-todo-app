const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()

//import board methods
const getBoards = require("./boards/getBoards.js")
const createBoards = require("./boards/createBoards.js")
const updateBoards = require("./boards/updateBoards.js")

app.use('/boards', getBoards)
app.use('/boards', createBoards)
app.use('/boards', updateBoards)

module.exports.handler = serverless(app)
