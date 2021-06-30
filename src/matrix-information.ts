import {
  Logging,
} from 'homebridge';
/**
 * the refresh time for the matrix information (including temperature and humidity)
 */
const REFRESH_TIME = 30000;

import axios from 'axios';

export class MatrixInformation {
  /**
   * the temperature information
   */
  public temperature = 0;
  /**
   * the humidity information
   */
  public humidity = 0;
  /**
   * the version information
   */
   public version = 'UNKNOWN';
  /**
   * the general log file
   */
  private readonly log: Logging;

  constructor(url: string, log: Logging) {
    this.log = log;

    this.fetchInformation(url);

    setInterval(() => {
      this.fetchInformation(url);
    }, REFRESH_TIME);
  }

  /**
   * this function fetches the matrix information
   * @param url the URL path
   */
  private async fetchInformation(url:string) {
    await axios.post(
      url,
      { get: 'matrixInfo' },
    ).then(response => {
      if ((response.data !== undefined) && (Object.keys(response.data).length !== 0)){
        this.temperature = response.data.Temp;
        this.humidity = response.data.Hum;
        this.version = response.data.version;
      }
    })
      .catch(error => {
        this.log.error('Error during version query: ' + error);
        return false;
      });
  }
}