import * as Reservation from './reservation';

export interface Detail {
  /**
   * 24 hours before scheduled departure in epoch seconds.
   */
  checkin_available_epoch: number;

  reservation: Reservation.Reservation;
}
