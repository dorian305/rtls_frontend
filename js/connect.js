import { createDeviceName       }   from "./deviceName.js?ver=1";
import { getDeviceType          }   from "./deviceType.js?ver=1";
import { movingAverage          }   from "./movingAverage.js";
import { simulateDeviceMovement }   from "./movementSimulation.js?ver=1";

if (getDeviceType() === "mobile"){
    /**
     * ISSUE: the deviceready even on document never runs (cordova application), therefore the app function is never fired.
     * Need to take a look at it.
     */
    document.addEventListener("deviceready", app, false);
    app();
}
else {
    app();
}

function app(){
    const simulateCoordinates = false;
    const coordsElem = document.querySelector("#coordinates");
    const deviceIDElem = document.querySelector("#device-id");
    const deviceNameElem = document.querySelector("#device-name");
    const statusElem = document.querySelector("#connection-status");
    const animationPulseElem = document.querySelector("#animation-init");
    const coordinatesList = [];
    const deviceType = getDeviceType();
    const worker = new Worker("js/locationUpdater.js?ver=1");
    
    let deviceName;
    let locationWatcher;
    let initialFetching = false;
    let deviceCoordinates = {x: 0, y: 0};

    
    createDeviceName()
    .then(data => {
        deviceName = data;
        
        if (!simulateCoordinates){
            promptClientForLocationServices();
        }
        else {
            connectToServer();
        }
    });
    
    
    const promptClientForLocationServices = function(){
        /**
         * Prompting the device for location services.
         * If location services are denied, displays the message to user to allow it.
         * 
         * Attempts to fetch the location information of the device.
         */
        if (!"geolocation" in navigator){
            statusElem.textContent = "Geolocation is not supported by this browser.";
        }
    
        else {
            const locationOptions = {
                enableHighAccuracy: true,
                maximumAge: 0,
            };
    
            locationWatcher = navigator.geolocation.watchPosition(gettingLocationSuccess, gettingLocationError, locationOptions);
        }
    }
    
    
    /**
     * Allows for data communication between worker thread and main thread (this).
     */
    worker.addEventListener("message", event => {
        /**
         * Store the received data.
         */
        const data = event.data;
    
        /**
         * Worker has successfully connected to the server.
         * Update UI data and start sending coordinates to the server.
         */
        if (data.type === "connectionSuccess"){
            deviceNameElem.innerHTML = `Device name:<br>${deviceName}`;
            statusElem.textContent = "Connected to the server.";
            animationPulseElem.id = "animation-pulse";

            if (simulateCoordinates){
                window.setInterval(() => {
                    deviceCoordinates = simulateDeviceMovement(deviceCoordinates);
                    updateAndSendDeviceCoordinates();
                }, 500);
            }
        }
        
        /**
         * Worker failed to connect to the server.
         */
        if (data.type === "connectionError"){
            navigator.geolocation.clearWatch(locationWatcher);
    
            statusElem.textContent = data.error;
        }
    
    
        /**
         * Worker has experienced connection closing.
         */
        if (data.type === "connectionClosed"){
            navigator.geolocation.clearWatch(locationWatcher);
    
            Swal.fire({
                title: "Error!",
                text: "Connection to the server has been lost.",
                icon: "error",
                confirmButtonText: "Reload",
                customClass: {
                    container: "swal-container",
                    popup: "swal-popup",
                    confirmButton: "swal-button-confirm",
                    input: "swal-input",
                },
            }).then(res => {
                if (res.isConfirmed){
                    location.reload();
                }
            });
        }
    
    
        /**
         * Worker has received device's ID from the server.
         */
        if (data.type === "sendingDeviceID"){
            deviceIDElem.innerHTML = `Device id:<br>${data.deviceID}`;
        }
    });
    
    
    /**
     * Calculates device position using move average algorithm, and then sends the position to the server.
     */
    function updateAndSendDeviceCoordinates(){
        coordinatesList.push(deviceCoordinates);
        deviceCoordinates = movingAverage(coordinatesList);
        
        coordsElem.textContent = `(Latitude: ${deviceCoordinates.x}, Longitude: ${deviceCoordinates.y})`;

        worker.postMessage({
            type: "coordinatesUpdate",
            coordinates: deviceCoordinates,
        });
    }
    
    
    
    /**
     * Store the newly fetched device coordinates.
     */
    function gettingLocationSuccess(position){
        deviceCoordinates = {
            x: position.coords.latitude,
            y: position.coords.longitude,
        };

        updateAndSendDeviceCoordinates();
    
        /**
         * Connect to the server only after the device coordinates have been initially fetched.
         */
        if (!initialFetching){
            initialFetching = true;
            connectToServer();
        }
    }
    
    
    /**
     * If watchPosition fails to get location information.
     */
    function gettingLocationError(error){
        let errorString = "";
    
        switch (error.code) {
            case error.PERMISSION_DENIED:
                errorString = "User denied the request for Geolocation.";
                break;
            case error.POSITION_UNAVAILABLE:
                errorString = "Location information is unavailable.";
                break;
            case error.TIMEOUT:
                errorString = "The request to get user location timed out.";
                break;
            default:
                errorString = "An unknown error occurred.";
                break;
        }
    
        statusElem.textContent = errorString;
    }


    /**
     * Initiates a connection to the server with initial device properties.
     */
    function connectToServer(){
        worker.postMessage({
            type: "connectToServer",
            deviceType: deviceType,
            coordinates: deviceCoordinates,
            deviceName: deviceName,
        });

        statusElem.textContent = "Connecting to the server...";
    }
}