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
    
//  ------------------------[ MONGODB INIT ] ------------------------

global.mongodb = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;

  general.MongoDB_connect(settings.mongoDB, function(db) {

    countries_check();

//  find if countries collection exists

  function countries_check() {
    db.collection('countries').find({}).toArray(function(err, docs) {
      if (err || typeof docs.length == 'undefined' || docs.length == 0) {
        fs.readFile(__dirname+'/public/json/countries.json', 'utf8', function(err, data) {
          if (err) {
            general.log('Error: /public/json/countries.json is unreadable.');
            process.exit();
          }
          
          try {
            var countries = JSON.parse(data);
          } catch(err) {
            general.log('Error: /public/json/countries.json is incorrect.');
            process.exit();
          } finally {

            countries.sort(function(a, b) {
                                              var namea = latinize(a.namehun).toLowerCase();
                                              var nameb = latinize(b.namehun).toLowerCase();
                                              if (namea < nameb) return -1;
                                              if (namea > nameb) return 1;
                                              return 0;
                                          });
            
            db.collection('countries').insertMany(countries, function(err, docs) {
              if (err) {
                general.log('Error: contents of /public/json/countries.json couldn\'t be added to database.');
                process.exit();
              }
              general.log('No countries in database - countries.json was added');
              default_user_check();
            });
          }
        });
      } else
        countries = docs;
        default_user_check();
    });
  }

//  find if default user exists

  function default_user_check() {
  
    db.collection('users').find({ userlevel: 10 }).count(function(err, docs) {
      if (Number(docs) == 0) {
      
        var password = (Math.random().toString(36)+'00000000000000000').slice(2, 12);

        db.collection('users').insert({

            name: 'Szalacsi Sándor',
            registered: new Date(),
            permitno: 'N/A',
            userlevel: 10,
            country: 'HU',
            province: '',
            city: 'Kocsord',
            zip: '4751',
            street: 'Jókai',
            houseno: '23',
            address_misc: '',
            email: 'admin@admin.com',
            skype: 'admin',
            phone1: '0',
            phone2: '00',
            phone3: '0000000',
            fax1: '1',
            fax2: '11',
            fax3: '1111111',
            remarks: 'A nővérje velem egykora.',
            username: 'admin',
            password: md5(password),
            legalEntity: false
            
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

//  ------------------------[ SESSION ENGINE INIT ] ------------------------
    
app.use(session({
  cookieName: 'session',
  secret: 'hge432klnfle32432dslgmr02',  // random encryption key string
  duration: 30 * 60 * 1000,             // session expiry time in milliseconds (30 minutes)
  activeDuration: 5 * 60 * 1000,        // milliseconds to extend the session in case of interaction (5 minutes)
}));

//  ------------------------[ DASHBOARD ] ------------------------

app.get('/dashboard',
    function(req, res) {
        general.checklogin(res, req);
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
        
        var ip = general.getIP(req);

        general.getpostdata(req, function(postdata) {
        
            //  verify username and password

            general.MongoDB_connect(settings.mongoDB, function(db) {
            
                db.collection('users').find({ username: postdata.username,
                                              password: postdata.password,
                                              userlevel: { $gt: 0 }
                                            }).toArray(function(err, docs) {
                                            
                                               db.close();
                                               if (err == null && docs.length > 0) {
                                                 
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
                                 { email : value }, { skype : value }, { company_city : value }, { company_street : value }, { username : value },
                                 { remarks : value }] }
            } else {
                finder = {};
                finder[postdata.searchfield] = value;
                
            }
          }
        }
        
//  assemble sorter criteria

        if (typeof postdata.sortmode != 'undefined') var sortmode = Number(postdata.sortmode)
          else sortmode = 1;

        if (typeof postdata.sortby != 'undefined') var sortby = Number(postdata.sortby)
          else sortby = 0;
        
        switch(sortby) {
          case 0: var sorter = { name: sortmode }; break;
          case 1: var sorter = { name: sortmode, legalEntity: sortmode }; break;
          case 2: var sorter = { registered: sortmode, firstname: 1, lastname: 1 }; break;
          case 3: var sorter = { email: sortmode }; break;
          case 4: var sorter = { skype: sortmode }; break;
        }
                
        if (postdata.id)
          var selector = {}
        else
          var selector = { _id: 1, name: 1, title: 1, firstname: 1, lastname: 1, company_name: 1, phone1: 1, phone2: 1, phone3: 1, email: 1, skype: 1 }
                  
//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
         else var startrecord = 0;
         
        general.MongoDB_connect(settings.mongoDB, function(db) {

//  count total number of documents matching the query

          db.collection('users').aggregate([ { $project: { _id: 1,
                                                           name: 1
                                                         } 
                                             },
                                             { $match: finder },
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('users').aggregate([
                                                  { $project: selector },
                                                  { $match: finder },
                                                  { $sort: sorter },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord }
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                if (err == null) {
                    
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {

                  if(postdata.id)
                    general.sendJSON(res, { 'error': 'A keresett felhasználó nem található az adatbázisban.' })
                  else
                    general.sendJSON(res, { 'error': 'Nincs a keresésnek megfelelő felhasználó.' });
                  return false;
                }
              });
          
          });
        });
      });
    });
//  ------------------------[ ADD/MODIFY USER ] ------------------------

app.get('/users_edit/:id?',
    function(req, res) {

        general.checklogin(res, req);
        
        var pagetitle = 'Új felhasználó';
        var buttonlabel = 'Felhasználó felvétele';
        var query = url.parse(req.url,true).query;

        userdata = { 
                     _id: '0',
                     country: settings.default_country,
                     company_country: settings.default_country,
                   };

//  if id is specified, get user
           
        if (typeof req.params.id != 'undefined') {
            pagetitle = 'Felhasználó módosítása';
            buttonlabel = 'Módosítás';
              
        try {
            var finder = new ObjectId(req.params.id);
        } catch(err) {
            notfound();
            return false;
        }
              
        general.MongoDB_connect(settings.mongoDB, function(db) {
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

          res.render('users_edit', {
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

app.post('/users_edit',
    function(req, res) {
        
      if (general.checklogin_post(res, req))
        general.getpostdata(req, function(postdata) {

            var ip = general.getIP(req);
        
            //  verify posted data
            
            if (postdata.id == 0) finder = new ObjectId()
            else try {
              var finder = new ObjectId(String(postdata.id));
            } catch(err) {
              general.sendJSON(res, { error: 'Ez a felhasználó nem módosítható.' });
              return false;
            }
            
            if (postdata.id != '0') postdata._id = finder
            else {
                delete postdata._id;
                postdata.registered = Date.now();
            }
            
            if (postdata.name.length < 5) { general.sendJSON(res, { error: 'Túl rövid a név.'}); return false; }
            if (isNaN(postdata.phone1) || postdata.phone1.length < 1 || postdata.phone1.length > 4) { general.sendJSON(res, { error: 'Érvénytelen telefonos országkód.'}); return false; }
            if (isNaN(postdata.phone2) || postdata.phone2.length < 1 || postdata.phone2.length > 4) { general.sendJSON(res, { error: 'Érvénytelen telefonos körzetszám.'}); return false; }
            if (isNaN(postdata.phone3) || postdata.phone3.length < 6 || postdata.phone3.length > 8) { general.sendJSON(res, { error: 'Érvénytelen telefonszám.'}); return false; }
            
            if (postdata.fax2 != '' || postdata.fax3 != '') {
              if (isNaN(postdata.fax1) || postdata.fax1.length < 1 || postdata.fax1.length > 4) { general.sendJSON(res, { error: 'Érvénytelen fax-országkód.'}); return false; }
              if (isNaN(postdata.fax2) || postdata.fax2.length < 1 || postdata.fax2.length > 4) { general.sendJSON(res, { error: 'Érvénytelen fax-körzetszám.'}); return false; }
              if (isNaN(postdata.fax3) || postdata.fax3.length < 6 || postdata.fax3.length > 8) { general.sendJSON(res, { error: 'Érvénytelen fax-szám.'}); return false; }
            }

            if (postdata.skype != '' && postdata.skype.length < 4) { general.sendJSON(res, { error: 'Túl rövid a Skype név.'}); return false; }
            if (!postdata.email.match(/^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/gi)) { general.sendJSON(res, { error: 'Érvénytelen e-mail cím.'}); return false; }
            
            if (postdata.city.length < 2) { general.sendJSON(res, { error: 'Az ügyfél címénél túl rövid a település neve.'}); return false; }
            if (postdata.zip.length < 4 || postdata.zip.length > 8) { general.sendJSON(res, { error: 'Érvénytelen postai irányítószám az ügyfél címénél.'}); return false; }
            if (postdata.street.length < 3 || postdata.street.length > 180) { general.sendJSON(res, { error: 'Érvénytelen utcanév az ügyfél címénél.'}); return false; }
            if (postdata.houseno.length < 1 || postdata.houseno.length > 10) { general.sendJSON(res, { error: 'Érvénytelen házszám az ügyfél címénél.'}); return false; }
            
            postdata.legalEntity = postdata.legalEntity == 'true';
            
            if (postdata.userlevel != 0) {
              if (postdata.username.length < 5) { general.sendJSON(res, { error: 'Túl rövid a felhasználónév. Legalább 5 karakter legyen.'}); return false; }
              if (postdata.password_changed && postdata.password1 != postdata.password2) { general.sendJSON(res, { error: 'A két megadott jelszó nem egyezik.'}); return false; }
                if (postdata.password_changed && postdata.password1.length <= 6) { general.sendJSON(res, { error: 'A jelszónak legalább 6 karakter hosszúnak kell lennie.'}); return false; }
            }
            
            postdata.userlevel = Number(postdata.userlevel);
            postdata.password = postdata.password1;
            delete postdata.id;
            delete postdata._id;
            delete postdata.password1;
            delete postdata.password2;
            
            //  mongodb update stuff
            var set = { $set: {} };
            for (t in postdata)
              if (t!= 'password_changed' && (t != 'password' || postdata.password_changed)) {
                set['$set'][t] = postdata[t];
              }

//  verify if user already exists, reject if it does

              function check_exists(callback) {
              
                  if (postdata.id == 0 && postdata.userlevel > 0) {
                    general.MongoDB_connect(settings.mongoDB, function(db) {
                        db.collection('users').find({ email: postdata.email }).toArray(function(err, docs) {
                                                       db.close();
                                                       if (docs.length > 0) {
                                                          general.sendJSON(res, { error: 'Ez az e-mail cím már foglalt.'});
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

                    var ip = general.getIP(req);
                    
                    general.MongoDB_connect(settings.mongoDB, function(db) {
                      db.collection('users').update({ _id: finder },
                                                    set,
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
    });    //  ------------------------[ USER DELETE FORM ] ------------------------

app.get('/users_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);

        
        if (typeof req.params.id != 'undefined') {
          try {
              var finder = new ObjectId(req.params.id);
          } catch(err) {
              notfound();
              return false;
          }
                
          general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('users').findOne(finder, 
                                           { _id: 1, title: 1, firstname: 1, lastname: 1, company_name: 1, registered: 1 },
                                           function(err, docs) {
              db.close();
              if (err == null && docs != null) {
                return renderstuff(docs)
              } else
                return notfound();
              })
          });
           
        } else {
          notfound();
        }

        function notfound() {
           general.errorpage(res, req,
                                      'Nincs ilyen felhasználó.', 
                                      'Erre sokféle magyarázat létezhet, de a legvalószínűbb, hogy kizárt dolog, mert nem tudom.');
           }

        
        function renderstuff(data) {

          if (typeof data.company_name != 'undefined' && data.company_name != '') 
            var company_name = data.company_name
          else
            company_name = '';
            
          res.render('users_delete', {
                                 id: data._id,
                                 name: general.formname(data),
                                 company_name: company_name,
                                 registered: dateformat(data.registered, settings.date_format),
                                 username: req.session.name,
                                 userid: req.session.user
                               });
        }
    });


//  ------------------------[ DELETE USERS ] ------------------------

app.post('/users_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen felhasználó-azonosító.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('users').findOneAndDelete(finder,
                                                  function(err, docs) {
            db.close();
              if (err == null) {
                general.log('User "'+general.formname(docs.value)+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Felhasználó törölve.' });
              } else {
                general.log(err);
                general.sendJSON(res, { error: 'Ez a felhasználó nem törölhető.' });
              }
            })
        });
        
      });
    });

//  ------------------------[ DELETE MULTIPLE USERS ] ------------------------

app.post('/users_deletelist', function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);
        
        try {
          var list = JSON.parse(postdata.deletelist);
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen lista.' });
          return false;
        }
        
        if (list.length <= 0) {
          general.sendJSON(res, { error: 'Nem adtál meg egy azonosítót sem.' });
          return false;
        }
        
        var deleted = 0;
        general.MongoDB_connect(settings.mongoDB, function(db) {
        
          for(t in list) {
        
            try {
              var finder = { _id: new ObjectId(list[t]) };
            } catch(err) {
              db.close();
              general.sendJSON(res, { error: 'Érvénytelen felhasználó-azonosító: '+list[t] });
              return false;
            }

              db.collection('users').findOneAndDelete(finder, function(err, docs) {
                db.close();
                  if (!err) {
                    general.log('User "'+general.formname(docs.value)+'" deleted by: '+req.session.name+' IP: '+ip);
                    deleted++;
                  }
                  
                  if (deleted >= list.length) {
                    db.close();
                    general.log(deleted+' users deleted by: '+req.session.name+' IP: '+ip);
                    general.sendJSON(res, { success: deleted+' felhasználó törölve.' });
                  }
                  
                })
          }
        
        });
      });
    });
//  ------------------------[ GET SINGLE USER INFORMATION ] ------------------------

app.get('/users_info/:id?',
    function(req, res) {
        general.checklogin(res, req);
        
        try {
          var finder = { '_id': new ObjectId(req.params.id) };
        } catch(err) {
          notfound();
          return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {

              db.collection('users').aggregate([
                                                  { $match: finder },
                                                  
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'country',
                                                                foreignField: 'id',
                                                                as: 'country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $group: { '_id': '$_id',
                                                              'name': { $first: '$name' },
                                                              'legalEntity': { $first: '$legalEntity' },
                                                              'country': { $first: '$country' },
                                                              'province': { $first: '$province' },
                                                              'city': { $first: '$city' },
                                                              'zip': { $first: '$zip' },
                                                              'street': { $first: '$street' },
                                                              'houseno': { $first: '$houseno' },
                                                              'address_misc': { $first: '$address_misc' },
                                                              'phone1': { $first: '$phone1' },
                                                              'phone2': { $first: '$phone2' },
                                                              'phone3': { $first: '$phone3' },
                                                              'fax1': { $first: '$fax1' },
                                                              'fax2': { $first: '$fax2' },
                                                              'fax3': { $first: '$fax3' },
                                                              'email': { $first: '$email' },
                                                              'skype': { $first: '$skype' },
                                                              'remarks': { $first: '$remarks' },
                                                              'permitno': { $first: '$permitno' },
                                                              'taxno': { $first: '$taxno' },
                                                              'eutaxno': { $first: '$eutaxno' },
                                                              'registered': { $first: '$registered' }
                                                            } 
                                                  },
                                                  
                                                  { $project: {
                                                                '_id': 1,
                                                                'name': 1,
                                                                'legalEntity': 1,
                                                                'registered': 1,
                                                                'country': 1,
                                                                'province': 1,
                                                                'city': 1,
                                                                'zip': 1,
                                                                'street': 1,
                                                                'houseno': 1,
                                                                'address_misc': 1,
                                                                'email': 1,
                                                                'skype': 1,
                                                                'phoneFormatted': { $concat: [ '+', '$phone1', ' (', '$phone2', ') ', '$phone3' ] },
                                                                'phone': { $concat: [ '+', '$phone1', '$phone2', '$phone3' ] },
                                                                'fax': { $concat: [ '+', '$fax1', '$fax2', '$fax3' ] },
                                                                'faxFormatted': { $concat: [ '+', '$fax1', ' (', '$fax2', ') ', '$fax3' ] },
                                                                'remarks': 1,
                                                                'permitno': 1,
                                                                'taxno': 1,
                                                                'eutaxno': 1,
                                                                'registered': 1
                                                              }
                                                  }
                                                ], 
                                                { collation: collation },
                                                
            function(err, docs) {
                db.close();
                if (!err && docs.length > 0) {
                    docs[0].date_formatted = dateformat(docs[0].registered, settings.date_format);
                    renderstuff(docs[0]);
                } else {
                    notfound();
                    return false;
                }
            });
        });
        
        
       function notfound() {
          general.errorpage(res, req,
                                      'Ez a felhasználó nem létezik.', 
                                      'Furcsa fordulat ez alapvetően stabilnak hitt univerzumunk történelmében.');
           }
           
       function renderstuff(data) {
  
          res.render('users_info', {
                                 pagetitle: 'Ügyfél adatlapja',
                                 username: req.session.name,
                                 userid: req.session.user,
                                 data: data
                               });
       }
    });


//  ------------------------[ GET USERS ] ------------------------

/*
app.post('/users_info',
    function(req, res) {
      return false;
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {};
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
                finder = { $or: [{'title' : value}, {'stages.description': value}]}
            } else {
                finder = {};
                finder[postdata.searchfield] = value;
                
            }
          }
        }
        
//  assemble sorter criteria

        if (typeof postdata.sortmode != 'undefined') var sortmode = Number(postdata.sortmode)
          else sortmode = 1;

        if (typeof postdata.sortby != 'undefined') var sortby = Number(postdata.sortby)
          else sortby = 0;
        
        switch(sortby) {
          case 0: var sorter = { date: sortmode }; break;
          case 1: var sorter = { severity: sortmode, date: -1 }; break;
          case 2: var sorter = { title: sortmode }; break;
          case 3: var sorter = { user: sortmode, date: -1 }; break;
        }
                
//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('bugs').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('bugs').aggregate([
                                                  { $match: finder },
                                                  { $sort: sorter },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  { $lookup: {  from: 'users',
                                                                localField: 'user',
                                                                foreignField: '_id',
                                                                as: 'userdata'
                                                              }
                                                  },
                                                  
                                                  { $unwind: '$userdata' },
                                                  { $unwind: '$stages' },

                                                  { $lookup: {  from: 'users',
                                                                localField: 'stages.user',
                                                                foreignField: '_id',
                                                                as: 'stages_users'
                                                              }
                                                  },
                                                  
                                                  { $unwind: '$stages_users' },
                                                  
                                                  { $group: { _id: '$_id',
                                                              title: { $first: '$title' },
                                                              date: { $first: '$date' },
                                                              severity: { $first: '$severity' },

                                                              userdata: { $push: '$userdata' },
                                                              stages: { $push: { stage: '$stages', user: '$stages_users' } }
                                                            }
                                                  },

                                                  { $unwind: '$userdata' },
                                                  
                                                  { $project: {
                                                                'title': 1,
                                                                'date': 1,
                                                                'severity': 1,
                                                                'browser': 1,
                                                                
                                                                'userdata._id': 1,
                                                                'userdata.title': 1,
                                                                'userdata.firstname': 1,
                                                                'userdata.lastname': 1,

                                                                'stages.user._id': 1,
                                                                'stages.user.title': 1,
                                                                'stages.user.firstname': 1,
                                                                'stages.user.lastname': 1,
                                                                'stages.stage.date': 1,
                                                                'stages.stage.description': 1,
                                                                'stages.stage.severity': 1,
                                                                'stages.stage.previous_severity': 1,
                                                                'stages.stage.files': 1
                                                              }
                                                  }
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();

                if (!err) {

                    for (t in docs) {
                      docs[t].userdata.name = general.formname(docs[t].userdata);
                      docs[t].date_formatted = dateformat(docs[t].date, settings.date_format);

                      for(tt in docs[t].stages) {
                        docs[t].stages[tt].stage.date_formatted = dateformat(docs[t].stages[tt].stage.date_formatted, settings.date_format);
                        docs[t].stages[tt].user.name = general.formname(docs[t].stages[tt].user);
                      }
                    }
                    
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                    general.sendJSON(res, { 'error': String(err) });
                    general.log(JSON.stringify(err, null, 3));
                    return false;
                }
              });
            });
          });
        });
      });
*/
//  ------------------------[ WEAPON TEMPLATES LIST ] ------------------------

app.get('/weapon_categories',
    function(req, res) {
        general.checklogin(res, req);
        res.render('weapon_categories', {
                               pagetitle: 'Fegyverkategóriák',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ GET WEAPON CATEGORIES ] ------------------------

app.post('/weapon_categories',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var finder = {}
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'Nincs ilyen kategória.' });
              return false;
            }
        }

//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('weapon_categories').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('weapon_categories').aggregate([
                                                  { $match: finder },
                                                  { $sort: { name: 1 } },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                if (err == null) {
                    
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                    general.sendJSON(res, { 'error': err+' Nincs ilyen kategória.' });
                    return false;
                }
              });
            });
          });
        });
      });
//  ------------------------[ WEAPON TYPES LIST ] ------------------------

app.get('/weapon_types',
    function(req, res) {
        general.checklogin(res, req);
        res.render('weapon_types', {
                               pagetitle: 'Jellegek',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ GET WEAPON TYPES ] ------------------------

app.post('/weapon_types',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var finder = {}
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'Nincs ilyen kategória.' });
              return false;
            }
        }

//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('weapon_types').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('weapon_types').aggregate([
                                                  { $match: finder },
                                                  { $sort: { name: 1 } },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                if (err == null) {
                    
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                    general.sendJSON(res, { 'error': err+' Nincs ilyen kategória.' });
                    return false;
                }
              });
            });
          });
        });
      });
