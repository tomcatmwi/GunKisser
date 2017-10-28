//  ------------------------[ VIEW WEAPON EXAMINATION SHEET ] ------------------------

app.get('/weapons_exam/:id?/:print?',
        function (req, res) {

            general.checklogin(res, req);

            if (typeof req.params.id != 'undefined') {
                try {
                    var finder = new ObjectId(req.params.id);
                } catch (err) {
                    notfound();
                    return false;
                }
            }

            general.MongoDB_connect(settings.mongoDB, function (db) {

                db.collection('weapons_exam').aggregate([
                    
                                                  { $match: { '_id': finder } },
                                                  
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner1.country',
                                                                foreignField: 'id',
                                                                as: 'owner1country'
                                                             }
                                                  },
                                                  
                                                  { $unwind: { path: '$owner1country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner2.country',
                                                                foreignField: 'id',
                                                                as: 'owner2country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner2country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner3.country',
                                                                foreignField: 'id',
                                                                as: 'owner3country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner3country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $group: { '_id': '$_id',
                                                              'owner1': { $first: '$owner1' },
                                                              'owner2': { $first: '$owner2' },
                                                              'owner3': { $first: '$owner3' },
                                                              'weapon': { $first: '$weapon' },
                                                              'general_description': { $first: '$general_description' },
                                                              'sight_test': { $first: '$sight_test' },
                                                              'trigger_tests': { $first: '$trigger_tests' },
                                                              'parts_tests': { $first: '$parts_tests' },
                                                              'examiner': { $first: '$examiner' },
                                                              'examiner_id': { $first: '$examiner_id' },
                                                              'date_formatted': { $first: '$date_formatted' },
                                                              'date': { $first: '$date' },
                                                              'images': { $first: '$images' }
                                                            } 
                                                  },

                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner1.country',
                                                                foreignField: 'id',
                                                                as: 'owner1.country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner1.country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                    
                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner2.country',
                                                                foreignField: 'id',
                                                                as: 'owner2.country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner2.country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },

                                                  { $lookup: {
                                                                from: 'countries',
                                                                localField: 'owner3.country',
                                                                foreignField: 'id',
                                                                as: 'owner3.country'
                                                             }
                                                  },
                                                  { $unwind: { path: '$owner3.country', 
                                                               preserveNullAndEmptyArrays: true
                                                             }
                                                  },
                                                  
                                                  { $project: {
                                                                '_id': 1,
                                                                'weapon': 1,
                                                                'owner1': 1,
                                                                'owner2': 1,
                                                                'owner3': 1,
                                                                'general_description': 1,
                                                                'sight_test': 1,
                                                                'trigger_tests': 1,
                                                                'parts_tests': 1,
                                                                'examiner': 1,
                                                                'examiner_id': 1,
                                                                'date_formatted': 1,
                                                                'date': 1,
                                                                'images': 1
                                                              }
                                                  }
                                                  
                ],
                { collation: collation },
                
                function (err, docs) {
                    
                    if (err || typeof docs == 'undefined' || docs.length <= 0) {
                        notfound();
                        return false;
                    } else {
                        res.render('weapons_exam_sheet', {
                                    data: docs[0],
                                    pagetitle: 'Vizsgálati lap',
                                    username: req.session.name,
                                    userid: req.session.user
                        });
                        return false;
                    }
                });
            });


            function notfound() {
                general.errorpage(res, req,
                        'Nincs vizsgálati lap ezzel az azonosítóval.',
                        'Ez szomorú.');
            }

        });

//  ------------------------[ SAVE WEAPON EXAMINATION SHEET ] ------------------------

app.post('/weapons_exam',
        function (req, res) {

            general.checklogin(res, req);
            general.getpostdata(req, function (postdata) {

//  verify object ids for the weapon and the owners

                try {
                    var finder = new ObjectId(postdata.weapon);
                } catch (err) {
                    general.sendJSON(res, {error: 'Érvénytelen fegyverazonosító.'});
                    return false;
                }

                try {
                    var owner1 = new ObjectId(postdata.owner1);
                } catch (err) {
                    general.sendJSON(res, {error: 'Érvénytelen tulajdonos.'});
                    return false;
                }
                
                try {
                    var owner2 = new ObjectId(postdata.owner2);
                } catch (err) {
                    general.sendJSON(res, {error: 'Érvénytelen vizsgáltató.'});
                    return false;
                }
                
                try {
                    var owner3 = new ObjectId(postdata.owner3);
                } catch (err) {
                    general.sendJSON(res, {error: 'Érvénytelen leadó.'});
                    return false;
                }

                postdata._id = new ObjectId();

                if (typeof postdata.parts_tests == 'undefined' || postdata.parts_tests.length < 1) {
                    general.sendJSON(res, {error: 'A fődarabok listája üres.'});
                    return false;
                }
                if (typeof postdata.trigger_tests == 'undefined' || postdata.trigger_tests.length < 1) {
                    general.sendJSON(res, {error: 'Az elsütési tesztek listája üres.'});
                    return false;
                }

                general.MongoDB_connect(settings.mongoDB, function (db) {

//  find weapon
                    function findWeapon() {
                        db.collection('weapons').aggregate([
                            {$match: {'_id': finder}}],
                                {collation: collation},
                                function (err, docs) {
                                    if (err || typeof docs == 'undefined' || docs.length <= 0) {
                                        general.sendJSON(res, {error: 'Ez a fegyver nincs az adatbázisban.'});
                                        return false;
                                    } else {
                                        postdata.weapon = docs[0];
                                        postdata.examiner = req.session.name;
                                        postdata.examiner_id = req.session.user;
                                        postdata.date = new Date();
                                        postdata.date_formatted = dateformat(postdata.date, settings.date_format);
                                        findOwners();
                                    }
                                });
                    }

//  find owner data
                    
                    function findOwners() {
                        db.collection('users').aggregate([{
                                                            $match: { $or: [ 
                                                                        { '_id': owner1 },
                                                                        { '_id': owner2 },
                                                                        { '_id': owner3 }
                                                                        ] }
                                                          }],
                                {collation: collation},
                                function (err, docs) {
                                    if (err || typeof docs == 'undefined' || docs.length <= 0) {
                                        general.sendJSON(res, {error: 'A vizsgáltató személyek közül egy vagy több nincs ügyfélként regisztrálva.'});
                                        return false;
                                    } else {
                                        for (t in docs) {
                                            delete docs[t].username;
                                            delete docs[t].password;
                                            delete docs[t].remarks;
                                            delete docs[t].userlevel;
                                            if (String(docs[t]._id) == String(owner1)) postdata.owner1 = docs[t];
                                            if (String(docs[t]._id) == String(owner2)) postdata.owner2 = docs[t];
                                            if (String(docs[t]._id) == String(owner3)) postdata.owner3 = docs[t];
                                        }
                                        saveExamSheet();
                                    }
                                });
                    }

//  save exam sheet

                    function saveExamSheet() {
                        db.collection('weapons_exam').insert(postdata, function (err) {
                            if (!err) {
                                general.sendJSON(res, {success: 'A vizsgálati lap mentése sikeres.', id: postdata._id});
                            } else {
                                general.sendJSON(res, {error: 'A vizsgálati lap mentése nem sikerült.'});
                            }
                        });
                    }
                    
                    findWeapon();
                    
                });
            });
        });

