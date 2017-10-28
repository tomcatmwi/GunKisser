$(document).ready(function() {

  tablerow = $('#datatable').find('tbody').html();
  $('#datatable').find('tbody').empty();

  $('#newBtn').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/weapon_templates_edit';
  });

  $('#searchBtn').click(function(e) {
    e.preventDefault();
    loadstuff(true);
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

  $('#paginator').change(function(e) {
    e.preventDefault();
    loadstuff(false);
  });
  
  loadstuff(true);

});

function loadstuff(clear) {

    if (typeof clear === 'undefined') clear = false;
    if (clear) $('#paginator').val(0);
    
    var data = { startrecord: $('#paginator').val(),
                 searchmode: $('#searchmode').val(),
                 search: $('#search').val() };
    data = JSON.stringify(data);
    
    $.ajax({
        data: data,
        url: api_url+'/weapon_templates',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }          

          $('#datatable').find('tbody').empty();
          $('#totalrecords').html(data.totalrecords);

//  display records
                    
          for (var t in data.results) {

            var temp = $.parseHTML(tablerow);
            
            $(temp).find('tr:first').attr('id', 'row_'+data.results[t]._id);
            
            $(temp).find('td:nth-child(1)').html(data.results[t].name);
            $(temp).find('td:nth-child(2)').html(data.results[t].caliber);
            $(temp).find('td:nth-child(3)').html(data.results[t].category);
            $(temp).find('td:nth-child(4)').html(data.results[t].type);

            $(temp).find('td:nth-child(5)').find('a:first').bind('click', { t: t }, function(e) {
              e.preventDefault();
              clonestuff(data.results[e.data.t]._id);
            });
            
            $(temp).find('td:nth-child(6)').find('a:first').attr('href', '/weapon_templates_edit/'+data.results[t]._id);
            $(temp).find('td:nth-child(7)').find('a:first').attr('href', '/weapon_templates_delete/'+data.results[t]._id);
            
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

function clonestuff(id) {

    var data = { id: id };
    data = JSON.stringify(data);

    $.ajax({
        data: data,
        url: api_url+'/weapon_templates_clone',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          loadstuff();
        }
    });

}
