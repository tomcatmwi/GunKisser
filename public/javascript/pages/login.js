$(document).ready(function() {

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
            
            if (location.pathname == '/login')
              location.href = api_url+'/dashboard'
            else
              location.reload();
          }
      });
                 
  });

  $('#logincsaj').click(function() {
    errormsg('error', 'Waifut nem basztatjuk.');
  });
  
});
