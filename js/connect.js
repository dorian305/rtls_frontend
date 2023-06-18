import { createDeviceName       }   from "./deviceName.js?ver=1";
import { getDeviceType          }   from "./deviceType.js?ver=1";
import { movingAverage          }   from "./movingAverage.js";
import { simulateDeviceMovement }   from "./movementSimulation.js?ver=1";
import { Battery                }   from "./battery.js?ver=1";

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
    const simulateCoordinatesInterval = 0.1;
    const wrapperElem = document.querySelector("#wrapper");
    const latitudeElem = document.querySelector("#latitude");
    const longitudeElem = document.querySelector("#longitude");
    const deviceIDElem = document.querySelector("#device-id");
    const deviceBatteryElem = document.querySelector("#device-battery");
    const deviceNameElem = document.querySelector("#device-name");
    const statusElem = document.querySelector("#connection-status");
    const animationPulseElem = document.querySelector("#animation-init");
    const coordinatesList = [];
    const worker = new Worker("js/locationUpdater.js?ver=1");
    
    let deviceName;
    let locationWatcher;
    let connectedToServer = false;
    let simulationIntervalHandler;
    let deviceCoordinates = {x: 0, y: 0};

    statusElem.textContent = "Device name required!";

    createDeviceName()
    .then(data => {
        deviceName = data;
        deviceNameElem.innerHTML = deviceName;
        setTimeout(() => wrapperElem.style.visibility = "visible", 200);
        deviceIDElem.textContent = "Waiting for server...";
        statusElem.textContent = "Locating the device...";
        deviceBatteryElem.textContent = Battery.getStatus();
        
        if (!simulateCoordinates){
            promptClientForLocationServices();
        }
        else {
            simulationIntervalHandler = setInterval(() => {
                deviceCoordinates = simulateDeviceMovement(deviceCoordinates);
                coordinatesList.push(deviceCoordinates);

                if (connectedToServer === false && coordinatesMinThresholdReached()){
                    connectToServer();
                    return;
                }

                if (connectedToServer === true){
                    updateAndSendCoordinates();
                }
            }, simulateCoordinatesInterval * 1000);
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
    
            locationWatcher = navigator.geolocation.watchPosition(
                gettingLocationSuccess,
                gettingLocationError,
                locationOptions
            );
        }
    }
    
    
    /**
     * Allows for data communication between worker thread and main thread (this).
     */
    worker.addEventListener("message", event => {
        /**
         * Store the received data from webworker.
         */
        const data = event.data;
    
        /**
         * Websocket sucessfully connected to the server.
         */
        if (data.type === "connectionSuccess"){
            statusElem.textContent = simulateCoordinates ? "Connected, simulating device coordinates..." : "Connected, device is being tracked";
            animationPulseElem.id = "animation-pulse";
            connectedToServer = true;
        }
        
        /**
         * Websocket has experienced an error.
         */
        // if (data.type === "connectionError"){
            
        // }
    
    
        /**
         * Websocket connection has been closed.
         */
        if (data.type === "connectionClosed"){
            navigator.geolocation.clearWatch(locationWatcher);
            clearInterval(simulationIntervalHandler);

            const title = connectedToServer === true ? "Connection lost!" : "Server unavailable";
            const description = connectedToServer === true ? "Connection to the server has been lost." : "Could not connect to the server.";

            Swal.fire({
                title: title,
                text: description,
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

            wrapperElem.style.visibility = "hidden";
            connectedToServer = false;
        }
    
    
        /**
         * Worker has received device's ID from the server.
         */
        if (data.type === "sendingDeviceID"){
            deviceIDElem.textContent = data.deviceID;
        }
    });
    
    
    /**
     * Calculates device position using move average algorithm, and then sends the position to the server.
     */
    function updateAndSendCoordinates(){
        deviceCoordinates = movingAverage(coordinatesList);
        updateUI();

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

        coordinatesList.push(deviceCoordinates);

        if (connectedToServer === false && coordinatesMinThresholdReached()){
            connectToServer();
        }

        if (connectedToServer === true){
            updateAndSendCoordinates();
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
        statusElem.textContent = "Connecting...";
        connectedToServer = "pending";
        
        worker.postMessage({
            type: "connectToServer",
            deviceType: getDeviceType(),
            coordinates: deviceCoordinates,
            deviceName: deviceName,
            battery: Battery.getStatus(),
        });

    }

    
    /**
     * Checks whether there are enough coordinates collected
     */
    function coordinatesMinThresholdReached(){
        const coordinatesMinThreshold = 10;
        return coordinatesList.length >= coordinatesMinThreshold;
    }


    /**
     * Update coordinates UI
     */
    function updateUI(){
        deviceBatteryElem.textContent = Battery.getStatus();
        latitudeElem.textContent = `Latitude: ${deviceCoordinates.x.toFixed(6)}`;
        longitudeElem.textContent = `Longitude: ${deviceCoordinates.y.toFixed(6)}`;
    }
}