import { createDeviceName }   from "./deviceName.js?ver=1";
import { getDeviceType }      from "./deviceType.js?ver=1";
import { simulateDeviceMovement } from "./movementSimulation.js?ver=1";

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
    const simulateCoordinates = true;
    const coordsElem = document.querySelector("#coordinates");
    const deviceIDElem = document.querySelector("#device-id");
    const deviceNameElem = document.querySelector("#device-name");
    const statusElem = document.querySelector("#connection-status");
    const animationPulseElem = document.querySelector("#animation-init");
    const coordinatesList = [];
    const numberOfLastSavedCoordinates = 10; // in seconds
    const sendCoordsToServerInterval = 0.5; // in seconds
    const deviceType = getDeviceType();
    const worker = new Worker("js/locationUpdater.js?ver=1");
    
    let deviceName;
    let locationWatcher;
    let initialFetching = false;
    let smoothedCoordinates = {x: 0, y: 0};
    let lastSmoothedCoordinates = {x: 0, y: 0};
    let coordinatesUpdateInterval = null;
    
    
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

            periodicUpdate();
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
     * Periodically sends newly calculated coordinates to the server.
     * If the last coordinates is different from the current coordinates, update last coordinates to current coordinates.
     * 
     * Also updates displayed coordinates.
     */
    function periodicUpdate(){
        coordinatesUpdateInterval = setInterval(() => {
            if (!simulateCoordinates){
                if (smoothedCoordinates.x === 0 && smoothedCoordinates.y === 0) return;
                if (JSON.stringify(smoothedCoordinates) === JSON.stringify(lastSmoothedCoordinates)) return;
            }
            
            coordsElem.textContent = `(Latitude: ${smoothedCoordinates.x}, Longitude: ${smoothedCoordinates.y})`;

            if (simulateCoordinates){
                smoothedCoordinates = simulateDeviceMovement(smoothedCoordinates);
            }
            
            worker.postMessage({
                type: "coordinatesUpdate",
                coordinates: smoothedCoordinates,
            });
            
            lastSmoothedCoordinates = smoothedCoordinates;
        }, sendCoordsToServerInterval * 1000);
    }
    
    
    
    /**
     * Runs whenever watchPosition of geolocation notices a new coordinate update.
     */
    function gettingLocationSuccess(position){
        const newCoordinates = {
            x: position.coords.latitude,
            y: position.coords.longitude,
        };
        
        coordinatesList.push(newCoordinates);
    
        if (coordinatesList.length > numberOfLastSavedCoordinates) {
            coordinatesList.shift();
        }
        
        let sumX = 0;
        let sumY = 0;
        for (let i = 0; i < coordinatesList.length; i++) {
            sumX += coordinatesList[i].x;
            sumY += coordinatesList[i].y;
        }
        
        smoothedCoordinates = {
            x: Number(sumX / coordinatesList.length).toFixed(6),
            y: Number(sumY / coordinatesList.length).toFixed(6),
        };

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
            coordinates: smoothedCoordinates,
            deviceName: deviceName,
        });

        statusElem.textContent = "Connecting to the server...";
    }
}