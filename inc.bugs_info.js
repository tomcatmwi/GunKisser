//  ------------------------[ GET SINGLE BUG REPORT INFORMATION ] ------------------------

app.get('/bugs_info/:id?',
    function(req, res) {
        general.checklogin(res, req);
        
        try {
          var finder = { '_id': new ObjectId(req.params.id) };
        } catch(err) {
          notfound();
          return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {

              db.collection('bugs').aggregate([
                                                  { $match: finder },
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
                                                  
                                                  { $sort: { 'stages.date': 1 }},
                                                  { $unwind: '$stages' },
                                                  
                                                  { $lookup: {
                                                                from: 'users',
                                                                localField: 'stages.user',
                                                                foreignField: '_id',
                                                                as: 'stages_users'
                                                             }
                                                  },
                                                  
                                                  { $unwind: '$stages' },
                                                                                                    
                                                  { $group: {
                                                                '_id': '$_id',
                                                                'title': { $first: '$title' },
                                                                'browser': { $first: '$browser' },
                                                                'severity': { $first: '$severity' },
                                                                'data': { $first: '$data' },
                                                                'date': { $first: '$date' },
                                                                'userdata': { $first: '$userdata' },
                                                                'stages_all': { $first: '$stages' },
                                                                'stages': { $push: { $concatArrays: [ '$stages_users', ['$stages'] ] } }
                                                            }
                                                  },
                                                  
                                                  { $project: {

                                                                '_id': 1,
                                                                'title': 1,
                                                                'browser': 1,
                                                                'date': 1,
                                                                'severity': 1,
                                                                'userdata._id': 1,
                                                                'userdata.name': 1,
                                                                'stages.id': 1,
                                                                'stages.name': 1,
                                                                'stages.date': 1,
                                                                'stages.description': 1,
                                                                'stages.previous_severity': 1,
                                                                'stages.severity': 1,
                                                                'stages.files': 1,
                                                                'date': 1

                                                             }
                                                  }
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();

                if (!err && docs.length > 0) {
                    
//  clean up shit after mongodb, the stupid fuck
                    
                    var docs2 = docs[0];
                    for (t in docs2.stages) {
                      docs2.stages[t]= Object.assign(docs2.stages[t][0], docs2.stages[t][1]);
                    }
                    
                    if (typeof docs2.userdata == 'undefined')
                      docs2.userdata = { name: 'Törölt felhasználó' }
                      
                    docs2.date_formatted = dateformat(docs2.date, settings.date_format);

                    for (t in docs2.stages) {
                      docs2.stages[t].date_formatted = dateformat(docs2.stages[t].date, settings.date_format);
                     if (typeof docs2.stages[t].name == 'undefined')
                        docs2.stages[t].name = 'Törölt felhasználó';
                    }
                    
                    docs2.stages.sort(function(a, b) {
                                                        if (a.date < b.date) return 1;
                                                        if (a.date > b.date) return -1;
                                                        return 0;
                    });
                    
                    renderstuff(docs2);
                    return false;
                } else {
                    notfound();
                    return false;
                }
              });
        });
        
        
       function notfound() {
          general.errorpage(res, req,
                                      'Ez a hibajelentés nincs meg.', 
                                      'A nindzsák, azok lehettek már megint.');
           }
           
       function renderstuff(data) {
  
          res.render('bugs_info', {
                                 pagetitle: 'Hibajelentés',
                                 username: req.session.name,
                                 userid: req.session.user,
                                 data: data
                               });
       }
    });


//  ------------------------[ GET BUG REPORTS ] ------------------------

