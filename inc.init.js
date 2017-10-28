const fs = require('fs');
const https = require('https');
const express = require('express')
const router = express.Router()
const connect = require('connect')
const multer  = require('multer')
const app = express()

const md5 = require('js-md5');
const pug = require('pug');
const session = require('client-sessions');
const url = require('url');
const latinize = require('latinize');
const dateformat = require('dateformat');
const methodOverride = require('method-override');

//  custom modules

const general = require('./general.js')

/*
//  append files - sample
eval(fs.readFileSync(__dirname + '/inc.init.js')+'');
*/

//  ------------------------[ APP INIT ] ------------------------

app.disable('x-powered-by')
app.set('view engine', 'pug')
app.set('views', __dirname + '/views')

app.use(methodOverride('X-HTTP-Method-Override'));    // allows the use of PUT and DELETE

app.use(express.static('./public'))

//  --------------------------------------[ STATIC VALUES ]--------------------------------------

//  app internal settings

const settings  = {
                     pagination_limit: 25,                            //  max. number of documents retrieved
                     upload_size_limit: 200*(1024*1024),              //  max. upload size in bytes
                     date_format: 'yyyy.mm.dd. HH:MM:ss',             //  date formatting string
                     default_country: 'HU',                           //  default country
                     mongoDB: { username: 'admin',
                                password: 'admin',
                                url: 'mongodb://localhost:27017/dbGunKisser'
                              },
                  }

//  firing test values

const triggerTestTypes = [{value: 'Sütésteszt', text: 'Sütésteszt'},
    {value: 'Sütésteszt gyorsítóval', text: 'Sütésteszt gyorsítóval'},
    {value: 'Sütésteszt revolverezve', text: 'Sütésteszt revolverezve'}];


//  possible user levels

const userlevels = [
                    { value: 0, text: 'Nincs belépési joga' },
                    { value: 1, text: 'Felhasználó' },
                    { value: 10, text: 'Adminisztrátor' }
                   ];

//  collation to sort search results

const collation = {
                     locale: 'hu',
                     strength: 2,
                     caseLevel: true,
                     caseFirst: 'upper',
                     numericOrdering: true,
                     alternate: 'shifted',
                     maxVariable: 'punct',
                     backwards: false
                  }

//  --------------------------------------[ SSL INIT ]--------------------------------------

const ssl = require(__dirname + '/ssl/ssl.js');
const myssl = ssl.create({
        ssl: {
            key: __dirname + '/ssl/server.key',
            certificate: __dirname + '/ssl/server.crt',
            active: true
        },
        port: 3000
    },
    app);
    
