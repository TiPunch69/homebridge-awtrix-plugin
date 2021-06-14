import {
  AccessoryConfig,
  AccessoryPlugin,
  API,
  HAP,
  Logging,
  Service,
} from 'homebridge';
import axios from 'axios';


/**
 * Configuration schema https://developers.homebridge.io/#/config-schema
 */

/**
 * This example was derived from the Homebridge Accessory template.
 */
let hap: HAP;
/*
 * Initializer function called when the plugin is loaded.
 */
export = (api: API) => {
  hap = api.hap;
  api.registerAccessory('Awtrix Plugin', AwtrixAccessory);
};
/**
 * the API URL
 */
const URL = '/api/v3/basics';

class AwtrixAccessory implements AccessoryPlugin {
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
   * the main switch service to power it on or off
   */
  private readonly switchService: Service;

  /**
   * the constructor from the HAP API
   */
  constructor(log: Logging, config: AccessoryConfig) {
    this.log = log;
    axios.defaults.baseURL = 'http://' + config.ip + ':' + config.port;

    this.temperatureService = new hap.Service.TemperatureSensor(config.name);
    this.temperatureService.getCharacteristic(hap.Characteristic.CurrentTemperature)
      .onGet(() => {
        return axios.post(
          URL,
          { get: 'matrixInfo' },
        ).then(response => {
          return response.data.Temp.toFixed(1);
        })
          .catch(error => {
            this.log.error('Error retrieving temperature: ' + error);
            return false;
          });
      });

    this.humidityService = new hap.Service.HumiditySensor(config.name);
    this.humidityService.getCharacteristic(hap.Characteristic.CurrentRelativeHumidity)
      .onGet(() => {
        return axios.post(
          URL,
          { get: 'matrixInfo' },
        ).then(response => {
          return response.data.Hum.toFixed(1);
        })
          .catch(error => {
            this.log.error('Error retrieving humidity: ' + error);
            return false;
          });
      });

    this.switchService = new hap.Service.Switch(config.name);
    this.switchService.getCharacteristic(hap.Characteristic.On)
      .onGet(() => {
        return axios.post(
          URL,
          { get: 'powerState' },
        ).then(response => {
          return response.data.powerState;
        })
          .catch(error => {
            this.log.error('Error during power state query: ' + error);
            return false;
          });
      })
      .onSet((value) => {
        return axios.post(
          URL,
          { power: value },
        ).then(response => {
          if (!response.data.success) {
            this.log.error('Error during setting the power state to power state ' + value);
          }
        })
          .catch(error => {
            this.log.error('Error during setting the power state to power state ' + value + ':' + error);
          });
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Blueforcer')
      .setCharacteristic(hap.Characteristic.Model, 'Awtrix')
      .setCharacteristic(hap.Characteristic.Name, config.name);

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
      this.switchService,
    ];
  }

}