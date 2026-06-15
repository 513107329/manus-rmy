export class AppException extends Error {
  constructor(
    public readonly msg: string,
    public readonly statusCode = 500,
    public readonly code = 500,
    public readonly data: unknown = {},
  ) {
    super(msg);
    this.name = 'AppException';
  }
}

export class NotFoundException extends AppException {
  constructor(msg: string) {
    super(msg, 404, 404);
    this.name = 'NotFoundException';
  }
}

export class InternalServerErrorException extends AppException {
  constructor(msg: string) {
    super(msg, 500, 500);
    this.name = 'InternalServerErrorException';
  }
}
