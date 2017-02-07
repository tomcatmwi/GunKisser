//  ------------------------[ USER LIST ] ------------------------

app.get('/users',
    function(req, res) {
        general.checklogin(res, req);
        res.render('users', {
                               pagetitle: 'Felhasználók',
                               username: req.session.name,
                               userid: req.session.user
                             });
    });


//  ------------------------[ SEARCH USERS ] ------------------------

app.post('/users',
    function(req, res) {
      if (general.checklogin_post(res, req))
      general.getpostdata(req, function(postdata) {

//  assemble filter criteria

        var finder = {}
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
                finder = { $or: [{ name : value }, { company_name : value }, { city : value }, { street : value },
                                 { email : value }, { skype : value }, { company_city : value }, { company_street : value },
                                 { username : value }, { remarks : value }] }
            } else {
                finder = {};
                finder[postdata.searchfield] = value;
            }
          }
        }
        
//  assemble sorter criteria

        if (typeof postdata.sortmode != 'undefined') var sortmode = Number(postdata.sortmode)
          else sortmode = 1;

        if (typeof postdata.sortby != 'undefined') var sortby = postdata.sortby
          else postdata.sortby = 0;
        
        switch(postdata.sortby) {
          case 0: var sorter = { name: sortmode, company_name: sortmode }; break;
          case 1: var sorter = { company_name: sortmode, name: sortmode }; break;
          case 2: var sorter = { registered: sortmode, name: 1 }; break;
          case 3: var sorter = { email: sortmode }; break;
          case 4: var sorter = { skype: sortmode }; break;
        }
        
        if (postdata.id)
          var selector = {}
        else
          var selector = { name: 1, company_name: 1, phone1: 1, phone2: 1, phone3: 1, email: 1, skype: 1 }
        
//  generate page number

        if (typeof postdata.page != 'undefined') var sortmode = Number(postdata.page)
         else var page = 2;
        
//  do search

        mongodb.connect(mongodb_url, function(err, db) {
          db.collection('users').find(finder, selector)
                                .limit(10)
                                .skip(page)
                                .sort(sorter)
                                .toArray(function(err, docs) {
            db.close();
            if (err == null && docs != null) {
                docs['page'] = page;
                general.sendJSON(res, docs);
                return false;
            } else {
              if(postdata.id)
                general.sendJSON(res, { 'error': 'A keresett felhasználó nem található az adatbázisban.' })
              else
                general.sendJSON(res, { 'error': 'Nincs a keresésnek megfelelő felhasználó.' });
              return false;
            }
          })
        });
      });
    });
