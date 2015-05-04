var whatsapi = require('whatsapi');
var logger = require('/logger');
var jf = require('jsonfile');

const CREDENTIALS = jf.readFileSync('./credentials.json');

/** CREATE WHATSAPP OBJECT */

var wa = whatsapi.createAdapter({
    msisdn: CREDENTIALS.phone, // phone number with country code
    username: 'cinnabot', // your name on WhatsApp
    password: CREDENTIALS.password, // WhatsApp password
    ccode: CREDENTIALS.cc // country code
});

/** START CONNECTION */

wa.connect(function connected(err) {
    if (err) { console.log(err); return; }
    console.log('Connected');
    // Now login
    wa.login(logged);
});

/** EVENT HANDLERS */

wa.on('receivedMessage', function(message) {
    console.log("Body: " + message.body);
	console.log("From: " + message.from);
    wa.sendMessage(parse(message.from), message.body, function (err, id) {
				  if (err) { console.log(err.message); return;}
				  console.log('Server received message %s', id);
	});

});

/** CALL BACKS */

function logged(err) {
    if (err) { console.log(err); return; }
    console.log('Logged in to WA server');
    wa.sendIsOnline();
}
