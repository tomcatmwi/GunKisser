$(document).ready(function() {

  $('#newUserBtn').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/useredit';
  });

  $('#searchBtn').click(function(e) {
    e.preventDefault();
    loadstuff();
  });

});

function loadstuff() {

    var data = { search: $('#search').val(),
                 searchfield: $('#searchfield').val(),
                 searchmode: $('#searchmode').val(),
                 sortmode: $('#sortmode').val(),
                 sortby: $('#sortby').val()
               };
               
    data = JSON.stringify(data);
    
    $.ajax({
        data: data,
        url: api_url+'/users',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          
          for (t in data)
            console.log(data[t].name);
          errormsg('error', 'rekordok: '+data.length, 'alert-success');
        }
        
    });

}
