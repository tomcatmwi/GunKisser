//  ------------------------[ USER DELETE FORM ] ------------------------

app.get('/weapon_categories_delete/:id?',
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
            db.collection('weapon_categories').findOne(finder,
                                           function(err, docs) {
              db.close();
              if (err == null && docs != null) {

                  res.render('weapon_categories_delete', {
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
                                      'Ez a kategória nem létezik.', 
                                      'Értetlenül állunk a probléma előtt. Helyette esetleg egy sört?');
           }

    });


//  ------------------------[ DELETE USERS ] ------------------------

app.post('/weapon_categories_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen kategória.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapon_categories').findOneAndDelete(finder,
                                                              { projection: { name: 1 } },
                                                  function(err, docs) {
            db.close();
              if (err == null) {
                general.log('Category "'+docs.value.name+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Kategória törölve.' });
              } else {
                general.sendJSON(res, { error: 'Ez a kategória nem törölhető.' });
              }
            })
        });
        
      });
    });

