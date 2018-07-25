/**
 * Zamenjava kode smeška s sliko (iz oddaljenega strežnika
 * https://teaching.lavbic.net/OIS/gradivo/{smesko}.png)
 * 
 * @param vhodnoBesedilo sporočilo, ki lahko vsebuje kodo smeška
 */
function dodajSmeske(vhodnoBesedilo) {
  var preslikovalnaTabela = {
    ";)": "wink.png",
    ":)": "smiley.png",
    "(y)": "like.png",
    ":*": "kiss.png",
    ":(": "sad.png"
  };
  for (var smesko in preslikovalnaTabela) {
    vhodnoBesedilo = vhodnoBesedilo.split(smesko).join(
      "<img src='https://teaching.lavbic.net/OIS/gradivo/" +
      preslikovalnaTabela[smesko] + "' />");
  }
  return vhodnoBesedilo;
}


/**
 * Čiščenje besedila sporočila z namenom onemogočanja XSS napadov
 * 
 * @param sporocilo začetno besedilo sporočila
 */
function divElementEnostavniTekst(sporocilo) {
  var jeSmesko = sporocilo.indexOf("https://teaching.lavbic.net/OIS/gradivo/") > -1;
  if (jeSmesko) {
    sporocilo =
      sporocilo.split("<").join("&lt;")
               .split(">").join("&gt;")
               .split("&lt;img").join("<img")
               .split("png' /&gt;").join("png' />");
    return divElementHtmlTekst(sporocilo);
  } else {
    return $('<div style="font-weight: bold"></div>').text(sporocilo);  
  }
}


/**
 * Prikaz "varnih" sporočil, t.j. tistih, ki jih je generiral sistem
 * 
 * @param sporocilo začetno besedilo sporočila
 */
function divElementHtmlTekst(sporocilo) {
  return $('<div></div>').html('<i>' + sporocilo + '</i>');
}


/**
 * Obdelaj besedilo, ki ga uporabnik vnese v obrazec na spletni strani, kjer
 * je potrebno ugotoviti ali gre za ukaz ali za sporočilo na kanal
 * 
 * @param klepetApp objekt Klepet, ki nam olajša obvladovanje 
 *        funkcionalnosti uporabnika
 * @param socket socket WebSocket trenutno prijavljenega uporabnika
 */
function procesirajVnosUporabnika(klepetApp, socket) {
  var sporocilo = $('#poslji-sporocilo').val();
  /*var st=sporocilo.search('https://www.youtube.com/watch?v=');
  while(st!=(-1)){
    var video=sporocilo.slice(st,sporocilo.length);
    st=video.search(' ');
    if(st!=(-1))
      video=video.slice(0,st);
    $('#sporocila').append('<iframe src="https://www.youtube.com/embed/'+video+'" allowfullscreen></iframe>');
  }*/
  sporocilo = dodajSmeske(sporocilo);
  var sistemskoSporocilo;
  
  // Če uporabnik začne sporočilo z znakom '/', ga obravnavaj kot ukaz
  if (sporocilo.charAt(0) == '/') {
    sistemskoSporocilo = klepetApp.procesirajUkaz(sporocilo);
    if (sistemskoSporocilo) {
      $('#sporocila').append(divElementHtmlTekst(sistemskoSporocilo));
    }
  // Če gre za sporočilo na kanal, ga posreduj vsem članom kanala
  } else {
    sporocilo = filtrirajVulgarneBesede(sporocilo);
    klepetApp.posljiSporocilo(trenutniKanal, sporocilo);
    $('#sporocila').append(divElementEnostavniTekst(sporocilo));
    var st=sporocilo.search('https://www.youtube.com/watch?v=');
    var video='';
    
    while(st!=(-1)){
      st+=32;
      var v=sporocilo.slice(st,sporocilo.length);
      var x = v.search(' ');
      if(x!=(-1)){
        video=v.slice(0,x);
      }
      else {
        video=v;
      }  
      $('#sporocila').append('<iframe src="https://www.youtube.com/embed/'+video+'" allowfullscreen></iframe>');
      st=v.search('https://www.youtube.com/watch?v=');
    }
   
    $('#sporocila').scrollTop($('#sporocila').prop('scrollHeight'));
    
    var n=sporocilo.search('@');
    var neki;
    while(n!=-1){
      var x='';
      sporocilo=sporocilo.slice(n+1,sporocilo.length);
      var b=0;
      while(((sporocilo[b]!=' '))&&(b<sporocilo.length)){
        x=x+sporocilo[b];
        b++;
      }
      n=sporocilo.search('@');
      neki=klepetApp.procesirajUkaz('/zasebno "'+x+'" "&#9758; Omemba v klepetu"');
      if (neki) {
        $('#sporocila').append(divElementHtmlTekst(neki));
      }
    }
    
  }

  $('#poslji-sporocilo').val('');
}


