const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()

//import board methods
const getCards = require("./cards/getCards.js")
const createCards = require("./cards/createCards.js")
const updateCards = require("./cards/updateCards.js")

app.use('/cards', getCards)
app.use('/cards', createCards)
app.use('/cards', updateCards)

module.exports.handler = serverless(app)
