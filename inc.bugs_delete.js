//  ------------------------[ BUG REPORT DELETE FORM ] ------------------------

app.get('/bugs_delete/:id?',
    function(req, res) {
        general.checklogin(res, req);
        
        if (typeof req.params.id != 'undefined') {
          try {
              var finder = new ObjectId(req.params.id);
          } catch(err) {
              notfound();
              return false;
          }
                
          general.MongoDB_connect(settings.mongoDB, function(db) {
            db.collection('bugs').findOne(finder, function(err, docs) {
              db.close();

              if (!err && docs != null) {
                docs.date_formatted = dateformat(docs.date, settings.date_format);
                return renderstuff(docs)
              } else
                return notfound();
              })
          });
           
        } else {
          notfound();
        }

        function notfound() {
           general.errorpage(res, req,
                                      'Nincs ilyen hibajegy.', 
                                      'Ez most vagy az isteni tökéletesség műve, vagy a világot pusztító entrópiáé. Ez a kettő tökre üti egymást.');
           }

        
        function renderstuff(data) {
          res.render('bugs_delete', {
                                 data: data,
                                 username: req.session.name,
                                 userid: req.session.user
                               });
        }
    });


//  ------------------------[ DELETE USERS ] ------------------------

app.post('/bugs_delete',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {
      
        var ip = general.getIP(req);

        try {
          var finder = { _id: new ObjectId(postdata.id) };
        } catch(err) {
          general.sendJSON(res, { error: 'Érvénytelen azonosító.' });
          return false;
        }
        
        general.MongoDB_connect(settings.mongoDB, function(db) {
          db.collection('bugs').findOneAndDelete(finder, function(err, docs) {
            db.close();
              if (err == null && docs != null) {
              
              //  delete uploaded images

                docs = docs.value;
                for (var t in docs.stages) {
                  for(var x in docs.stages[t].files) {
                    fs.unlink(__dirname+'/public/userdata/bugreport_screenshots/'+docs.stages[t].files[x], function() {});
                  }
                }
              
                general.log('Bug report "'+docs.title+'" deleted by: '+req.session.name+' IP: '+ip);
                general.sendJSON(res, { success: 'Hibajelentés törölve.' });
              } else {
                general.log(err);
                general.sendJSON(res, { error: 'Ez a hibajelentés nem törölhető.' });
              }
            })
        });
        
      });
    });

