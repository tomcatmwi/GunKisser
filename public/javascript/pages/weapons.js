$(document).ready(function() {

  tablerow = $('#datatable').find('tbody').html();
  $('#datatable').find('tbody').empty();

  $('#newUserBtn').click(function(e) {
    e.preventDefault();
    location.href = api_url+'/weapons_edit';
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
  
  loadstuff(true);

});

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
        url: api_url+'/weapons',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          
          $('#totalrecords').html(data.totalrecords+' fegyver');
          $('#datatable').find('tbody').empty();

//  display records

          for (var t in data.results) {

            var temp = $.parseHTML(tablerow);
            
            $(temp).find('tr:first').attr('id', 'row_'+data.results[t]._id);

            $(temp).find('td:nth-child(1)').html(data.results[t].name);
            $(temp).find('td:nth-child(2)').html(data.results[t].serialno);
            $(temp).find('td:nth-child(3)').html(data.results[t].caliber);
            $(temp).find('td:nth-child(4)').html(data.results[t].date_formatted);

            $(temp).find('td:nth-child(5)').find('a:first').attr('href', '/weapons_info/'+data.results[t]._id);
            $(temp).find('td:nth-child(6)').find('a:first').attr('href', '/weapons_edit/'+data.results[t]._id);
            $(temp).find('td:nth-child(7)').find('a:first').attr('href', '/weapons_delete/'+data.results[t]._id);
            
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