//  ------------------------[ ADD/MODIFY WEAPON CATEGORY ] ------------------------
app.get('/weapon_types_edit/:id?',
   function(req, res) {

      general.checklogin(res, req);

      var pagetitle = 'Új jelleg';
      var buttonlabel = 'Jelleg felvétele';
      var query = url.parse(req.url, true)
         .query;

      var data = {
         _id: '0'
      };

      //  if id is specified, get user

      if (typeof req.params.id != 'undefined') {
         pagetitle = 'Jelleg módosítása';
         buttonlabel = 'Módosítás';

         try {
            var finder = new ObjectId(req.params.id);
         } catch (err) {
            notfound();
            return false;
         }

         general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('weapon_types')
               .findOne(finder, function(err, docs) {
                  db.close();
                  if (err == null && docs != null) {
                     data = docs;
                     return renderstuff();
                  } else
                     return notfound();
               })
         });

      } else {
         renderstuff();
      }

      function renderstuff() {

         res.render('weapon_types_edit', {
            data: data,
            pagetitle: pagetitle,
            buttonlabel: buttonlabel,
            username: req.session.name,
            userid: req.session.user
         });

      }

      function notfound() {
         general.errorpage(res, req,
            'Nincs ilyen jelleg.',
            'A zsidók tehetnek róla.');
      }

   });

