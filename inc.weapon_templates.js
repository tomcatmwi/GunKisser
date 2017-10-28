//  ------------------------[ WEAPON TEMPLATES LIST ] ------------------------

app.get('/weapon_templates',
    function(req, res) {
        general.checklogin(res, req);
        res.render('weapon_templates', {
                               pagetitle: 'Fegyversablonok',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ GET WEAPON TEMPLATES ] ------------------------

app.post('/weapon_templates',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        finder = {};
      
        if (postdata.id) {
            try {
              var finder = { '_id': new ObjectId(postdata.id) };
            } catch(err) {
              general.sendJSON(res, { 'error': 'Nincs ilyen sablon.' });
              return false;
            }
        }

//  text search

        else if (postdata.search != '') {
          
          if (postdata.search.length <= 3) {
            general.sendJSON(res, { 'error': 'A keresőszó túl rövid.' });
            return false;
          }

          switch(postdata.searchmode) {
            //  %like%
              case '0': var value = { $regex: new RegExp(postdata.search, 'gi') }; break;
            //  like%
              case '1': var value = { $regex: new RegExp('^'+postdata.search, 'gi'), }; break;
            //  like
              case '2': value = postdata.search; break;
          }
            
          finder = { $or: [{ name : value }, { description : value }, { 'parts.name' : value } ] }
          
        }

//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('weapon_templates').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('weapon_templates').aggregate([
                                                  { $match: finder },
                                                  { $sort: { name: 1 } },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                
                if (err) {
                    general.sendJSON(res, { 'error': 'Nincs ilyen sablon.' });
                    return false;
                } else {
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } 
              });
            });
          });
        });
      });

//  ------------------------[ CLONE WEAPON TEMPLATE ] ------------------------

app.post('/weapon_templates_clone',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        try {
            var finder = new ObjectId(postdata.id);
        } catch(err) {
            general.sendJSON(res, { 'error': 'Nincs ilyen sablon.' });
            return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {
        
//  get record

              db.collection('weapon_templates').findOne(finder,
                                                         function(err, docs) {
                                                         if (err == null) {
                                                            docs.name = docs.name + ' COPY';
                                                            delete docs._id;
                                                            
                                                         db.collection('weapon_templates').insert(docs,
                                                                                                  function(err, docs) {
                                                                                                    if (err == null) {
                                                                                                      general.sendJSON(res, { 'success': 'A klónozás sikeres.' });
                                                                                                      return false;
                                                                                                    } else {
                                                                                                      general.sendJSON(res, { 'error': 'A klónozás sikertelen.' });
                                                                                                      return false;
                                                                                                    }
                                                                                                  });

                                                         } else {
                                                            general.sendJSON(res, { 'error': 'Nincs ilyen sablon.' });
                                                            return false;
                                                         }
              });
          });
      })
});
