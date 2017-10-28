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