//  ------------------------[ WEAPON CATEGORY REGISTRATION / MODIFICATION ] ------------------------

app.post('/weapon_types_edit',
   function(req, res) {

      if (general.checklogin_post(res, req))
         general.getpostdata(req, function(postdata) {

            var ip = general.getIP(req);

            //  verify posted data

            if (postdata.id == 0) finder = new ObjectId()
            else try {
               var finder = new ObjectId(String(postdata.id));
            }
            catch (err) {
               general.sendJSON(res, {
                  error: 'Ez a jelleg nem módosítható.'
               });
               return false;
            }

            if (postdata.id != '0') postdata._id = finder
            else delete postdata._id;

            if (postdata.name.length < 4) {
               general.sendJSON(res, {
                  error: 'Túl rövid a jelleg neve.'
               });
               return false;
            }

            //  modify db

            general.MongoDB_connect(settings.mongoDB, function(db) {
               db.collection('weapon_types')
                  .update({
                        _id: finder
                     },
                     postdata, {
                        upsert: true
                     },
                     function(err) {
                        if (err == null) {

                           if (postdata.id == 0) {
                              general.sendJSON(res, {
                                 success: 'A jelleg hozzáadása sikeres.'
                              });
                           } else {
                              general.sendJSON(res, {
                                 success: 'A jelleg módosítása sikeres.'
                              });
                           }
                        } else {
                           general.log('MongoDB error in /inc.weapon_types_edit.js: ' + err.message);
                           general.sendJSON(res, {
                              error: 'MongoDB hiba: ' + err.message
                           });
                        }
                        db.close();
                        return false;
                     });
            });

         });
   });//  ------------------------[ USER DELETE FORM ] ------------------------

app.get('/weapon_types_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);

        
        if (typeof req.params.id != 'undefined') {
          try {
              var finder = new ObjectId(req.params.id);
          } catch(err) {
              notfound();
              return false;
          }
                
          general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('weapon_types').findOne(finder,
                                           function(err, docs) {
              db.close();
              if (err == null && docs != null) {

                  res.render('weapon_types_delete', {
                                         id: docs._id,
                                         name: docs.name,
                                         username: req.session.name,
                                         userid: req.session.user
                                       });

              } else
                return notfound();
              })
          });
           
        } else {
          notfound();
        }

        function notfound() {
           general.errorpage(res, req,
                                      'Ez a jelleg nem létezik.', 
                                      'A róka tudja, miért, kérdezd őt.');
           }

    });


//  ------------------------[ DELETE USERS ] ------------------------

app.post('/weapon_types_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen jelleg.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapon_types').findOneAndDelete(finder,
                                                              { projection: { name: 1 } },
                                                  function(err, docs) {
            db.close();
              if (err == null) {
                general.log('Type "'+docs.value.name+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Jelleg törölve.' });
              } else {
                general.sendJSON(res, { error: 'Ez a jelleg nem törölhető.' });
              }
            })
        });
        
      });
    });

//  ------------------------[ ADD/MODIFY WEAPON CATEGORY ] ------------------------
app.get('/weapon_categories_edit/:id?',
   function(req, res) {

      general.checklogin(res, req);

      var pagetitle = 'Új fegyverkategória';
      var buttonlabel = 'Kategória felvétele';
      var query = url.parse(req.url, true)
         .query;

      var data = {
         _id: '0'
      };

      //  if id is specified, get user

      if (typeof req.params.id != 'undefined') {
         pagetitle = 'Kategória módosítása';
         buttonlabel = 'Módosítás';

         try {
            var finder = new ObjectId(req.params.id);
         } catch (err) {
            notfound();
            return false;
         }

         general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('weapon_categories')
               .findOne(finder, function(err, docs) {
                  db.close();
                  if (err == null && docs != null) {
                     data = docs;
                     return renderstuff();
                  } else
                     return notfound();
               })
         });

      } else {
         renderstuff();
      }

      function renderstuff() {

         res.render('weapon_categories_edit', {
            data: data,
            pagetitle: pagetitle,
            buttonlabel: buttonlabel,
            username: req.session.name,
            userid: req.session.user
         });

      }

      function notfound() {
         general.errorpage(res, req,
            'Nincs ilyen kategória.',
            'Erre sokféle magyarázat létezhet, de a legvalószínűbb, hogy kizárt dolog, mert nem tudom.');
      }

   });

//  ------------------------[ WEAPON CATEGORY REGISTRATION / MODIFICATION ] ------------------------

app.post('/weapon_categories_edit',
   function(req, res) {

      if (general.checklogin_post(res, req))
         general.getpostdata(req, function(postdata) {

            var ip = general.getIP(req);

            //  verify posted data

            if (postdata.id == 0) finder = new ObjectId()
            else try {
               var finder = new ObjectId(String(postdata.id));
            }
            catch (err) {
               general.sendJSON(res, {
                  error: 'Ez a kategória nem módosítható.'
               });
               return false;
            }

            if (postdata.id != '0') postdata._id = finder
            else delete postdata._id;

            if (postdata.name == '') {
               general.sendJSON(res, {
                  error: 'Túl rövid a kategória neve.'
               });
               return false;
            }

            //  modify db

            general.MongoDB_connect(settings.mongoDB, function(db) {
               db.collection('weapon_categories')
                  .update({
                        _id: finder
                     },
                     postdata, {
                        upsert: true
                     },
                     function(err) {
                        if (err == null) {

                           if (postdata.id == 0) {
                              general.sendJSON(res, {
                                 success: 'A kategória hozzáadása sikeres.'
                              });
                           } else {
                              general.sendJSON(res, {
                                 success: 'A kategória módosítása sikeres.'
                              });
                           }
                        } else {
                           general.log('MongoDB error in /inc.weapon_categories_edit.js: ' + err.message);
                           general.sendJSON(res, {
                              error: 'MongoDB hiba: ' + err.message
                           });
                        }
                        db.close();
                        return false;
                     });
            });

         });
   });//  ------------------------[ USER DELETE FORM ] ------------------------

app.get('/weapon_categories_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);

        
        if (typeof req.params.id != 'undefined') {
          try {
              var finder = new ObjectId(req.params.id);
          } catch(err) {
              notfound();
              return false;
          }
                
          general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('weapon_categories').findOne(finder,
                                           function(err, docs) {
              db.close();
              if (err == null && docs != null) {

                  res.render('weapon_categories_delete', {
                                         id: docs._id,
                                         name: docs.name,
                                         username: req.session.name,
                                         userid: req.session.user
                                       });

              } else
                return notfound();
              })
          });
           
        } else {
          notfound();
        }

        function notfound() {
           general.errorpage(res, req,
                                      'Ez a kategória nem létezik.', 
                                      'Értetlenül állunk a probléma előtt. Helyette esetleg egy sört?');
           }

    });


//  ------------------------[ DELETE USERS ] ------------------------

app.post('/weapon_categories_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen kategória.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapon_categories').findOneAndDelete(finder,
                                                              { projection: { name: 1 } },
                                                  function(err, docs) {
            db.close();
              if (err == null) {
                general.log('Category "'+docs.value.name+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Kategória törölve.' });
              } else {
                general.sendJSON(res, { error: 'Ez a kategória nem törölhető.' });
              }
            })
        });
        
      });
    });

//  ------------------------[ WEAPON TEMPLATES LIST ] ------------------------

app.get('/weapon_templates',
    function(req, res) {
        general.checklogin(res, req);
        res.render('weapon_templates', {
                               pagetitle: 'Fegyversablonok',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ GET WEAPON TEMPLATES ] ------------------------

app.post('/weapon_templates',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        finder = {};
      
        if (postdata.id) {
            try {
              var finder = { '_id': new ObjectId(postdata.id) };
            } catch(err) {
              general.sendJSON(res, { 'error': 'Nincs ilyen sablon.' });
              return false;
            }
        }

//  text search

        else if (postdata.search != '') {
          
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
            
          finder = { $or: [{ name : value }, { description : value }, { 'parts.name' : value } ] }
          
        }

//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('weapon_templates').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('weapon_templates').aggregate([
                                                  { $match: finder },
                                                  { $sort: { name: 1 } },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                
                if (err) {
                    general.sendJSON(res, { 'error': 'Nincs ilyen sablon.' });
                    return false;
                } else {
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } 
              });
            });
          });
        });
      });

//  ------------------------[ CLONE WEAPON TEMPLATE ] ------------------------

