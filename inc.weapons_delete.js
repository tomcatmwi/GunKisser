//  ------------------------[ DELETE WEAPON ] ------------------------

app.get('/weapons_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);
        
        if (typeof req.params.id != 'undefined') {
          try {
            var finder = { '_id': new ObjectId(req.params.id) };
          } catch(err) {
            notfound();
            return false;
          }
        }
                  
        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapons').aggregate([{ $match: finder },
                                            { $project: {
                                                            _id: 1,
                                                            name: 1,
                                                            serialno: 1,
                                                            caliber: 1,
                                                            category: 1,
                                                            year: 1,
                                                            description: 1
                                                        }
                                            }
                                           ], 

                                           { collation: collation },
                                           function(err, docs) {
                                              db.close();
                                              if (!err && typeof docs != 'undefined' && docs.length > 0) {
                                                renderstuff(docs[0]);
                                              } else {
                                                notfound();
                                              }
                                           });
        });


       function notfound() {
          general.errorpage(res, req,
                                      'Ez a fegyver nem található.', 
                                      'De így legalább nem kell törölni.');
           }

       function renderstuff(data) {
  
          res.render('weapons_delete', {
                                 pagetitle: 'Fegyver törlése',
                                 username: req.session.name,
                                 userid: req.session.user,
                                 data: data
                               });
       }


    });


//  ------------------------[ DELETE WEAPON ] ------------------------

app.post('/weapons_delete',
    function(req, res) {

      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

        try {
          var finder = { '_id': new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { 'error': 'Ezt a fegyvert nem lehet törölni.' });
          return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('weapons').removeOne(finder, function(err) {
              if (!err) {
                general.sendJSON(res, { 'success': 'Fegyver törölve.' });
              } else {
                general.sendJSON(res, { 'error': 'Ezt a fegyvert nem lehet törölni.' });
              }
          });
        });
      });
    });
