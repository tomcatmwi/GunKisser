//  ------------------------[ DISPLAY DELETE WEAPON EXAMINATION FORM ] ------------------------

app.get('/weapons_exam_delete/:id?',
   function(req, res) {

      general.checklogin(res, req);
      
      if (typeof req.params.id != 'undefined') {
        try {
          var finder = new ObjectId(req.params.id);
        } catch(err) {
          notfound();
          return false;
        }
      }

      general.MongoDB_connect(settings.mongoDB, function(db) {
      
          db.collection('weapons_exam').findOne(finder, function(err, docs) {
          
              if (err || typeof docs == 'undefined' || docs.length <= 0) {
                notfound();
                return false;
              } else {
                res.render('weapons_exam_sheet_delete', {
                                                      data: docs,
                                                      pagetitle: 'Vizsgálati lap törlése',
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
                                                'De így legalább nem kell törölni.');
    }

});

//  ------------------------[ DELETE WEAPON EXAMINATION SHEET ] ------------------------

app.post('/weapons_exam_sheet_delete',
   function(req, res) {

      general.checklogin(res, req);
      general.getpostdata(req, function(postdata) {
      
        try {
          var finder = new ObjectId(postdata.id);
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen azonosító.' });
          return false;
        }

        general.MongoDB_connect(settings.mongoDB, function(db) {

          db.collection('weapons_exam').findOne({ _id: finder }, function(err, docs) {
              if (err || typeof docs == 'undefined' || docs.length == 0) {
                general.sendJSON(res, { error: 'Ez a vizsgálati lap nincs az adatbázisban.' });
                return false;
              } else {
              
                if (typeof docs.images != 'undefined' && docs.images.length > 0)
                  for (t in docs.images)
                    fs.unlinkSync(__dirname+'/public/userdata/weapon_exams/'+docs.images[t]);
                    
                for(t in docs.parts_tests)
                  if (typeof docs.parts_tests[t].images != 'undefined' && docs.parts_tests[t].images.length > 0)
                    for (x in docs.parts_tests[t].images)
                      fs.unlinkSync(__dirname+'/public/userdata/weapon_exams/'+docs.parts_tests[t].images[x]);

                db.collection('weapons_exam').remove({ _id: finder }, function(err) {
                    if (err) {
                      general.sendJSON(res, { error: 'Ez a vizsgálati lap nem törölhető.' });
                      return false;
                    } else {
                      general.sendJSON(res, { success: 'A vizsgálati lap törlése sikeres.' });
                    }
                });
                
              }
          });
        });
    });
});

