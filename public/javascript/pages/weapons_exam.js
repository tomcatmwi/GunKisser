$(document).ready(function() {

//  --------------------------------------------------------------------------------------------------
//  submit button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnSubmit').click(function(e) {
    e.preventDefault();
  
  //  upload images
  
    var thumbnails = $('[id^=thumbnails_]').children('div');
    if (thumbnails.length > 0) {

      var t = -1;
      var loop = function() {
        t++;
        if (t < thumbnails.length) {
          thumbnails[t].upload('weapon_exams', 'POST', api_url+'/uploadimage', loop);
        } else {
          doPost();
        }
      }
      loop();
    } else doPost();

  function doPost() {
  
  //  convert results to json
  
    var data = {
                  weapon: $('#id').val(),
                  owner1: $('#owner1').val(),
                  owner2: $('#owner2').val(),
                  owner3: $('#owner3').val(),
                  general_description: $('#general_description').val(),
                  sight_test: $('[name=sight_test]:checked').val()
               }
    
    data.trigger_tests = [];           
    $('[id^=trigger_test_]').each(function() {
        data.trigger_tests.push({ 'name': $(this).find('input:first').val(), 'result': $(this).find('input:last').val() });
    });
    
    var parts_test = [];
    $('[id^=part_test_]').each(function() {
      var part_test = {};
      
      if ($(this).find('[name^=appearance_]').length > 0) part_test.appearance = $(this).find('[name^=appearance_]:checked').val();
      if ($(this).find('[name^=function_]').length > 0) part_test.function = $(this).find('[name^=function_]:checked').val();
      if ($(this).find('[name^=headspace_go]').length > 0) part_test.headspace_go = $(this).find('[name^=headspace_go]:checked').val();
      if ($(this).find('[name^=headspace_nogo]').length > 0) part_test.headspace_nogo = $(this).find('[name^=headspace_nogo]:checked').val();
      if ($(this).find('[id^=shims_]').length > 0) part_test.shims = $(this).find('[id^=shims_]').val();
      
      part_test.description = $(this).find('[id^=description_]').val();
      parts_test.push(part_test);
    });
    data.parts_tests = parts_test;
    
    $('[id^=thumbnails_]').each(function() {

      var id = $(this).attr('id');
      id = id.substr(11, id.length);
      var images = [];

      $(this).find('div').each(function() {
        if (typeof $(this).attr('remote_filename') != 'undefined')
          images.push($(this).attr('remote_filename'));
      });
      
      if (images.length > 0) {
        if (isNaN(id))
          data.images = images
        else
          data.parts_tests[Number(id)-1].images = images;
      }
    });
    
//  save data
 
    data = JSON.stringify(data);
    
    $.ajax({
        type: 'POST',
        data: data,
        url: api_url+'/weapons_exam',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          errormsg('error', data.success, 'alert-success');
          location.href = api_url+'/weapons_exam/'+data.id;
        }
    });
  }
 
  });

//  --------------------------------------------------------------------------------------------------
//  change user fields
//  --------------------------------------------------------------------------------------------------

  $('#owner1').change(function(e) {
    e.preventDefault();
    $('#owner2').val($('#owner1').val());
    $('#owner3').val($('#owner1').val());
  });
  
  $('#owner2').change(function(e) {
    e.preventDefault();
    $('#owner3').val($('#owner2').val());
  });
    
//  --------------------------------------------------------------------------------------------------
//  close button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnClose').click(function(e) {
    e.preventDefault();
    location.href = api_url+'/weapons_info/'+$('#id').val();
  });

//  --------------------------------------------------------------------------------------------------
//  upload image button click event
//  --------------------------------------------------------------------------------------------------

  $('[id^=btnUpload_]').click(function(e) {
    e.preventDefault();
    var id = $(this).attr('id');
    id = id.substring(10, id.length);
    $('#uploadFile_'+id).click();
  });
  
  $('[id^=uploadFile_]').change(function(evt) {
    var f = evt.target.files;
    if (f[0].type != ('image/jpeg') && f[0].type != ('image/png') && f[0].type != ('image/gif')) { return false; }

    var reader = new FileReader();
    var thumbname = '';
    var id = $(this).attr('id');
    id = id.substring(11, id.length);
    
    reader.onloadstart = (function() {
       $('#thumbnails_'+id).prepend(imgUploader());
       thumbname = $('#thumbnails_'+id).find('div:first').attr('id');
    });
      
    reader.onload = (function(theFile) {
      return function(e) {
        document.getElementById(thumbname).filename = $('#uploadFile_'+id).val();
        document.getElementById(thumbname).loadImage(e.target.result);
      };
    })(f);

    reader.readAsDataURL(f[0]);
  });

});

