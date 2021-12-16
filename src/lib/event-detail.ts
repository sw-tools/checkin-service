import * as Reservation from './reservation';

export interface Detail {
  /**
   * 24 hours before scheduled departure in epoch seconds.
   */
  checkin_time_epoch: number;

  reservation: Reservation.Reservation;
}
