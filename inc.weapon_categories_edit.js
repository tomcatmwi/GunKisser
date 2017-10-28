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
   });