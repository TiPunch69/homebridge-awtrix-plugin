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
   * the URL path
   */
  private readonly url: string;
  /**
   * the display name (this property must exist)
   */
  name: string;
  /**
   * indicates if the app loop is on hold
   */
  private appLoopOnHold = false;
  /**
   * animation
   */
  private animationToggleState = false;
  /**
   * next app
   */
  private nextAppToggleState = false;
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
   * the service to pause the app loop
   */
  private readonly appLoopService: Service;
  /**
   * the service for matrix animations
   */
  private readonly animationService: Service;
  /**
   * the service to switch to the next app
   */
  private readonly nextAppService: Service;

  /**
* the constructor from the HAP API
* @param hap the HAP package
* @param log the logging interface
* @param name the display name
* @param url the target URL
* @param informationSerivce the shared information service
*/
  constructor(hap: HAP, log: Logging, name: string, url: string, informationService: Service) {
    this.url = url;
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
          const power = response.data.powerState;
          if (power !== undefined) {
            return power;
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
        this.log.debug('Settting power to ' + value);
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

    this.appLoopService = new hap.Service.Switch(this.name, 'AppLoop');

    this.appLoopService.setCharacteristic(hap.Characteristic.Name, 'AppLoop');
    this.appLoopService.getCharacteristic(hap.Characteristic.On)
      .onGet(() => {
        return this.appLoopOnHold;
      })
      .onSet(async () => {
        this.log.debug('Pausing apploop');
        await axios.post(
          this.url,
          { app: 'pause' },
        ).then(response => {
          if (response.data === 'App switching paused') {
            this.appLoopOnHold = true;
          } else {
            this.appLoopOnHold = false;
          }
        })

          .catch(error => {
            this.log.error('Error during pausing apploop:' + error);
          });
      });

    this.animationService = new hap.Service.Switch(this.name, 'Animation');

    this.animationService.setCharacteristic(hap.Characteristic.Name, 'Animation');
    this.animationService.getCharacteristic(hap.Characteristic.On)
      .onGet(() => {
        return this.animationToggleState;
      })
      .onSet(async (value) => {
        this.animationToggleState = value ? true : false;
        if (value) {
          this.log.debug('Running animation.');

          await axios.post(
            this.url,
            { showAnimation: 'random' },
          ).then(response => {
            if (!response.data.success) {
              this.log.error('Error during animation');
            }
          })
            .catch(error => {
              this.log.error('Error during animation:' + error);
            });
          setTimeout(() => {
            this.animationService.setCharacteristic(hap.Characteristic.On, false);
          }, 250);
        }
      });

    this.nextAppService = new hap.Service.Switch(this.name, 'Next');

    this.nextAppService.setCharacteristic(hap.Characteristic.Name, 'Next');
    this.nextAppService.getCharacteristic(hap.Characteristic.On)
      .onGet(() => {
        return this.nextAppToggleState;
      })
      .onSet(async (value) => {
        this.nextAppToggleState = value ? true : false;
        if (value) {
          this.log.debug('Moving to next app');

          await axios.post(
            this.url,
            { app: 'next' },
          ).then(response => {
            if (!response.data.success) {
              this.log.error('Error app switching');
            }
          })
            .catch(error => {
              this.log.error('Error during app switching:' + error);
            });
          setTimeout(() => {
            this.nextAppService.setCharacteristic(hap.Characteristic.On, false);
          }, 250);
        }
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
      this.appLoopService,
      this.animationService,
      this.nextAppService,
    ];
  }
}

