import { z } from "zod"

import { logger } from "~/lib/logger"

type Result<TData = undefined, TError = unknown> =
  | { success: true; data: TData }
  | { success: false; error: TError }

interface FetchErrorOptions {
  baseUrl: string
  path: string
  method: string
  /** HTTP status code if available */
  status?: number
  /** The response from the request, text or json depending on the response type */
  response?: unknown
  cause?: unknown
}

const composeFetchErrorMessage = (
  message: string,
  { status, method, path }: FetchErrorOptions,
) => {
  if (!status) {
    return `${method} ${path} - ${message}`
  }
  return `${status} ${method} ${path} - ${message}`
}

export class FetchError extends Error {
  baseUrl: string
  path: string
  method: string
  status?: number
  response?: unknown

  constructor(
    /** The unique error message, this will be prefixed relevant request metadata */
    message: string,
    options: FetchErrorOptions,
  ) {
    super(composeFetchErrorMessage(message, options), options)
    this.name = "FetchError"

    this.method = options.method
    this.baseUrl = options.baseUrl
    this.path = options.path
    this.status = options.status
    this.response = options.response
  }
}

interface FetchOptions<TResponse> {
  baseUrl: string
  path: string
  method?: string
  body?: Record<string, unknown> | URLSearchParams
  headers?: Record<string, string>
  /**
   * Zod schema that will be used to validate the response.
   * This is also used to decide the return type of the function.
   *
   * Note that if you want to support 204 you must make your schema optional.
   */
  responseSchema?: z.ZodType<TResponse>
  timeout?: number
  /** If you need to pass custom options to the fetch call, use this. Properties of this will overwrite any default options that the fetch wrapper uses */
  fetchOptions?: RequestInit
  /** Optional metadata that will be included in fetch related logs */
  meta?: Record<string, unknown>
}

interface RequestMeta {
  baseUrl: string
  path: string
  method: string
}

const parseResponse = async ({
  response,
  requestMeta,
}: {
  response: Response
  requestMeta: RequestMeta
}): Promise<unknown> => {
  if (response.status === 204) {
    return
  }
  const text = await response.text()
  try {
    return JSON.parse(text)
  } catch (error) {
    logger.info(
      { error, baseUrl: requestMeta.baseUrl, path: requestMeta.path },
      `${requestMeta.path} - Parsing response as JSON failed, returning raw text`,
    )
    return text
  }
}

type FetchResult<TResponse, TError> = Result<TResponse, TError> & {
  status?: number
}

/**
 * Basic fetch wrapper with optional parsing, will never throw but instead always returns a result type
 *
 * @returns Result with data if successful, or an error of type FetchError if the request failed.
 *
 * @example
 * // Define a schema for the expected response
 * const userSchema = z.object({
 *   id: z.number(),
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * // GET request example, POST would be similar but with method and body included in options
 * const getUserResult = await fetchJson({
 *   baseUrl: 'https://api.example.com',
 *   path: '/users/123',
 *   schema: userSchema,
 * });
 *
 * // Handle the result (pseudo-code)
 * if (getUserResult.success) {
 *   console.log('User data:', getUserResult.data);
 * } else {
 *   console.error('Failed to fetch user:', getUserResult.error.message);
 * }
 */
export const fetchJson = async <TResponse = unknown>({
  baseUrl,
  path,
  method = "GET",
  body,
  headers,
  responseSchema,
  timeout = 10000,
  fetchOptions,
  meta,
}: FetchOptions<TResponse>): Promise<FetchResult<TResponse, FetchError>> => {
  const requestMeta: RequestMeta = { baseUrl, path, method, ...meta }
  try {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      body: body
        ? body instanceof URLSearchParams
          ? body
          : JSON.stringify(body)
        : undefined,
      headers,
      signal: AbortSignal.timeout(timeout),
      ...fetchOptions,
    }).catch((error: unknown) => {
      throw new FetchError("Fetch threw an error", {
        ...requestMeta,
        cause: error,
      })
    })

    const payload = await parseResponse({ response, requestMeta })

    if (!response.ok) {
      throw new FetchError("Fetch responded with non-success status code", {
        ...requestMeta,
        response: payload,
        status: response.status,
      })
    }

    if (!responseSchema) {
      return {
        success: true,
        data: payload as TResponse,
        status: response.status,
      }
    }

    const parsed = responseSchema.safeParse(payload)
    if (!parsed.success) {
      throw new FetchError("Response schema parsing failed", {
        ...requestMeta,
        response: payload,
        status: response.status,
        cause: parsed.error,
      })
    }

    return { success: true, data: parsed.data, status: response.status }
  } catch (error) {
    if (error instanceof FetchError) {
      logger.warn({ error, ...requestMeta }, error.message)
      return { success: false, error, status: error.status }
    }

    logger.error(
      { error, ...requestMeta },
      composeFetchErrorMessage("Unexpected error in fetchJson", requestMeta),
    )

    return {
      success: false,
      error: new FetchError("Request failed with unexpected error", {
        ...requestMeta,
        cause: error,
      }),
    }
  }
}
