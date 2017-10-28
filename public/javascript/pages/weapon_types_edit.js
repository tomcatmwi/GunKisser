$(document).ready(function() {

//  --------------------------------------------------------------------------------------------------
//  submit button click event
//  --------------------------------------------------------------------------------------------------

  $('#post').click(function(e) {
    e.preventDefault();
    
    var data = {};
    $('#form').find('.form-control').each(function() {
      data[$(this).attr('id')] = $(this).val();
    });
    
    data = JSON.stringify(data, null, 3);
    
    $.ajax({
        type: 'POST',
        data: data,
        url: api_url+'/weapon_types_edit',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          errormsg('success', data.success, 'alert-success');
          if ($('#id').val() == 0) $('#form')[0].reset();
        }
    });
    
    
  });

//  --------------------------------------------------------------------------------------------------
//  cancel button click event
//  --------------------------------------------------------------------------------------------------

  $('#cancel').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/weapon_types';
  });

});
