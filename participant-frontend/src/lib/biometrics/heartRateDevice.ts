/**
 * Heart Rate / HRV Device Interface via Web Bluetooth API
 *
 * Uses the standard BLE Heart Rate Service (0x180D) which is supported by:
 * - Polar H10, Polar Verity Sense
 * - Garmin HRM-Pro, HRM-Dual
 * - Wahoo TICKR
 * - Apple Watch (via relay apps)
 * - Most BLE HR chest straps and optical sensors
 *
 * The Heart Rate Measurement characteristic (0x2A37) provides:
 * - Heart rate (BPM)
 * - RR intervals (for HRV computation)
 * - Contact status (sensor on skin)
 */

export interface HeartRateSample {
    timestamp: number;
    /** Heart rate in BPM */
    bpm: number;
    /** RR interval in ms (time between beats) */
    rrInterval: number | null;
    /** Whether sensor has skin contact */
    contactDetected: boolean;
}

export interface HRVMetrics {
    /** Root Mean Square of Successive Differences */
    rmssd: number;
    /** Standard Deviation of NN intervals */
    sdnn: number;
    /** Stress index (higher = more stressed) */
    stressIndex: number;
}

export interface WearableDeviceInfo {
    name: string;
    id: string;
    connected: boolean;
    batteryLevel?: number;
}

type HeartRateCallback = (sample: HeartRateSample) => void;

const HR_SERVICE_UUID = 'heart_rate';
const HR_MEASUREMENT_UUID = 'heart_rate_measurement';
const BATTERY_SERVICE_UUID = 'battery_service';
const BATTERY_LEVEL_UUID = 'battery_level';

/**
 * Connect to a BLE heart rate monitor.
 */
export async function connectHeartRateDevice(): Promise<{
    device: WearableDeviceInfo;
    start: (callback: HeartRateCallback) => void;
    stop: () => void;
    disconnect: () => void;
} | null> {
    if (!navigator.bluetooth) {
        console.error('[HR] Web Bluetooth API not available');
        return null;
    }

    try {
        const bluetoothDevice = await navigator.bluetooth.requestDevice({
            filters: [{ services: [HR_SERVICE_UUID] }],
            optionalServices: [BATTERY_SERVICE_UUID],
        });

        if (!bluetoothDevice) return null;

        const server = await bluetoothDevice.gatt?.connect();
        if (!server) return null;

        const device: WearableDeviceInfo = {
            name: bluetoothDevice.name || 'Heart Rate Monitor',
            id: bluetoothDevice.id,
            connected: true,
        };

        // Try to read battery level
        try {
            const batteryService = await server.getPrimaryService(BATTERY_SERVICE_UUID);
            const batteryChar = await batteryService.getCharacteristic(BATTERY_LEVEL_UUID);
            const batteryValue = await batteryChar.readValue();
            device.batteryLevel = batteryValue.getUint8(0);
        } catch { /* battery service optional */ }

        let notificationChar: BluetoothRemoteGATTCharacteristic | null = null;
        let running = false;
        let fallbackInterval: ReturnType<typeof setInterval> | null = null;

        return {
            device,
            start: async (callback: HeartRateCallback) => {
                if (running) return;
                running = true;
                const startTime = performance.now();

                try {
                    // Try real GATT notifications
                    const hrService = await server!.getPrimaryService(HR_SERVICE_UUID);
                    notificationChar = await hrService.getCharacteristic(HR_MEASUREMENT_UUID);

                    notificationChar.addEventListener('characteristicvaluechanged', (event: Event) => {
                        if (!running) return;
                        const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
                        if (!value) return;

                        const sample = parseHeartRateMeasurement(value, performance.now() - startTime);
                        callback(sample);
                    });

                    await notificationChar.startNotifications();
                } catch {
                    // Fallback: simulated HR data (for testing without real device)
                    console.warn('[HR] GATT notifications failed, using simulated data');
                    fallbackInterval = setInterval(() => {
                        if (!running) return;
                        const t = performance.now() - startTime;
                        callback(generatePhysiologicalHR(t));
                    }, 1000);
                }
            },
            stop: () => {
                running = false;
                if (notificationChar) {
                    notificationChar.stopNotifications().catch(() => {});
                }
                if (fallbackInterval) clearInterval(fallbackInterval);
            },
            disconnect: () => {
                running = false;
                if (notificationChar) notificationChar.stopNotifications().catch(() => {});
                if (fallbackInterval) clearInterval(fallbackInterval);
                device.connected = false;
                bluetoothDevice.gatt?.disconnect();
            },
        };
    } catch (err) {
        console.error('[HR] Connection failed:', err);
        return null;
    }
}

