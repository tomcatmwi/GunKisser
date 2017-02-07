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
//  ------------------------[ APP INIT ] ------------------------

app.disable('x-powered-by')
app.set('view engine', 'pug')
app.set('views', './views')
app.use(express.static('./public'))

// get countries and sort them

var countries = JSON.parse(fs.readFileSync('./public/json/countries.json'));
countries.sort(function(a, b) {
                                  var namea = latinize(a.namehun).toLowerCase();
                                  var nameb = latinize(b.namehun).toLowerCase();
                                  if (namea < nameb) return -1;
                                  if (namea > nameb) return 1;
                                  return 0;
                              });

//  possible user levels

const userlevels = [
                    { value: 0, text: 'Nincs belépési joga' },
                    { value: 1, text: 'Felhasználó' },
                    { value: 10, text: 'Adminisztrátor' }
                   ];

//  ------------------------[ SSL INIT ] ------------------------

const ssl = require('./ssl/ssl.js');
const myssl = ssl.create({
        ssl: {
            key: './ssl/server.key',
            certificate: './ssl/server.crt',
            active: true
        },
        port: 3000
    },
    app);
    
//  ------------------------[ SESSION ENGINE INIT ] ------------------------
    
app.use(session({
  cookieName: 'session',
  secret: 'hge432klnfle32432dslgmr02',  // random encryption key string
  duration: 30 * 60 * 1000,             // session expiry time in milliseconds (30 minutes)
  activeDuration: 5 * 60 * 1000,        // milliseconds to extend the session in case of interaction (5 minutes)
}));
//  ------------------------[ MONGODB INIT ] ------------------------

const mongodb = require('mongodb').MongoClient;
const mongodb_url = 'mongodb://localhost:27017/dbGunKisser';

var ObjectId = require('mongodb').ObjectId;

mongodb.connect(mongodb_url, function(err, db) {  
  try {
    assert(err, null);
    if (err != null) {
      general.log('MongoDB error: '+err.message);
      process.exit();
    }
  } catch(err) {
  } finally {
    general.log('MongoDB is responding properly.');
    db.collection('users').find({ userlevel: 10 }).count(function(err, docs) {
      if (Number(docs) == 0) {
      
        var password = (Math.random().toString(36)+'00000000000000000').slice(2, 12);

        db.collection('users').insert({

            name: 'Default Administrator',
            registered: new Date(),
            userlevel: 10,
            nationality: 'HU',
            country: 'HU',
            province: '',
            city: '',
            zip: '',
            street: '',
            houseno: '',
            address_misc: '',
            company_name: '',
            company_taxno: '',
            company_eutaxno: '',
            company_country: 'HU',
            company_province: '',
            company_city: '',
            company_zip: '',
            company_street: '',
            company_houseno: '',
            company_address_misc: '',
            email: '',
            skype: '',
            phone1: '',
            phone2: '',
            phone3: '',
            fax1: '',
            fax2: '',
            fax3: '',
            remarks: 'This is the default administrator account.',
            username: 'admin',
            password: md5(password)
            
        }, function(err, docs) {
            if (err == null)
              general.log('Default administrator created. Username: "admin" Password: "'+password+'"')
            else
              general.log('Error: No users. Failed to create default administrator');
            db.close();
        });
      } else {
        db.close();
      }
    });
  }
});
//  ------------------------[ DASHBOARD ] ------------------------

app.get('/dashboard',
    function(req, res) {
        general.checklogin(res, req);
        if (typeof req.session.user === 'undefined')
           res.redirect('/login')
        else
           res.render('dashboard', { 
                                     pagetitle: 'Dashboard',
                                     username: req.session.name,
                                     userid: req.session.user
                                   });
    });
//  ------------------------[ LOGIN AND LOGOUT ] ------------------------

app.get('/logout',
    function(req, res) {
        general.log('User '+req.session.name+' logged out');
        req.session.reset();
        res.redirect('/login')
    });

app.get('/login',
    function(req, res) {
        if (typeof req.session.user === 'undefined')
          res.render('login');
        else
          res.redirect('/dashboard')
    });

