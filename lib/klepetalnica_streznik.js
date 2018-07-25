var socketio = require('socket.io');
var io;
var stevilkaGosta = 1;
var vzdevkiGledeNaSocket = {};
var uporabljeniVzdevki = [];
var trenutniKanal = {};


// Nastavitve Socket.io strežnika, ki skrbi za medsebojno komunikacijo
// odjemalcev in strežnika s pomočjo tehnologije WebSocket
exports.listen = function(streznik) {
  // Poženi Socket.io strežnik, tako da razširimo obsotječega
  io = socketio.listen(streznik);
  // Opredelimo, kako se bo obdelala posamezna povezava
  io.sockets.on('connection', function (socket) {
    // Uporabniku dodeli vzdevek gosta
    stevilkaGosta = dodeliVzdevekGostu(socket, stevilkaGosta, 
      vzdevkiGledeNaSocket, uporabljeniVzdevki);
    // Uporabnika včlani v privzet kanal 'Skedenj'
    pridruzitevKanalu(socket, 'Skedenj');
    obdelajPosredovanjeSporocila(socket, vzdevkiGledeNaSocket);
    obdelajZahtevoZaSprememboVzdevka(socket, vzdevkiGledeNaSocket, 
      uporabljeniVzdevki);
    obdelajPridruzitevKanalu(socket);
    // Uporabniku prikaži seznam obstoječih kanalov
    socket.on('kanali', function() {
      var kanaliNaVoljo = [];
      var vsiKanali = io.sockets.adapter.rooms;
      if (vsiKanali) {
        for (var kanal in vsiKanali) {
          if (Object.keys(vsiKanali[kanal].sockets) != kanal) {
            kanaliNaVoljo.push(kanal);
          }
        }
      }
      socket.emit('kanali', kanaliNaVoljo);
    });
    // Uporabniku prikaži seznam trenutnih uporabnikov kanala
    socket.on('uporabniki', function(kanal) {
      var uporabnikiNaKanalu = io.sockets.adapter.rooms[kanal.kanal];
      var uporabniki = [];
      if (uporabnikiNaKanalu) {
        uporabnikiNaKanalu = Object.keys(uporabnikiNaKanalu.sockets);
        for (var i=0; i < uporabnikiNaKanalu.length; i++) {
          uporabniki.push(vzdevkiGledeNaSocket[uporabnikiNaKanalu[i]]);
        }
      }
      io.sockets.in(kanal.kanal).emit('uporabniki', uporabniki);
    });
    // Čiščenje ob odjavi uporabnika
    obdelajOdjavoUporabnika(socket, vzdevkiGledeNaSocket, uporabljeniVzdevki);
  });
  
};


/**
 * Gostu ob prvi prijavi samodejno dodeli vzdevek po vzorcu "GostX", kjer je
 * X zaporedna številka gosta
 * 
 * @param socket WebSocket trenutno prijavljenega uporabnika
 * @param stGosta zaporedna številka uporabnika
 * @param vzdevki tabela vzdevkov s pripadajočim ID-jem povezave
 * @param uporabljeniVzdevki seznam vseh že uporabljenih vzdevkov v 
 *        spletni klepetalnici
 */
function dodeliVzdevekGostu(socket, stGosta, vzdevki, uporabljeniVzdevki) {
  // Generiraj nov vzdevek gosta
  var vzdevek = 'Gost' + stGosta;
  // Poveži vzdevek gosta z ID-jem povezave
  vzdevki[socket.id] = vzdevek;
  // Uporabniku sporoči njegov vzdevek
  socket.emit('vzdevekSpremembaOdgovor', {
    uspesno: true,
    vzdevek: vzdevek
  });
  // Shrani dodeljen vzdevek med že uporabljene vzdevke
  uporabljeniVzdevki.push(vzdevek);
  // Povečaj števec gostov
  return stGosta + 1;
}


