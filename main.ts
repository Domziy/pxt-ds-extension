namespace MAX30100 {

    // Function to write to a register
    function writeRegister(register: number, value: number) {
        let buffer = pins.createBuffer(2)
        buffer[0] = register
        buffer[1] = value
        pins.i2cWriteBuffer(0x57, buffer)
    }
    
    let threshold = 14000
    let numReadings = 0
    let IR = 0
    numReadings = 20

    /**
     * Set threshold
     */
    //% blockId="MAX30100_SET_THRESHOLD" block="Set threshold %user_threshold"
    //% weight=80 blockGap=8
    export function set_threshold(user_threshold: number){
        threshold = user_threshold
    }

    /**
     * Get finger data
     */
    //% blockId="MAX30100_GET_FINGER" block="Get heartbeat detection"
    //% weight=80 blockGap=8
    export function read_MAX30100(): number {
        let readings: number[] = []
        let red: number
        let sumIR = 0
        let avgIR = 0

        // INIT code for the MAX30100
        // Write 0x03 to register 0x06 (enable heartbeat and SpO2 readings)
        writeRegister(6, 3)
        // Write 0x44 to register 0x09 (set IR and Red LED currents)
        writeRegister(9, 68)
        // Write 0x03 to register 0x07 (enable LED PWM)
        writeRegister(7, 3)
        // Write 0x03 to register 0x06 (re-enable heartbeat and SpO2 readings)
        writeRegister(6, 3)
        // Write 0x00 to registers 0x02, 0x03, and 0x04
        writeRegister(2, 0)
        writeRegister(3, 0)
        writeRegister(4, 0)
        // Set the sampling rate to 0x13 in register 0x07
        writeRegister(7, 19)

        // Point to the FIFO data register
        for (let i = 0; i <= numReadings - 1; i++) {
            // Read Red LED value
            pins.i2cWriteNumber(
                87,
                5,
                NumberFormat.UInt8BE,
                true
            )
            red = pins.i2cReadNumber(87, NumberFormat.UInt16BE, false)
            // Add the new reading to the array
            readings.push(red)
        }

        for (let i = 0; i <= readings.length - 1; i++) {
            sumIR += readings[i]
        }
        avgIR = sumIR / readings.length
        // Check if the average IR value exceeds the threshold
        if (avgIR > threshold) {
            //serial.writeString("Finger detected. Average IR: ")
            return 1;
        } 
        else 
        {
            //serial.writeString("No finger detected. Average IR: ")
            return 0;
        }

       
    }
    
}

enum BMP280_I2C_ADDRESS {
    //% block="0x76"
    ADDR_0x76 = 0x76,
    //% block="0x77"
    ADDR_0x77 = 0x77
}

namespace BMP280 {

    let BMP280_I2C_ADDR = BMP280_I2C_ADDRESS.ADDR_0x76

    function setreg(reg: number, dat: number): void {
        let buf = pins.createBuffer(2);
        buf[0] = reg;
        buf[1] = dat;
        pins.i2cWriteBuffer(BMP280_I2C_ADDR, buf);
    }

    function getreg(reg: number): number {
        pins.i2cWriteNumber(BMP280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BMP280_I2C_ADDR, NumberFormat.UInt8BE);
    }

    function getUInt16LE(reg: number): number {
        pins.i2cWriteNumber(BMP280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BMP280_I2C_ADDR, NumberFormat.UInt16LE);
    }

    function getInt16LE(reg: number): number {
        pins.i2cWriteNumber(BMP280_I2C_ADDR, reg, NumberFormat.UInt8BE);
        return pins.i2cReadNumber(BMP280_I2C_ADDR, NumberFormat.Int16LE);
    }

    let dig_T1 = getUInt16LE(0x88)
    let dig_T2 = getInt16LE(0x8A)
    let dig_T3 = getInt16LE(0x8C)
    let dig_P1 = getUInt16LE(0x8E)
    let dig_P2 = getInt16LE(0x90)
    let dig_P3 = getInt16LE(0x92)
    let dig_P4 = getInt16LE(0x94)
    let dig_P5 = getInt16LE(0x96)
    let dig_P6 = getInt16LE(0x98)
    let dig_P7 = getInt16LE(0x9A)
    let dig_P8 = getInt16LE(0x9C)
    let dig_P9 = getInt16LE(0x9E)
    setreg(0xF4, 0x2F)
    setreg(0xF5, 0x0C)
    let T = 0
    let P = 0

    function get(): void {
        let adc_T = (getreg(0xFA) << 12) + (getreg(0xFB) << 4) + (getreg(0xFC) >> 4)
        let var1 = (((adc_T >> 3) - (dig_T1 << 1)) * dig_T2) >> 11
        let var2 = (((((adc_T >> 4) - dig_T1) * ((adc_T >> 4) - dig_T1)) >> 12) * dig_T3) >> 14
        let t = var1 + var2
        T = Math.idiv(((t * 5 + 128) >> 8), 100)
        var1 = (t >> 1) - 64000
        var2 = (((var1 >> 2) * (var1 >> 2)) >> 11) * dig_P6
        var2 = var2 + ((var1 * dig_P5) << 1)
        var2 = (var2 >> 2) + (dig_P4 << 16)
        var1 = (((dig_P3 * ((var1 >> 2) * (var1 >> 2)) >> 13) >> 3) + (((dig_P2) * var1) >> 1)) >> 18
        var1 = ((32768 + var1) * dig_P1) >> 15
        if (var1 == 0)
            return; // avoid exception caused by division by zero
        let adc_P = (getreg(0xF7) << 12) + (getreg(0xF8) << 4) + (getreg(0xF9) >> 4)
        let _p = ((1048576 - adc_P) - (var2 >> 12)) * 3125
        _p = Math.idiv(_p, var1) * 2;
        var1 = (dig_P9 * (((_p >> 3) * (_p >> 3)) >> 13)) >> 12
        var2 = (((_p >> 2)) * dig_P8) >> 13
        P = _p + ((var1 + var2 + dig_P7) >> 4)
    }

