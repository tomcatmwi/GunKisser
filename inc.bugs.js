//  ------------------------[ BUG LIST ] ------------------------

app.get('/bugs',
    function(req, res) {
        general.checklogin(res, req);
        res.render('bugs', {
                               pagetitle: 'Hibabejelentő',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ GET BUG REPORTS ] ------------------------

app.post('/bugs',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {};
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'Ez a hibajelentés nem található az adatbázisban.' });
              return false;
            }
        } else {
          
//  text search
          
          if (postdata.search != '') {
          
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
            
            if (postdata.searchfield == '*') {
                finder = { $or: [{'title' : value}, {'stages.description': value}]}
            } else {
                finder = {};
                finder[postdata.searchfield] = value;
                
            }
          }
        }
        
//  assemble sorter criteria

        if (typeof postdata.sortmode != 'undefined') var sortmode = Number(postdata.sortmode)
          else sortmode = 1;

        if (typeof postdata.sortby != 'undefined') var sortby = Number(postdata.sortby)
          else sortby = 0;
        
        switch(sortby) {
          case 0: var sorter = { date: sortmode }; break;
          case 1: var sorter = { severity: sortmode, date: -1 }; break;
          case 2: var sorter = { title: sortmode }; break;
          case 3: var sorter = { user: sortmode, date: -1 }; break;
        }
                
//--------------------------------------------------------------------------------------------------------------------------------------
//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
          else var startrecord = 0;

        general.MongoDB_connect(settings.mongoDB, function(db) {
              
              db.collection('bugs').aggregate([ 
                                             { $match: finder },
                                             { $project: { _id: 1 }},
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('bugs').aggregate([
                                                  { $match: finder },
                                                  { $sort: sorter },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  { $lookup: {  from: 'users',
                                                                localField: 'user',
                                                                foreignField: '_id',
                                                                as: 'userdata'
                                                              }
                                                  },
                                                  
                                                  { $unwind: { 
                                                                path: '$userdata', 
                                                                preserveNullAndEmptyArrays: true 
                                                             }
                                                  },

                                                  { $project: {
                                                                'userdata.title': 1,
                                                                'userdata.firstname': 1,
                                                                'userdata.lastname': 1,
                                                                'stages': 1,
                                                                '_id': 1,
                                                                'user': 1,
                                                                'title': 1,
                                                                'browser': 1,
                                                                'date': 1,
                                                                'severity': 1
                                                               }
                                                  }
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                
                if (!err) {

                    if (docs.length > 0)
                      
                      for (t in docs) {
                        if (typeof docs[t].userdata != 'undefined')
                          docs[t].userdata.name = general.formname(docs[t].userdata)
                        else {
                          docs[t].userdata = { name: 'Törölt felhasználó' }
                        }
                        
                        docs[t].date_formatted = dateformat(docs[t].date, settings.date_format);

                        for(tt in docs[t].stages) {
                          docs[t].stages[tt].date_formatted = dateformat(docs[t].stages[tt].date, settings.date_format);
                        }
                      }

                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                      general.sendJSON(res, { 'error': String(err) });
                    
                    return false;
                }
              });
            });
          });
        });
      });
