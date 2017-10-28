$(document).ready(function() {

  tablerow = $('#datatable').find('tbody').html();
  $('#datatable').find('tbody').empty();

  $('#newBtn').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/weapon_categories_edit';
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
    
    var data = { startrecord: $('#paginator').val() };
    data = JSON.stringify(data);
    
    $.ajax({
        data: data,
        url: api_url+'/weapon_categories',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }          

          $('#datatable').find('tbody').empty();

//  display records
                    
          for (var t in data.results) {

            var temp = $.parseHTML(tablerow);
            
            $(temp).find('tr:first').attr('id', 'row_'+data.results[t]._id);
            
            $(temp).find('td:nth-child(1)').html(data.results[t].name);
            $(temp).find('td:nth-child(2)').find('a:first').attr('href', '/weapon_categories_edit/'+data.results[t]._id);
            $(temp).find('td:nth-child(3)').find('a:first').attr('href', '/weapon_categories_delete/'+data.results[t]._id);
            
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
