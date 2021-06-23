import {
  AccessoryPlugin,
  Logging,
  HAP,
  Service,
}
  from 'homebridge';
import axios from 'axios';
/**
 * the basic temperature and humidity information
 */
export class TemperatureAccessory implements AccessoryPlugin {
  /**
   * the general log file
   */
  private readonly log: Logging;
  /**
   * the general information service
   */
  private readonly informationService: Service;
  /**
   * the temperature service (from the attached BM280 chip)
   */
  private readonly temperatureService: Service;
  /**
   * the humidity service (from the attached BM280 chip)
   */
  private readonly humidityService: Service;

  /**
   * the constructor from the HAP API
   * @param hap the HAP package
   * @param log the logging interface
   * @param name the display name
   * @param url the target URL
   * @param informationSerivce the shared information service
   */
  constructor(hap: HAP, log: Logging, name: string, url: string, informationService: Service) {
    this.log = log;
    this.informationService = informationService;

    this.temperatureService = new hap.Service.TemperatureSensor(name);

    this.temperatureService.getCharacteristic(hap.Characteristic.CurrentTemperature)
      .onGet(async () => {
        return await axios.post(
          url,
          { get: 'matrixInfo' },
        ).then(response => {
          const temp = response.data.Temp;
          if (temp !== undefined) {
            return temp.toFixed(1);
          } else {
            return 0;
          }
        })
          .catch(error => {
            this.log.error('Error retrieving temperature: ' + error);
            return false;
          });
      });

    this.humidityService = new hap.Service.HumiditySensor(name);
    this.humidityService.getCharacteristic(hap.Characteristic.CurrentRelativeHumidity)
      .onGet(async () => {
        return await axios.post(
          url,
          { get: 'matrixInfo' },
        ).then(response => {
          const hum = response.data.Hum;
          if (hum !== undefined) {
            return hum.toFixed(1);
          } else {
            return 0;
          }
        })
          .catch(error => {
            this.log.error('Error retrieving humidity: ' + error);
            return false;
          });
      });
    log.info('Awtrix initializiation initializing');
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.temperatureService,
      this.humidityService,
    ];
  }

}