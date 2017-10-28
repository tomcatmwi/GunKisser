$(document).ready(function() {

  parts = []
  part_row = $('#tblParts tbody tr:first').html();
  $('#tblParts tbody tr:first').remove();
  for (var t in document.parts)
    part_add(document.parts[t]);

  trigger_tests = []
  trigger_test_row = $('#tblTriggerTestFields tbody tr:first').html();
  $('#tblTriggerTestFields tbody tr:first').remove();
  for (var t in document.trigger_tests)
    trigger_test_add(document.trigger_tests[t]);
  
//  --------------------------------------------------------------------------------------------------
//  submit button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnSubmit').click(function(e) {
    e.preventDefault();
    
    var data = {};
    
    data.id = $('#id').val();
    data.name = $('#name').val();
    data.description = $('#description').val();
    data.caliber = $('#caliber').val();
    data.type = $('#type').val();
    data.category = $('#category').val();
    data.parts = parts;
    data.trigger_tests = trigger_tests;

    for(t in data.parts)
      delete data.parts[t].id;

    data = JSON.stringify(data);
    
    $.ajax({
        type: 'POST',
        data: data,
        url: api_url+'/weapon_templates_edit',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          
          location.href = api_url+'/weapon_templates';
        }
    });
    
  });

//  --------------------------------------------------------------------------------------------------
//  cancel button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnCancel').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/weapon_templates';
  });

//  --------------------------------------------------------------------------------------------------
//  reset button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnReset').click(function(e) {
    e.preventDefault();
    parts = [];
    $('#form')[0].reset();
    $('#tblParts tbody').empty();
    $('#tbltblTriggerTestFields tbody').empty();
    if ($('#id').val() == '0')
      $('#id').val(randomstring);
    
  });

//  --------------------------------------------------------------------------------------------------
//  add trigger test element button click event
//  --------------------------------------------------------------------------------------------------
  
  $('#btnAddTriggerTestField').click(function(e) {
    e.preventDefault();
      if ($('#addTriggerTestField').val().length < 3) return false;
      trigger_test_add($('#addTriggerTestField').val());
  });

//  --------------------------------------------------------------------------------------------------
//  add part button click event
//  --------------------------------------------------------------------------------------------------
  
  $('#btnAddPart').click(function(e) {
    e.preventDefault();
    var name = $('#addPart').val();
    if (name.length < 3) return false;

    var addShimTest = 0;
    if ($('#addShimTest').prop('checked')) {
      if (isNaN($('#addShimTestMax').val()) || $('#addShimTestMax').val() <= 0 || $('#addShimTestMax').val() > 5) return false;
      addShimTest = Number($('#addShimTestMax').val());
    }
    
    var part = { name: name,
                 test_function: $('#addPartFunctionTest').prop('checked'),
                 test_appearance: $('#addPartAppearanceTest').prop('checked'),
                 test_headspace: $('#addHeadspaceTest').prop('checked'),
                 test_shims: addShimTest,
                 extra: $('#addPartExtra').prop('checked')
               };
    
    part_add(part);
        
    $('#addPart').val('');
    $('#addPart').focus();
  });

//  --------------------------------------------------------------------------------------------------
//  load template button event
//  --------------------------------------------------------------------------------------------------

  $('#btnLoadTemplate').click(function(e) {
    e.preventDefault();

    var data = { id: $('#weapon_template_load').val() };
    data = JSON.stringify(data);

    $.ajax({
        data: data,
        url: api_url+'/weapon_templates',
        
        success: function(data, textStatus, jqXHR) {
        
          if (typeof data.error != 'undefined') {
             errormsg('error_template', data.error);
             return false;
          }
          
          var data = data.results[0];
          $('#name').val(data.name);
          $('#category').val(data.category);
          $('#description').val(data.description);
          
          $('#tblParts tbody').empty();
          
          for(t in data.parts)
            part_add(data.parts[t]);
        }
        
    });
  });
});

function randomstring() {
  var str = '';
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (var t=0; t<=8; t++)
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  return str;
}

function disable_editors() {
  $('#tblParts tbody').find('input').each(function() {
      $(this).prop('disabled', true);
      $(this).removeClass('form-control');
      $(this).addClass('hiddenedit');
  });
}

function part_add(part) {

      part.id = randomstring();
      parts.push(part);
      
      var temp = $('<tr></tr>', { id: part.id });
      $(temp).html(part_row);
      $(temp).find('td:nth-child(1)').html(part.name);

      if (part.test_function) $(temp).find('td:nth-child(2)').html($('<span></span>', { class: 'glyphicon glyphicon-ok' }))
      if (part.test_appearance) $(temp).find('td:nth-child(3)').html($('<span></span>', { class: 'glyphicon glyphicon-ok' }))
      if (part.test_headspace) $(temp).find('td:nth-child(4)').html($('<span></span>', { class: 'glyphicon glyphicon-ok' }))
      if (part.extra) $(temp).find('td:nth-child(6)').html($('<span></span>', { class: 'glyphicon glyphicon-ok' }))
      
      if (part.test_shims > 0) 
        $(temp).find('td:nth-child(5)').html(part.test_shims+' mm')
        
      $('#tblParts tbody').append(temp);
      $('#tblParts').show();
      return false;
}

function part_up(link) {
      var tr = link.parent().parent();
      if (tr.index() == 0) return false;
      var tr_move = tr.parent().find('tr:eq('+String(Number(tr.index())-1)+')').first();
      tr_move.insertAfter(tr);
      
      var id = tr.attr('id');
      for(var t in parts) {
        if(parts[t].id == id) {
          temp = parts[t-1];
          parts[t-1] = parts[t];
          parts[t] = temp;
        }
      }
}

function part_down(link) {
      var tr = link.parent().parent();
      if (tr.index() == tr.parent().find('tr').length-1) return false;
      var tr_move = tr.parent().find('tr:eq('+String(Number(tr.index())+1)+')').first();
      tr_move.insertBefore(tr);

      var id = tr.attr('id');
      for(var t in parts) {
        if(parts[t].id == id) {
          temp = parts[t+1];
          parts[t+1] = parts[t];
          parts[t] = temp;
        }
      }
}

function part_delete(link) {
      var tr = link.parent().parent();
      if (tr.parent().find('tr').length == 0)
        tr.parent().parent().hide();
      var id = tr.attr('id');
      tr.remove();
      
      for(var t in parts)
        if(parts[t].id == id)
          parts.splice(t, 1);
}

function trigger_test_add(element) {
  var temp = $('<tr></tr>');
  $(temp).html(trigger_test_row);
  $(temp).find('td:first').html(element);
  $('#tblTriggerTestFields tbody').append(temp);
  $('#tblTriggerTestFields').show();
  trigger_tests.push($.trim(element));
}

function trigger_test_field_delete(element) {
  var index = $(element).parent().parent().index();
  trigger_tests.splice(index, 1);
  element.parent().parent().remove();
}
