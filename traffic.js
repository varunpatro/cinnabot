var rest = require('restler');

var busstop_url = 'http://datamall2.mytransport.sg/ltaodataservice/BusArrival?BusStopID=' ;

var busstop_headers = {
    "AccountKey": "ka44N24PjMwhr4R/4ZxO0A==",
    "UniqueUserID": "e95c73d0-7771-4744-994e-1e0a6d17392d"
};

function busstop(id) {
    var req_url = busstop_url + id.toString();
    var req_options = {"headers": busstop_headers};
    var response = send(req_url, req_options);
    return response;
}

function send(req_url, req_options) {
    return rest.get(req_url, req_options).on('complete', process_info);
}

function process_info(data) {
    console.log (data);
}

module.exports = {
    'x': busstop
}