app.post('/login',
    function(req, res) {
        var ip = req.headers['x-forwarded-for'] || 
        req.connection.remoteAddress || 
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;

        general.getpostdata(req, function(postdata) {

            //  verify username and password

            mongodb.connect(mongodb_url, function(err, db) {
                
                db.collection('users').find({ username: postdata.username,
                                              password: postdata.password,
                                              userlevel: { $gt: 0 }
                                            }).toArray(function(err, docs) {
                                            
                                               db.close();
                                               if (docs.length > 0) {
                                                       
                                                 general.log('Successful login: '+docs[0].name+'. IP: '+ip);
                                                 
                                                 // save session
                                                 req.session.user = docs[0]._id;
                                                 req.session.name = docs[0].name;
                                                 req.session.userlevel = docs[0].userlevel;
                                                 req.session.email = docs[0].email;
                                                 general.sendJSON(res, { user: docs[0].name });
                                                 
                                               } else {
                                                 general.log('Invalid login attempt. IP: '+ip);
                                                 general.sendJSON(res, { error: 'Helytelen felhasználónév vagy jelszó.' });
                                               }
                                            });
            });
        });
    });
//  ------------------------[ USER LIST ] ------------------------

app.get('/users',
    function(req, res) {
        general.checklogin(res, req);
        res.render('users', {
                               pagetitle: 'Felhasználók',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ SEARCH USERS ] ------------------------

app.post('/users',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {}
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'A keresett felhasználó nem található az adatbázisban.' });
              return false;
            }
        } else {
          
          //  text search
          
          if (postdata.search != '') {
          
            if (postdata.search.length <= 3) {
              general.sendJSON(res, { 'error': 'A keresőszó túl rövid.' });
              return false;
            }

            switch(postdata.searchmode) {
            //  %like%
              case '0': var value = { $regex: new RegExp(postdata.search, 'gi') }; break;
            //  like%
              case '1': var value = { $regex: new RegExp('^'+postdata.search, 'gi'), }; break;
            //  like
              case '2': value = postdata.search; break;
            }

            if (postdata.searchfield == '*') {
                finder = { $or: [{ name : value }, { company_name : value }, { city : value }, { street : value },
                                 { email : value }, { skype : value }, { company_city : value }, { company_street : value },
                                 { username : value }, { remarks : value }] }
            } else {
                finder = {};
                finder[postdata.searchfield] = value;
            }
          }
        }
        
//  assemble sorter criteria

        if (typeof postdata.sortmode != 'undefined') var sortmode = Number(postdata.sortmode)
          else sortmode = 1;

        if (typeof postdata.sortby != 'undefined') var sortby = postdata.sortby
          else postdata.sortby = 0;
        
        switch(postdata.sortby) {
          case 0: var sorter = { name: sortmode, company_name: sortmode }; break;
          case 1: var sorter = { company_name: sortmode, name: sortmode }; break;
          case 2: var sorter = { registered: sortmode, name: 1 }; break;
          case 3: var sorter = { email: sortmode }; break;
          case 4: var sorter = { skype: sortmode }; break;
        }
        
        if (postdata.id)
          var selector = {}
        else
          var selector = { name: 1, company_name: 1, phone1: 1, phone2: 1, phone3: 1, email: 1, skype: 1 }
        
//  generate page number

        if (typeof postdata.page != 'undefined') var sortmode = Number(postdata.page)
         else var page = 2;
        
//  do search

        mongodb.connect(mongodb_url, function(err, db) {
          db.collection('users').find(finder, selector)
                                .limit(10)
                                .skip(page)
                                .sort(sorter)
                                .toArray(function(err, docs) {
            db.close();
            if (err == null && docs != null) {
                docs['page'] = page;
                general.sendJSON(res, docs);
                return false;
            } else {
              if(postdata.id)
                general.sendJSON(res, { 'error': 'A keresett felhasználó nem található az adatbázisban.' })
              else
                general.sendJSON(res, { 'error': 'Nincs a keresésnek megfelelő felhasználó.' });
              return false;
            }
          })
        });
      });
    });
