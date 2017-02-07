const api_url = 'https://localhost:3000';

$.ajaxSetup({
              type: 'POST',
              cache: false,
              crossdomain: false,
              dataType: 'json',
              contentType: 'application/json; charset=UTF-8',
              timeout: 30000,
              beforeSend: function() {
                $('[id^=error]').hide();
                loader('türelem');
              },
              complete: function() {
                loader();
              }, error: function(data, textStatus, errorThrown) {
                if (errorThrown == '') errorThrown = 'Nincs kapcsolat a szerverrel.';
                errormsg('error', errorThrown);
              }
            });

$(document).ready(function() {

//  panel tab handling

  $('.panel-control').hide();
  $('.panel-control:first').show();
  $('.nav-tabs li').removeClass('active');
  $('.nav-tabs li:first').addClass('active');

  $('.nav-tabs li').click(function(e) {
    e.preventDefault();
    $('.panel-control').hide();
    $('.nav-tabs li').removeClass('active');
    $(this).addClass('active');
    $('#'+$(this).attr('linked')).show();
  });

//  paginator buttons

  $('.pagination li').click(function(e) {
    e.preventDefault();
    
    if ($(this).index() != 0 && $(this).index() != $(this).parent().children().length-1) {
      $(this).parent().find('.active').removeClass('active');
      $(this).addClass('active')
    }
    
    else {
      var current = $(this).parent().find('.active:first');

      if ($(this).index() == 0 && current.index() > 1) {
        $(this).parent().find('li:nth-child('+String(current.index())+')').trigger('click');
      }
      
      if ($(this).index() == $(this).parent().find('li').length-1 && current.index() < $(this).parent().find('li').length-2) {
        $(this).parent().find('li:nth-child('+String(current.index()+2)+')').trigger('click');
      }
    }
  });
});

$('[id^=error]').click(function(e) {
  e.preventDefault();
  $(this).hide();
});

function errormsg(id, msg, type) {
  if (typeof type === 'undefined') type = 'alert-danger';
  if (type == 'alert-error') type = 'alert-danger';
  if (type != 'alert-success' && type != 'alert-info' && type != 'alert-warning' && type != 'alert-danger') return false;
  if (typeof id === 'undefined' || id === '' || $('#'+id).length == 0) id = 'error';

  var element = $('#'+id);
  if (element.length == 0) {
    console.log('Error message element "'+id+'" doesn\'t exist.');
    return false;
  }
  
  element.hide();
  element.removeClass();
  element.addClass('alert');
  element.addClass(type);
  element.html(msg);
  element.show();
}

function loader(message) {
  if (typeof message === 'undefined') message = 'betöltés';
  if ($('#loader').css('display') == 'flex') {
    $('#loader').hide();
  } else {
    $('#loader_text').html(message);
    $('#loader').css('display', 'flex');
  }
}

function filetodataurl(input, callback) {

    var filesSelected = $('#' + input)[0].files;
    if (filesSelected.length > 0) {
        var fileToLoad = filesSelected[0];
        var fileReader = new FileReader();

        fileReader.onload = function(fileLoadedEvent) {
            callback.call(this, fileLoadedEvent.target.result);
        };

        fileReader.readAsDataURL(fileToLoad);
    } else {
        callback.call(this, '');
    }
}

//  -------------------------------------------------------------------------
//  GETDATEMAX function
//  Returns the number of days in a given month.

function getdatemax(mnth) {

    switch (mnth) {
        case 1:
            return (31);
        case 2:
            return (29);
        case 3:
            return (31);
        case 4:
            return (30);
        case 5:
            return (31);
        case 6:
            return (30);
        case 7:
            return (31);
        case 8:
            return (31);
        case 9:
            return (30);
        case 10:
            return (31);
        case 11:
            return (30);
        case 12:
            return (31);
    }
    return false;
}


//  -------------------------------------------------------------------------
//  RETURNDOCUMENT
//  Retrieves the filename of the current document

function returnDocument() {
    var file_name = document.location.href;
    var end = (file_name.indexOf("?") == -1) ? file_name.length : file_name.indexOf("?");
    return file_name.substring(file_name.lastIndexOf("/") + 1, end);
}

//  -------------------------------------------------------------------------
//  IN_ARRAY
//  Tells if a value is present in an array

function in_array(needle, haystack) {
    for (key in haystack) {
        if (haystack[key] == needle) {
            return key;
        }
    }
    return false;
}

//  -------------------------------------------------------------------------
//  TEST
//  Tests if this thing works at all...

function test() {
    alert('it worx');
}

function nl2br(str, is_xhtml) {
    var breakTag = (is_xhtml || typeof is_xhtml === 'undefined') ? '<br ' + '/>' : '<br>';
    return (str + '').replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/gi, '$1' + breakTag + '$2');
}

function br2nl(string) {
    return string.replace(/<[bB][rR]\s*[\/]?>/gi, "\n");
}

function rgb2hex(rgb) {

    if (rgb.match(/(rgb)?\(?([01]?\d\d?|2[0-4]\d|25[0-5])(\W+)([01]?\d\d?|2[0-4]\d|25[0-5])\W+(([01]?\d\d?|2[0-4]\d|25[0-5])\)?)$/) == null) return '';

    var rgb = rgb.substring(rgb.indexOf('(') + 1, rgb.indexOf(')'));
    rgb = rgb.replace(/ /gi, '');

    r = rgb.substring(0, rgb.indexOf(','));
    g = rgb.substring(rgb.indexOf(',') + 1, rgb.indexOf(',', rgb.indexOf(',') + 1));
    b = rgb.substring(rgb.indexOf(',', rgb.indexOf(',') + 1) + 1);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return '';

    r = ("0" + (Number(r).toString(16))).slice(-2).toUpperCase()
    g = ("0" + (Number(g).toString(16))).slice(-2).toUpperCase()
    b = ("0" + (Number(b).toString(16))).slice(-2).toUpperCase()

    return '#' + r + g + b;
}

function hex2rgb(hex) {

    if (hex.length != 7 || hex.substring(0, 1) != '#') return '';
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result == null || result.length != 4) return '';

    r = parseInt(result[1], 16);
    g = parseInt(result[2], 16);
    b = parseInt(result[3], 16);

    if (isNaN(r) || isNaN(g) || isNaN(b)) return '';
    return ('rgb (' + r + ', ' + g + ', ' + b + ')');
}