app.post('/weapon_templates_clone',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        try {
            var finder = new ObjectId(postdata.id);
        } catch(err) {
            general.sendJSON(res, { 'error': 'Nincs ilyen sablon.' });
            return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {
        
//  get record

              db.collection('weapon_templates').findOne(finder,
                                                         function(err, docs) {
                                                         if (err == null) {
                                                            docs.name = docs.name + ' COPY';
                                                            delete docs._id;
                                                            
                                                         db.collection('weapon_templates').insert(docs,
                                                                                                  function(err, docs) {
                                                                                                    if (err == null) {
                                                                                                      general.sendJSON(res, { 'success': 'A klónozás sikeres.' });
                                                                                                      return false;
                                                                                                    } else {
                                                                                                      general.sendJSON(res, { 'error': 'A klónozás sikertelen.' });
                                                                                                      return false;
                                                                                                    }
                                                                                                  });

                                                         } else {
                                                            general.sendJSON(res, { 'error': 'Nincs ilyen sablon.' });
                                                            return false;
                                                         }
              });
          });
      })
});
//  ------------------------[ ADD/MODIFY WEAPON CATEGORY ] ------------------------
app.get('/weapon_templates_edit/:id?',
   function(req, res) {

      general.checklogin(res, req);

      var pagetitle = 'Új fegyversablon';
      var buttonlabel = 'Fegyversablon felvétele';

      general.MongoDB_connect(settings.mongoDB, function(db) {
      
        loadcategories();
        
        function loadcategories() {
          db.collection('weapon_categories').aggregate([{ $sort: { 'name': 1 } }], 
                                                        { collation: collation },
                                              
                                              function (err, docs) {
                                              if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                weapon_categories = docs;
                                                loadtypes();
                                                return false;
                                              } else
                                                db.close();
                                                notfound();
                                              return false;
          });
        }
        
        function loadtypes() {
          db.collection('weapon_types').aggregate([{ $sort: { 'name': 1 } }], 
                                              { collation: collation },
                                              function (err, docs) {
                                              if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                weapon_types = docs;
                                                loadcalibers();
                                                return false;
                                              } else
                                                notfound();
                                              return false;
          });
        }

        function loadcalibers() {
          db.collection('calibers').aggregate([{ $sort: { 'name': 1 } }], 
                                              { collation: collation },
                                              function (err, docs) {
                                              if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                calibers = docs;
                                                loadtemplate();
                                                return false;
                                              } else
                                                notfound();
                                              return false;
          });
        }
        
        function loadtemplate() {

                  if (typeof req.params.id != 'undefined') {
                     pagetitle = 'Fegyversablon módosítása';
                     buttonlabel = 'Módosítás';

                     try {
                        var finder = new ObjectId(req.params.id);
                     } catch (err) {
                        notfound();
                        return false;
                     }

                     db.collection('weapon_templates').findOne(finder, function(err, docs) {
                           db.close();
                           if (!err) {
                              data = docs;
                              renderstuff();
                           } else
                              notfound();
                        });

                  } else {
                     data = {
                              _id: 0,
                              category: weapon_categories[0]._id,
                              caliber: calibers[0]._id,
                              type: weapon_types[0]._id,
                              parts: [],
                              trigger_tests: []
                            }
                     renderstuff();
                  }
        }
        
        

        function renderstuff() {

          res.render('weapon_templates_edit', {
              data: data,
              categories: weapon_categories,
              calibers: calibers,
              weapon_types: weapon_types,
              triggerTestTypes: triggerTestTypes,
              pagetitle: pagetitle,
              buttonlabel: buttonlabel,
              username: req.session.name,
              userid: req.session.user
          });
        }

        function notfound() {
              general.errorpage(res, req, 
                                          'Nincs ilyen sablon.', 
                                          'Erről természetesen tudjuk, kik tehetnek.');
        }


     });
   });

//  ------------------------[ WEAPON CATEGORY REGISTRATION / MODIFICATION ] ------------------------

app.post('/weapon_templates_edit',
   function(req, res) {

      if (general.checklogin_post(res, req))
         general.getpostdata(req, function(postdata) {

            var ip = general.getIP(req);

            //  verify posted data
            
            if (postdata.id == 0) finder = new ObjectId()
            else try {
               var finder = new ObjectId(String(postdata.id));
            }
            catch (err) {
               general.sendJSON(res, { error: 'Ez a sablon nem módosítható.' });
               return false;
            }

            if (postdata.id != '0') postdata._id = finder
            else delete postdata._id;
            delete postdata.addPart;
            
            var insert = postdata;
            delete insert.id;

            if (typeof postdata.name == 'undefined' || postdata.name.length < 4) { general.sendJSON(res, { error: 'Túl rövid a sablon neve.' }); return false; }
            if (typeof postdata.category == 'undefined') { general.sendJSON(res, { error: 'Érvénytelen fegyverkategória.' }); return false; }
            if (typeof postdata.description == 'undefined') { postdata.description = ''; }
            if (typeof postdata.parts == 'undefined' || postdata.parts.length < 1) { general.sendJSON(res, { error: 'Nem adtál meg egy alkatrészt sem.' }); return false; }

            //  modify db

            general.MongoDB_connect(settings.mongoDB, function(db) {
               db.collection('weapon_templates').update( { _id: finder },
                                                         insert, 
                                                         { upsert: true },
                                                         function(err) {
                                                         
                        if (err == null) {

                           if (typeof postdata._id == 'undefined') {
                              general.sendJSON(res, { success: 'A sablon hozzáadása sikeres.' });
                           } else {
                              general.sendJSON(res, { success: 'A sablon módosítása sikeres.' });
                           }
                        } else {
                           general.log('MongoDB error in /inc.weapon_templates_edit.js: ' + err.message);
                           general.sendJSON(res, {
                              error: 'MongoDB hiba: ' + err.message
                           });
                        }
                        db.close();
                        return false;
                     });
            });

         });
   });//  ------------------------[ WEAPON TEMPLATE DELETE FORM ] ------------------------

app.get('/weapon_templates_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);

        
        if (typeof req.params.id != 'undefined') {
          try {
              var finder = new ObjectId(req.params.id);
          } catch(err) {
              notfound();
              return false;
          }
                
          general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('weapon_templates').findOne(finder,
                                           function(err, docs) {
              db.close();
              if (err == null && docs != null) {

                  res.render('weapon_templates_delete', {
                                         data: docs,
                                         username: req.session.name,
                                         userid: req.session.user,
                                         pagetitle: 'Sablon törlése'
                                       });

              } else
                return notfound();
              })
          });
           
        } else {
          notfound();
        }

        function notfound() {
           general.errorpage(res, req,
                                      'Ez a sablon nem létezik.', 
                                      'Nem, sajnos fogalmunk sincs, hová lett.');
           }

    });


//  ------------------------[ DELETE WEAPON TEMPLATE ] ------------------------

app.post('/weapon_templates_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Nincs ilyen sablon.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapon_templates').findOneAndDelete(finder,
                                                              { projection: { name: 1 } },
                                                  function(err, docs) {
            db.close();
              if (err == null) {
                general.log('Template "'+docs.value.name+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Sablon törölve.' });
              } else {
                general.sendJSON(res, { error: 'Ez a sablon nem törölhető.' });
              }
            })
        });
        
      });
    });

//  ------------------------[ BUG LIST ] ------------------------

app.get('/bugs',
    function(req, res) {
        general.checklogin(res, req);
        res.render('bugs', {
                               pagetitle: 'Hibabejelentő',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ GET BUG REPORTS ] ------------------------

app.post('/bugs',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {};
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'Ez a hibajelentés nem található az adatbázisban.' });
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
                finder = { $or: [{'title' : value}, {'stages.description': value}]}
            } else {
                finder = {};
                finder[postdata.searchfield] = value;
                
            }
          }
        }
        
//  assemble sorter criteria

        if (typeof postdata.sortmode != 'undefined') var sortmode = Number(postdata.sortmode)
          else sortmode = 1;

        if (typeof postdata.sortby != 'undefined') var sortby = Number(postdata.sortby)
          else sortby = 0;
        
        switch(sortby) {
          case 0: var sorter = { date: sortmode }; break;
          case 1: var sorter = { severity: sortmode, date: -1 }; break;
          case 2: var sorter = { title: sortmode }; break;
          case 3: var sorter = { user: sortmode, date: -1 }; break;
        }
                
//--------------------------------------------------------------------------------------------------------------------------------------
//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('bugs').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('bugs').aggregate([
                                                  { $match: finder },
                                                  { $sort: sorter },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  { $lookup: {  from: 'users',
                                                                localField: 'user',
                                                                foreignField: '_id',
                                                                as: 'userdata'
                                                              }
                                                  },
                                                  
                                                  { $unwind: { 
                                                                path: '$userdata', 
                                                                preserveNullAndEmptyArrays: true 
                                                             }
                                                  },

                                                  { $project: {
                                                                'userdata.title': 1,
                                                                'userdata.firstname': 1,
                                                                'userdata.lastname': 1,
                                                                'stages': 1,
                                                                '_id': 1,
                                                                'user': 1,
                                                                'title': 1,
                                                                'browser': 1,
                                                                'date': 1,
                                                                'severity': 1
                                                               }
                                                  }
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                
                if (!err) {

                    if (docs.length > 0)
                      
                      for (t in docs) {
                        if (typeof docs[t].userdata != 'undefined')
                          docs[t].userdata.name = general.formname(docs[t].userdata)
                        else {
                          docs[t].userdata = { name: 'Törölt felhasználó' }
                        }
                        
                        docs[t].date_formatted = dateformat(docs[t].date, settings.date_format);

                        for(tt in docs[t].stages) {
                          docs[t].stages[tt].date_formatted = dateformat(docs[t].stages[tt].date, settings.date_format);
                        }
                      }

                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                      general.sendJSON(res, { 'error': String(err) });
                    
                    return false;
                }
              });
            });
          });
        });
      });
//  ------------------------[ ADD BUG REPORT ] ------------------------
app.get('/bugs_edit',
   function(req, res) {
      general.checklogin(res, req);
      res.render('bugs_edit', {
            pagetitle: 'Hibajelentés',
            username: req.session.name,
            userid: req.session.user
      });
   });

//  ------------------------[ BUG REGISTRATION ] ------------------------

app.post('/bugs_edit',
   function(req, res) {

      if (general.checklogin_post(res, req))
         general.getpostdata(req, function(postdata) {
         
            //  verify posted data

            var ok = true;
            if (postdata.title.length < 5) { general.sendJSON(res, { error: 'Túl rövid a hiba rövid leírása.' }); ok=false; }
            if (isNaN(postdata.severity) || postdata.severity < 0 || postdata.severity > 5) { general.sendJSON(res, { error: 'Érvénytelen súlyossági szint.' }); ok=false; }
            if (postdata.description.length < 20) { general.sendJSON(res, { error: 'Túl rövid a hiba részletes leírása.' }); ok=false; }
            if (postdata.title.length < 3) { general.sendJSON(res, { error: 'Nem adtad meg a böngésző típusát.' }); ok=false; }

            if (!ok) {
              for (var t in postdata.files)
                fs.unlink(__dirname+'/public/userdata/bugreport_screenshots/'+postdata.files[t], function() {});
              return false;
            }
            
            //  modify db
            
            var bug = {
                        _id: new ObjectId(),
                        user: new ObjectId(req.session.user),
                        date: Date.now(),
                        title: postdata.title,
                        severity: postdata.severity,
                        browser: postdata.browser,
                        stages: [{
                                  id: general.RandomString(12, false, false),
                                  user: new ObjectId(req.session.user),
                                  date: Date.now(),
                                  description: postdata.description,
                                  previous_severity: postdata.severity,
                                  severity: postdata.severity,
                                  files: postdata.files
                                }]
                      }
            
            general.MongoDB_connect(settings.mongoDB, function(db) {

//  insert new bug report

               db.collection('bugs').insert(bug, { upsert: true }, function(err) {
                        if (err == null) {
                             general.sendJSON(res, { success: 'A hibajelentés hozzáadása sikeres.' });
                          } else {
                             for (var t in postdata.files)
                               fs.unlink(__dirname+'/public/userdata/bugreport_screenshots/'+postdata.files[t], function() {});
                             general.log('MongoDB error in /inc.bugs_edit.js: ' + err.message);
                             general.sendJSON(res, { error: 'A hiba felvétele nem sikerült.' });
                          } 
                        
                        db.close();
                        return false;
               });
            });
         });
   });
//  ------------------------[ GET SINGLE BUG REPORT INFORMATION ] ------------------------

