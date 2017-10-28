//  ------------------------[ LOGIN AND LOGOUT ] ------------------------

app.get('/logout',
    function(req, res) {
        general.log('User '+req.session.name+' logged out');
        req.session.reset();
        res.redirect('/login')
    });

app.get('/login',
    function(req, res) {
        if (typeof req.session.user === 'undefined')
          res.render('login');
        else
          res.redirect('/dashboard')
    });

app.post('/login',
    function(req, res) {
        
        var ip = general.getIP(req);

        general.getpostdata(req, function(postdata) {
        
            //  verify username and password

            general.MongoDB_connect(settings.mongoDB, function(db) {
            
                db.collection('users').find({ username: postdata.username,
                                              password: postdata.password,
                                              userlevel: { $gt: 0 }
                                            }).toArray(function(err, docs) {
                                            
                                               db.close();
                                               if (err == null && docs.length > 0) {
                                                 
                                                 general.log('Successful login: '+docs[0].name+'. IP: '+ip);
                                                 
                                                 // save session
                                                 req.session.user = docs[0]._id;
                                                 req.session.name = docs[0].name;
                                                 req.session.userlevel = docs[0].userlevel;
                                                 req.session.email = docs[0].email;
                                                 general.sendJSON(res, { user: docs[0].name });
                                                 
                                               } else {
                                                 general.log('Invalid login attempt. IP: '+ip);
                                                 general.sendJSON(res, { error: 'Helytelen felhasználónév vagy jelszó.' });
                                               }
                                            });
            });
        });
    });
