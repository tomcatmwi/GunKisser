//  ------------------------[ WEAPON TEMPLATES LIST ] ------------------------

app.get('/calibers',
    function(req, res) {
        general.checklogin(res, req);
        res.render('calibers', {
                               pagetitle: 'Kaliberjelek',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ GET WEAPON CATEGORIES ] ------------------------

app.post('/calibers',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var finder = {}
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'Nincs ilyen kaliberjelzés.' });
              return false;
            }
        }

//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('calibers').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('calibers').aggregate([
                                                  { $match: finder },
                                                  { $sort: { name: 1 } },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                if (err == null) {
                    
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                    general.sendJSON(res, { 'error': err+' Nincs ilyen kaliberjelzés.' });
                    return false;
                }
              });
            });
          });
        });
      });
