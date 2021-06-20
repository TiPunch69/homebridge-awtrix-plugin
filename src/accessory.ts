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
/**
 * the available operations on Awtrix
 */
enum OPERATION {
  ONOFF = 'power',
  APPLICATION = 'app',
  ANIMATION = 'showAnimation',
}

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
   * a remote TV service for all operations
   */
  private readonly remoteService: Service;
  /**
   * indicates if a timer is running
   */
  private timerRunning = false;
  /**
   * the timer string
   */
  private timer: string;

  /**
   * the constructor from the HAP API
   */
  constructor(log: Logging, config: AccessoryConfig) {
    this.log = log;
    axios.defaults.baseURL = 'http://' + config.ip + ':' + config.port;
    this.timer = config.timer;

    this.temperatureService = new hap.Service.TemperatureSensor(config.name);
    this.temperatureService.getCharacteristic(hap.Characteristic.CurrentTemperature)
      .onGet(() => {
        return axios.post(
          URL,
          { get: 'matrixInfo' },
        ).then(response => {
          if (response.data.Temp !== undefined) {
            return response.data.Temp.toFixed(1);
          } else {
            return 0;
          }
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
          if (response.data.Hum !== undefined) {
            return response.data.Hum.toFixed(1);
          } else {
            return 0;
          }
        })
          .catch(error => {
            this.log.error('Error retrieving humidity: ' + error);
            return false;
          });
      });

    this.remoteService = new hap.Service.Television(config.name);
    this.remoteService.setCharacteristic(hap.Characteristic.SleepDiscoveryMode, hap.Characteristic.SleepDiscoveryMode.ALWAYS_DISCOVERABLE);
    this.remoteService.getCharacteristic(hap.Characteristic.Active)
      .onGet(() => {
        return axios.post(
          URL,
          { 'get': 'powerState' },
        ).then(response => {
          if (response.data.powerState === 'true') {
            return hap.Characteristic.Active.ACTIVE;
          } else {
            return hap.Characteristic.Active.INACTIVE;
          }
        })
          .catch(error => {
            this.log.error('Error during power state query: ' + error);
            return hap.Characteristic.Active.INACTIVE;
          });
      })
      .onSet((value) => {
        let power = false;
        if (value === hap.Characteristic.Active.ACTIVE) {
          power = true;
        }
        return axios.post(
          URL,
          { power: power },
        ).then(response => {
          if (!response.data.success) {
            this.log.error('Error during setting the power state to power state ' + value);
          }
        })
          .catch(error => {
            this.log.error('Error during setting the power state to power state ' + value + ':' + error);
          });
      });
    this.remoteService.getCharacteristic(hap.Characteristic.RemoteKey)
      .onSet((newValue) => {
        switch (newValue) {
          case hap.Characteristic.RemoteKey.INFORMATION: {
            this.sendOperation(OPERATION.ANIMATION, 'random');
            break;
          }
          case hap.Characteristic.RemoteKey.ARROW_LEFT: {
            this.sendOperation(OPERATION.APPLICATION, 'back');
            break;
          }
          case hap.Characteristic.RemoteKey.ARROW_RIGHT: {
            this.sendOperation(OPERATION.APPLICATION, 'next');
            break;
          }
          case hap.Characteristic.RemoteKey.PLAY_PAUSE: {
            this.sendOperation(OPERATION.APPLICATION, 'pause');
            break;
          }
          case hap.Characteristic.RemoteKey.SELECT: {
            let data = { 'timer': this.timer };
            if (this.timerRunning) {
              // timer is running
              data = { 'timer': 'stop' };
            }
            axios.post(
              URL,
              data,
            ).then(response => {
              if (!response.data.success) {
                this.log.error('Error during setting the timer');
              }
            })
              .catch(error => {
                this.log.error('Error during setting the timer: ' + error);
              });
            break;
          }
        }
      });

    this.informationService = new hap.Service.AccessoryInformation()
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Blueforcer')
      .setCharacteristic(hap.Characteristic.Model, 'Awtrix')
      .setCharacteristic(hap.Characteristic.Name, config.name);

    this.informationService.getCharacteristic(hap.Characteristic.SoftwareRevision)
      .onGet(() => {
        return axios.post(
          URL,
          { get: 'version' },
        ).then(response => {
          if (response.data.version !== undefined) {
            return response.data.version;
          } else {
            return 'UNKNOWN';
          }
        })
          .catch(error => {
            this.log.error('Error during version query: ' + error);
            return false;
          });
      });

    this.informationService.getCharacteristic(hap.Characteristic.FirmwareRevision)
      .onGet(() => {
        return axios.post(
          URL,
          { get: 'matrixInfo' },
        ).then(response => {
          if (response.data.version !== undefined) {
            return response.data.version;
          } else {
            return 'UNKNOWN';
          }
        })
          .catch(error => {
            this.log.error('Error during version query: ' + error);
            return false;
          });
      });

    log.info('Awtrix initializiation finished');
  }

  /**
   * This function sends a command to the Awtrix clock.
   * @param operation the operation that should be executed
   * @param value the detailed operation value
   */
  private sendOperation(operation: OPERATION, value: string) {
    axios.post(
      URL,
      { OPERATION: value },
    ).then(response => {
      if (!response.data.success) {
        this.log.error('Error during setting of operation "' + OPERATION + '" to value "' + value + '"');
      }
    })
      .catch(error => {
        this.log.error('Error during setting of operation "' + OPERATION + '" to value "' + value + '":' + error);
      });
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
      this.remoteService,
    ];
  }

}