var whatsapi = require('whatsapi');

var wa = whatsapi.createAdapter({
    msisdn: '6581113335', // phone number with country code
    username: 'Yui Wei', // your name on WhatsApp
    password: 'k23L9COMI3a6cpg4dF+K3v4l6zg=', // WhatsApp password
    ccode: '65' // country code
});


wa.on('receivedMessage', function(message) {
    console.log("Body: " + message.body);
	console.log("From: " + message.from);
});



wa.connect(function connected(err) {
    if (err) { console.log(err); return; }
    console.log('Connected');
    // Now login
    wa.login(logged);
});

function logged(err) {
    if (err) { console.log(err); return; }
    console.log('Logged in to WA server');
    wa.sendIsOnline();
}
