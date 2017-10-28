/*

================================================================
        imgUploader for jQuery and Bootstrap
================================================================

*/

// --------------------- create imgUploader ---------------------

function imgUploader(id, mode) {

// --------------------- create enlarger ---------------------

  if ($('#img-thumbnail-enlarge').length <= 0) {
  
    var temp = $('<div></div>', { 'id': 'img-thumbnail-enlarge', 'class': 'img-thumbnail-enlarge' } );
    temp.append($('<img />'));

    temp.click(function(e) { 
      e.preventDefault();
      $(this).css('display', 'none');
    });

    $('body').prepend(temp);
  }
  
  if (typeof id == 'undefined') id = String(Date.now())+'_'+String(Math.floor(Math.random()*65535)+1);
  if (typeof mode == 'undefined' || mode != 'viewer') mode = 'uploader';

  var imgUploader = document.createElement('div');

  imgUploader.id = id;
  imgUploader.errorImage = '/pic/img-uploader-error.svg';
  imgUploader.loaderImage = '/pic/img-uploader-loader.svg';
  
  $(imgUploader).addClass('img-thumbnail-holder');
  
  var temp = $('<img />', { 'class': 'img-responsive img-thumbnail', 
                            'crossOrigin': 'Anyonymous',
                            'src': imgUploader.loaderImage });
  temp.click(function(e) {
      e.preventDefault();
      if ($(this).parent().find('.img-thumbnail-progressbar').css('visibility') != 'visible')
        imgUploader.enlarge($(this));
  });
  $(imgUploader).append(temp);
  
  if (mode == 'uploader') {
    
    var temp = $('<div></div>', { 'class': 'glyphicon glyphicon-remove img-thumbnail-button' });
    temp.click(function(e) {
        e.preventDefault();
        if ($(this).parent().find('.img-thumbnail-progressbar').css('visibility') != 'visible')
          $(this).parent().remove();
    });
    $(imgUploader).append(temp);
    
    var temp = $('<div></div>', { 'class': 'glyphicon glyphicon-zoom-in img-thumbnail-button' });
    temp.click(function(e) {
        e.preventDefault();
        $(this).parent().find('img').trigger('click');
    });
    $(imgUploader).append(temp);
    
    var temp = $('<div></div>', { 'class': 'progress img-thumbnail-progressbar' });
    temp.append($('<div></div>', { 'class': 'progress-bar', 'role': 'progressbar', 'style': 'width: 0%' }));
    $(imgUploader).append(temp);

  }

// --------------------- load image stream ---------------------

  imgUploader.loadImage = function(img_url) {
  
    var temp_img = new Image();
    var img = $(this).find('img');

    $(temp_img).on('load', function() {
        var data = imgUploader.toData($(this), 'image/png', 1);
        if (!data) $(img).attr('src', imgUploader.errorImage);
        $(img).attr('src', data);
    });

    $(temp_img).on('error', function() {
      $(img).attr('src', imgUploader.errorImage);
    });
    
    img.attr('src', imgUploader.loaderImage);
    temp_img.src = img_url;
    
    if (temp_img.naturalWidth > 4096 || temp_img.naturalHeight > 4096) {
      $(temp_img).unbind('load');
      $(img).attr('src', imgUploader.errorImage);
      return false;
    }

  };

// --------------------- convert image to dataurl ---------------------

  imgUploader.toData = function(img, type, quality) {
  
    if (typeof img == 'undefined' || img == null) {
      var img = $(this).find('img');
      if ($(img).attr('src') == imgUploader.loaderImage || $(img).attr('src') == imgUploader.errorImage) return false;
      if (img[0].naturalWidth > 4096 || img[0].naturalHeight > 4096) {
        $(img).attr('src', imgUploader.errorImage);
        return false;
      }
    }
    
    if (typeof type == 'undefined') type = 'image/jpeg';
    if (typeof quality == 'encoderOptions') quality = 0.75;    

        try {
          $(img).attr('crossOrigin', 'Anonymous');
          var canvas = document.createElement('canvas');
          canvas.width = img[0].naturalWidth;
          canvas.height = img[0].naturalHeight;
          canvas.getContext('2d').drawImage(img[0], 0, 0);
          return canvas.toDataURL('image/jpeg');
        } catch (e) {
          return false;
        }
  
  }

// --------------------- enlarge image ---------------------

  imgUploader.enlarge = function() {

    var data = imgUploader.toData(null, 'image/png', 1);
    if (!data) return false;

    $('#img-thumbnail-enlarge img:first').attr('src', data);
    $('#img-thumbnail-enlarge').css('display', 'flex');
  }

//  --------------------- upload image ---------------------

  imgUploader.upload = function(upload_directory, upload_method, upload_url, callback) {
    
    if (mode != 'uploader') return false;
 
    var img = $(imgUploader).find('img');
    if ($(img).attr('src') == imgUploader.errorImage || $(img).attr('src') == imgUploader.loaderImage) { callback(); return false; }
  
    var data = imgUploader.toData();
    if (!data) {
      callback();
      return false;
    }

    if (typeof upload_method == 'undefined') upload_method = 'POST';

//  collect data
    
    var formData = new FormData();
    formData.append('file', new File( [new Blob([data])], imgUploader.id));
    formData.append('dirname', upload_directory);

    var progressbar = $(imgUploader).find('.progress-bar');
    progressbar.css('width', '0%');
    $(imgUploader).find('.img-thumbnail-progressbar').css('visibility', 'visible');

//  do upload

    var xhr = new XMLHttpRequest();
    xhr.open(upload_method, upload_url, true);
    xhr.responseType = 'text';
    
    xhr.onerror = function(e) {
      callback();
      return false;
    };
    
    xhr.onload = function() {
      if (xhr.readyState === xhr.DONE) {
        
        if (xhr.status === 200) {
          setTimeout(function() {
            $(imgUploader).find('.img-thumbnail-progressbar').css('visibility', 'hidden');
            progressbar.css('width', 0);
          }, 1000);
          
          var response = JSON.parse(xhr.responseText);
          $(imgUploader).attr('remote_filename', response[0].originalname);
        }
        
        if (typeof callback == 'function') callback();

      }
    };

    xhr.upload.addEventListener('progress', function(e) {
      if (e.lengthComputable)
        progressbar.css('width', Math.floor(e.loaded / (e.total / 100)) + '%');
        $(imgUploader).find('img').css('filter', 'grayscale('+Math.floor(e.loaded / (e.total / 100)) + '%)');
    }, false);
    
    xhr.send(formData);

  }

//  ---------------------------------------------------------

  return imgUploader;

}  
