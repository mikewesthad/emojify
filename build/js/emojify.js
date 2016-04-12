(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
/**
 * A module that takes a clm tracker object and uses it to draw an emoji face
 * using p5.  The canvas has a debug mode that can be toggled on/off by pressing
 * the "f" key.
 * @module emoji-canvas
 */

module.exports = EmojiCanvas;

function EmojiCanvas(ctracker) {
    this.ctracker = ctracker;
    this.debugModeEnabled = false;
}

EmojiCanvas.prototype.start = function(width, height, parentElement) {
    // Using p5 in instance mode:
    //  https://github.com/processing/p5.js/wiki/Instantiation-Cases
    // This keeps everything from ending up in the global scope.
    var sketch = function (p) {
        // Store p5 instance, so that not all methods have to be based it 
        // directly
        this.p = p;
        // Bind a context and some parameters to the p5 functions, so that when
        // they are called by the p5 event loop, they have the info we want.
        p.setup = this._setup.bind(this, p, width, height);
        p.draw = this._draw.bind(this, p);
        p.keyPressed = this._keyPressed.bind(this, p);
    }.bind(this);
    new p5(sketch, parentElement);
};

EmojiCanvas.prototype.clear = function() {
    if (this.p) this.p.clear();
};

EmojiCanvas.prototype._setup = function(p, width, height) {
    var canvas = p.createCanvas(width, height);
    p.textSize(32); // Set the "default" text size for the canvas once
};

EmojiCanvas.prototype._draw = function(p) {
    p.clear();
    // Get the array of face points from tracker, returns false if no face is 
    // detected
    var facePoints = this.ctracker.getCurrentPosition();
    if (facePoints) {
        this._drawEmoji(p, facePoints);
        if (this.debugModeEnabled) {
            // The score is a value between 0 and 1 that describes how well the
            // "detected" face matches the tracker's face model 
            var score = this.ctracker.getScore();
            this._drawDebug(p, facePoints, score);
        }
    }
};

EmojiCanvas.prototype._keyPressed = function(p) {
    var lowerKey = p.key.toLowerCase();
    if (lowerKey === "f") {
        this.debugModeEnabled = !this.debugModeEnabled;
    }
};

EmojiCanvas.prototype._drawDebug = function(p, facePoints, score) {
    p.fill(255);
    p.noStroke();
    p.text("Face Match: " + p.round(score * 100) + "%", 10, 40);
    p.fill(255);
    p.stroke(0);
    p.strokeWeight(1);
    for (var i = 0; i < facePoints.length; i += 1) {
        var point = facePoints[i];
        p.ellipse(point[0], point[1], 4, 4);
    }
};

EmojiCanvas.prototype._drawEmoji = function (p, facePoints) {
    // clmtrackr has a reference diagram that shows what the array of facePoints
    // correspond to in terms of the face model:
    //  http://auduno.github.io/clmtrackr/docs/reference.html
    // Calculate the face diameter.  This is used to size the other face 
    // components.
    var nose = facePoints[41];
    var chin = facePoints[7];
    var chinDist = facePosDist(nose, chin);
    var faceDiameter = 2 * chinDist;
    // Draw the components
    this._drawHead(p, facePoints, faceDiameter);
    this._drawEyes(p, facePoints, faceDiameter);
    this._drawMouth(p, facePoints, faceDiameter);
};

EmojiCanvas.prototype._drawHead = function(p, facePoints, faceDiameter) {
    var center = facePoints[41];
    p.fill("#ffdd67");
    p.noStroke();
    p.ellipse(center[0], center[1], faceDiameter, faceDiameter);
};

EmojiCanvas.prototype._drawEyes = function(p, facePoints, faceDiameter) {
    var leftPos = facePoints[27];
    var rightPos = facePoints[32];
    var eyeDiameter = faceDiameter * 0.3;
    var irisDiameter = eyeDiameter * 0.5;
    p.fill(255);
    p.noStroke();
    p.ellipse(leftPos[0], leftPos[1], eyeDiameter, eyeDiameter);
    p.ellipse(rightPos[0], rightPos[1], eyeDiameter, eyeDiameter);
    p.fill("#664e27");
    p.ellipse(leftPos[0], leftPos[1], irisDiameter, irisDiameter);
    p.ellipse(rightPos[0], rightPos[1], irisDiameter, irisDiameter);
};

EmojiCanvas.prototype._drawMouth = function(p, facePoints, faceDiameter) {
    var mouthLeft = facePoints[44];
    var mouthRight = facePoints[50];
    var mouthTop = facePoints[47];
    var upperLipBottom = facePoints[60];
    var lowerLipTop = facePoints[57];
    var mouthSize = faceDiameter * 0.5;
    var mouthWidth = facePosDist(mouthLeft, mouthRight);
    var mouthCenter = facePosAve(mouthLeft, mouthRight);
    var mouthAngle = p.atan2(mouthRight[1] - mouthLeft[1],
                             mouthRight[0] - mouthLeft[0]);
    var lipDist = facePosDist(upperLipBottom, lowerLipTop);
    var normalizedLipDist = lipDist / mouthWidth;
    var isOpen = (normalizedLipDist > 0.2);
    var eyeDiameter = faceDiameter * 0.3;
    var irisDiameter = eyeDiameter * 0.5;    
    // Draw the mouth
    if (!isOpen) {
        // Draw a straight line mouth
        p.stroke("#664e27");
        p.noFill();
        p.strokeWeight(10);  
        p.line(mouthLeft[0], mouthLeft[1], mouthRight[0], mouthRight[1]);
    }
    else {        
        // Draw a half-circle mouth
        p.fill("#664e27");
        p.noStroke();
        p.push();
        p.translate(mouthTop[0], mouthTop[1]);
        p.rotate(mouthAngle);
        p.arc(0, 0, mouthSize, mouthSize, 0, p.PI, p.CHORD);
        p.pop();
    }
};

// Helper functions that are private to this module

function facePosDist(pos1, pos2) {
    var dx = pos2[0] - pos1[0];
    var dy = pos2[1] - pos1[1];
    return Math.sqrt((dx * dx) + (dy * dy));
}

function facePosAve(pos1, pos2) {
    var ax = (pos1[0] + pos2[0]) / 2;
    var ay = (pos1[1] + pos2[1]) / 2;
    return [ax, ay];
}
},{}],2:[function(require,module,exports){
// Modules
var EmojiCanvas = require("./emoji-canvas.js");
var crossBrowserGetUserMedia = require("./get-user-media.js");

// Global flags for keeping track of when the video stream has started
var hasStreamStarted = false;

// Get & cache DOM elements
var startButton = document.getElementById("start-button");
var stopButton = document.getElementById("stop-button");
var trackerContainer = document.getElementById("tracker-container");
var video = document.getElementById("webcam-stream");

// Set up a tracker
var ctracker = new clm.tracker({ useWebGL: true });
ctracker.init(pModel);

// Set up the canvas that will draw the emoji face
var emojiCanvas = new EmojiCanvas(ctracker);

// When the start button is pressed, make sure the webcam feed has loaded before
// starting the clm tracker
startButton.addEventListener("click", function (event) {
    if (hasStreamStarted) {        
        ctracker.start(video);
    }
});

// When the stop button is pressed, stop & reset everything so that no emojis
// are drawn
stopButton.addEventListener("click", function (event) {
    ctracker.reset();      
    ctracker.stop();
    emojiCanvas.clear();
});

// Get the web cam feed
if (!crossBrowserGetUserMedia) {
    displayError("Unfortunately, your browser doesn't support webcam feeds " +
                 "in the browser :(");
}
else {
    // Request a video stream
    // We could also make a request for a specific resolution, if we wanted
    var constraints = {
        audio: false,
        video: true
    };
    crossBrowserGetUserMedia(constraints, handleStream, handleError);
}

function handleStream(mediaStream) {
    // Pipe webcam stream to video element
    video.src = window.URL.createObjectURL(mediaStream);
    video.play();
    video.addEventListener("loadedmetadata", function () {
        // When this event fires, the video element will have figured out its
        // attributes (including width & height of the stream)
        // Give the video a width & height attribute, because that's what 
        // the clm tracker will eventually need.
        hasStreamStarted = true;
        video.width = video.videoWidth;
        video.height = video.videoHeight;
        // Create the emoji canvas and append it to the trackerContainer DOM
        // element
        emojiCanvas.start(video.width, video.height, trackerContainer);
    });
}

function handleError(error) {
    console.log("Error: %s", error);
    if (error.name.toLowerCase() === "permissiondeniederror") {
        displayError("This app needs permission to use your webcam.");
    }        
    else {
        displayError("Error getting webcam feed!");
    }
}

function displayError(message) {
    var errorMessage = document.getElementById("error-message");
    errorMessage.textContent = message;
    errorMessage.style.display = "block";
}
},{"./emoji-canvas.js":1,"./get-user-media.js":3}],3:[function(require,module,exports){
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
},{}]},{},[2])


//# sourceMappingURL=emojify/emojify.js.map
