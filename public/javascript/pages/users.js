$(document).ready(function() {

  tablerow = $('#datatable').find('tbody').html();
  $('#datatable').find('tbody').empty();

  $('#newUserBtn').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/users_edit';
  });

  $('#searchBtn').click(function(e) {
    e.preventDefault();
    loadstuff(true);
  });
  
  $('#sortBtn').click(function(e) {
    e.preventDefault();
    $('#searchBtn').trigger('click');
  });

  $('#paginator').change(function(e) {
    e.preventDefault();
    loadstuff(false);
  });

  $('#searchClearBtn').click(function(e) {
    e.preventDefault();
    $('#controls').find('input').val('');
    $('#controls').find('select').each(function() {
      $(this).find('option').attr('selected', false);
      $(this).find('option:first').attr('selected', true);
    });
    loadstuff(true);
  });
  
  $('#deleteSelected').click(function(e) {
    e.preventDefault();
    
    loader('darálás');
    var deleteThis = [];
    $('#datatable').find('tbody').find('[id^=delete_]').each(function() {
      if ($(this).prop('checked'))
        deleteThis.push($(this).attr('id').substr(7, $(this).attr('id').length-1));
    });
    
    if (deleteThis.length == 0) {
      loader();
      return false;
    }
    
    $.ajax({
          data: JSON.stringify({ deletelist: JSON.stringify(deleteThis) }),
          url: api_url+'/users_deletelist',
          
          success: function(data, textStatus, jqXHR) {
            loader();
            if (typeof data.error != 'undefined') {
               errormsg('error', data.error);
               return false;
            }

            $('#datatable').find('tbody').find('[id^=delete_]').each(function() {
              $(this).prop('checked', false);
            });
            $('#selectAll').prop('checked', false);
            
            loadstuff(false);
          }
    });
  });
  
  loadstuff(true);

});

function selectAll() {
  $('#datatable').find('tbody').find('[id^=delete_]').each(function() {
    $(this).prop('checked', !$(this).prop('checked'));
  });
}

function deleteSelected() {

}

function loadstuff(clear) {

    if (typeof clear === 'undefined') clear = false;
    if (clear) $('#paginator').val(0);

    var data = { search: $('#search').val(),
                 searchfield: $('#searchfield').val(),
                 searchmode: $('#searchmode').val(),
                 sortmode: $('#sortmode').val(),
                 sortby: $('#sortby').val(),
                 startrecord: $('#paginator').val()
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

          $('#totalrecords').html(data.totalrecords+' felhasználó');
          $('#datatable').find('tbody').empty();

//  display records
                    
          for (var t in data.results) {

            var temp = $.parseHTML(tablerow);
            
            $(temp).find('tr:first').attr('id', 'row_'+data.results[t]._id);
            
            var deleter = $('<input />', { type: 'checkbox', id: 'delete_'+data.results[t]._id });
            $(temp).find('td:nth-child(1)').append(deleter);
            
            $(temp).find('td:nth-child(2)').html(data.results[t].name);

            var phone = $('<a></a>', { href: 'tel:'+data.results[t].phone1+data.results[t].phone2+data.results[t].phone3,
                                       target: '_blank' });
              phone.html('+'+data.results[t].phone1+' ('+data.results[t].phone2+') '+data.results[t].phone3);
            $(temp).find('td:nth-child(3)').append(phone);

            var email = $('<a></a>', { href: 'mailto:'+data.results[t].email,
                                       target: '_blank' });
            email.html(data.results[t].email);
            $(temp).find('td:nth-child(4)').html(email);

            $(temp).find('td:nth-child(5)').html(data.results[t].skype);
            $(temp).find('td:nth-child(6)').find('a:first').attr('href', '/users_info/'+data.results[t]._id);
            $(temp).find('td:nth-child(7)').find('a:first').attr('href', '/users_edit/'+data.results[t]._id);
            $(temp).find('td:nth-child(8)').find('a:first').attr('href', '/users_delete/'+data.results[t]._id);
            
            $('#datatable').append(temp);
          }

//  configure paginator
            
          $('#paginator option').remove();
          for (t=0; t <= data.totalrecords; t+=data.pagesize) {
              var option = $('<option></option>', { value: t, text: String(1+(t / Number(data.pagesize))) });
              if (t == Number(data.startrecord)) option.attr('selected', true);
              $('#paginator').append(option);
          }
       }
        
    });

}
