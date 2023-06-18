export const Battery = {
    level: null,
    isCharging: null,
    chargingTime: null,
    dischargingTime: null,
    batteryAvailable: "getBattery" in navigator ? true : false,

    init: function(battery){
        this.level = battery.level;
        this.isCharging = battery.charging;
        this.chargingTime = battery.chargingTime;
        this.dischargingTime = battery.dischargingTime;
    },
    getStatus: function(){
        if (!this.batteryAvailable) return `Battery not available on this device.`;

        if (this.isCharging){
            return `Charging (${this.convertToPercentage(this.level)}%)`;
        }
        else {
            return `${this.convertToPercentage(this.level)}%`;
        }
    },
    convertToPercentage: function(batteryLevel){
        return Math.round(batteryLevel * 100);
    }
};

navigator.getBattery().
then(battery => {
    // Initial battery status
    Battery.init(battery);

    // Battery level changed
    battery.addEventListener("levelchange", () => {
        Battery.level = battery.level;
    });

    // Charging status changed
    battery.addEventListener("chargingchange", () => {
        Battery.isCharging = battery.charging;
    });

    // Updating remaining charging time if charging
    battery.addEventListener("chargingtimechange", () => {
        Battery.chargingTime = battery.chargingTime;
    });

    battery.addEventListener("dischargingtimechange", () => {
        // Updating remaining discharging time if not charging
        Battery.dischargingTime = battery.dischargingTime;
    });
}).catch(error => {
    console.error("Battery status retrieval error:", error);
});