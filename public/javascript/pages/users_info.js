$(document).ready(function() {

  $('#btnClose').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/users';
  });

  $('#btnEditUser').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/users_edit/'+$('#id').val();
  });

  $('#btnAddWeapon').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/weapons_edit?user='+$('#id').val();
  });

});

function weapon_delete(id) {
  document.location.href = api_url+'/weapons_delete/'+id;
}

function weapon_edit(id) {
  document.location.href = api_url+'/weapons_edit/'+id;
}

function weapon_info(id) {
  document.location.href = api_url+'/weapons_info/'+id;
}

