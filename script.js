function isMobileDevice() {
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const rectangle = document.querySelector('.rectangle');
const codeInput = document.getElementById('code');
const videoContainer = document.getElementById('video-container');
const captureButton = document.getElementById('capture-button');
const abbruchButton = document.getElementById('abbruch');
const anleitung = document.getElementById('anleitung');
const scanner = document.querySelector('.scanner');

document.getElementById('start-camera').addEventListener('click', function() {
    const video = document.getElementById('video');
    const videoContainer = document.getElementById('video-container');
    const captureButton = document.getElementById('capture-button');
    const abbruchButton = document.getElementById('abbruch');
    const anleitung = document.getElementById('anleitung');
    const scanner = document.querySelector('.scanner');

    // Hide the scanner class and show the video container and capture button
    scanner.classList.add('hidden');
    videoContainer.classList.remove('hidden');
    anleitung.classList.remove('hidden');
    captureButton.classList.remove('hidden');
    abbruchButton.classList.remove('hidden');

    // Check if the browser supports getUserMedia API
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        // Determine if it's a mobile device
        const isMobile = isMobileDevice();

        // Set constraints based on the device type
        let constraints = {
            video: {}
        };

        if (isMobile) {
            constraints = {
                video: { 
                    facingMode: { exact: "environment" },
                    zoom: 2  // Attempt to set zoom level to 2x
                }
            };
        }

        // Request the camera stream with the appropriate constraints
        navigator.mediaDevices.getUserMedia(constraints)
        .then(function(stream) {
            const track = stream.getVideoTracks()[0];
            const capabilities = track.getCapabilities();
            
            // Check if the zoom capability is supported on mobile
            if (isMobile && capabilities.zoom) {
                track.applyConstraints({
                    advanced: [{ zoom: Math.min(2, capabilities.zoom.max) }]
                });
            }
            
            // Set the stream as the source of the video element
            video.srcObject = stream;
            video.play();

            // Store the stream globally to stop it later
            video.dataset.streamId = stream.id;
        })
        .catch(function(err) {
            // Handle errors (e.g., user denied access to camera or no rear camera available)
            console.error("Error accessing the camera: " + err);
            alert("Error accessing the camera: " + err.message);
            // Show the scanner again if an error occurs
            scanner.classList.remove('hidden');
            videoContainer.classList.add('hidden');
            captureButton.classList.add('hidden');
            abbruchButton.classList.add('hidden');
            anleitung.classList.add('hidden');
        });
    } else {
        // Notify the user if their browser doesn't support the API
        alert('Camera API not supported by this browser.');
        // Show the scanner again if an error occurs
        scanner.classList.remove('hidden');
        videoContainer.classList.add('hidden');
        captureButton.classList.add('hidden');
        abbruchButton.classList.add('hidden');
    }
});


document.getElementById('abbruch').addEventListener('click', function() {
    const video = document.getElementById('video');
    const videoContainer = document.getElementById('video-container');
    const captureButton = document.getElementById('capture-button');
    const abbruchButton = document.getElementById('abbruch');
    const anleitung = document.getElementById('anleitung');
    const scanner = document.querySelector('.scanner');

    // Stop the video stream
    const stream = video.srcObject;
    if (stream) {
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
    }

    // Hide the video container, capture button, and "Abbruch" button
    videoContainer.classList.add('hidden');
    captureButton.classList.add('hidden');
    abbruchButton.classList.add('hidden');
    anleitung.classList.add('hidden');

    // Show the scanner again
    scanner.classList.remove('hidden');
});

