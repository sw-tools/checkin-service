export interface Reservation {
  confirmation_number: string;
  first_name: string;
  last_name: string;
}

export function isReservation(value: any): value is Reservation {
  const typedValue = <Reservation>value;

  return (
    typedValue &&
    typeof typedValue.confirmation_number === 'string' &&
    typeof typedValue.first_name === 'string' &&
    typeof typedValue.last_name === 'string'
  );
}
