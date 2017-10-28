//  ------------------------[ IMAGE UPLOAD ] ------------------------

const upload = multer({ dest: __dirname + '/upload-tmp/',
                                limits: { fileSize: settings.upload_size_limit }
                      }).any();

app.post('/uploadimage',
   function(req, res) {
   
    general.checklogin_post(res, req);
    upload(req, res, function(err) {
      
      if (typeof req.body == 'undefined' || typeof req.body.dirname == 'undefined' || !fs.existsSync(__dirname+'/public/userdata/'+req.body.dirname)) {
         try {
           fs.mkdirSync(__dirname+'/public/userdata/'+req.body.dirname, 0o755);
         } catch(err) {
           general.sendJSON(res, { error: 'Érvénytelen feltöltési célkönyvtár' });
           return false;
         }
      }

//  error handling
        
      if (err) {
        var msg = 'Ismeretlen hiba.';
          switch(err.code) {
            case 'LIMIT_FILE_SIZE': msg = 'A fájl túl nagy. Maximális méret: '+settings.upload_size_limit+' byte.'; break;
            case 'LIMIT_PART_COUNT': msg = 'Túl sok darabra van osztva a feltöltött fájl.'; break;
            case 'LIMIT_FILE_COUNT': msg = 'A feltölteni próbált fájlok száma túl nagy.'; break;
            case 'LIMIT_FIELD_KEY': msg = 'Az egyik mező neve túl hosszú.'; break;
            case 'LIMIT_FIELD_VALUE': msg = 'Az egyik mező értéke túl hosszú.'; break;
            case 'LIMIT_FIELD_COUNT': msg = 'Túl sok a mező.'; break;
            case 'LIMIT_UNEXPECTED_FILE': msg = 'Nem várt mező.'; break;
          }
        general.sendJSON(res, { error: msg });
        return false;
      }

//  successful upload

      ip = general.getIP(req);
      var errors = [];

      req.files.forEach(function(file) {
                
//  convert uploaded base64 block back to file
          
          fs.readFile(file.destination+file.filename, 'utf-8', function(err, data) {
              
              if (err) {
                general.log('Unable to read uploaded image: "'+file.filename+'", error: "'+String(err)+ '", uploaded by user '+req.session.name+', IP: '+ip);
                errors.push({ filename: file.filename, originalname: null, error: err.errno });
                if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                return false;
              }
              
              var temp = data.split(',');
              
              try {
                var file_contents = Buffer.from(temp[1], 'base64');
              } catch(err) {
                general.log('Attempt to upload non-BASE64 encoded image by user '+req.session.name+', IP: '+ip);
                errors.push({ filename: file.filename, originalname: null, error: 2 });
                if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                return false;
              }
              
              var filename = file.originalname;
              
              var wrong = true;
              if (temp[0].indexOf('image/jpeg') > -1) { wrong = false; var ext = '.jpg'; }
              if (temp[0].indexOf('image/png') > -1) { wrong = false; var ext = '.png'; }
              if (temp[0].indexOf('image/gif') > -1) { wrong = false; var ext = '.gif'; }

              if (wrong) {
                  general.log('Not a valid image file: "'+file.destination+file.filename+'", uploaded by user '+req.session.name+', IP: '+ip);
                  errors.push({ filename: file.filename, originalname: null, error: 1 });
                  if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                  return false;
              } else

//  save converted file

              fs.writeFile(__dirname+'/public/userdata/'+req.body.dirname+'/'+filename+ext,
                           file_contents,
                           'utf8',
                           function(err) {
                               if (err) {
                                 general.log('Unable to write file: "/public/userdata/'+req.body.dirname+'/'+filename+'", error: "'+String(err)+ '", uploaded by user '+req.session.name+', IP: '+ip);
                                 errors.push({ filename: file.filename, originalname: null, error: err.errno });
                                 if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                                 return false;
                               }

//  oh, success

                               general.log('Image uploaded: '+req.body.dirname+'/'+filename+' user '+req.session.name+', IP: '+ip);
                               errors.push({ filename: file.filename, originalname: file.originalname+ext, error: 0 });
                               if (errors.length >= req.files.length) finish_image_upload(res, req, errors);
                               return true;
                           });
                            
          });
        });
      });
  });


//  finish things, send final response, kthxbai

function finish_image_upload(res, req, errors) {

    var error_counter = 0;
    errors.forEach(function(error) {
      fs.unlink(__dirname+'/upload-tmp/'+error.filename, function() {});
      delete error.filename;
    });

    general.sendJSON(res, errors);

}