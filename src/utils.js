/**
 * Shrinks a string to a certain length by taking out enough characters in the middle and replacing them with ellipsis
 * @param what the string to be shrinked
 * @param length the length to shrink to
 * @returns {*} ths shrinked string
 */
function shrink(what, length) {
    if (what.length <= length) {
        return what;
    }
    var left = what.substr(0, length / 2);
    var right = what.substr(what.length - length / 2 + 1);
    return left + '⋯' + right;
}

function dateFormat (date, fstr, utc) {
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace(/%[YmdHMSl]/g, function (m) {
        switch (m) {
        case '%Y': return date[utc + 'FullYear'] (); // no leading zeros required
        case '%m': m = 1 + date[utc + 'Month'] (); break;
        case '%d': m = date[utc + 'Date'] (); break;
        case '%H': m = date[utc + 'Hours'] (); break;
        case '%M': m = date[utc + 'Minutes'] (); break;
        case '%S': m = date[utc + 'Seconds'] (); break;
        case '%l': var l = date[utc + 'Milliseconds'] (); return l < 100 ? '0' + l : l;
        default: return m.slice (1); // unknown code, remove %
        }
        // add leading zero if required
        return ('0' + m).slice (-2);
    });
}

function fmt(time) {
    return dateFormat(time, '%H:%M:%S,%l');
}

exports.formatTime = fmt;
