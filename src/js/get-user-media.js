/**
 * A module that returns a function (or null) that can get user media in a cross
 * browser compatible way.
 * @module get-user-media
 */

module.exports = (function getCrossBrowserUserMedia() {
	if (!window.navigator) return null;
    // Unfortunately, we're at a point where we still have to use vendor 
    // prefixes to get user media.
    var _getUserMedia = navigator.getUserMedia ||       // No prefix
                        navigator.webkitGetUserMedia || // Chrome/Opera
                        navigator.mozGetUserMedia ||    // Mozilla
                        navigator.msGetUserMedia;       // IE
    if (!_getUserMedia) return null;
    // If we have navigator and one of the getUserMedia prefixes, then return
    // a function with the proper context bound to it (i.e. navigator).  If you
    // call getUserMedia without the navigator context, it will error out.
    return _getUserMedia.bind(navigator);
})();