$('#login_button').click(function(e) {
    e.preventDefault();

    var data = { username: $('#username').val(),
                 password: md5($('#password').val()) 
               }
    
    data = JSON.stringify(data);
    
    $.ajax({
        data: data,
        url: api_url+'/login',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          
          errormsg('error', 'Üdv, '+data.user+'!', 'alert-success');
          window.location.href = api_url+'/dashboard';
        }
    });
               
});

$('#logincsaj').click(function() {
  errormsg('error', 'Waifut nem basztatjuk.');
});