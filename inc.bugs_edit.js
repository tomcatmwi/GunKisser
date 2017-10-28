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
