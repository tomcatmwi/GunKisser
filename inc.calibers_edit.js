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
