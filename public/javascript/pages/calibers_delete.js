$(document).ready(function() {

  $('#btnDelete').click(function(e) {
    e.preventDefault();

    var data = { id: $('#id').html() }
    data = JSON.stringify(data);
        
    $.ajax({
        data: data,
        url: api_url+'/calibers_delete',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          window.location.href = api_url+'/calibers';
        }
    });
    
  });

//  --------------------------------------------------------------------------------------------------
//  cancel button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnCancel').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/calibers';
  });  

});
