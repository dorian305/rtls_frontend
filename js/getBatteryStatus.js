let level;
let isCharging;
let remainingChargingTime;
let remainingDischargingTime;

function getBattery(){
    if (!("getBattery" in navigator)) return "Battery not available";

    return "Battery available, getting battery level...";
}

navigator.getBattery().then(battery => {
    // Initial battery status
    updateBatteryStatus(battery);

    // Listen for battery status changes
    battery.addEventListener('levelchange', function() {
        updateBatteryStatus(battery);
    });

    battery.addEventListener('chargingchange', function() {
        updateBatteryStatus(battery);
    });

    battery.addEventListener('chargingtimechange', function() {
        updateBatteryStatus(battery);
    });

    battery.addEventListener('dischargingtimechange', function() {
        updateBatteryStatus(battery);
    });
});


function updateBatteryStatus(battery){
    // Battery level
    level = battery.level;

    // Charging status
    isCharging = battery.charging;

    // Charging time remaining
    remainingChargingTime = battery.chargingTime;

    // Discharging time remaining
    remainingDischargingTime = battery.dischargingTime;
}