//  ------------------------[ WEAPON TEMPLATE DELETE FORM ] ------------------------

app.get('/weapon_templates_delete/:id?',
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
            db.collection('weapon_templates').findOne(finder,
                                           function(err, docs) {
              db.close();
              if (err == null && docs != null) {

                  res.render('weapon_templates_delete', {
                                         data: docs,
                                         username: req.session.name,
                                         userid: req.session.user,
                                         pagetitle: 'Sablon törlése'
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
                                      'Ez a sablon nem létezik.', 
                                      'Nem, sajnos fogalmunk sincs, hová lett.');
           }

    });


//  ------------------------[ DELETE WEAPON TEMPLATE ] ------------------------

app.post('/weapon_templates_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Nincs ilyen sablon.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapon_templates').findOneAndDelete(finder,
                                                              { projection: { name: 1 } },
                                                  function(err, docs) {
            db.close();
              if (err == null) {
                general.log('Template "'+docs.value.name+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Sablon törölve.' });
              } else {
                general.sendJSON(res, { error: 'Ez a sablon nem törölhető.' });
              }
            })
        });
        
      });
    });

