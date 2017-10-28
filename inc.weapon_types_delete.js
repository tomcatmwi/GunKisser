//  ------------------------[ USER DELETE FORM ] ------------------------

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

