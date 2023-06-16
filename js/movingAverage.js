export function movingAverage(coordinatesList){
    if (coordinatesList.length > 10){
        coordinatesList.shift();
    }

    const coordinatesListLength = coordinatesList.length
    
    let sumX = 0;
    let sumY = 0;
    for (let i = 0; i < coordinatesListLength; i++) {
        sumX += coordinatesList[i].x;
        sumY += coordinatesList[i].y;
    }
    
    const averageCoordinates = {
        x: sumX / coordinatesListLength,
        y: sumY / coordinatesListLength,
    };

    return averageCoordinates;
}