app.get('/bugs_info/:id?',
    function(req, res) {
        general.checklogin(res, req);
        
        try {
          var finder = { '_id': new ObjectId(req.params.id) };
        } catch(err) {
          notfound();
          return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {

              db.collection('bugs').aggregate([
                                                  { $match: finder },
                                                  { $lookup: {  from: 'users',
                                                                localField: 'user',
                                                                foreignField: '_id',
                                                                as: 'userdata'
                                                              }
                                                  },
                                                  
                                                  { $unwind: { 
                                                                path: '$userdata', 
                                                                preserveNullAndEmptyArrays: true 
                                                             }
                                                  },
                                                  
                                                  { $sort: { 'stages.date': 1 }},
                                                  { $unwind: '$stages' },
                                                  
                                                  { $lookup: {
                                                                from: 'users',
                                                                localField: 'stages.user',
                                                                foreignField: '_id',
                                                                as: 'stages_users'
                                                             }
                                                  },
                                                  
                                                  { $unwind: '$stages' },
                                                                                                    
                                                  { $group: {
                                                                '_id': '$_id',
                                                                'title': { $first: '$title' },
                                                                'browser': { $first: '$browser' },
                                                                'severity': { $first: '$severity' },
                                                                'data': { $first: '$data' },
                                                                'date': { $first: '$date' },
                                                                'userdata': { $first: '$userdata' },
                                                                'stages_all': { $first: '$stages' },
                                                                'stages': { $push: { $concatArrays: [ '$stages_users', ['$stages'] ] } }
                                                            }
                                                  },
                                                  
                                                  { $project: {

                                                                '_id': 1,
                                                                'title': 1,
                                                                'browser': 1,
                                                                'date': 1,
                                                                'severity': 1,
                                                                'userdata._id': 1,
                                                                'userdata.name': 1,
                                                                'stages.id': 1,
                                                                'stages.name': 1,
                                                                'stages.date': 1,
                                                                'stages.description': 1,
                                                                'stages.previous_severity': 1,
                                                                'stages.severity': 1,
                                                                'stages.files': 1,
                                                                'date': 1

                                                             }
                                                  }
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();

                if (!err && docs.length > 0) {
                    
//  clean up shit after mongodb, the stupid fuck
                    
                    var docs2 = docs[0];
                    for (t in docs2.stages) {
                      docs2.stages[t]= Object.assign(docs2.stages[t][0], docs2.stages[t][1]);
                    }
                    
                    if (typeof docs2.userdata == 'undefined')
                      docs2.userdata = { name: 'Törölt felhasználó' }
                      
                    docs2.date_formatted = dateformat(docs2.date, settings.date_format);

                    for (t in docs2.stages) {
                      docs2.stages[t].date_formatted = dateformat(docs2.stages[t].date, settings.date_format);
                     if (typeof docs2.stages[t].name == 'undefined')
                        docs2.stages[t].name = 'Törölt felhasználó';
                    }
                    
                    docs2.stages.sort(function(a, b) {
                                                        if (a.date < b.date) return 1;
                                                        if (a.date > b.date) return -1;
                                                        return 0;
                    });
                    
                    renderstuff(docs2);
                    return false;
                } else {
                    notfound();
                    return false;
                }
              });
        });
        
        
       function notfound() {
          general.errorpage(res, req,
                                      'Ez a hibajelentés nincs meg.', 
                                      'A nindzsák, azok lehettek már megint.');
           }
           
       function renderstuff(data) {
  
          res.render('bugs_info', {
                                 pagetitle: 'Hibajelentés',
                                 username: req.session.name,
                                 userid: req.session.user,
                                 data: data
                               });
       }
    });


//  ------------------------[ GET BUG REPORTS ] ------------------------

app.post('/bugs_info',
    function(req, res) {

      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {};
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
                finder = { $or: [{'title' : value}, {'stages.description': value}]}
            } else {
                finder = {};
                finder[postdata.searchfield] = value;
                
            }
          }
        }
        
//  assemble sorter criteria

        if (typeof postdata.sortmode != 'undefined') var sortmode = Number(postdata.sortmode)
          else sortmode = 1;

        if (typeof postdata.sortby != 'undefined') var sortby = Number(postdata.sortby)
          else sortby = 0;
        
        switch(sortby) {
          case 0: var sorter = { date: sortmode }; break;
          case 1: var sorter = { severity: sortmode, date: -1 }; break;
          case 2: var sorter = { title: sortmode }; break;
          case 3: var sorter = { user: sortmode, date: -1 }; break;
        }
                
//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('bugs').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('bugs').aggregate([
                                                  { $match: finder },
                                                  { $sort: sorter },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  { $lookup: {  from: 'users',
                                                                localField: 'user',
                                                                foreignField: '_id',
                                                                as: 'userdata'
                                                              }
                                                  },
                                                  
                                                  { $unwind: '$userdata' },
                                                  { $unwind: '$stages' },

                                                  { $lookup: {  from: 'users',
                                                                localField: 'stages.user',
                                                                foreignField: '_id',
                                                                as: 'stages_users'
                                                              }
                                                  },
                                                  
                                                  { $unwind: '$stages_users' },
                                                  
                                                  { $group: { _id: '$_id',
                                                              title: { $first: '$title' },
                                                              date: { $first: '$date' },
                                                              severity: { $first: '$severity' },

                                                              userdata: { $push: '$userdata' },
                                                              stages: { $push: { stage: '$stages', user: '$stages_users' } }
                                                            }
                                                  },

                                                  { $unwind: '$userdata' },
                                                  
                                                  { $project: {
                                                                'title': 1,
                                                                'date': 1,
                                                                'severity': 1,
                                                                'browser': 1,
                                                                
                                                                'userdata._id': 1,
                                                                'userdata.title': 1,
                                                                'userdata.firstname': 1,
                                                                'userdata.lastname': 1,

                                                                'stages.user._id': 1,
                                                                'stages.user.title': 1,
                                                                'stages.user.firstname': 1,
                                                                'stages.user.lastname': 1,
                                                                'stages.stage.date': 1,
                                                                'stages.stage.description': 1,
                                                                'stages.stage.severity': 1,
                                                                'stages.stage.previous_severity': 1,
                                                                'stages.stage.files': 1
                                                              }
                                                  }
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();

                if (!err) {

                    for (t in docs) {
                      docs[t].userdata.name = general.formname(docs[t].userdata);
                      docs[t].date_formatted = dateformat(docs[t].date, settings.date_format);

                      for(tt in docs[t].stages) {
                        docs[t].stages[tt].stage.date_formatted = dateformat(docs[t].stages[tt].stage.date_formatted, settings.date_format);
                        docs[t].stages[tt].user.name = general.formname(docs[t].stages[tt].user);
                      }
                    }
                    
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                    general.sendJSON(res, { 'error': String(err) });
                    general.log(JSON.stringify(err, null, 3));
                    return false;
                }
              });
            });
          });
        });
      });

//  ------------------------[ GET STAGE ADDITION FORM ] ------------------------

app.get('/bugs_addstage/:id?',
    function(req, res) {
       general.checklogin(res, req);
        
       try {
          var finder = { '_id': new ObjectId(req.params.id) };
       } catch(err) {
          notfound();
          return false;
       }
       
       general.MongoDB_connect(settings.mongoDB, function(db) {
         db.collection('bugs').aggregate([
                                            { $match: finder }
                                         ], 
                                         function(err, docs) {
            if (!err && docs.length > 0) {
              docs = docs[0];
              renderstuff(docs)
            } else {
              notfound();
            }
            return false;
         });
       });
       
       function notfound() {
          general.errorpage(res, req,
                                      'Ez a hibajelentés nincs meg.', 
                                      'A nindzsák, azok lehettek már megint.');
       }
           
       function renderstuff(data) {

          res.render('bugs_addstage', {
                                 pagetitle: 'Új lépés',
                                 username: req.session.name,
                                 userid: req.session.user,
                                 id: req.params.id,
                                 data: data
                               });
       }

});

//  ------------------------[ ADD NEW STAGE ] ------------------------

app.post('/bugs_addstage',
   function(req, res) {

      if (general.checklogin_post(res, req))
         general.getpostdata(req, function(postdata) {

            var ip = general.getIP(req);

            //  verify posted data

            if (postdata.id == 0) 
              finder = new ObjectId()
            else 
            try {
               var finder = new ObjectId(String(postdata.id));
            }
            catch (err) {
               general.sendJSON(res, { error: 'Ehhez a hibajelentéshez nem lehet több lépést adni.' });
               return false;
            }

            if (postdata.id != '0') postdata._id = finder
            else delete postdata._id;

            if (postdata.description.length < 10) { general.sendJSON(res, { error: 'Túl rövid a szöveg.' }); return false; }
            if (isNaN(postdata.severity) || postdata.severity < 0 || postdata.severity > 6) { general.sendJSON(res, { error: 'Érvénytelen súlyosság.' }); return false; }

            //  assemble inserted data
            
            var stage = postdata;
            stage.date = new Date();
            stage.user = new ObjectId(req.session.user);
            stage.id = general.RandomString(12, false, false);
            delete stage._id;
            
            //  modify db

            general.MongoDB_connect(settings.mongoDB, function(db) {
               db.collection('bugs').update(
                                              { _id: finder },
                                              { 
                                                $set: { severity: postdata.severity },
                                                $push: { stages: stage }
                                              },
                                              { upsert: true },
                     function(err) {
                        if (err == null)
                           general.sendJSON(res, { success: 'A lépés hozzáadása sikeres.' })
                        else {
                           general.log('MongoDB error in /inc.weapon_categories_edit.js: ' + err.message);
                           general.sendJSON(res, { error: 'MongoDB hiba: ' + err.message });
                        }
                        db.close();
                        return false;
                     });
                });
         });
   });
//  ------------------------[ BUG REPORT DELETE FORM ] ------------------------

app.get('/bugs_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);
        
        if (typeof req.params.id != 'undefined') {
          try {
              var finder = new ObjectId(req.params.id);
          } catch(err) {
              notfound();
              return false;
          }
                
          general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('bugs').findOne(finder, function(err, docs) {
              db.close();

              if (!err && docs != null) {
                docs.date_formatted = dateformat(docs.date, settings.date_format);
                return renderstuff(docs)
              } else
                return notfound();
              })
          });
           
        } else {
          notfound();
        }

        function notfound() {
           general.errorpage(res, req,
                                      'Nincs ilyen hibajegy.', 
                                      'Ez most vagy az isteni tökéletesség műve, vagy a világot pusztító entrópiáé. Ez a kettő tökre üti egymást.');
           }

        
        function renderstuff(data) {
          res.render('bugs_delete', {
                                 data: data,
                                 username: req.session.name,
                                 userid: req.session.user
                               });
        }
    });


//  ------------------------[ DELETE USERS ] ------------------------