document.getElementById('capture-button').addEventListener('click', function() {
    const videoRect = video.getBoundingClientRect();
    const rectRect = rectangle.getBoundingClientRect();

    // Calculate the scale of the video element compared to the original video stream
    const scaleX = video.videoWidth / videoRect.width;
    const scaleY = video.videoHeight / videoRect.height;

    // Calculate the dimensions of the rectangle relative to the video stream
    const sx = (rectRect.left - videoRect.left) * scaleX;
    const sy = (rectRect.top - videoRect.top) * scaleY;
    const sw = rectRect.width * scaleX;
    const sh = rectRect.height * scaleY;

    canvas.width = sw;
    canvas.height = sh;

    const ctx = canvas.getContext('2d');

    // Draw the video frame into the canvas, cropping to the rectangle
    ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

    // Convert the captured image to a data URL (base64 string)
    const dataURL = canvas.toDataURL('image/png');
    console.log('Captured Image Data URL:', dataURL); // Debug: Check if the image data is captured correctly

    // Send the captured image to OCR.Space API
    fetch('https://api.ocr.space/parse/image', {
        method: 'POST',
        headers: {
            'apikey': 'K83948168188957',
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `base64Image=${encodeURIComponent(dataURL)}&language=eng`
    })
    .then(response => {
        console.log('OCR API Response:', response); // Debug: Check the API response
        return response.json();
    })
    .then(data => {
        console.log('OCR Parsed Data:', data); // Debug: Log the parsed data to inspect it
        if (data.OCRExitCode === 1) {
            // Successfully parsed, insert the recognized text into the input field
            const parsedText = data.ParsedResults[0].ParsedText;
            codeInput.value = parsedText.trim(); // Trim whitespace in case of empty or partial results
        } else {
            alert('OCR failed to recognize text. Please try again.');
        }
    })
    .catch(error => {
        console.error('Error with OCR request:', error);
        alert('An error occurred while processing the image. Please try again.');
    })
    .finally(() => {
        // Stop the video stream
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());

        // Hide the video container and capture button, show the scanner again
        videoContainer.classList.add('hidden');
        captureButton.classList.add('hidden');
        abbruchButton.classList.add('hidden');
        anleitung.classList.add('hidden');
        scanner.classList.remove('hidden');
        // Simulate a click on the #check-code button
        document.getElementById('check-code').click(); 
    });
});
document.getElementById('check-code').addEventListener('click', function() {
    const codeInput = document.getElementById('code').value.trim();
    const validationMessage = document.getElementById('validation-message');

    // Regular expression to match "XXX XXX XXX" or "XXXXXXXXX" format
    const codeRegex = /^[A-Z0-9]{3}(?:\s?[A-Z0-9]{3}){2}$/;

    if (codeRegex.test(codeInput)) {
        // Valid code
        validationMessage.textContent = "Dieser Code ist gültig!";
        validationMessage.classList.remove('invalid');
        validationMessage.classList.add('valid');
    } else {
        // Invalid code
        validationMessage.textContent = "Dieser Code ist ungültig! Bitte probiere es erneut.";
        validationMessage.classList.remove('valid');
        validationMessage.classList.add('invalid');
    }
});

// Get modal elements
const modal = document.getElementById('info-modal');
const infoIcon = document.getElementById('info-icon');
const closeModal = document.querySelector('.modal .close');

// When the user clicks on the info icon, open the modal
infoIcon.addEventListener('click', function() {
    if (videoContainer.classList.contains('hidden')){
    modal.classList.add('show');
    } else {
    videoContainer.classList.add('hidden');
    modal.classList.add('show');
    }
});

// When the user clicks on the close (x), close the modal
closeModal.addEventListener('click', function() {
    if (!(videoContainer.classList.contains('hidden'))){
        modal.classList.remove('show');
        } else {
        videoContainer.classList.remove('hidden');
        modal.classList.remove('show');
        }
});

// When the user clicks anywhere outside of the modal, close it
window.addEventListener('click', function(event) {
    if (event.target == modal) {
        modal.classList.remove('show');
    }
});

//Throw Alert for non mobile users
document.addEventListener('DOMContentLoaded', function() {
    // Function to detect if the device is mobile
    function isMobileDevice() {
        return /Mobi|Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
    }

    // If the device is not mobile, show an alert
    if (!isMobileDevice()) {
        alert("Die Funktionen dieser App sind für Mobilgeräte entwickelt. Um einen einwandfreien Ablauf zu gewährleisten, nutze bitte Dein Mobilgerät.");        
    }
});

