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

    this.powerSwitchService = new hap.Service.StatefulProgrammableSwitch(name);

    this.powerSwitchService.getCharacteristic(hap.Characteristic.ProgrammableSwitchOutputState)
      .onGet(() => {
        return axios.post(
          url,
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
  }

  /*
   * This method is called directly after creation of this instance.
   * It should return all services which should be added to the accessory.
   */
  getServices(): Service[] {
    return [
      this.informationService,
      this.powerSwitchService,
    ];
  }
}

