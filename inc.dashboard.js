//  ------------------------[ DASHBOARD ] ------------------------

app.get('/dashboard',
    function(req, res) {
        general.checklogin(res, req);
        if (typeof req.session.user === 'undefined')
           res.redirect('/login')
        else
           res.render('dashboard', { 
                                     pagetitle: 'Dashboard',
                                     username: req.session.name,
                                     userid: req.session.user
                                   });
    });
