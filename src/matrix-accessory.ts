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
   * the current app state
   */
  private currentAppState: number;
  /**
   * the target app state
   */
  private targetAppState: number;
  /**
   * indicates if the app loop is on hold
   */
  private appLoopOnHold = false;
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
   * the service for the app matrix
   */
  private readonly appLoopService: Service;

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
    this.currentAppState = hap.Characteristic.CurrentMediaState.LOADING;
    this.targetAppState = hap.Characteristic.TargetMediaState.PLAY;
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
          if (power !== undefined){
            return power;
            // set the state according to the power
            if (power){
              // power is on, so check the apploop
              if (this.appLoopOnHold){
                // apploop is playing
                this.currentAppState = hap.Characteristic.CurrentMediaState.PAUSE;
              } else {
                this.currentAppState = hap.Characteristic.CurrentMediaState.PLAY;
              }
            } else {
              // power is off
              this.currentAppState = hap.Characteristic.CurrentMediaState.INTERRUPTED;
            }
          } else {
            // no result from Awtrix
            this.currentAppState = hap.Characteristic.CurrentMediaState.LOADING;
            return false;
          }
        })
          .catch(error => {
            this.log.error('Error during power state query: ' + error);
            return false;
          });
      })
      .onSet(async (value) => {
        this.log.info('Settting power to ' + value);
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

    this.appLoopService = new hap.Service.SmartSpeaker(this.name, 'matrix');
    this.appLoopService.setCharacteristic(hap.Characteristic.Name, 'Apps');

    this.appLoopService.getCharacteristic(hap.Characteristic.TargetMediaState)
      .onGet(() => {
        return this.targetAppState;
      })
      .onSet((value) => {
        switch (value) {
          case hap.Characteristic.TargetMediaState.PLAY:
            this.targetAppState = hap.Characteristic.TargetMediaState.PLAY;
            this.sendOperation('app', 'pause');
            break;
          case hap.Characteristic.TargetMediaState.PAUSE:
            this.targetAppState = hap.Characteristic.TargetMediaState.PAUSE;
            this.sendOperation('app', 'pause');
            break;
          case hap.Characteristic.TargetMediaState.STOP:
            this.targetAppState = hap.Characteristic.TargetMediaState.PLAY;
            if (this.currentAppState === hap.Characteristic.TargetMediaState.PLAY) {
              this.sendOperation('app', 'next');
            }
            break;
        }
      });
  }

  /**
   * This function sends a command to the Awtrix clock.
   * @param operation the operation that should be executed
   * @param value the detailed operation value
   */
  private async sendOperation(operation: string, value: string) {
    await axios.post(
      this.url,
      { operation: value },
    ).then(response => {
      if (!response.data.success) {
        this.log.error('Error during setting of operation "' + operation + '" to value "' + value + '"');
      }
    })
      .catch(error => {
        this.log.error('Error during setting of operation "' + operation + '" to value "' + value + '":' + error);
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
    ];
  }
}

