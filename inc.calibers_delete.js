//  ------------------------[ USER DELETE FORM ] ------------------------

app.get('/calibers_delete/:id?',
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
            db.collection('calibers').findOne(finder, function(err, docs) {
              db.close();
              if (err == null && docs != null) {

                  res.render('calibers_delete', {
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
                                      'Ez a kaliberjelzés nem létezik.', 
                                      'De így legalább nem kell törölni, igaz?');
           }

    });


//  ------------------------[ DELETE USERS ] ------------------------

app.post('/calibers_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen kaliberjelzés.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('calibers').findOneAndDelete(finder,
                                                     { projection: { name: 1 } },
                                                    function(err, docs) {
            db.close();
              if (err == null) {
                general.log('Caliber "'+docs.value.name+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Kaliberjelzés törölve.' });
              } else {
                general.sendJSON(res, { error: 'Ez a kaliberjelzés nem törölhető.' });
              }
            })
        });
        
      });
    });

