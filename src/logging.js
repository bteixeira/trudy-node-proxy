var i = 1;

function log(n) {
    Array.prototype.unshift.call(arguments, n + ' ');
    console.log.apply(null, arguments);
}

exports.nextLogger = function () {
    i += 1;
    var n = i;
    return function () {
        log(n);
    };
};