// Branje vulgarnih besed v seznam
var vulgarneBesede = [];
$.get('./swearWords.txt', function(podatki) {
  vulgarneBesede = podatki.split('\r\n');
});


/**
 * Iz podanega niza vse besede iz seznama vulgarnih besed zamenjaj 
 * z enako dolžino zvezdic (*)
 * 
 * @param vhodni niz
 */
function filtrirajVulgarneBesede(vhod) {
  for (var i in vulgarneBesede) {
    var re = new RegExp('\\b' + vulgarneBesede[i] + '\\b', 'gi');
    vhod = vhod.replace(re, "*".repeat(vulgarneBesede[i].length));
  }
  return vhod;
}


var socket = io.connect();
var trenutniVzdevek = "";
var trenutniKanal = "";


// Poačakj, da se celotna stran naloži, šele nato začni z izvajanjem kode
$(document).ready(function() {
  var klepetApp = new Klepet(socket);
  
  // Prikaži rezultat zahteve po spremembi vzdevka
  socket.on('vzdevekSpremembaOdgovor', function(rezultat) {
    var sporocilo;
    if (rezultat.uspesno) {
      trenutniVzdevek = rezultat.vzdevek;
      $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
      sporocilo = 'Prijavljen si kot ' + rezultat.vzdevek + '.';
    } else {
      sporocilo = rezultat.sporocilo;
    }
    $('#sporocila').append(divElementHtmlTekst(sporocilo));
  });
  
  // Prikaži rezultat zahteve po spremembi kanala
  socket.on('pridruzitevOdgovor', function(rezultat) {
    trenutniKanal = rezultat.kanal;
    $('#kanal').text(trenutniVzdevek + " @ " + trenutniKanal);
    $('#sporocila').append(divElementHtmlTekst('Sprememba kanala.'));
  });
  
  // Prikaži prejeto sporočilo
  socket.on('sporocilo', function (sporocilo) {
    var novElement = divElementEnostavniTekst(sporocilo.besedilo);
    $('#sporocila').append(novElement);
  });
  
  // Prikaži seznam kanalov, ki so na voljo
  socket.on('kanali', function(kanali) {
    $('#seznam-kanalov').empty();

    for(var i in kanali) {
      if (kanali[i] != '') {
        $('#seznam-kanalov').append(divElementEnostavniTekst(kanali[i]));
      }
    }
  
    // Klik na ime kanala v seznamu kanalov zahteva pridružitev izbranemu kanalu
    $('#seznam-kanalov div').click(function() {
      klepetApp.procesirajUkaz('/pridruzitev ' + $(this).text());
      $('#poslji-sporocilo').focus();
    });
  });
  
  socket.on('uporabniki', function(uporabniki) {
    $("#seznam-uporabnikov").empty();
    for (var i=0; i < uporabniki.length; i++) {
      $("#seznam-uporabnikov").append(divElementEnostavniTekst(uporabniki[i]));
    }
  });
  
  // Seznam kanalov in uporabnikov posodabljaj vsako sekundo
  setInterval(function() {
    socket.emit('kanali');
    socket.emit('uporabniki', {kanal: trenutniKanal});
  }, 1000);

  $('#poslji-sporocilo').focus();
  
  // S klikom na gumb pošljemo sporočilo strežniku
  $('#poslji-obrazec').submit(function() {
    procesirajVnosUporabnika(klepetApp, socket);
    return false;
  });
});


/* global $, io, Klepet */