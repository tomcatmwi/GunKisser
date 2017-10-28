//  ------------------------[ GET SINGLE USER INFORMATION ] ------------------------

app.get('/users_info/:id?',
    function(req, res) {
        general.checklogin(res, req);
        
        try {
          var finder = { '_id': new ObjectId(req.params.id) };
        } catch(err) {
          notfound();
          return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {

              db.collection('users').aggregate([
                                                  { $match: finder },
                                                  
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'country',
                                                                foreignField: 'id',
                                                                as: 'country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $group: { '_id': '$_id',
                                                              'name': { $first: '$name' },
                                                              'legalEntity': { $first: '$legalEntity' },
                                                              'country': { $first: '$country' },
                                                              'province': { $first: '$province' },
                                                              'city': { $first: '$city' },
                                                              'zip': { $first: '$zip' },
                                                              'street': { $first: '$street' },
                                                              'houseno': { $first: '$houseno' },
                                                              'address_misc': { $first: '$address_misc' },
                                                              'phone1': { $first: '$phone1' },
                                                              'phone2': { $first: '$phone2' },
                                                              'phone3': { $first: '$phone3' },
                                                              'fax1': { $first: '$fax1' },
                                                              'fax2': { $first: '$fax2' },
                                                              'fax3': { $first: '$fax3' },
                                                              'email': { $first: '$email' },
                                                              'skype': { $first: '$skype' },
                                                              'remarks': { $first: '$remarks' },
                                                              'permitno': { $first: '$permitno' },
                                                              'taxno': { $first: '$taxno' },
                                                              'eutaxno': { $first: '$eutaxno' },
                                                              'registered': { $first: '$registered' }
                                                            } 
                                                  },
                                                  
                                                  { $project: {
                                                                '_id': 1,
                                                                'name': 1,
                                                                'legalEntity': 1,
                                                                'registered': 1,
                                                                'country': 1,
                                                                'province': 1,
                                                                'city': 1,
                                                                'zip': 1,
                                                                'street': 1,
                                                                'houseno': 1,
                                                                'address_misc': 1,
                                                                'email': 1,
                                                                'skype': 1,
                                                                'phoneFormatted': { $concat: [ '+', '$phone1', ' (', '$phone2', ') ', '$phone3' ] },
                                                                'phone': { $concat: [ '+', '$phone1', '$phone2', '$phone3' ] },
                                                                'fax': { $concat: [ '+', '$fax1', '$fax2', '$fax3' ] },
                                                                'faxFormatted': { $concat: [ '+', '$fax1', ' (', '$fax2', ') ', '$fax3' ] },
                                                                'remarks': 1,
                                                                'permitno': 1,
                                                                'taxno': 1,
                                                                'eutaxno': 1,
                                                                'registered': 1
                                                              }
                                                  }
                                                ], 
                                                { collation: collation },
                                                
            function(err, docs) {
                db.close();
                if (!err && docs.length > 0) {
                    docs[0].date_formatted = dateformat(docs[0].registered, settings.date_format);
                    renderstuff(docs[0]);
                } else {
                    notfound();
                    return false;
                }
            });
        });
        
        
       function notfound() {
          general.errorpage(res, req,
                                      'Ez a felhasználó nem létezik.', 
                                      'Furcsa fordulat ez alapvetően stabilnak hitt univerzumunk történelmében.');
           }
           
       function renderstuff(data) {
  
          res.render('users_info', {
                                 pagetitle: 'Ügyfél adatlapja',
                                 username: req.session.name,
                                 userid: req.session.user,
                                 data: data
                               });
       }
    });


//  ------------------------[ GET USERS ] ------------------------

/*
app.post('/users_info',
    function(req, res) {
      return false;
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
*/
