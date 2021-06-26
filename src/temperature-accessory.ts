import {
  AccessoryPlugin,
  Logging,
  HAP,
  Service,
}
  from 'homebridge';
import { MatrixInformation } from './matrix-information';
/**
 * the basic temperature and humidity information
 */
export class TemperatureAccessory implements AccessoryPlugin {
  /**
   * the display name (this property must exist)
   */
  name: string;
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
   * @param matrixData the response matrix data
   * @param informationSerivce the shared information service
   */
  constructor(hap: HAP, log: Logging, name: string, matrixInformation: MatrixInformation, informationService: Service) {
    this.log = log;
    this.informationService = informationService;
    this.name = name;

    this.temperatureService = new hap.Service.TemperatureSensor(this.name);

    this.temperatureService.getCharacteristic(hap.Characteristic.CurrentTemperature)
      .onGet(() => {
        return matrixInformation.temperature;
      });

    this.humidityService = new hap.Service.HumiditySensor(this.name);
    this.humidityService.getCharacteristic(hap.Characteristic.CurrentRelativeHumidity)
      .onGet(() => {
        return matrixInformation.humidity;
      });

    log.info('Awtrix Temperature Accessory finished initializing');
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