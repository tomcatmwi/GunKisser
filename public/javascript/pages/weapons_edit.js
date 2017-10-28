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
    
    data._id = $('#id').val();
    data.name = $('#name').val();
    data.serialno = $('#serialno').val();
    data.caliber = $('#caliber').val();
    data.year = $('#year').val();
    data.description = $('#description').val();
    data.category = $('#category').val();
    data.type = $('#type').val();
    data.user_id = $('#user_id').val();
    data.parts = parts;
    data.trigger_tests = trigger_tests;

    for(t in data.parts)
      delete data.parts[t].id;

    data = JSON.stringify(data);
    
    $.ajax({
        type: 'POST',
        data: data,
        url: api_url+'/weapons_edit',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          
          window.history.back();

        }
    });
  });

//  --------------------------------------------------------------------------------------------------
//  cancel button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnCancel').click(function(e) {
    e.preventDefault();
    window.history.back();
  });

//  --------------------------------------------------------------------------------------------------
//  reset button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnReset').click(function(e) {
    e.preventDefault();
    parts = [];
    $('#form')[0].reset();
    $('#tblParts tbody').empty();
    $('#tblTriggerTestFields tbody').empty();
    if ($('#id').val() == '0')
      $('#id').val(randomstring);
  });

//  --------------------------------------------------------------------------------------------------
//  get weapon number button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnGetNumber').click(function(e) {
    e.preventDefault();
    $('#addPartSerialNo').val($('#serialno').val());
  });

//  --------------------------------------------------------------------------------------------------
//  copy weapon number to all parts button click event
//  --------------------------------------------------------------------------------------------------

  $('#btnCopyNumber').click(function(e) {
    e.preventDefault();
    for (t in parts) {
      parts[t].serialno = $('#serialno').val();
      $('#tblParts tbody').find('input').val($('#serialno').val());
    }
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
                 serialno: $('#addPartSerialNo').val(),
                 test_function: $('#addPartFunctionTest').prop('checked'),
                 test_appearance: $('#addPartAppearanceTest').prop('checked'),
                 test_headspace: $('#addHeadspaceTest').prop('checked'),
                 test_shims: addShimTest,
                 extra: $('#addPartExtra').prop('checked')
               };
    
    part_add(part);
        
    $('#addPart').val('');
    $('#addPartSerialNo').val('');
    $('#addPartExtra').prop('checked', false);
    $('#addPartFunctionTest').prop('checked', true);
    $('#addPartAppearanceTest').prop('checked', true);
    $('#addHeadspaceTest').prop('checked', true);
    $('#addShimTest').prop('checked', true);
    $('#addShimTestMax').val(0.2);
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
          $('#type').val(data.type);
          $('#description').val(data.description);
          
          $('#tblParts tbody').empty();
          $('#tblTriggerTestFields tbody').empty();

          for(t in data.parts)
            part_add(data.parts[t]);

          for(t in data.trigger_tests)
            trigger_test_add(data.trigger_tests[t]);
        }
        
    });
  });

});

function disable_editors() {
  $('#tblParts tbody').find('input').each(function() {
      $(this).prop('disabled', true);
      $(this).removeClass('form-control');
      $(this).addClass('hiddenedit');
  });
}

function part_edit(element) {
  
  disable_editors();
  
  var element = element.parent().parent().find('.hiddenedit');
  element.prop('disabled', false);
  element.removeClass('hiddenedit');
  element.addClass('form-control');
  element.focus();
  element.select();
  var prev_value = element.val();
  
  element.keydown(function(e) {
    if (e.which == 27) {
      $(this).val(prev_value);
    }

    if (e.which == 13) {
      for(var t in parts)
        if(parts[t].id == $(this).parent().parent().attr('id')) parts[t].serialno = $(this).val();
    }

    if (e.which == 13 || e.which == 27) {
      element.prop('disabled', true);
      element.removeClass('form-control');
      element.addClass('hiddenedit');
    }
  });  
}

function randomstring() {
  var str = '';
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  for (var t=0; t<=8; t++)
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  return str;
}

function part_add(part) {

      part.id = randomstring();
      parts.push(part);

      var temp = $('<tr></tr>', { 'id': part.id });
      $(temp).html(part_row);
      
      $(temp).find('td:nth-child(1)').html(part.name);
      $(temp).find('td:nth-child(2)').find('input:first').val(part.serialno);
      if (part.test_function) $(temp).find('td:nth-child(3)').html($('<span></span>', { class: 'glyphicon glyphicon-ok' }))
      if (part.test_appearance) $(temp).find('td:nth-child(4)').html($('<span></span>', { class: 'glyphicon glyphicon-ok' }))
      if (part.test_headspace) $(temp).find('td:nth-child(5)').html($('<span></span>', { class: 'glyphicon glyphicon-ok' }))
      if (part.extra) $(temp).find('td:nth-child(7)').html($('<span></span>', { class: 'glyphicon glyphicon-ok' }))
      
      if (part.test_shims > 0) 
        $(temp).find('td:nth-child(6)').html(part.test_shims+' mm')
        
      $('#tblParts tbody').append(temp);
      $('#tblParts').show();
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
  var index = $(element).parent().parent().index()-1;
  trigger_tests.splice(index, 1);
  element.parent().parent().remove();
}