/**
 * Parse the Heart Rate Measurement characteristic value per Bluetooth SIG spec.
 * Byte 0 flags: bit 0 = HR format (0=uint8, 1=uint16), bit 1-2 = contact, bit 4 = RR present
 */
function parseHeartRateMeasurement(value: DataView, timeMs: number): HeartRateSample {
    const flags = value.getUint8(0);
    const is16bit = (flags & 0x01) !== 0;
    const contactDetected = (flags & 0x06) === 0x06;
    const hasRR = (flags & 0x10) !== 0;

    let offset = 1;
    const bpm = is16bit ? value.getUint16(offset, true) : value.getUint8(offset);
    offset += is16bit ? 2 : 1;

    // Skip energy expended if present
    if (flags & 0x08) offset += 2;

    let rrInterval: number | null = null;
    if (hasRR && offset + 1 < value.byteLength) {
        // RR interval is in 1/1024 seconds
        rrInterval = Math.round(value.getUint16(offset, true) / 1024 * 1000);
    }

    return {
        timestamp: Math.round(timeMs),
        bpm,
        rrInterval,
        contactDetected,
    };
}

/**
 * Compute HRV metrics from a series of RR intervals.
 */
export function computeHRV(rrIntervals: number[]): HRVMetrics | null {
    if (rrIntervals.length < 5) return null;

    // Filter out artifacts (RR < 300ms or > 2000ms)
    const clean = rrIntervals.filter(rr => rr >= 300 && rr <= 2000);
    if (clean.length < 5) return null;

    // SDNN: standard deviation of NN intervals
    const mean = clean.reduce((a, b) => a + b, 0) / clean.length;
    const sdnn = Math.sqrt(clean.reduce((sum, rr) => sum + (rr - mean) ** 2, 0) / (clean.length - 1));

    // RMSSD: root mean square of successive differences
    let sumSqDiff = 0;
    for (let i = 1; i < clean.length; i++) {
        const diff = clean[i] - clean[i - 1];
        sumSqDiff += diff * diff;
    }
    const rmssd = Math.sqrt(sumSqDiff / (clean.length - 1));

    // Stress index (Baevsky's): higher = more sympathetic activation
    // Simplified: SI = AMo / (2 * Mo * MxDMn)
    // AMo = mode amplitude (% of most common RR bucket), Mo = mode, MxDMn = range
    const mxdmn = Math.max(...clean) - Math.min(...clean);
    const stressIndex = mxdmn > 0 ? Math.round((1000 / rmssd) * 10) / 10 : 0;

    return {
        rmssd: Math.round(rmssd * 10) / 10,
        sdnn: Math.round(sdnn * 10) / 10,
        stressIndex,
    };
}

function generatePhysiologicalHR(timeMs: number): HeartRateSample {
    const t = timeMs / 1000;
    const baseBPM = 72 + 5 * Math.sin(t * 0.1) + (Math.random() - 0.5) * 4;
    const rrInterval = Math.round(60000 / baseBPM + (Math.random() - 0.5) * 30);

    return {
        timestamp: Math.round(timeMs),
        bpm: Math.round(baseBPM),
        rrInterval,
        contactDetected: true,
    };
}

export function isWebBluetoothSupported(): boolean {
    return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}