/**
 * Ob pridružitvi kanalu je potrebno sporočiti trenutnemu uporabniku, da se je
 * uspešno prijavil v kanal, mu posredovati seznam obstoječih uporabnikov,
 * medtem ko je potrebno ostale uporabnike obvestiti, da se je prijavil nov
 * uporabnik
 * 
 * @param socket WebSocket trenutno prijavljenega uporabnika
 * @param kanal kanal, kateremu se želi uporabnik pridružiti
 */
function pridruzitevKanalu(socket, kanal) {
  // Prijava uporabnika na kanal
  socket.join(kanal);
  // Označi, da je uporabnik sedaj na kanalu
  trenutniKanal[socket.id] = kanal;
  // Sporoči trenutnemu uporabniku, da je sedaj v novem kanalu
  socket.emit('pridruzitevOdgovor', {kanal: kanal});
  // Sporoči vsem ostalim uporabnikom na kanalu, da se je prijavil nov uporabnik
  socket.broadcast.to(kanal).emit('sporocilo', {
    besedilo: vzdevkiGledeNaSocket[socket.id] + 
      ' se je pridružil kanalu ' + kanal + '.'
  });
  
  // Pridobi uporabnike, ki so na kanalu
  var uporabnikiNaKanalu = Object.keys(io.sockets.adapter.rooms[kanal].sockets);
  // Če je poleg trenutnega uporabnika še kakšen uporabnik, 
  // potem pripravi seznam prisotnih uporabnikov na kanalu
  if (uporabnikiNaKanalu.length > 1) {
    var uporabnikiNaKanaluPovzetek = 
      'Trenutni uporabniki na kanalu ' + kanal + ': ';
    for (var i in uporabnikiNaKanalu) {
      var uporabnikSocketId = uporabnikiNaKanalu[i];
      if (uporabnikSocketId != socket.id) {
        if (i > 0) {
          uporabnikiNaKanaluPovzetek += ', ';
        }
        uporabnikiNaKanaluPovzetek += vzdevkiGledeNaSocket[uporabnikSocketId];
      }
    }
    uporabnikiNaKanaluPovzetek += '.';
    // Trenutnemu uporabniku posreduj seznam vseh prisotnih uporabnikov
    socket.emit('sporocilo', {besedilo: uporabnikiNaKanaluPovzetek});
  }
}


/**
 * Uporabnik lahko zahteva spremembo vzdevka, če le-ta še ni zaseden oz. se ne
 * začne s predpono 'Gost'. Če je sprememba vzdevka uspešna, je potrebno o tem
 * obvestiti tudi ostale uporabnike na kanalu
 * 
 * @param socket WebSocket trenutno prijavljenega uporabnika
 * @param vzdevkiGledeNaSocket tabela vzdevkov s pripadajočim ID-jem povezave
 * @param uporabljeniVzdevki seznam vseh že uporabljenih vzdevkov v 
 *        spletni klepetalnici
 */
function obdelajZahtevoZaSprememboVzdevka(socket, vzdevkiGledeNaSocket, 
    uporabljeniVzdevki) {
  // Dodan poslušalec z zahtevo po spremembi vzdevka
  socket.on('vzdevekSpremembaZahteva', function(vzdevek) {
    // Uporabniku ne dovolimo spremembe v vzdevek s predpono 'Gost'
    if (vzdevek.indexOf('Gost') == 0) {
      socket.emit('vzdevekSpremembaOdgovor', {
        uspesno: false,
        sporocilo: 'Vzdevki se ne morejo začeti z "Gost".'
      });
    } else {
      // Če vzdevek še ni zaseden, ga registriraj
      if (uporabljeniVzdevki.indexOf(vzdevek) == -1) {
        var prejsnjiVzdevek = vzdevkiGledeNaSocket[socket.id];
        var prejsnjiVzdevekIndeks = uporabljeniVzdevki.indexOf(prejsnjiVzdevek);
        uporabljeniVzdevki.push(vzdevek);
        vzdevkiGledeNaSocket[socket.id] = vzdevek;
        // Vzdevek, ki je bil prej v uporabi izbriši, da ga lahko potencialno
        // izbere drug uporabnik
        delete uporabljeniVzdevki[prejsnjiVzdevekIndeks];
        socket.emit('vzdevekSpremembaOdgovor', {
          uspesno: true,
          vzdevek: vzdevek
        });
        // Vse ostale uporabnike na kanalu obvesti o spremembi vzdevka
        // trenutnega uporabnika
        socket.broadcast.to(trenutniKanal[socket.id]).emit('sporocilo', {
          besedilo: prejsnjiVzdevek + ' se je preimenoval v ' + vzdevek + '.'
        });
      } else {
        // Če je vzdevek že zaseden, pošlji uporabniku sporočilo o napaki
        socket.emit('vzdevekSpremembaOdgovor', {
          uspesno: false,
          sporocilo: 'Vzdevek je že v uporabi.'
        });
      }
    }
  });
}