app.post('/bugs_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen azonosító.' });
          return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('bugs').findOneAndDelete(finder, function(err, docs) {
            db.close();
              if (err == null && docs != null) {
              
              //  delete uploaded images

                docs = docs.value;
                for (var t in docs.stages) {
                  for(var x in docs.stages[t].files) {
                    fs.unlink(__dirname+'/public/userdata/bugreport_screenshots/'+docs.stages[t].files[x], function() {});
                  }
                }
              
                general.log('Bug report "'+docs.title+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Hibajelentés törölve.' });
              } else {
                general.log(err);
                general.sendJSON(res, { error: 'Ez a hibajelentés nem törölhető.' });
              }
            })
        });
        
      });
    });

//  ------------------------[ WEAPON LIST ] ------------------------

app.get('/weapons',
    function(req, res) {
        general.checklogin(res, req);
        res.render('weapons', {
                               pagetitle: 'Fegyverek',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ SEARCH WEAPONS ] ------------------------

app.post('/weapons',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {}
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'A keresett fegyver nem található az adatbázisban.' });
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
                finder = { $or: [{ 'serialno': value }, { 'description': value }, { 'name': value }] }
            } else {
                finder = {};
                finder[postdata.searchfield] = value;
            }
          }
        }
        
//  assemble sorter criteria

        if (typeof postdata.sortmode != 'undefined') var sortmode = Number(postdata.sortmode)
          else sortmode = 1;

        if (typeof postdata.sortby != 'undefined') var sortby = Number(postdata.sortby)
          else sortby = 0;
        
        switch(sortby) {
          case 0: var sorter = { name: sortmode }; break;
          case 1: var sorter = { serialno: sortmode }; break;
          case 2: var sorter = { date: sortmode }; break;
          case 3: var sorter = { category: sortmode }; break;
          case 4: var sorter = { caliber: sortmode }; break;
        }
        
        if (postdata.id)
          var selector = {
                            _id: 1,
                            name: 1,
                            caliber: 1,
                            category: 1,
                            serialno: 1,
                            description: 1,
                            year: 1,
                            date: 1,
                            parts: 1,
                            trigger_tests: 1,
                         }

        else
          var selector = {
                            _id: 1,
                            name: 1,
                            caliber: 1,
                            category: 1,
                            serialno: 1,
                            date: 1
                         }
        
//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
         else var startrecord = 0;
         
        general.MongoDB_connect(settings.mongoDB, function(db) {

//  count total number of documents matching the query

          db.collection('weapons').aggregate([ 
                                               { $match: finder },
                                               { $project: { _id: 1 } },
                                               { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('weapons').aggregate([
                                                  { $match: finder },
                                                  { $sort: sorter },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  { $project: selector }
                                                  
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                if (err == null) {
                    
                    for (var t in docs)
                      docs[t].date_formatted = dateformat(docs[t].date, settings.date_format);

                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {

                  if(postdata.id)
                    general.sendJSON(res, { 'error': 'A keresett fegyver nem található az adatbázisban.' })
                  else
                    general.sendJSON(res, { 'error': err+'Nincs a keresésnek megfelelő fegyver.' });
                  return false;
                }
              });
          
          });
        });
      });
    });
//  ------------------------[ ADD WEAPON - GENERATE FORM ] ------------------------
app.get('/weapons_edit/:id?',
   function(req, res) {

      general.checklogin(res, req);
      
      if (typeof req.params.id != 'undefined') {
        try {
          var finder = { '_id': new ObjectId(req.params.id) };
        } catch(err) {
          finder = {};
        }
      }

      general.MongoDB_connect(settings.mongoDB, function(db) {

        if (typeof req.params.id != 'undefined') {
        
          buttonlabel = 'Módosítás';
          pagetitle = 'Fegyver módosítása';
          
          db.collection('weapons').aggregate([
                                              { $match: finder }
                                           ], 
                                           { collation: collation },
                                           function (err, docs) {
                                              if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                weapon = docs[0];
                                                loadcategories();
                                                return false;
                                              } else {
                                                db.close();
                                                notfound();
                                                return false;
                                              }
          });

        } else {

          weapon = {
                      _id: 0,
                      name: '',
                      category: 0,
                      caliber: 0,
                      serialno: '',
                      year: 2000,
                      user: 0,
                      description: '',
                      parts: [],
                      trigger_tests: []
                 }
          buttonlabel = 'Hozzáadás';
          pagetitle = 'Új fegyver hozzáadása';
          loadcategories();
        }
        
        function loadcategories() {
          db.collection('weapon_categories').aggregate([
                                              { $sort: { 'name': 1 } }
                                           ], 
                                           { collation: collation },
                                           function (err, docs) {
                                              if (!err) {
                                                weapon_categories = docs;
                                                loadtypes();
                                                return false;
                                              } else
                                                db.close();
                                                notfound();
                                              return false;
          });
        }


        function loadtypes() {
          db.collection('weapon_types').aggregate([{ $sort: { 'name': 1 } }], 
                                              { collation: collation },
                                              function (err, docs) {
                                              if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                weapon_types = docs;
                                                loadtemplates();
                                                return false;
                                              } else
                                                notfound();
                                              return false;
          });
        }

        function loadtemplates() {
          db.collection('weapon_templates').aggregate([
                                              { $sort: { 'name': 1 } },
                                              { $project: {
                                                            '_id': 1,
                                                            'name': 1
                                                          }
                                              }
                                           ], 
                                           { collation: collation },
                                           function (err, docs) {
                                              if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                weapon_templates = docs;
                                                loadcalibers();
                                                return false;
                                              } else
                                                notfound();
                                              return false;
          });
        }

        function loadcalibers() {
          db.collection('calibers').aggregate([{ $sort: { 'name': 1 } }], 
                                              { collation: collation },
                                              function (err, docs) {
                                              if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                calibers = docs;
                                                renderstuff();
                                                return false;
                                              } else
                                                notfound();
                                              return false;
          });
        }

        function renderstuff() {
        
            var user_id = null;
            if (req.query.user)
              user_id = req.query.user;
            
            res.render('weapons_edit', {
                                                  weapon_categories: weapon_categories,
                                                  weapon_templates: weapon_templates,
                                                  calibers: calibers,
                                                  triggerTestTypes: triggerTestTypes,
                                                  user_id: user_id,
                                                  data: weapon,
                                                  pagetitle: pagetitle,
                                                  buttonlabel: buttonlabel,
                                                  username: req.session.name,
                                                  userid: req.session.user
                       });

        }

        function notfound() {
                     general.errorpage(res, req,
                                                'Nem lehet új fegyvert hozzáadni.',
                                                'Bonyolult dolog ez, nem is tudnám két szóban elmagyarázni, de a lényeg, hogy az adatbázis valami érdekeset adott vissza, ezért ma nincs játék.');
        }
   });
});

//  ------------------------[ SAVE WEAPON EDITS ] ------------------------

app.post('/weapons_edit',
   function(req, res) {

      if (general.checklogin_post(res, req))
         general.getpostdata(req, function(postdata) {

            var ip = general.getIP(req);

            //  verify posted data
            
            if (typeof postdata.parts == 'undefined' || postdata.parts.length <= 0) { general.sendJSON(res, { error: 'Nem adtad meg a fődarabok listáját.' }); return false; }
            if (typeof postdata.name == 'undefined' || postdata.name.length < 2) { general.sendJSON(res, { error: 'Túl rövid a fegyver neve.' }); return false; }
            if (typeof postdata.year == 'undefined' || (postdata.year.length != 4 && Number(postdata.year) != 0) || isNaN(postdata.year)) { general.sendJSON(res, { error: 'Érvénytelen gyártási év.' }); return false; }
            if (typeof postdata.category == 'undefined' || postdata.category.length < 2) { general.sendJSON(res, { error: 'Érvénytelen fegyverkategória.' }); return false; }
            if (typeof postdata.type == 'undefined' || postdata.type.length < 2) { general.sendJSON(res, { error: 'Érvénytelen jelleg.' }); return false; }
            if (typeof postdata.description == 'undefined') postdata.description = '';
            if (typeof postdata.serialno == 'undefined') postdata.serialno = '';
            if (typeof postdata.trigger_tests == 'undefined') postdata.trigger_tests = [];

            if (postdata._id == '0') {
                finder = new ObjectId();
                postdata.date = new Date();
                postdata.date_formatted = dateformat(postdata.date, settings.date_format);
            } else {
              try {
                finder = new ObjectId(postdata._id);
              } catch(err) {
                general.sendJSON(res, { error: 'Érvénytelen azonosító.' });
                return false;
              }
            }
            
            delete postdata._id;
            
            general.MongoDB_connect(settings.mongoDB, function(db) {
            
              db.collection('weapons').update({ _id: finder },
                                              { $set: postdata },
                                              { upsert: true }, 
                                              function(err) {
                                                db.close();
                                                if(!err) {
                                                  general.sendJSON(res, { success: 'A fegyver felvétele sikeres.' });
                                                } else {
                                                  general.sendJSON(res, { error: err+' A fegyver felvétele nem sikerült.' });
                                                }
                                              });
            });
      });
});
//  ------------------------[ DELETE WEAPON ] ------------------------

app.get('/weapons_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);
        
        if (typeof req.params.id != 'undefined') {
          try {
            var finder = { '_id': new ObjectId(req.params.id) };
          } catch(err) {
            notfound();
            return false;
          }
        }
                  
        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapons').aggregate([{ $match: finder },
                                            { $project: {
                                                            _id: 1,
                                                            name: 1,
                                                            serialno: 1,
                                                            caliber: 1,
                                                            category: 1,
                                                            year: 1,
                                                            description: 1
                                                        }
                                            }
                                           ], 

                                           { collation: collation },
                                           function(err, docs) {
                                              db.close();
                                              if (!err && typeof docs != 'undefined' && docs.length > 0) {
                                                renderstuff(docs[0]);
                                              } else {
                                                notfound();
                                              }
                                           });
        });


       function notfound() {
          general.errorpage(res, req,
                                      'Ez a fegyver nem található.', 
                                      'De így legalább nem kell törölni.');
           }

       function renderstuff(data) {
  
          res.render('weapons_delete', {
                                 pagetitle: 'Fegyver törlése',
                                 username: req.session.name,
                                 userid: req.session.user,
                                 data: data
                               });
       }


    });


//  ------------------------[ DELETE WEAPON ] ------------------------

app.post('/weapons_delete',
    function(req, res) {

      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

        try {
          var finder = { '_id': new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { 'error': 'Ezt a fegyvert nem lehet törölni.' });
          return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapons').removeOne(finder, function(err) {
              if (!err) {
                general.sendJSON(res, { 'success': 'Fegyver törölve.' });
              } else {
                general.sendJSON(res, { 'error': 'Ezt a fegyvert nem lehet törölni.' });
              }
          });
        });
      });
    });
