import { type ClassValue, clsx } from 'clsx';
import type { SafeActionResult } from 'next-safe-action';
import type { KeyboardEventHandler } from 'react';
import { twMerge } from 'tailwind-merge';
import type { z } from 'zod';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const handleKeyUpAsClick: KeyboardEventHandler<HTMLElement> = (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.currentTarget.click();
  }
};

export const getActionErrorMsg = <
  TServerError = unknown,
  TSchema extends z.ZodTypeAny = z.ZodTypeAny,
  TData = unknown,
  TContext = unknown,
  TMeta = unknown,
>(
  res:
    | SafeActionResult<TServerError, TSchema, TData, TContext, TMeta>
    | null
    | undefined,
  defaultMsg: string,
): string => {
  if (!res) {
    return defaultMsg;
  }
  if (res.serverError) {
    return typeof res.serverError === 'string' ? res.serverError : defaultMsg;
  }
  if (res.validationErrors) {
    const errors = Object.values(res.validationErrors)
      .flat()
      .map((err) => {
        if (typeof err === 'string') {
          return err;
        }
        if (err && typeof err === 'object' && '_errors' in err) {
          const errorObj = err as { _errors?: string[] };
          return errorObj._errors?.[0];
        }
        return null;
      })
      .filter((msg): msg is string => typeof msg === 'string');
    return errors.length > 0 ? errors.join('; ') : defaultMsg;
  }
  return defaultMsg;
};

export const formatNumber = (number: number) => {
  if (number < 1000) {
    return number;
  }
  return `${(number / 1000).toFixed(1)}K`;
};