//  ------------------------[ ADD/MODIFY USER ] ------------------------

app.get('/useredit',
    function(req, res) {
        general.checklogin(res, req);
        if (typeof req.session.user === 'undefined')
           res.redirect('/login')
        else
           var pagetitle = 'Új felhasználó';
           var buttonlabel = 'Felhasználó felvétele';
           var query = url.parse(req.url,true).query;

           userdata = { 
                        _id: '0',
                        country: 'HU',
                        nationality: 'HU',
                        company_country: 'HU',
                      };

//  if id is specified, get user
           
           if (typeof query.id != 'undefined') {
              pagetitle = 'Felhasználó módosítása';
              buttonlabel = 'Módosítás';
              
              try {
                var finder = new ObjectId(query.id);
              } catch(err) {
                notfound();
                return false;
              }
              
              mongodb.connect(mongodb_url, function(err, db) {
                  db.collection('users').findOne(finder, function(err, docs) {
                        db.close();
                        if (err == null && docs != null) {
                          userdata = docs;
                          return renderstuff()
                        } else
                          return notfound();
                    })
              });
           
           } else {
              renderstuff();
           }

           function notfound() {
              general.errorpage(res, req,
                                'Nincs ilyen felhasználó.', 
                                'Erre sokféle magyarázat létezhet, de a legvalószínűbb, hogy kizárt dolog, mert nem tudom.');
           }
           
           function renderstuff() {

              res.render('useredit', {
                                         userdata: userdata,
                                         countries: countries,
                                         userlevels: userlevels,
                                         pagetitle: pagetitle,
                                         buttonlabel: buttonlabel,
                                         username: req.session.name,
                                         userid: req.session.user
                                      });
           }


    });

//  ------------------------[ USER REGISTRATION / MODIFICATION ] ------------------------

