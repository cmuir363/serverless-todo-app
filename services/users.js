const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const express = require('express')
const app = express()

//import user methods
const addCanvas = require("./users/addCanvas.js")

app.use('/v1.0/users', addCanvas)

module.exports.handler = serverless(app)
