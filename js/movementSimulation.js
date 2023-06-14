/**
 * This code generates a random initial coordinates within boundaries of Rijeka if received coordinates are (0,0).
 * If not, simulates a device moving by further randomizing coordinates in the random direction determined by
 * the algorithm.
 */
const maxChange = 0.001; // Maximum change in latitude and longitude (controls the mild direction changes)
const maxAngle = Math.PI; // Maximum angle deviation from the initial direction (45 degrees in radians)
const latitudeRange = { min: 45.305, max: 45.377 }; // Range of latitude values (Rijeka latitude range)
const longitudeRange = { min: 14.381, max: 14.447 }; // Range of longitude values (Rijeka longitude range)

export function simulateDeviceMovement(receivedCoordinates){
    if (!receivedCoordinates.x && !receivedCoordinates.y){
        return generateInitialCoordinates();
    }

    return calculateNewCoordinates(receivedCoordinates);
}


function calculateNewCoordinates(currentCoordinates) {
    const randomAngle = (Math.random() * maxAngle) - maxAngle / 2;

    const initialDirection = Math.atan2(currentCoordinates.y, currentCoordinates.x);
    const newDirection = initialDirection + randomAngle;

    const randomDeltaX = Math.cos(newDirection) * maxChange;
    const randomDeltaY = Math.sin(newDirection) * maxChange;

    return {
        x: currentCoordinates.x + randomDeltaX,
        y: currentCoordinates.y + randomDeltaY,
    };
}


function generateInitialCoordinates() {
    const coords = {
        x: Math.random() * (latitudeRange.max - latitudeRange.min) + latitudeRange.min,
        y: Math.random() * (longitudeRange.max - longitudeRange.min) + longitudeRange.min,
    };

    console.log('Initial Coordinates:', coords);

    return coords;
}