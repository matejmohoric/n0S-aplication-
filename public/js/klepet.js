// V tej datoteki je opredeljen objekt Klepet, 
// ki nam olajša obvladovanje funkcionalnosti uporabnika


var Klepet = function(socket) {
  this.socket = socket;
};


/**
 * Pošiljanje sporočila od uporabnika na strežnik z uporabo 
 * WebSocket tehnologije po socketu 'sporocilo'
 * 
 * @param kanal ime kanala, na katerega želimo poslati sporočilo
 * @param besedilo sporočilo, ki ga želimo posredovati
 */
Klepet.prototype.posljiSporocilo = function(kanal, besedilo) {
  var sporocilo = {
    kanal: kanal,
    besedilo: besedilo
  };
  this.socket.emit('sporocilo', sporocilo);
};


/**
 * Uporabnik želi spremeniti kanal, kjer se zahteva posreduje na strežnik 
 * z uporabo WebSocket tehnologije po socketu 'pridruzitevZahteva'
 * 
 * @param kanal ime kanala, kateremu se želimo pridružiti
 */
Klepet.prototype.spremeniKanal = function(kanal) {
  this.socket.emit('pridruzitevZahteva', {
    novKanal: kanal
  });
};


/**
 * Procesiranje ukaza, ki ga uporabnik vnese v vnosno polje, kjer je potrebno
 * najprej izluščiti za kateri ukaz gre, nato pa prebrati še parametre ukaza
 * in zahtevati izvajanje ustrezne funkcionalnosti
 * 
 * @param ukaz besedilo, ki ga uporabnik vnese v vnosni obrazec na spletu
 */
Klepet.prototype.procesirajUkaz = function(ukaz) {
  var besede = ukaz.split(' ');
  // Izlušči ukaz iz vnosnega besedila
  ukaz = besede[0].substring(1, besede[0].length).toLowerCase();
  var sporocilo = false;

  switch(ukaz) {
    case 'pridruzitev':
      besede.shift();
      var kanal = besede.join(' ');
      // Sproži spremembo kanala
      this.spremeniKanal(kanal);
      break;
    case 'vzdevek':
      besede.shift();
      var vzdevek = besede.join(' ');
      // Zahtevaj spremembo vzdevka
      this.socket.emit('vzdevekSpremembaZahteva', vzdevek);
      break;
    case 'zasebno':
      besede.shift();
      var besedilo = besede.join(' ');
      var parametri = besedilo.split('\"');
      var neki = parametri.join(',');
      parametri=neki.split(',');
      neki='';
      for(var i=1;i<parametri.length-3;i++){
        //console.log(parametri[i]);
        //console.log(i);
      if (parametri) {
        neki=neki+parametri[i];
        if(i<parametri.length-4)
          neki=neki+',';
        this.socket.emit('sporocilo', {vzdevek: parametri[i], besedilo: parametri[parametri.length-2]});
        sporocilo = '(zasebno za ' + neki + '): ' + parametri[parametri.length-2];
      } else {
        sporocilo = 'Neznan ukaz';
      }}
      break;
      case 'barva':
        besede.shift();
        var barva = besede.join(' ');
        document.getElementById('kanal').style.color=barva;
        document.getElementById('sporocila').style.color=barva;
        break;
    default:
      // Vrni napako, če pride do neznanega ukaza
      sporocilo = 'Neznan ukaz.';
      break;
  }

  return sporocilo;
};