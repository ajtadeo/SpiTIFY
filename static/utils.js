/* getEnv(name) */
// https://stackoverflow.com/questions/68329418/in-javascript-how-can-i-throw-an-error-if-an-environmental-variable-is-missing
function getEnv(name){
    let val = process.env[name];
    if ((val === undefined) || (val === null)) {
        throw ("Spotipi: Error: Missing "+ name +" in ./.env");
    }
    return val;
}

export {getEnv}