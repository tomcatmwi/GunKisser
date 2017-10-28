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

