//  ------------------------[ USER LIST ] ------------------------

app.get('/users',
    function(req, res) {
        general.checklogin(res, req);
        res.render('users', {
                               pagetitle: 'Felhasználók',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ SEARCH USERS ] ------------------------

app.post('/users',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {}
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'A keresett felhasználó nem található az adatbázisban.' });
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
                finder = { $or: [{ name : value }, { company_name : value }, { city : value }, { street : value },
                                 { email : value }, { skype : value }, { company_city : value }, { company_street : value }, { username : value },
                                 { remarks : value }] }
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
          case 0: var sorter = { name: sortmode }; break;
          case 1: var sorter = { name: sortmode, legalEntity: sortmode }; break;
          case 2: var sorter = { registered: sortmode, firstname: 1, lastname: 1 }; break;
          case 3: var sorter = { email: sortmode }; break;
          case 4: var sorter = { skype: sortmode }; break;
        }
                
        if (postdata.id)
          var selector = {}
        else
          var selector = { _id: 1, name: 1, title: 1, firstname: 1, lastname: 1, company_name: 1, phone1: 1, phone2: 1, phone3: 1, email: 1, skype: 1 }
                  
//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
         else var startrecord = 0;
         
        general.MongoDB_connect(settings.mongoDB, function(db) {

//  count total number of documents matching the query

          db.collection('users').aggregate([ { $project: { _id: 1,
                                                           name: 1
                                                         } 
                                             },
                                             { $match: finder },
                                             { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('users').aggregate([
                                                  { $project: selector },
                                                  { $match: finder },
                                                  { $sort: sorter },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord }
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

                  if(postdata.id)
                    general.sendJSON(res, { 'error': 'A keresett felhasználó nem található az adatbázisban.' })
                  else
                    general.sendJSON(res, { 'error': 'Nincs a keresésnek megfelelő felhasználó.' });
                  return false;
                }
              });
          
          });
        });
      });
    });
