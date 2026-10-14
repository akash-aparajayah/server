export class ApiResult<T = any> {
  constructor(
    public readonly message: string,
    public readonly data: T,
  ) {}
}

export const withMessage = <T>(message: string, data: T = null as T) =>
  new ApiResult<T>(message, data);