/**
 * Posredovanje sporočila na podan kanal (na trenutuni kanal prijavljenega 
 * uporabnika), skupaj z vzdevkom avtorja sporočila oz. posredovanje 
 * privatnega sporočila izbranemu uporabniku
 * 
 * @param socket WebSocket trenutno prijavljenega uporabnika
 */
function obdelajPosredovanjeSporocila(socket) {
  socket.on('sporocilo', function (sporocilo) {
    // Posredovanje sporočila na kanal
    if (sporocilo.kanal) {
      socket.broadcast.to(sporocilo.kanal).emit('sporocilo', {
        besedilo: vzdevkiGledeNaSocket[socket.id] + ': ' + sporocilo.besedilo
      });  
    // Posredovanje zasebnega sporočila
    } else if (sporocilo.vzdevek) {
      var socketIdNaslovnika = null;
      // Poiščemo ID socketa naslovnika
      for (var id in vzdevkiGledeNaSocket) {
        if (sporocilo.vzdevek == vzdevkiGledeNaSocket[id]) {
          socketIdNaslovnika = id;
          break;
        }
      }
      // Če naslovnika najdemo ...
      if (socketIdNaslovnika) {
        // ... in to nismo mi (pošiljanje samemu sebi)
        if (socketIdNaslovnika == socket.id) {
          io.sockets.sockets[socket.id].emit('sporocilo', {
            besedilo: "Sporočila '" + sporocilo.besedilo + 
              "' uporabniku z vzdevkom '" + sporocilo.vzdevek + 
              "' ni bilo mogoče posredovati."
          });
        // ... pošljemo zasebno sporočilo
        } else {
          io.sockets.sockets[socketIdNaslovnika].emit('sporocilo', {
            besedilo: vzdevkiGledeNaSocket[socket.id] + ' (zasebno): ' + 
              sporocilo.besedilo
          });
        }
      // Če naslovnika ne najdemo (ne obstaja) ...
      } else {
        io.sockets.sockets[socket.id].emit('sporocilo', {
          besedilo: "Sporočila '" + sporocilo.besedilo + 
            "' uporabniku z vzdevkom '" + sporocilo.vzdevek + 
            "' ni bilo mogoče posredovati."
        });
      }
    }
  });
}


/**
 * Pri prijavi uporabnika na nov kanal ga je potrebno iz predhodnjega 
 * kanala odjaviti
 * 
 * @param socket WebSocket trenutno prijavljenega uporabnika
 */
function obdelajPridruzitevKanalu(socket) {
  socket.on('pridruzitevZahteva', function(kanal) {
    socket.leave(trenutniKanal[socket.id]);
    pridruzitevKanalu(socket, kanal.novKanal);
  });
}


/**
 * Ob odjavi uporabnika njegov vzdevek odstranimo iz seznama 
 * uporabljenih vzdevkov
 * 
 * @param socket WebSocket trenutno prijavljenega uporabnika
 */
function obdelajOdjavoUporabnika(socket) {
  socket.on('disconnect', function() {
    var vzdevekIndeks = 
      uporabljeniVzdevki.indexOf(vzdevkiGledeNaSocket[socket.id]);
    delete uporabljeniVzdevki[vzdevekIndeks];
    delete vzdevkiGledeNaSocket[socket.id];
  });
}