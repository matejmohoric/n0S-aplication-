// Za združljivost razvoja na lokalnem računalniku ali v Cloud9 okolju
if (!process.env.PORT) {
  process.env.PORT = 8080;
}


// Opredelitev knjižnic, ki jih naš projekt potrebuje
var http = require('http');
var fs  = require('fs');
var path = require('path');
var mime = require('mime-types');

var predpomnilnik = {};


/**
 * Prišlo je do napake na strani odjemalca, zato ga je potrebno obvestiti
 * 
 * @param odgovor objekt, ki ga strežnik posreduje odjemalcu kot 
 *        odgovor na zahtevo
 */
function posredujNapako404(odgovor) {
  odgovor.writeHead(404, {'Content-Type': 'text/plain'});
  odgovor.write('Napaka 404: Vira ni mogoče najti.');
  odgovor.end();
}


/**
 * Prišlo je do napake na strani strežnika, zato je potrebno obvestiti odjemalca
 * 
 * @param odgovor objekt, ki ga strežnik posreduje odjemalcu kot 
 *        odgovor na zahtevo
 */
function posredujNapako500(odgovor) {
  odgovor.writeHead(500, {'Content-Type': 'text/plain'});
  odgovor.write('Napaka 500: Prišlo je do napake na strežniku.');
  odgovor.end();
}


/**
 * Posreduj vsebino datoteke odjemalcu
 * 
 * @param odgovor objekt, ki ga strežnik posreduje odjemalcu kot 
 *        odgovor na zahtevo
 * @param datotekaPot pot do datoteke
 * @param datotekaVsebina vsebina datoteka
 * 
 */
function posredujDatoteko(odgovor, datotekaPot, datotekaVsebina) {
  odgovor.writeHead(200, 
    {"content-type": mime.lookup(path.basename(datotekaPot))});
  odgovor.end(datotekaVsebina);
}


/**
 * Strežnik odjemalcu zgolj posreduje statično datoteko, t.j. ko odjemalec
 * zahteva datoteko, mu jo strežnik samo posreduje in odjemalec jo mora sam
 * prikazati
 * 
 * @param odgovor objekt, ki ga strežnik posreduje odjemalcu kot 
 *        odgovor na zahtevo
 * @param predpomnilnik podatkovna struktura, kjer so prepomnjene datoteke, 
 *        da je delovanje strežnika hitrejše
 * @param absolutnaPotDoDatoteke celotna pot do datoteke, 
 *        ki jo odjemalec zahteva
 */
function posredujStaticnoVsebino(odgovor, predpomnilnik, absolutnaPotDoDatoteke) {
  if (predpomnilnik[absolutnaPotDoDatoteke]) {
    posredujDatoteko(odgovor, absolutnaPotDoDatoteke, 
        predpomnilnik[absolutnaPotDoDatoteke]);
  } else {
    fs.exists(absolutnaPotDoDatoteke, function(datotekaObstaja) {
      if (datotekaObstaja) {
        fs.readFile(absolutnaPotDoDatoteke, function(napaka, datotekaVsebina) {
          if (napaka) {
            posredujNapako500(odgovor);
          } else {
            predpomnilnik[absolutnaPotDoDatoteke] = datotekaVsebina;
            posredujDatoteko(odgovor, absolutnaPotDoDatoteke, datotekaVsebina);
          }
        });
      } else {
        posredujNapako404(odgovor);
      }
    });
  }
}


// Kreiranje objekta strežnika in opredelitev funkcionalnosti strežnika, 
// ki jih le-ta ponuja
var streznik = http.createServer(function(zahteva, odgovor) {
  var potDoDatoteke = false;

  if (zahteva.url == '/') {
    potDoDatoteke = 'public/index.html';
  } else {
    potDoDatoteke = 'public' + zahteva.url;
  }

  var absolutnaPotDoDatoteke = './' + potDoDatoteke;
  posredujStaticnoVsebino(odgovor, predpomnilnik, absolutnaPotDoDatoteke);
});


// Strežnik poženemo tako da začne poslušati na podanih vratih
streznik.listen(process.env.PORT, function() {
  console.log("Strežnik je pognan.");
});


// Strežniku dodamo še funkcionalnost komuniciranja s pomočjo tehnologije 
// WebSocket, kar je na voljo v ločeni datoteki `klepetalnica_streznik.js`
//
// Naš strežnik sedaj ponuja naslednji funkcionalnosti:
//  - streže statične spletne strani (html, css, js)
//  - podpira komunikacijo s kanali (WebSocket)
var klepetalnicaStreznik = require('./lib/klepetalnica_streznik');
klepetalnicaStreznik.listen(streznik);