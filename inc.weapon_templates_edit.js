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
   });