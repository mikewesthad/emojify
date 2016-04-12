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