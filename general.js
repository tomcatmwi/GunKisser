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
      res.redirect('/login');
      return false;
    } else return true;
  },

//  ---------------------------------------------------------------------------------------------------------------------------------------
  
  checklogin_post: function(res, req) {
    if (req.path != '/login' && (typeof req.session === 'undefined' || typeof req.session.user === 'undefined')) {
      self.sendJSON(res, { error: 'Lejárt a munkameneted. A munka folytatásához újra be kell lépned.' });
      return false;
    } else return true;
  }

//  ---------------------------------------------------------------------------------------------------------------------------------------

}