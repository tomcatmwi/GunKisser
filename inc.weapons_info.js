//  ------------------------[ WEAPON INFO FORM ] ------------------------
app.get('/weapons_info/:id?/:examine?',
   function(req, res) {

      general.checklogin(res, req);
      
      try {
        var finder = new ObjectId(req.params.id);
      } catch(err) {
        notfound();
        return false;
      }
      
      general.MongoDB_connect(settings.mongoDB, function(db) {
          
        var users = [];
        var weapon = null;
        
        function getusers() {
            db.collection('users').aggregate(
                        [{ $sort: { 'name': 1 } }],
                        { collation: collation },
                        function(err, docs) {
                            if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                users = docs;
                                getweapons();
                            } else {
                                notfound();
                                return false;
                            }
                       
                        });
        }
        
        function getweapons() {

            db.collection('weapons').aggregate([{ $match: { _id: finder } },

                                                { $lookup: {
                                                                    from: 'weapons_exam',
                                                                    localField: '_id',
                                                                    foreignField: 'weapon._id',
                                                                    as: 'weapons_exam'
                                                           }
                                                },
                                                { $unwind: { path: '$weapons_exam', 
                                                             preserveNullAndEmptyArrays: true
                                                           }
                                                },
                                                { $sort: { 'weapons_exam.date': -1 } },

                                                { $group: {
                                                            '_id': '$_id',
                                                            'weapons_exam': { $push: '$weapons_exam' },
                                                            'parts': { $first: '$parts' },
                                                            'trigger_tests': { $first: '$trigger_tests' },
                                                            'name': { $first: '$name' },
                                                            'serialno': { $first: '$serialno' },
                                                            'caliber': { $first: '$caliber' },
                                                            'type': { $first: '$type' },
                                                            'category': { $first: '$category' },
                                                            'year': { $first: '$year' },
                                                            'description': { $first: '$description' }
                                                          }
                                                },

                                                { $project: {
                                                                '_id': 1,
                                                                'name': 1,
                                                                'serialno': 1,
                                                                'caliber': 1,
                                                                'category': 1,
                                                                'type': 1,
                                                                'year': {
                                                                    $cond: { if: '0', then: 'Nem ismert', else: '$year' }
                                                                },
                                                                'description': 1,
                                                                'parts': 1,
                                                                'trigger_tests': 1,
                                                                'weapons_exam._id': 1,
                                                                'weapons_exam.date_formatted': 1,
                                                                'weapons_exam.examiner': 1,
                                                                'weapons_exam.examiner_id': 1
                                                            }
                                                }
                                               ], 
                                               { collation: collation },
                                               function (err, docs) {
                                                  db.close();

                                                  if (!err && typeof docs.length != 'undefined' && docs.length > 0) {
                                                    docs[0].date_formatted = dateformat(docs[0].date, settings.date_format);
                                                    weapon = docs[0];
                                                    renderstuff();
                                                    return false;
                                                  } else {
                                                    notfound();
                                                    return false;
                                                  }
            });
        
        }

        function notfound() {
                     general.errorpage(res, req,
                                                'Ez a fegyver nincs meg.',
                                                'Az élet kemény, a fegyver csöve meg még keményebb. Sose verjük fejbe embertársunkat fegyverrel.');
        }

        function renderstuff() {
        
          if (req.params.examine == 'examine')
            res.render('weapons_exam', {
                                                  data: weapon,
                                                  pagetitle: 'Fegyvervizsgálat',
                                                  users: users,
                                                  username: req.session.name,
                                                  userid: req.session.user
                       });
          
          else
            res.render('weapons_info', {
                                                  data: weapon,
                                                  pagetitle: 'Fegyver adatai',
                                                  username: req.session.name,
                                                  userid: req.session.user
                       });

        }
        
        getusers();

   });
   
});

