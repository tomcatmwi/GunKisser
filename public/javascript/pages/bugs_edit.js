$(document).ready(function() {

  $('#browser').val(navigator.sayswho);
  
//  --------------------------------------------------------------------------------------------------
//  submit button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnPost').click(function(e) {
    e.preventDefault();
    
    var thumbnails = $('#thumbnails').children('div');
    
    if (thumbnails.length > 0) {

      var t = -1;
      var loop = function() {
        t++;
        if (t < thumbnails.length) {
          thumbnails[t].upload('bugreport_screenshots', 'POST', api_url+'/uploadimage', loop);
        } else {
          doPost();
        }
      }
      loop();
    } else doPost();
    
    function doPost() {
    
      var data = {};
      $('#form').find('.form-control').each(function() {
        data[$(this).attr('id')] = $(this).val();
      });
      
      var files = [];
      $(thumbnails).each(function() {
        files.push($(this).attr('remote_filename'));
      });
      data['files'] = files;
      data = JSON.stringify(data);
            
      $.ajax({
          type: 'POST',
          data: data,
          url: api_url+'/bugs_edit',
          
          success: function(data, textStatus, jqXHR) {
            if (typeof data.error != 'undefined') {
               errormsg('error', data.error);
               return false;
            }
            errormsg('success', data.success, 'alert-success');
            $('#btnReset').trigger('click');
          }
      });
    
    }

  });

//  --------------------------------------------------------------------------------------------------
//  cancel button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnCancel').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/bugs';
  });

//  --------------------------------------------------------------------------------------------------
//  reset button, remove images
//  --------------------------------------------------------------------------------------------------

    $('#btnReset').click(function(e) {
      e.preventDefault();
      $('#form')[0].reset();
      $('#thumbnails').empty();
      $('#browser').val(navigator.sayswho);
    });

//  --------------------------------------------------------------------------------------------------
//  upload image button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnUpload').click(function(e) {
    e.preventDefault();
    $('#uploadFile').click();
  });

  $('#uploadFile').change(function(evt) {

    var f = evt.target.files;
    if (f[0].type != ('image/jpeg') && f[0].type != ('image/png') && f[0].type != ('image/gif')) { return false; }

    var reader = new FileReader();
    var thumbname = '';
    
    reader.onloadstart = (function() {
       $('#thumbnails').prepend(imgUploader());
       thumbname = $('#thumbnails').find('div:first').attr('id');
    });
      
    reader.onload = (function(theFile) {
      return function(e) {
        document.getElementById(thumbname).filename = $('#uploadFile').val();
        document.getElementById(thumbname).loadImage(e.target.result);
      };
    })(f);

    reader.readAsDataURL(f[0]);
  });
});

