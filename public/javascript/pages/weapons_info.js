$(document).ready(function() {

  $('#btnClose').click(function(e) {
    e.preventDefault();
    window.history.back();
  });

  $('#btnEditWeapon').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/weapons_edit/'+$('#id').val();
  });

  $('#btnNewExam').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/weapons_info/'+$('#id').val()+'/examine';
  });

});

function weapons_exam_delete(id) {
  location.href = api_url+'/weapons_exam_delete/'+id;
}

function weapons_exam_view(id) {
  location.href = api_url+'/weapons_exam/'+id;
}

