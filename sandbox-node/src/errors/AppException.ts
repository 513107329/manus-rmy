export class AppException extends Error {
  constructor(
    public readonly msg: string,
    public readonly statusCode = 500,
    public readonly data: unknown = null,
  ) {
    super(msg);
    this.name = 'AppException';
  }
}

export class BadRequestException extends AppException {
  constructor(msg: string, data: unknown = null) {
    super(msg, 400, data);
    this.name = 'BadRequestException';
  }
}

export class NotFoundException extends AppException {
  constructor(msg: string, data: unknown = null) {
    super(msg, 404, data);
    this.name = 'NotFoundException';
  }
}