    /**
     * get pressure
     */
    //% blockId="BMP280_GET_PRESSURE" block="Get pressures"
    //% weight=80 blockGap=8
    export function pressure(): number {
        get();
        return P;
    }

    /**
     * get temperature
     */
    //% blockId="BMP280_GET_TEMPERATURE" block="Get temperature"
    //% weight=80 blockGap=8
    export function temperature(): number {
        get();
        return T;
    }

    /**
     * power on
     */
    //% blockId="BMP280_POWER_ON" block="Power On"
    //% weight=61 blockGap=8
    export function PowerOn() {
        setreg(0xF4, 0x2F)
    }

    /**
     * power off
     */
    //% blockId="BMP280_POWER_OFF" block="Power Off"
    //% weight=60 blockGap=8
    export function PowerOff() {
        setreg(0xF4, 0)
    }

    /**
     * set I2C address
     */
    //% blockId="BMP280_SET_ADDRESS" block="Set address %addr"
    //% weight=50 blockGap=8
    export function Address(addr: BMP280_I2C_ADDRESS) {
        BMP280_I2C_ADDR = addr
    }
}

namespace NEO6M {

    function parseRMC(sentence: string) {
        // serial.writeLine("Parts:" + sentence);
        parts = sentence.split(",")
        date = parts[9]
    }
    function parseGPSData(data: string) {
        lines = data.split("$")
        for (let line of lines) {
            if (line.charAt(0) == "G" && line.charAt(1) == "P" && line.charAt(2) == "G" && line.charAt(3) == "G" && line.charAt(4) == "A") {
                parseGGA(line)
                //serial.writeLine("GGA - Time: " + time + " Lat: " + lat + " Lon: " + lon + " Satellites: " + satellites + " Alttitude: " + alltitude)
            } else if (line.charAt(0) == "G" && line.charAt(1) == "P" && line.charAt(2) == "R" && line.charAt(3) == "M" && line.charAt(4) == "C") {
                parseRMC(line)
                //serial.writeLine("RMC - Time: " + time + " Date: " + date + " Lat: " + lat + " Lon: " + lon)
            }
        }
    }
    function parseGGA(sentence: string) {
        parts = sentence.split(",")
        time = parts[1]
        lat = "" + parts[2].substr(0, 2) + " " + parts[2].substr(2, parts[2].length) + parts[3]
        lon = "" + parts[4].substr(0, 3) + " " + parts[4].substr(3, parts[4].length) + parts[5]
        satellites = parseInt(parts[7])
        alltitude = parseInt(parts[9])
    }

    function collectGPSData() {
        let buff: Buffer
        startTime = input.runningTime()
        serial.redirect(
            SerialPin.P0,
            SerialPin.P1,
            BaudRate.BaudRate9600
        )
        while (input.runningTime() - startTime < 1300) {
            buff = serial.readBuffer(1)
            collectedData = "" + collectedData + buff.toString()
        }
        parseGPSData(collectedData)
        serial.redirectToUSB()
        collectedData = ""
    }

    /**
     * Get coordinates
     */
    //% blockId="NEO6M_GET_COORDINATES" block="Get coordinates"
    //% weight=80 blockGap=8
    export function get_coordinates(): string
    {
        collectGPSData()
        return lat + " " + lon
    }

    /**
     * Get alltitude
     */
    //% blockId="NEO6M_GET_ALLTITUDE" block="Get alltitude"
    //% weight=80 blockGap=8
    export function get_alltitude(): number {
        collectGPSData()
        return alltitude
    }

    /**
     * Get date
     */
    //% blockId="NEO6M_GET_DATE" block="Get date"
    //% weight=80 blockGap=8
    export function get_date(): string {
        collectGPSData()
        let datum: string
        datum = date.substr(0,2) + "." + date.substr(2,2) + "." + date.substr(4,2)
        return datum
    }

    /**
     * Get time
     */
    //% blockId="NEO6M_GET_TIME" block="Get UTC time"
    //% weight=80 blockGap=8
    export function get_utc_time(): string {
        collectGPSData()
        let cas: string
        cas = time.substr(0, 2) + ":" + time.substr(2, 2) + ":" + time.substr(4, 2)
        return cas
    }

    /**
     * Get satellites
     */
    //% blockId="NEO6M_GET_SATELLITES" block="Get satellites"
    //% weight=80 blockGap=8
    export function get_satellites(): number {
        collectGPSData()
        return satellites
    }
    
    let alltitude: number
    let parts3: string[] = []
    let collectedData = ""
    let startTime = 0
    let dotPos = 0
    let satellites = 0
    let lines: string[] = []
    let date = ""
    let time = ""
    let parts: string[] = []
    let totalSatellites = ""
    let gsvData = 0
    let rmcData = 0
    let ggaData = 0
    let parts2: number[] = []
    let time2 = ""
    let gpsData = ""
    let lon: string
    let lat: string
}
