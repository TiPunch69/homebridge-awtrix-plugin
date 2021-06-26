import {
  AccessoryPlugin,
  Logging,
  HAP,
  Service,
}
  from 'homebridge';
import axios from 'axios';
/**
 * This class represents the services to control the matrix.
 */
export class MatrixAccessory implements AccessoryPlugin {
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
   * the general power switch
   */
  private readonly powerSwitchService: Service;
  /**
   * a button to switch to the next app
   */
  private readonly nexAppSwitchService: Service;
  /**
   * indicates that the power is off
   */
  private powerOn = false;

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
    this.name = name;

    this.powerSwitchService = new hap.Service.Switch(this.name, 'On');

    this.powerSwitchService.setCharacteristic(hap.Characteristic.Name, 'On/Off');
    this.powerSwitchService.getCharacteristic(hap.Characteristic.On)
      .onGet(async () => {
        return await axios.post(
          url,
          { get: 'powerState' },
        ).then(response => {
          const powerState = response.data.powerState;
          if (powerState !== undefined){
            return response.data.powerState;
          } else {
            return false;
          }
        })
          .catch(error => {
            this.log.error('Error during power state query: ' + error);
            return false;
          });
      })
      .onSet(async (value) => {
        return await axios.post(
          url,
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

    this.nexAppSwitchService = new hap.Service.Switch(this.name, 'Next');
    this.nexAppSwitchService.setCharacteristic(hap.Characteristic.Name, 'Next');
    this.nexAppSwitchService.getCharacteristic(hap.Characteristic.On)
      .onGet(async () => {
        return false;
      })
      .onSet(async (value) => {
        return await axios.post(
          url,
          { app: 'next' },
        ).then(response => {
          if (!response.data.success) {
            this.log.error('Error during setting the next app ' + value);
          }
        })
          .catch(error => {
            this.log.error('Error during setting the next app ' + value + ':' + error);
          });
      });
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.powerSwitchService,
      this.nexAppSwitchService,
    ];
  }
}

