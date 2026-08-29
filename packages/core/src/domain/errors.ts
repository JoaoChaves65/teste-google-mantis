/**
 * Domain-specific errors.
 *
 * These errors carry no HTTP knowledge (no status codes). The future HTTP layer
 * maps them to responses.
 */

export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidDomainError extends DomainError {
  readonly field: string;

  constructor(field: string, message: string) {
    super('INVALID_DOMAIN', message);
    this.name = 'InvalidDomainError';
    this.field = field;
    Object.setPrototypeOf(this, InvalidDomainError.prototype);
  }
}

export class InvalidStatusTransitionError extends DomainError {
  readonly from: string;
  readonly to: string;

  constructor(from: string, to: string) {
    super('INVALID_STATUS_TRANSITION', `Cannot transition appointment from ${from} to ${to}`);
    this.name = 'InvalidStatusTransitionError';
    this.from = from;
    this.to = to;
    Object.setPrototypeOf(this, InvalidStatusTransitionError.prototype);
  }
}

export class InactiveBarberError extends DomainError {
  readonly barberId: string;

  constructor(barberId: string) {
    super('INACTIVE_BARBER', `Barber ${barberId} is inactive and cannot receive new appointments`);
    this.name = 'InactiveBarberError';
    this.barberId = barberId;
    Object.setPrototypeOf(this, InactiveBarberError.prototype);
  }
}

export class InactiveServiceError extends DomainError {
  readonly serviceId: string;

  constructor(serviceId: string) {
    super(
      'INACTIVE_SERVICE',
      `Service ${serviceId} is inactive and cannot be used for new appointments`
    );
    this.name = 'InactiveServiceError';
    this.serviceId = serviceId;
    Object.setPrototypeOf(this, InactiveServiceError.prototype);
  }
}

export class InvalidTransactionTypeError extends DomainError {
  readonly type: string;

  constructor(type: string, message: string) {
    super('INVALID_TRANSACTION_TYPE', message);
    this.name = 'InvalidTransactionTypeError';
    this.type = type;
    Object.setPrototypeOf(this, InvalidTransactionTypeError.prototype);
  }
}

export class EntityNotFoundError extends DomainError {
  readonly resource: string;
  readonly id: string;

  constructor(resource: string, id: string) {
    super('NOT_FOUND', `${resource} with id ${id} not found`);
    this.name = 'EntityNotFoundError';
    this.resource = resource;
    this.id = id;
    Object.setPrototypeOf(this, EntityNotFoundError.prototype);
  }
}

export class InvalidCredentialsError extends DomainError {
  constructor(message = 'Invalid email or password') {
    super('INVALID_CREDENTIALS', message);
    this.name = 'InvalidCredentialsError';
    Object.setPrototypeOf(this, InvalidCredentialsError.prototype);
  }
}

export class TokenExpiredError extends DomainError {
  constructor(message = 'Token has expired') {
    super('TOKEN_EXPIRED', message);
    this.name = 'TokenExpiredError';
    Object.setPrototypeOf(this, TokenExpiredError.prototype);
  }
}

export class TokenRevokedError extends DomainError {
  constructor(message = 'Token has been revoked') {
    super('TOKEN_REVOKED', message);
    this.name = 'TokenRevokedError';
    Object.setPrototypeOf(this, TokenRevokedError.prototype);
  }
}

export class TokenInvalidError extends DomainError {
  constructor(message = 'Invalid token') {
    super('TOKEN_INVALID', message);
    this.name = 'TokenInvalidError';
    Object.setPrototypeOf(this, TokenInvalidError.prototype);
  }
}

export class InsufficientPermissionsError extends DomainError {
  constructor(message = 'Insufficient permissions') {
    super('INSUFFICIENT_PERMISSIONS', message);
    this.name = 'InsufficientPermissionsError';
    Object.setPrototypeOf(this, InsufficientPermissionsError.prototype);
  }
}

export class AccountInactiveError extends DomainError {
  constructor(message = 'Account is inactive') {
    super('ACCOUNT_INACTIVE', message);
    this.name = 'AccountInactiveError';
    Object.setPrototypeOf(this, AccountInactiveError.prototype);
  }
}
