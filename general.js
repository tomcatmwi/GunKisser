  function ts2log(timestamp) {
  
    var ts = timestamp.getFullYear()+'/';
    
    var temp = timestamp.getMonth()+1;
    if (Number(temp) < 10) temp = '0'+temp;
    ts += temp + '/';

    var temp = timestamp.getDate();
    if (Number(temp) < 10) temp = '0'+temp;
    ts += temp + ' ';
    
    var temp = timestamp.getHours();
    if (Number(temp) < 10) temp = '0'+temp;
    ts += temp + ':';
    
    var temp = timestamp.getMinutes();
    if (Number(temp) < 10) temp = '0'+temp;
    ts += temp + ':';
    
    var temp = timestamp.getSeconds();
    if (Number(temp) < 10) temp = '0'+temp;
    ts += temp + ' ';
    
    return ts;
  }

//  ---------------------------------------------------------------------------------------------------------------------------------------

const self = module.exports = {

  timestamp2log: function(timestamp) {
    return ts2log(timestamp);
  },

//  ---------------------------------------------------------------------------------------------------------------------------------------

  log: function(msg) {
    var date = new Date();
    console.log(ts2log(date)+' '+msg);
  },

//  ---------------------------------------------------------------------------------------------------------------------------------------

  getpostdata: function(req, cb) {
    var postdata = [];
    req.on('data', function(chunk) {
      postdata.push(chunk);
    }).on('end', function() {
      try {
        stuff = JSON.parse(decodeURIComponent(Buffer.concat(postdata).toString()));
      } catch(error){
        stuff = { error: error };
      } finally {
        cb(stuff);
      }
    });
  },
  
//  ---------------------------------------------------------------------------------------------------------------------------------------

  sendJSON: function(res, data) {
    res.writeHead(200, {
                          'Content-Type': 'application/json',
                          'charset': 'utf-8',
                          'Access-Control-Allow-Origin': '*'
                       });
    res.write(JSON.stringify(data));
    res.end();  
  },

//  ---------------------------------------------------------------------------------------------------------------------------------------

  errorpage: function(res, req, title, body) {
     res.render('error', {
                            pagetitle: 'Hiba',
                            title: title,
                            body: body,
                            username: req.session.name,
                            userid: req.session.user
                         });
  },

//  ---------------------------------------------------------------------------------------------------------------------------------------
  
  checklogin: function(res, req) {
    if (req.path != '/login' && (typeof req.session === 'undefined' || typeof req.session.user === 'undefined')) {
      res.render('login');
      return false;
    } else return true;
  },

//  ---------------------------------------------------------------------------------------------------------------------------------------
  
  checklogin_post: function(res, req) {
    if (req.path != '/login' && (typeof req.session === 'undefined' || typeof req.session.user === 'undefined')) {
      self.sendJSON(res, { error: 'Lejárt a munkameneted. A munka folytatásához újra be kell lépned.' });
      return false;
    } else return true;
  },

//  ---------------------------------------------------------------------------------------------------------------------------------------

  getIP: function(req) {
        return req.headers['x-forwarded-for'] || 
        req.connection.remoteAddress || 
        req.socket.remoteAddress ||
        req.connection.socket.remoteAddress;
  },
  
//  ---------------------------------------------------------------------------------------------------------------------------------------

  formname: function(source) {
        if (typeof source == 'undefined' || typeof source.firstname == 'undefined' || typeof source.lastname == 'undefined') return false;
        var name  = source.firstname + ' ' + source.lastname;
        if (typeof source.title != 'undefined' && source.title != null && source.title != '')
          name = source.title + ' ' + name;
        return name;
  },
  
//  ---------------------------------------------------------------------------------------------------------------------------------------
//  a random string generator for ids and stuff

  RandomString: function(chars=12, numbers=true, onlynumbers=false) {
    let str = '';
    
    if (!numbers)
      var charray = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    else
      var charray = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    if (onlynumbers)
      var charray = '0123456789';
    
    for (let t=0; t<=chars; t++)
      str += charray.charAt(Math.floor(Math.random() * charray.length));
    
    return str;
  },

//  ---------------------------------------------------------------------------------------------------------------------------------------
//  MongoDB connect
  
  MongoDB_connect: function(mongoData, callback) {
  
    global.mongodb.connect(mongoData.url, function(err, db) {

      if (err) {
        self.log(err.message);
        process.exit();
      }

      db.authenticate(mongoData.username, mongoData.password, function(err, res) {
        if(err) {
          self.log(err.message);
          process.exit();
        }
        return callback(db);
      });
    });
  }

//  ---------------------------------------------------------------------------------------------------------------------------------------  
}