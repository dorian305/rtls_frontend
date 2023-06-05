/**
 * Determining the type of the device.
*/
export const getDeviceType = () => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isTablet = /iPad/i.test(navigator.userAgent);

    if (isMobile) return "mobile";
    if (isTablet) return "tablet";
    if (!isMobile && !isTablet) return "pc";
}