
function parseCmd(input) {
    if(input[0] != '/') {
        //log error message
        return;
    }
    var cmd = input.substr(1);
    switch(cmd) {
            case 'fault':
            case 'help':
            case 'mealcred':
            case 'menu':
            case 'nextbus':
            case 'traffic':
            case 'weather':
            break;
    }
}