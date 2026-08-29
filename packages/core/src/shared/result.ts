export type Result<T, E = Error> = Ok<T> | Err<E>;

export interface Ok<T> {
  readonly _tag: 'Ok';
  readonly value: T;
}

export interface Err<E> {
  readonly _tag: 'Err';
  readonly error: E;
}

export const ok = <T>(value: T): Ok<T> => ({ _tag: 'Ok', value });
export const err = <E>(error: E): Err<E> => ({ _tag: 'Err', error });

export const isOk = <T, E>(result: Result<T, E>): result is Ok<T> => result._tag === 'Ok';
export const isErr = <T, E>(result: Result<T, E>): result is Err<E> => result._tag === 'Err';

export const unwrap = <T, E>(result: Result<T, E>): T => {
  if (isOk(result)) return result.value;
  throw result.error;
};

export const unwrapErr = <T, E>(result: Result<T, E>): E => {
  if (isErr(result)) return result.error;
  throw new Error('Expected Err but got Ok');
};
