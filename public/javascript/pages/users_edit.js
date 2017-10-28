$(document).ready(function() {

  document.password_changed = false;

//  --------------------------------------------------------------------------------------------------
//  submit button click event
//  --------------------------------------------------------------------------------------------------

  $('#post').click(function(e) {
    e.preventDefault();
    
    var password1 = $('#password1').val();
    var password2 = $('#password2').val();

    if ($('#userlevel').val() > 0 && (password1.length < 8 || password2.length < 8)) {
      errormsg('error', 'Túl rövid a jelszó. Legalább 8 karakter legyen.');
      return false;
    }

    var data = {};
    data['password_changed'] = document.password_changed;

    $('#form').find('.form-control').each(function() {
      data[$(this).attr('id')] = $(this).val();
    });
    
    data['legalEntity'] = String($('#legalEntity').prop('checked'));

    data.password1 = md5(password1);
    data.password2 = md5(password2);
    data = JSON.stringify(data);
    
    $.ajax({
        type: 'POST',
        data: data,
        url: api_url+'/users_edit',
        
        success: function(data, textStatus, jqXHR) {
          if (typeof data.error != 'undefined') {
             errormsg('error', data.error);
             return false;
          }
          errormsg('success', data.success, 'alert-success');
          if ($('#id').val() == 0) $('#form')[0].reset();
        }
    });
    
    
  });

//  --------------------------------------------------------------------------------------------------
//  cancel button click event
//  --------------------------------------------------------------------------------------------------

  $('#cancel').click(function(e) {
    e.preventDefault();
    document.location.href = api_url+'/users';
  });

//  --------------------------------------------------------------------------------------------------
//  stuff
//  --------------------------------------------------------------------------------------------------

  $('#password1').change(function(e) {
    e.preventDefault();
    document.password_changed = true;
  });

  $('#password2').change(function(e) {
    e.preventDefault();
    document.password_changed = true;
  });
  
  $('#country').change(function(e) {
    e.preventDefault();
    $(document.countries).each(function() {
      if ($(this)[0].id == $('#country').val()) {
        $('#phone1').val($(this)[0].phonecode);
        $('#fax1').val($(this)[0].phonecode);
      }
    });
  });
  
});
