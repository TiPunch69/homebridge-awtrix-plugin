import {
  AccessoryPlugin,
  API,
  HAP,
  Logging,
  PlatformConfig,
  Service,
  StaticPlatformPlugin,
} from 'homebridge';

import axios from 'axios';

import { TemperatureAccessory } from './temperature-accessory';
import { MatrixAccessory } from './matrix-accessory';
import { MatrixInformation } from './matrix-information';

let hap: HAP;

/**
 * the API URL
 */
const URL = '/api/v3/basics';

export = (api: API) => {
  hap = api.hap;
  api.registerPlatform('Awtrix Platform', AwtrixStaticPlatform);
};

class AwtrixStaticPlatform implements StaticPlatformPlugin {
  /**
   * the central information service
   */
  private readonly informationService: Service;
  /**
   * the matrix information used by all
   */
  private readonly matrixInformation: MatrixInformation;
  /**
   * the log
   */
  private readonly log: Logging;
  /**
   * the matrix data
   */
  public matrixData;

  constructor(log: Logging, config: PlatformConfig) {
    log.info('Starting configuration');
    this.log = log;
    axios.defaults.baseURL = 'http://' + config.ip + ':' + config.port;

    this.matrixInformation = new MatrixInformation(URL, log);

    this.informationService = new hap.Service.AccessoryInformation('Awtrix')
      .setCharacteristic(hap.Characteristic.Manufacturer, 'Blueforcer')
      .setCharacteristic(hap.Characteristic.Model, 'Awtrix');
    this.informationService.getCharacteristic(hap.Characteristic.SoftwareRevision)
      .onGet(async () => {
        return await axios.post(
          URL,
          { get: 'version' },
        ).then(response => {
          const version = response.data.version;
          if (version !== undefined) {
            return version;
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
        return this.matrixInformation.version;
      });

    // probably parse config or something here
    log.info('Awtrix platform finished initializing!');
  }

  /*
   * This method is called to retrieve all accessories exposed by the platform.
   * The Platform can delay the response my invoking the callback at a later time,
   * it will delay the bridge startup though, so keep it to a minimum.
   * The set of exposed accessories CANNOT change over the lifetime of the plugin!
   */
  accessories(callback: (foundAccessories: AccessoryPlugin[]) => void): void {
    callback([
      new TemperatureAccessory(hap, this.log, 'Awtrix Temperature', this.matrixInformation, this.informationService),
      new MatrixAccessory(hap, this.log, 'Awtrix Matrix', URL, this.informationService),
    ]);
  }
}