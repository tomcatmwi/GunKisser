$(document).ready(function() {

  $('#btnClose').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/bugs';
  });

  $('#btnAddNew').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/bugs_addstage/'+$('#id').val();
  });

});

