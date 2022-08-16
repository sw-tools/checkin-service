import { isReservation, Reservation } from './reservation';

export interface Message {
  /** 24 hours before scheduled departure in unix epoch seconds */
  checkin_available_epoch: number;

  /**
   * IANA timezone name of the departure airport
   * @example "America/New_York"
   */
  departure_timezone: string;

  reservation: Reservation;
}

export function isMessage(value: any): value is Message {
  const typedValue = <Message>value;

  return (
    typedValue &&
    typeof typedValue.checkin_available_epoch === 'number' &&
    isReservation(typedValue.reservation)
  );
}