//  ------------------------[ WEAPON INFO FORM ] ------------------------
app.get('/weapons_info/:id?/:examine?',
   function(req, res) {

      general.checklogin(res, req);
      
      try {
        var finder = new ObjectId(req.params.id);
      } catch(err) {
        notfound();
        return false;
      }
      
      general.MongoDB_connect(settings.mongoDB, function(db) {
          
        var users = [];
        var weapon = null;
        
        function getusers() {
            db.collection('users').aggregate(
                        [{ $sort: { 'name': 1 } }],
                        { collation: collation },
                        function(err, docs) {
                            if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                users = docs;
                                getweapons();
                            } else {
                                notfound();
                                return false;
                            }
                       
                        });
        }
        
        function getweapons() {

            db.collection('weapons').aggregate([{ $match: { _id: finder } },

                                                { $lookup: {
                                                                    from: 'weapons_exam',
                                                                    localField: '_id',
                                                                    foreignField: 'weapon._id',
                                                                    as: 'weapons_exam'
                                                           }
                                                },
                                                { $unwind: { path: '$weapons_exam', 
                                                             preserveNullAndEmptyArrays: true
                                                           }
                                                },
                                                { $sort: { 'weapons_exam.date': -1 } },

                                                { $group: {
                                                            '_id': '$_id',
                                                            'weapons_exam': { $push: '$weapons_exam' },
                                                            'parts': { $first: '$parts' },
                                                            'trigger_tests': { $first: '$trigger_tests' },
                                                            'name': { $first: '$name' },
                                                            'serialno': { $first: '$serialno' },
                                                            'caliber': { $first: '$caliber' },
                                                            'type': { $first: '$type' },
                                                            'category': { $first: '$category' },
                                                            'year': { $first: '$year' },
                                                            'description': { $first: '$description' }
                                                          }
                                                },

                                                { $project: {
                                                                '_id': 1,
                                                                'name': 1,
                                                                'serialno': 1,
                                                                'caliber': 1,
                                                                'category': 1,
                                                                'type': 1,
                                                                'year': {
                                                                    $cond: { if: '0', then: 'Nem ismert', else: '$year' }
                                                                },
                                                                'description': 1,
                                                                'parts': 1,
                                                                'trigger_tests': 1,
                                                                'weapons_exam._id': 1,
                                                                'weapons_exam.date_formatted': 1,
                                                                'weapons_exam.examiner': 1,
                                                                'weapons_exam.examiner_id': 1
                                                            }
                                                }
                                               ], 
                                               { collation: collation },
                                               function (err, docs) {
                                                  db.close();

                                                  if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                    docs[0].date_formatted = dateformat(docs[0].date, settings.date_format);
                                                    weapon = docs[0];
                                                    renderstuff();
                                                    return false;
                                                  } else {
                                                    notfound();
                                                    return false;
                                                  }
            });
        
        }

        function notfound() {
                     general.errorpage(res, req,
                                                'Ez a fegyver nincs meg.',
                                                'Az élet kemény, a fegyver csöve meg még keményebb. Sose verjük fejbe embertársunkat fegyverrel.');
        }

        function renderstuff() {
        
          if (req.params.examine == 'examine')
            res.render('weapons_exam', {
                                                  data: weapon,
                                                  pagetitle: 'Fegyvervizsgálat',
                                                  users: users,
                                                  username: req.session.name,
                                                  userid: req.session.user
                       });
          
          else
            res.render('weapons_info', {
                                                  data: weapon,
                                                  pagetitle: 'Fegyver adatai',
                                                  username: req.session.name,
                                                  userid: req.session.user
                       });

        }
        
        getusers();

   });
   
});

//  ------------------------[ VIEW WEAPON EXAMINATION SHEET ] ------------------------

app.get('/weapons_exam/:id?/:print?',
        function (req, res) {

            general.checklogin(res, req);

            if (typeof req.params.id != 'undefined') {
                try {
                    var finder = new ObjectId(req.params.id);
                } catch (err) {
                    notfound();
                    return false;
                }
            }

            general.MongoDB_connect(settings.mongoDB, function (db) {

                db.collection('weapons_exam').aggregate([
                    
                                                  { $match: { '_id': finder } },
                                                  
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner1.country',
                                                                foreignField: 'id',
                                                                as: 'owner1country'
                                                             }
                                                  },
                                                  
                                                  { $unwind: { path: '$owner1country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner2.country',
                                                                foreignField: 'id',
                                                                as: 'owner2country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner2country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner3.country',
                                                                foreignField: 'id',
                                                                as: 'owner3country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner3country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $group: { '_id': '$_id',
                                                              'owner1': { $first: '$owner1' },
                                                              'owner2': { $first: '$owner2' },
                                                              'owner3': { $first: '$owner3' },
                                                              'weapon': { $first: '$weapon' },
                                                              'general_description': { $first: '$general_description' },
                                                              'sight_test': { $first: '$sight_test' },
                                                              'trigger_tests': { $first: '$trigger_tests' },
                                                              'parts_tests': { $first: '$parts_tests' },
                                                              'examiner': { $first: '$examiner' },
                                                              'examiner_id': { $first: '$examiner_id' },
                                                              'date_formatted': { $first: '$date_formatted' },
                                                              'date': { $first: '$date' },
                                                              'images': { $first: '$images' }
                                                            } 
                                                  },

                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner1.country',
                                                                foreignField: 'id',
                                                                as: 'owner1.country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner1.country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                    
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner2.country',
                                                                foreignField: 'id',
                                                                as: 'owner2.country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner2.country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },

                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner3.country',
                                                                foreignField: 'id',
                                                                as: 'owner3.country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner3.country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $project: {
                                                                '_id': 1,
                                                                'weapon': 1,
                                                                'owner1': 1,
                                                                'owner2': 1,
                                                                'owner3': 1,
                                                                'general_description': 1,
                                                                'sight_test': 1,
                                                                'trigger_tests': 1,
                                                                'parts_tests': 1,
                                                                'examiner': 1,
                                                                'examiner_id': 1,
                                                                'date_formatted': 1,
                                                                'date': 1,
                                                                'images': 1
                                                              }
                                                  }
                                                  
                ],
                { collation: collation },
                
                function (err, docs) {
                    
                    if (err || typeof docs == 'undefined' || docs.length <= 0) {
                        notfound();
                        return false;
                    } else {
                        res.render('weapons_exam_sheet', {
                                    data: docs[0],
                                    pagetitle: 'Vizsgálati lap',
                                    username: req.session.name,
                                    userid: req.session.user
                        });
                        return false;
                    }
                });
            });


            function notfound() {
                general.errorpage(res, req,
                        'Nincs vizsgálati lap ezzel az azonosítóval.',
                        'Ez szomorú.');
            }

        });

//  ------------------------[ SAVE WEAPON EXAMINATION SHEET ] ------------------------

app.post('/weapons_exam',
        function (req, res) {

            general.checklogin(res, req);
            general.getpostdata(req, function (postdata) {

//  verify object ids for the weapon and the owners

                try {
                    var finder = new ObjectId(postdata.weapon);
                } catch (err) {
                    general.sendJSON(res, {error: 'Érvénytelen fegyverazonosító.'});
                    return false;
                }

                try {
                    var owner1 = new ObjectId(postdata.owner1);
                } catch (err) {
                    general.sendJSON(res, {error: 'Érvénytelen tulajdonos.'});
                    return false;
                }
                
                try {
                    var owner2 = new ObjectId(postdata.owner2);
                } catch (err) {
                    general.sendJSON(res, {error: 'Érvénytelen vizsgáltató.'});
                    return false;
                }
                
                try {
                    var owner3 = new ObjectId(postdata.owner3);
                } catch (err) {
                    general.sendJSON(res, {error: 'Érvénytelen leadó.'});
                    return false;
                }

                postdata._id = new ObjectId();

                if (typeof postdata.parts_tests == 'undefined' || postdata.parts_tests.length < 1) {
                    general.sendJSON(res, {error: 'A fődarabok listája üres.'});
                    return false;
                }
                if (typeof postdata.trigger_tests == 'undefined' || postdata.trigger_tests.length < 1) {
                    general.sendJSON(res, {error: 'Az elsütési tesztek listája üres.'});
                    return false;
                }

                general.MongoDB_connect(settings.mongoDB, function (db) {

//  find weapon
                    function findWeapon() {
                        db.collection('weapons').aggregate([
                            {$match: {'_id': finder}}],
                                {collation: collation},
                                function (err, docs) {
                                    if (err || typeof docs == 'undefined' || docs.length <= 0) {
                                        general.sendJSON(res, {error: 'Ez a fegyver nincs az adatbázisban.'});
                                        return false;
                                    } else {
                                        postdata.weapon = docs[0];
                                        postdata.examiner = req.session.name;
                                        postdata.examiner_id = req.session.user;
                                        postdata.date = new Date();
                                        postdata.date_formatted = dateformat(postdata.date, settings.date_format);
                                        findOwners();
                                    }
                                });
                    }

//  find owner data
                    
                    function findOwners() {
                        db.collection('users').aggregate([{
                                                            $match: { $or: [ 
                                                                        { '_id': owner1 },
                                                                        { '_id': owner2 },
                                                                        { '_id': owner3 }
                                                                        ] }
                                                          }],
                                {collation: collation},
                                function (err, docs) {
                                    if (err || typeof docs == 'undefined' || docs.length <= 0) {
                                        general.sendJSON(res, {error: 'A vizsgáltató személyek közül egy vagy több nincs ügyfélként regisztrálva.'});
                                        return false;
                                    } else {
                                        for (t in docs) {
                                            delete docs[t].username;
                                            delete docs[t].password;
                                            delete docs[t].remarks;
                                            delete docs[t].userlevel;
                                            if (String(docs[t]._id) == String(owner1)) postdata.owner1 = docs[t];
                                            if (String(docs[t]._id) == String(owner2)) postdata.owner2 = docs[t];
                                            if (String(docs[t]._id) == String(owner3)) postdata.owner3 = docs[t];
                                        }
                                        saveExamSheet();
                                    }
                                });
                    }

//  save exam sheet

                    function saveExamSheet() {
                        db.collection('weapons_exam').insert(postdata, function (err) {
                            if (!err) {
                                general.sendJSON(res, {success: 'A vizsgálati lap mentése sikeres.', id: postdata._id});
                            } else {
                                general.sendJSON(res, {error: 'A vizsgálati lap mentése nem sikerült.'});
                            }
                        });
                    }
                    
                    findWeapon();
                    
                });
            });
        });

//  ------------------------[ DISPLAY DELETE WEAPON EXAMINATION FORM ] ------------------------

app.get('/weapons_exam_delete/:id?',
   function(req, res) {

      general.checklogin(res, req);
      
      if (typeof req.params.id != 'undefined') {
        try {
          var finder = new ObjectId(req.params.id);
        } catch(err) {
          notfound();
          return false;
        }
      }

      general.MongoDB_connect(settings.mongoDB, function(db) {
      
          db.collection('weapons_exam').findOne(finder, function(err, docs) {
          
              if (err || typeof docs == 'undefined' || docs.length <= 0) {
                notfound();
                return false;
              } else {
                res.render('weapons_exam_sheet_delete', {
                                                      data: docs,
                                                      pagetitle: 'Vizsgálati lap törlése',
                                                      username: req.session.name,
                                                      userid: req.session.user
                                                  });
                return false;
              }
      
      });
    });


    function notfound() {
                            general.errorpage(res, req,
                                                'Nincs vizsgálati lap ezzel az azonosítóval.',
                                                'De így legalább nem kell törölni.');
    }

});

