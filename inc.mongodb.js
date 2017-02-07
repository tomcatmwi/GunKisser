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
