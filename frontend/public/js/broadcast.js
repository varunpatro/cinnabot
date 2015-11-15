$('#broadcastForm').submit(function(event) {
	var header = "Are you sure you want to broadcast this crap?\n";
	var msg = $("textarea:first").val();
    var isConfirmed = confirm(header + msg);
    if (isConfirmed) {
    	var data = $(this).serialize();
    	$.get("/broadcast", data, function() {
    		alert("Message Broadcasted!");
    	});
    }
    $("textarea:first").val("");
    event.preventDefault();
})