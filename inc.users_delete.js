//  ------------------------[ USER DELETE FORM ] ------------------------

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