app.post('/bugs_info',
    function(req, res) {

      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {};
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
                                                  
                                                  { $unwind: '$userdata' },
                                                  { $unwind: '$stages' },

                                                  { $lookup: {  from: 'users',
                                                                localField: 'stages.user',
                                                                foreignField: '_id',
                                                                as: 'stages_users'
                                                              }
                                                  },
                                                  
                                                  { $unwind: '$stages_users' },
                                                  
                                                  { $group: { _id: '$_id',
                                                              title: { $first: '$title' },
                                                              date: { $first: '$date' },
                                                              severity: { $first: '$severity' },

                                                              userdata: { $push: '$userdata' },
                                                              stages: { $push: { stage: '$stages', user: '$stages_users' } }
                                                            }
                                                  },

                                                  { $unwind: '$userdata' },
                                                  
                                                  { $project: {
                                                                'title': 1,
                                                                'date': 1,
                                                                'severity': 1,
                                                                'browser': 1,
                                                                
                                                                'userdata._id': 1,
                                                                'userdata.title': 1,
                                                                'userdata.firstname': 1,
                                                                'userdata.lastname': 1,

                                                                'stages.user._id': 1,
                                                                'stages.user.title': 1,
                                                                'stages.user.firstname': 1,
                                                                'stages.user.lastname': 1,
                                                                'stages.stage.date': 1,
                                                                'stages.stage.description': 1,
                                                                'stages.stage.severity': 1,
                                                                'stages.stage.previous_severity': 1,
                                                                'stages.stage.files': 1
                                                              }
                                                  }
                                                ], 
                                                { collation: collation },
                                                function(err, docs) {
                                      
                db.close();

                if (!err) {

                    for (t in docs) {
                      docs[t].userdata.name = general.formname(docs[t].userdata);
                      docs[t].date_formatted = dateformat(docs[t].date, settings.date_format);

                      for(tt in docs[t].stages) {
                        docs[t].stages[tt].stage.date_formatted = dateformat(docs[t].stages[tt].stage.date_formatted, settings.date_format);
                        docs[t].stages[tt].user.name = general.formname(docs[t].stages[tt].user);
                      }
                    }
                    
                    general.sendJSON(res, { startrecord: startrecord,
                                            pagesize: settings.pagination_limit,
                                            totalrecords: totalrecords,
                                            results: docs });
                    return false;
                } else {
                    general.sendJSON(res, { 'error': String(err) });
                    general.log(JSON.stringify(err, null, 3));
                    return false;
                }
              });
            });
          });
        });
      });

//  ------------------------[ GET STAGE ADDITION FORM ] ------------------------

app.get('/bugs_addstage/:id?',
    function(req, res) {
       general.checklogin(res, req);
        
       try {
          var finder = { '_id': new ObjectId(req.params.id) };
       } catch(err) {
          notfound();
          return false;
       }
       
       general.MongoDB_connect(settings.mongoDB, function(db) {
         db.collection('bugs').aggregate([
                                            { $match: finder }
                                         ], 
                                         function(err, docs) {
            if (!err && docs.length > 0) {
              docs = docs[0];
              renderstuff(docs)
            } else {
              notfound();
            }
            return false;
         });
       });
       
       function notfound() {
          general.errorpage(res, req,
                                      'Ez a hibajelentés nincs meg.', 
                                      'A nindzsák, azok lehettek már megint.');
       }
           
       function renderstuff(data) {

          res.render('bugs_addstage', {
                                 pagetitle: 'Új lépés',
                                 username: req.session.name,
                                 userid: req.session.user,
                                 id: req.params.id,
                                 data: data
                               });
       }

});

//  ------------------------[ ADD NEW STAGE ] ------------------------

app.post('/bugs_addstage',
   function(req, res) {

      if (general.checklogin_post(res, req))
         general.getpostdata(req, function(postdata) {

            var ip = general.getIP(req);

            //  verify posted data

            if (postdata.id == 0) 
              finder = new ObjectId()
            else 
            try {
               var finder = new ObjectId(String(postdata.id));
            }
            catch (err) {
               general.sendJSON(res, { error: 'Ehhez a hibajelentéshez nem lehet több lépést adni.' });
               return false;
            }

            if (postdata.id != '0') postdata._id = finder
            else delete postdata._id;

            if (postdata.description.length < 10) { general.sendJSON(res, { error: 'Túl rövid a szöveg.' }); return false; }
            if (isNaN(postdata.severity) || postdata.severity < 0 || postdata.severity > 6) { general.sendJSON(res, { error: 'Érvénytelen súlyosság.' }); return false; }

            //  assemble inserted data
            
            var stage = postdata;
            stage.date = new Date();
            stage.user = new ObjectId(req.session.user);
            stage.id = general.RandomString(12, false, false);
            delete stage._id;
            
            //  modify db

            general.MongoDB_connect(settings.mongoDB, function(db) {
               db.collection('bugs').update(
                                              { _id: finder },
                                              { 
                                                $set: { severity: postdata.severity },
                                                $push: { stages: stage }
                                              },
                                              { upsert: true },
                     function(err) {
                        if (err == null)
                           general.sendJSON(res, { success: 'A lépés hozzáadása sikeres.' })
                        else {
                           general.log('MongoDB error in /inc.weapon_categories_edit.js: ' + err.message);
                           general.sendJSON(res, { error: 'MongoDB hiba: ' + err.message });
                        }
                        db.close();
                        return false;
                     });
                });
         });
   });
