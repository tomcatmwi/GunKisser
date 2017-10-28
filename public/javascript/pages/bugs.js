$(document).ready(function() {

  tablerow = $('#datatable').find('tbody').html();
  $('#datatable').find('tbody').empty();

  $('#newUserBtn').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/bugs_edit';
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
        url: api_url+'/bugs',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }          

          $('#totalrecords').html(data.totalrecords);
          $('#datatable').find('tbody').empty();

//  display records
                    
          for (var t in data.results) {

            var temp = $.parseHTML(tablerow);
            
            $(temp).find('tr:first').attr('id', 'row_'+data.results[t]._id);
            
            var severity = 'Ismeretlen';
            var labelClass = '';
            
            switch (data.results[t].severity) {
              case '0': labelClass='label-default'; severity = 'Jelentéktelen'; break;
              case '1': labelClass='label-primary'; severity = 'Enyhe'; break;
              case '2': labelClass='label-warning'; severity = 'Súlyos'; break;
              case '3': labelClass='label-danger'; severity = 'Kritikus'; break;
              case '4': labelClass='label-danger blink'; severity = 'Fatális'; break;
              case '5': labelClass='label-default'; severity = 'Fejlesztési javaslat'; break;
              case '6': labelClass='label-success'; severity = 'Megoldva'; break;
            }
            
            $(temp).find('td:nth-child(1)').html(data.results[t].title);
            $(temp).find('td:nth-child(2)').html(data.results[t].userdata.name);
            $(temp).find('td:nth-child(3)').html(data.results[t].date_formatted);
            $(temp).find('td:nth-child(4)').html(data.results[t].stages[data.results[t].stages.length-1].date_formatted);
            $(temp).find('td:nth-child(5)').html(data.results[t].stages.length);
            $(temp).find('td:nth-child(6) span').html(severity);
            $(temp).find('td:nth-child(7)').find('a:first').attr('href', '/bugs_info/'+data.results[t]._id);
            $(temp).find('td:nth-child(8)').find('a:first').attr('href', '/bugs_delete/'+data.results[t]._id);

            $(temp).find('td:nth-child(6) span').addClass(labelClass);

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
