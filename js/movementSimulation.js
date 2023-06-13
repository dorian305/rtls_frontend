/**
 * This code generates a random initial coordinates within boundaries of Rijeka if received coordinates are (0,0).
 * If not, simulates a device moving by further randomizing coordinates in the random direction determined by
 * the algorithm.
 */
export function simulateDeviceMovement(receivedCoordinates){
    if (!receivedCoordinates.x && !receivedCoordinates.y){
        return generateInitialCoordinates();
    }

    return calculateNewCoordinates(receivedCoordinates);
}

function calculateNewCoordinates(currentCoordinates) {
    const maxChange = 0.0001; // Adjust the maximum change in latitude and longitude (controls the mild direction changes)
    const randomDeltaX = (Math.random() * maxChange) - maxChange / 2;
    const randomDeltaY = (Math.random() * maxChange) - maxChange / 2;

    return {
        x: currentCoordinates.x + randomDeltaX,
        y: currentCoordinates.y + randomDeltaY,
    };
}

function generateInitialCoordinates() {
    const coords = {
        x: Math.random() * 0.072 + 45.305, // Random latitude between 45.305 and 45.377 (Rijeka latitude range)
        y: Math.random() * 0.066 + 14.381, // Random longitude between 14.381 and 14.447 (Rijeka longitude range)
    };

    console.log('Initial Coordinates:', coords);

    return coords;
}