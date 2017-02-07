$(document).ready(function() {

//  --------------------------------------------------------------------------------------------------
//  get countries json and wire country selector to phone and fax country code inputs
//  --------------------------------------------------------------------------------------------------

  $.ajax({
      type: 'GET',
      url: api_url+'/json/countries.json',
        
      success: function(data, textStatus, jqXHR) {
        if (typeof data.error != 'undefined') {
           errormsg('error', data.error);
           return false;
        }
        
        const countries = data;
        $('#country').change(function() {
          for(var t in countries) {
            if (countries[t].id == $('#country').val()) {
              $('#phone1').val(countries[t].phonecode);
              $('#fax1').val(countries[t].phonecode);
            }
          }
        });
        $('#country').trigger('change');

      }
  });

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
    $('#form').find('.form-control').each(function() {
      data[$(this).attr('id')] = $(this).val();
    });

    data.password1 = md5(password1);
    data.password2 = md5(password2);
    data = JSON.stringify(data);
    
    $.ajax({
        type: 'POST',
        data: data,
        url: api_url+'/useredit',
        
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
  

});
