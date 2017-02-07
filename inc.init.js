//  ------------------------[ APP INIT ] ------------------------

app.disable('x-powered-by')
app.set('view engine', 'pug')
app.set('views', './views')
app.use(express.static('./public'))

// get countries and sort them

var countries = JSON.parse(fs.readFileSync('./public/json/countries.json'));
countries.sort(function(a, b) {
                                  var namea = latinize(a.namehun).toLowerCase();
                                  var nameb = latinize(b.namehun).toLowerCase();
                                  if (namea < nameb) return -1;
                                  if (namea > nameb) return 1;
                                  return 0;
                              });

//  possible user levels

const userlevels = [
                    { value: 0, text: 'Nincs belépési joga' },
                    { value: 1, text: 'Felhasználó' },
                    { value: 10, text: 'Adminisztrátor' }
                   ];

//  ------------------------[ SSL INIT ] ------------------------

const ssl = require('./ssl/ssl.js');
const myssl = ssl.create({
        ssl: {
            key: './ssl/server.key',
            certificate: './ssl/server.crt',
            active: true
        },
        port: 3000
    },
    app);
    
//  ------------------------[ SESSION ENGINE INIT ] ------------------------
    
app.use(session({
  cookieName: 'session',
  secret: 'hge432klnfle32432dslgmr02',  // random encryption key string
  duration: 30 * 60 * 1000,             // session expiry time in milliseconds (30 minutes)
  activeDuration: 5 * 60 * 1000,        // milliseconds to extend the session in case of interaction (5 minutes)
}));
