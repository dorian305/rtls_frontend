importScripts("./websocketInit.js");

let socket; // Websocket handler
let localDevice = {}; // This device handler

/**
 * We setup this event listener so we can communicate with the web worker from the main thread and
 * vice versa via messages. Messages are usually data that web worker requires that main thread fetches
 * and sends to the worker, and worker can send back result of whatever it's doing back to main thread.
 */
self.addEventListener("message", event => {
    /**
     * Store the data from main thread.
     */
    const data = event.data;

    if (data.type === "connectToServer"){
        /**
         * Lets web worker know the application is ready to initiate websocket connection to the server.
         */
        socket = new WebSocket(`${protocol}://${endpoint}:${port}`);

        localDevice.type = data.deviceType;
        localDevice.coordinates = data.coordinates;
        localDevice.name = data.deviceName;

        /**
         * Websocket connection has been established.
         */
        socket.addEventListener('open', event => {
            socket.send(JSON.stringify({
                type: "deviceConnected",
                device: localDevice,
            }));

            self.postMessage({
                type: "connectionSuccess"
            });
        });

        /**
         * Websocket connection has been closed.
         */
        socket.addEventListener('close', event => {
            self.postMessage({
                type: "connectionClosed",
            });
        });


        /**
         * An error has occured during communication with the server.
         * Notify frontend and print the error.
         */
        socket.addEventListener('error', event => {
            self.postMessage({
                type: "connectionError",
                error: `An error occured while communicating with the server.`,
            });

            console.log(`Websocket error: ${event}`);
        });


        socket.addEventListener('message', event => {
            const data = JSON.parse(event.data);
            
            if (data.type === "deviceConnected"){
                localDevice = data.device;

                self.postMessage({
                    type: "sendingDeviceID",
                    deviceID: localDevice.id,
                });
            }


            if (data.type === "ping"){
                /**
                 * Server sent a ping, respond with pong.
                 */
                socket.send(JSON.stringify({
                    type: "pong",
                    socketId: localDevice.id,
                }));

                console.log("Server pinged me. Sending back pong...");
            }
        });
    }

    /**
     * Updating device coordinates and sending it to the server.
     */
    if (data.type === "coordinatesUpdate"){
        localDevice.coordinates = data.coordinates;

        // Do not send coordinates if the device's ID hasn't been established.
        // This check is because the update might get sent before the server returns the ID assigned to the device, which crashes the app.
        if (localDevice.id){
            // console.log(`Sending coordinates x: ${localDevice.coordinates.x} y: ${localDevice.coordinates.y}`);
            
            socket.send(JSON.stringify({
                type: "locationUpdate",
                device: localDevice,
            }));
        }
    }
});