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
    });    