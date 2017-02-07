const fs = require('fs');
const https = require('https');
const express = require('express')
const router = express.Router()
const app = express()
const bodyParser = require('body-parser')
const md5 = require('js-md5');
const session = require('client-sessions');
const url = require('url') ;
const latinize = require('latinize');
const general = require('./general.js')

/*
//  app initialize
eval(fs.readFileSync(__dirname + '/inc.init.js')+'');
*/
