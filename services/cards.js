const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()

//import board methods
const getCards = require("./cards/getCards.js")
const createCards = require("./cards/createCards.js")
const updateCards = require("./cards/updateCards.js")
const archiveCards = require("./cards/archiveCards.js")

app.use('/v1.0/cards', getCards)
app.use('/v1.0/cards', createCards)
app.use('/v1.0/cards', updateCards)
app.use('/v1.0/cards', archiveCards)

module.exports.handler = serverless(app)