app.post('/useredit',
    function(req, res) {
        
      if (general.checklogin_post(res, req))
        general.getpostdata(req, function(postdata) {

            var ip = req.headers['x-forwarded-for'] || 
            req.connection.remoteAddress || 
            req.socket.remoteAddress ||
            req.connection.socket.remoteAddress;
        
            //  verify posted data
            
            if (postdata.id == 0) finder = new ObjectId()
            else try {
              var finder = new ObjectId(String(postdata.id));
            } catch(err) {
              general.sendJSON(res, { error: 'Ez a felhasználó nem módosítható.' });
              return false;
            }
            
            if (postdata.id != '0') postdata._id = finder
            else delete postdata._id;
            
            postdata.userlevel = Number(postdata.userlevel);
            
            if (postdata.name.length < 3) { general.sendJSON(res, { error: 'Túl rövid a név.'}); return false; }
            if (isNaN(postdata.phone1) || postdata.phone1.length < 1 || postdata.phone1.length > 4) { general.sendJSON(res, { error: 'Érvénytelen telefonos országkód.'}); return false; }
            if (isNaN(postdata.phone2) || postdata.phone2.length < 2 || postdata.phone2.length > 4) { general.sendJSON(res, { error: 'Érvénytelen telefonos körzetszám.'}); return false; }
            if (isNaN(postdata.phone3) || postdata.phone3.length < 6 || postdata.phone3.length > 8) { general.sendJSON(res, { error: 'Érvénytelen telefonszám.'}); return false; }
            
            if (postdata.fax2 != '' || postdata.fax3 != '') {
              if (isNaN(postdata.fax1) || postdata.fax1.length < 1 || postdata.fax1.length > 4) { general.sendJSON(res, { error: 'Érvénytelen fax-országkód.'}); return false; }
              if (isNaN(postdata.fax2) || postdata.fax2.length < 2 || postdata.fax2.length > 4) { general.sendJSON(res, { error: 'Érvénytelen fax-körzetszám.'}); return false; }
              if (isNaN(postdata.fax3) || postdata.fax3.length < 6 || postdata.fax3.length > 8) { general.sendJSON(res, { error: 'Érvénytelen fax-szám.'}); return false; }
            }

            if (postdata.skype != '' && postdata.skype.length < 4) { general.sendJSON(res, { error: 'Túl rövid a Skype név.'}); return false; }
            if (!postdata.email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/gi)) { general.sendJSON(res, { error: 'Érvénytelen e-mail cím.'}); return false; }
            
            if (postdata.city.length < 2) { general.sendJSON(res, { error: 'Az ügyfél címénél túl rövid a település neve.'}); return false; }
            if (postdata.zip.length < 4 || postdata.zip.length > 8) { general.sendJSON(res, { error: 'Érvénytelen postai irányítószám az ügyfél címénél.'}); return false; }
            if (postdata.street.length < 3 || postdata.street.length > 180) { general.sendJSON(res, { error: 'Érvénytelen utcanév az ügyfél címénél.'}); return false; }
            if (postdata.houseno.length < 2 || postdata.houseno.length > 10) { general.sendJSON(res, { error: 'Érvénytelen házszám az ügyfél címénél.'}); return false; }
            
            if (postdata.company_name != '') {
              if (postdata.company_city.length < 2) { general.sendJSON(res, { error: 'A cég címénél túl rövid a település neve.'}); return false; }
              if (postdata.company_zip.length < 4 || postdata.company_zip.length > 8) { general.sendJSON(res, { error: 'Érvénytelen postai irányítószám a cég címénél.'}); return false; }
              if (postdata.company_street.length < 3 || postdata.company_street.length > 180) { general.sendJSON(res, { error: 'Érvénytelen utcanév a cég címénél.'}); return false; }
              if (postdata.company_houseno.length < 2 || postdata.company_houseno.length > 10) { general.sendJSON(res, { error: 'Érvénytelen házszám a cég címénél.'}); return false; }
            }

            if (postdata.userlevel != 0) {
              if (postdata.username.length < 6) { general.sendJSON(res, { error: 'Túl rövid a felhasználónév. Legalább 6 karakter legyen.'}); return false; }
              if (postdata.password1 != postdata.password2) { general.sendJSON(res, { error: 'A két megadott jelszó nem egyezik.'}); return false; }
            }

//  verify if user already exists, reject if it does

              function check_exists(callback) {
              
                  if (postdata.id == 0 && postdata.userlevel > 0) {
                    mongodb.connect(mongodb_url, function(err, db) {
                        db.collection('users').find({ username: postdata.username }).toArray(function(err, docs) {
                                                       db.close();
                                                       if (docs.length > 0) {
                                                          general.log('Faszt.');
                                                          general.sendJSON(res, { error: 'Ez a felhasználónév már foglalt.'});
                                                          return false;
                                                       } else {
                                                          return callback();
                                                       }
                                                    });
                    });
                  } else {
                    return callback();
                  }
              } 

//  modify db

              function adduser() {

                    postdata.password = postdata.password1;
                    delete postdata.password1;
                    delete postdata.password2;
                    var id = postdata.id;
                    delete postdata.id;
                    
                    mongodb.connect(mongodb_url, function(err, db) {
                      db.collection('users').update({ _id: finder }, 
                                                    postdata, 
                                                    { upsert: true },
                                                    function(err) {
                            if (err == null) {
                              
                              if (req.session.user == finder) {
                                req.session.name = postdata.name;
                                req.session.userlevel = postdata.userlevel;
                                req.session.email = postdata.email;
                              }
                              if (postdata.id == 0) {
                                general.log('New user added: "'+postdata.name+'" by: '+req.session.name+' IP: '+ip);
                                general.sendJSON(res, { success: 'A felhasználó hozzáadása sikeres.' });
                              } else {
                                general.log('User modified: "'+postdata.name+'" by: '+req.session.name+' IP: '+ip);
                                general.sendJSON(res, { success: 'A felhasználó módosítása sikeres.' });
                              }
                            } else {
                              general.log('MongoDB error in /edituser: '+err.message);
                              general.sendJSON(res, { error: 'MongoDB hiba: '+err.message });
                            }
                            db.close();
                            return false;
                          });
                    });
              }
              
              check_exists(adduser);
        });
    });    