//  ------------------------[ DELETE WEAPON EXAMINATION SHEET ] ------------------------

app.post('/weapons_exam_sheet_delete',
   function(req, res) {

      general.checklogin(res, req);
      general.getpostdata(req, function(postdata) {
      
        try {
          var finder = new ObjectId(postdata.id);
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen azonosító.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {

          db.collection('weapons_exam').findOne({ _id: finder }, function(err, docs) {
              if (err || typeof docs == 'undefined' || docs.length == 0) {
                general.sendJSON(res, { error: 'Ez a vizsgálati lap nincs az adatbázisban.' });
                return false;
              } else {
              
                if (typeof docs.images != 'undefined' && docs.images.length > 0)
                  for (t in docs.images)
                    fs.unlinkSync(__dirname+'/public/userdata/weapon_exams/'+docs.images[t]);
                    
                for(t in docs.parts_tests)
                  if (typeof docs.parts_tests[t].images != 'undefined' && docs.parts_tests[t].images.length > 0)
                    for (x in docs.parts_tests[t].images)
                      fs.unlinkSync(__dirname+'/public/userdata/weapon_exams/'+docs.parts_tests[t].images[x]);

                db.collection('weapons_exam').remove({ _id: finder }, function(err) {
                    if (err) {
                      general.sendJSON(res, { error: 'Ez a vizsgálati lap nem törölhető.' });
                      return false;
                    } else {
                      general.sendJSON(res, { success: 'A vizsgálati lap törlése sikeres.' });
                    }
                });
                
              }
          });
        });
    });
});

//  ------------------------[ WEAPON TEMPLATES LIST ] ------------------------

app.get('/calibers',
    function(req, res) {
        general.checklogin(res, req);
        res.render('calibers', {
                               pagetitle: 'Kaliberjelek',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ GET WEAPON CATEGORIES ] ------------------------

app.post('/calibers',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var finder = {}
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'Nincs ilyen kaliberjelzés.' });
              return false;
            }
        }

//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('calibers').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('calibers').aggregate([
                                                  { $match: finder },
                                                  { $sort: { name: 1 } },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                if (err == null) {
                    
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                    general.sendJSON(res, { 'error': err+' Nincs ilyen kaliberjelzés.' });
                    return false;
                }
              });
            });
          });
        });
      });
//  ------------------------[ ADD/MODIFY WEAPON CATEGORY ] ------------------------
app.get('/calibers_edit/:id?',
   function(req, res) {

      general.checklogin(res, req);

      var pagetitle = 'Új kaliberjelzés';
      var buttonlabel = 'Kaliberjelzés felvétele';
      var query = url.parse(req.url, true).query;

      var data = { _id: '0' };

      //  if id is specified, get user

      if (typeof req.params.id != 'undefined') {
         pagetitle = 'Kaliberjelzés módosítása';
         buttonlabel = 'Módosítás';

         try {
            var finder = new ObjectId(req.params.id);
         } catch (err) {
            notfound();
            return false;
         }

         general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('calibers').findOne(finder, function(err, docs) {
                  db.close();
                  if (err == null && docs != null) {
                     data = docs;
                     return renderstuff();
                  } else
                     return notfound();
               })
         });

      } else {
         renderstuff();
      }

      function renderstuff() {

         res.render('calibers_edit', {
            data: data,
            pagetitle: pagetitle,
            buttonlabel: buttonlabel,
            username: req.session.name,
            userid: req.session.user
         });

      }

      function notfound() {
         general.errorpage(res, req,
            'Nincs ilyen kaliberjelzés.',
            'Akár fel is vehetnéd, persze.');
      }

   });

//  ------------------------[ WEAPON CATEGORY REGISTRATION / MODIFICATION ] ------------------------

app.post('/calibers_edit',
   function(req, res) {

      if (general.checklogin_post(res, req))
         general.getpostdata(req, function(postdata) {

            var ip = general.getIP(req);

            //  verify posted data

            if (postdata.id == 0) finder = new ObjectId()
            else try {
               var finder = new ObjectId(String(postdata.id));
            }
            catch (err) {
               general.sendJSON(res, {
                  error: 'Ez a kaliberjelzés nem módosítható.'
               });
               return false;
            }

            if (postdata.id != '0') postdata._id = finder
            else delete postdata._id;

            if (postdata.name.length < 2) {
               general.sendJSON(res, {
                  error: 'Túl rövid a kaliberjelzés neve.'
               });
               return false;
            }

            //  modify db

            general.MongoDB_connect(settings.mongoDB, function(db) {
               db.collection('calibers').update({ _id: finder }, 
                                                postdata, 
                                                { upsert: true },
                     function(err) {
                        if (err == null) {

                           if (postdata.id == 0) {
                              general.sendJSON(res, {
                                 success: 'A kaliberjelzés hozzáadása sikeres.'
                              });
                           } else {
                              general.sendJSON(res, { success: 'A kaliberjelzés módosítása sikeres.' });
                           }
                        } else {
                           general.log('MongoDB error in /inc.calibers_edit.js: ' + err.message);
                           general.sendJSON(res, { error: 'A kaliberjelzés hozzáadása sikertelen.' });
                        }
                        db.close();
                        return false;
                     });
            });

         });
   });
//  ------------------------[ USER DELETE FORM ] ------------------------

app.get('/calibers_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);

        
        if (typeof req.params.id != 'undefined') {
          try {
              var finder = new ObjectId(req.params.id);
          } catch(err) {
              notfound();
              return false;
          }
                
          general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('calibers').findOne(finder, function(err, docs) {
              db.close();
              if (err == null && docs != null) {

                  res.render('calibers_delete', {
                                         id: docs._id,
                                         name: docs.name,
                                         username: req.session.name,
                                         userid: req.session.user
                                       });

              } else
                return notfound();
              })
          });
           
        } else {
          notfound();
        }

        function notfound() {
           general.errorpage(res, req,
                                      'Ez a kaliberjelzés nem létezik.', 
                                      'De így legalább nem kell törölni, igaz?');
           }

    });


//  ------------------------[ DELETE USERS ] ------------------------

app.post('/calibers_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen kaliberjelzés.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('calibers').findOneAndDelete(finder,
                                                     { projection: { name: 1 } },
                                                    function(err, docs) {
            db.close();
              if (err == null) {
                general.log('Caliber "'+docs.value.name+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Kaliberjelzés törölve.' });
              } else {
                general.sendJSON(res, { error: 'Ez a kaliberjelzés nem törölhető.' });
              }
            })
        });
        
      });
    });

//  ------------------------[ IMAGE UPLOAD ] ------------------------

const upload = multer({ dest: __dirname + '/upload-tmp/',
                                limits: { fileSize: settings.upload_size_limit }
                      }).any();

app.post('/uploadimage',
   function(req, res) {
   
    general.checklogin_post(res, req);
    upload(req, res, function(err) {
      
      if (typeof req.body == 'undefined' || typeof req.body.dirname == 'undefined' || !fs.existsSync(__dirname+'/public/userdata/'+req.body.dirname)) {
         try {
           fs.mkdirSync(__dirname+'/public/userdata/'+req.body.dirname, 0o755);
         } catch(err) {
           general.sendJSON(res, { error: 'Érvénytelen feltöltési célkönyvtár' });
           return false;
         }
      }

//  error handling
        
      if (err) {
        var msg = 'Ismeretlen hiba.';
          switch(err.code) {
            case 'LIMIT_FILE_SIZE': msg = 'A fájl túl nagy. Maximális méret: '+settings.upload_size_limit+' byte.'; break;
            case 'LIMIT_PART_COUNT': msg = 'Túl sok darabra van osztva a feltöltött fájl.'; break;
            case 'LIMIT_FILE_COUNT': msg = 'A feltölteni próbált fájlok száma túl nagy.'; break;
            case 'LIMIT_FIELD_KEY': msg = 'Az egyik mező neve túl hosszú.'; break;
            case 'LIMIT_FIELD_VALUE': msg = 'Az egyik mező értéke túl hosszú.'; break;
            case 'LIMIT_FIELD_COUNT': msg = 'Túl sok a mező.'; break;
            case 'LIMIT_UNEXPECTED_FILE': msg = 'Nem várt mező.'; break;
          }
        general.sendJSON(res, { error: msg });
        return false;
      }

//  successful upload

      ip = general.getIP(req);
      var errors = [];

      req.files.forEach(function(file) {
                
//  convert uploaded base64 block back to file
          
          fs.readFile(file.destination+file.filename, 'utf-8', function(err, data) {
              
              if (err) {
                general.log('Unable to read uploaded image: "'+file.filename+'", error: "'+String(err)+ '", uploaded by user '+req.session.name+', IP: '+ip);
                errors.push({ filename: file.filename, originalname: null, error: err.errno });
                if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                return false;
              }
              
              var temp = data.split(',');
              
              try {
                var file_contents = Buffer.from(temp[1], 'base64');
              } catch(err) {
                general.log('Attempt to upload non-BASE64 encoded image by user '+req.session.name+', IP: '+ip);
                errors.push({ filename: file.filename, originalname: null, error: 2 });
                if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                return false;
              }
              
              var filename = file.originalname;
              
              var wrong = true;
              if (temp[0].indexOf('image/jpeg') > -1) { wrong = false; var ext = '.jpg'; }
              if (temp[0].indexOf('image/png') > -1) { wrong = false; var ext = '.png'; }
              if (temp[0].indexOf('image/gif') > -1) { wrong = false; var ext = '.gif'; }

              if (wrong) {
                  general.log('Not a valid image file: "'+file.destination+file.filename+'", uploaded by user '+req.session.name+', IP: '+ip);
                  errors.push({ filename: file.filename, originalname: null, error: 1 });
                  if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                  return false;
              } else

//  save converted file

              fs.writeFile(__dirname+'/public/userdata/'+req.body.dirname+'/'+filename+ext,
                           file_contents,
                           'utf8',
                           function(err) {
                               if (err) {
                                 general.log('Unable to write file: "/public/userdata/'+req.body.dirname+'/'+filename+'", error: "'+String(err)+ '", uploaded by user '+req.session.name+', IP: '+ip);
                                 errors.push({ filename: file.filename, originalname: null, error: err.errno });
                                 if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                                 return false;
                               }

//  oh, success

                               general.log('Image uploaded: '+req.body.dirname+'/'+filename+' user '+req.session.name+', IP: '+ip);
                               errors.push({ filename: file.filename, originalname: file.originalname+ext, error: 0 });
                               if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                               return true;
                           });
                            
          });
        });
      });
  });


//  finish things, send final response, kthxbai

function finish_image_upload(res, req, errors) {

    var error_counter = 0;
    errors.forEach(function(error) {
      fs.unlink(__dirname+'/upload-tmp/'+error.filename, function() {});
      delete error.filename;
    });

    general.sendJSON(res, errors);

}