//  ------------------------[ DASHBOARD ] ------------------------

app.get('/dashboard',
    function(req, res) {
        general.checklogin(res, req);
        res.render('dashboard', { 
                                     pagetitle: 'Dashboard',
                                     username: req.session.name,
                                     userid: req.session.user
                                });
    });
