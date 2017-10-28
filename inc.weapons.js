//  ------------------------[ WEAPON LIST ] ------------------------

app.get('/weapons',
    function(req, res) {
        general.checklogin(res, req);
        res.render('weapons', {
                               pagetitle: 'Fegyverek',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ SEARCH WEAPONS ] ------------------------

app.post('/weapons',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {}
        if (postdata.id) {
            try {
              var finder = new ObjectId(postdata.id);
            } catch(err) {
              general.sendJSON(res, { 'error': 'A keresett fegyver nem található az adatbázisban.' });
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
                finder = { $or: [{ 'serialno': value }, { 'description': value }, { 'name': value }] }
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
          case 1: var sorter = { serialno: sortmode }; break;
          case 2: var sorter = { date: sortmode }; break;
          case 3: var sorter = { category: sortmode }; break;
          case 4: var sorter = { caliber: sortmode }; break;
        }
        
        if (postdata.id)
          var selector = {
                            _id: 1,
                            name: 1,
                            caliber: 1,
                            category: 1,
                            serialno: 1,
                            description: 1,
                            year: 1,
                            date: 1,
                            parts: 1,
                            trigger_tests: 1,
                         }

        else
          var selector = {
                            _id: 1,
                            name: 1,
                            caliber: 1,
                            category: 1,
                            serialno: 1,
                            date: 1
                         }
        
//  generate page number

        if (typeof postdata.startrecord != 'undefined') var startrecord = Number(postdata.startrecord)
         else var startrecord = 0;
         
        general.MongoDB_connect(settings.mongoDB, function(db) {

//  count total number of documents matching the query

          db.collection('weapons').aggregate([ 
                                               { $match: finder },
                                               { $project: { _id: 1 } },
                                               { $group: { _id: null, count: { $sum: 1 } } }
                                            ], function(err, docs) {
                                            
                                            if (err == null && typeof docs != 'undefined' && typeof docs[0] != 'undefined')
                                              var totalrecords = docs[0].count
                                            else
                                              var totalrecords = 0;

//  do actual search

              db.collection('weapons').aggregate([
                                                  { $match: finder },
                                                  { $sort: sorter },
                                                  { $limit: startrecord + settings.pagination_limit },
                                                  { $skip: startrecord },
                                                  { $project: selector }
                                                  
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();
                if (err == null) {
                    
                    for (var t in docs)
                      docs[t].date_formatted = dateformat(docs[t].date, settings.date_format);

                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {

                  if(postdata.id)
                    general.sendJSON(res, { 'error': 'A keresett fegyver nem található az adatbázisban.' })
                  else
                    general.sendJSON(res, { 'error': err+'Nincs a keresésnek megfelelő fegyver.' });
                  return false;
                }
              });
          
          });
        });
      });
    });
