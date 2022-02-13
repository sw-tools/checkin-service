import { Reservation } from './reservation';

export interface Message {
  /**
   * 24 hours before scheduled departure in epoch seconds.
   */
  checkin_available_epoch: number;

  reservation: Reservation;
}

export function isMessage(value: any): value is Message {
  const typedValue = <Message>value;

  return (
    typedValue &&
    typedValue.reservation &&
    typeof typedValue.reservation.confirmation_number === 'string' &&
    typeof typedValue.reservation.first_name === 'string' &&
    typeof typedValue.reservation.last_name === 'string'
  );
}
