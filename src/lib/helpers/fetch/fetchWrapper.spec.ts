import nock from "nock"
import { describe, expect, it, vi } from "vitest"
import { z, ZodError } from "zod"

import { logger } from "~/lib/logger"

import { FetchError, fetchJson } from "./fetchWrapper"

function assertExpectIsBoolean<TBoolean extends boolean>(
  value: boolean,
  expected: TBoolean,
): asserts value is TBoolean {
  expect(value).toBe(expected)
}

describe("fetchJson", () => {
  vi.spyOn(logger, "info").mockImplementation(vi.fn())
  const loggerWarnSpy = vi.spyOn(logger, "warn").mockImplementation(vi.fn())

  const baseUrl = "https://api.example.com"
  const path = "/users"
  const testSchema = z.object({
    id: z.number(),
    name: z.string(),
  })

  describe("successful requests", () => {
    it("should return success result with parsed data for 200 response", async () => {
      const mockData = { id: 1, name: "John Doe" }
      nock(baseUrl).get(path).reply(200, mockData)

      const result = await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema,
      })

      expect(result).toEqual({
        success: true,
        data: mockData,
        status: 200,
      })
    })

    it("should return success result with undefined data for 204 response", async () => {
      nock(baseUrl).get(path).reply(204)

      const result = await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema.optional(), // Doesn't need to be passed, but if passed it needs the .optional() to support 204
      })

      expect(result).toEqual({
        success: true,
        data: undefined,
        status: 204,
      })
    })

    it("should support POST requests with body parsing", async () => {
      const mockData = { id: 1, name: "John Doe" }
      const options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: { name: "Jane Doe" },
      }

      const spy = nock(baseUrl, {
        reqheaders: { ...options.headers },
      })
        .post(path, options.body)
        .reply(200, mockData)

      await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema,
        ...options,
      })

      expect(spy.isDone()).toBe(true) // Make sure the nock spy was hit
    })
  })

  describe("Error handling", () => {
    it("should handle fetch throwing an error", async () => {
      const networkError = new Error("Network failure")
      vi.spyOn(global, "fetch").mockRejectedValueOnce(networkError)

      const result = await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema,
      })

      assertExpectIsBoolean(result.success, false)
      expect(result.error).toBeInstanceOf(FetchError)
      expect(result.error.message).toBe("GET /users - Fetch threw an error")
      expect(result.error.cause).toEqual(networkError)

      expect(loggerWarnSpy).toHaveBeenCalledWith(
        {
          error: expect.objectContaining({
            message: "GET /users - Fetch threw an error",
          }) as unknown,
          baseUrl,
          path,
          method: "GET",
        },
        expect.any(String),
      )
    })

    it("should handle unsuccessful status code", async () => {
      const errorResponse = { error: "Invalid request" }
      nock(baseUrl).get(path).reply(400, errorResponse)

      const result = await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema,
      })

      assertExpectIsBoolean(result.success, false)
      expect(result.error).toBeInstanceOf(FetchError)
      expect(result.error.message).toBe(
        "400 GET /users - Fetch responded with non-success status code",
      )
      expect(result.error.response).toEqual(errorResponse)
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        {
          error: expect.objectContaining({
            message:
              "400 GET /users - Fetch responded with non-success status code",
          }) as unknown,
          baseUrl,
          path,
          method: "GET",
        },
        expect.any(String),
      )
    })

    it("should handle malformed JSON response", async () => {
      nock(baseUrl)
        .get(path)
        .reply(200, "invalid json {", { "Content-Type": "application/json" })

      const result = await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema,
      })

      assertExpectIsBoolean(result.success, false)
      expect(result.error).toBeInstanceOf(FetchError)
      expect(result.error.message).toBe(
        "200 GET /users - Response schema parsing failed",
      )
      expect(result.error.cause).toBeInstanceOf(ZodError)
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        {
          error: expect.objectContaining({
            message: "200 GET /users - Response schema parsing failed",
          }) as unknown,
          baseUrl,
          path,
          method: "GET",
        },
        expect.any(String),
      )
    })

    it("should handle response with missing required fields", async () => {
      const invalidData = { id: 1 } // missing 'name' field
      nock(baseUrl).get(path).reply(200, invalidData)

      const result = await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema,
      })

      assertExpectIsBoolean(result.success, false)
      expect(result.error).toBeInstanceOf(FetchError)
      expect(result.error.message).toBe(
        "200 GET /users - Response schema parsing failed",
      )
      expect(result.error.cause).toHaveProperty("issues")
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        {
          error: expect.objectContaining({
            message: "200 GET /users - Response schema parsing failed",
          }) as unknown,
          baseUrl,
          path,
          method: "GET",
        },
        expect.any(String),
      )
    })

    it("should handle unsuccessful status code with non-JSON response", async () => {
      nock(baseUrl)
        .get(path)
        .reply(500, "Internal Server Error", { "Content-Type": "text/plain" })

      const result = await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema,
      })

      assertExpectIsBoolean(result.success, false)
      expect(result.error).toBeInstanceOf(FetchError)
      expect(result.error.message).toBe(
        "500 GET /users - Fetch responded with non-success status code",
      )
      expect(result.error.response).toEqual("Internal Server Error")
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        {
          error: expect.objectContaining({
            message:
              "500 GET /users - Fetch responded with non-success status code",
          }) as unknown,
          baseUrl,
          path,
          method: "GET",
        },
        expect.any(String),
      )
    })

    it("should handle successful response with non-JSON content", async () => {
      nock(baseUrl)
        .get(path)
        .reply(200, "plain text response", { "Content-Type": "text/plain" })

      const result = await fetchJson({
        baseUrl,
        path,
        responseSchema: testSchema,
      })

      assertExpectIsBoolean(result.success, false)
      expect(result.error).toBeInstanceOf(FetchError)
      expect(result.error.message).toBe(
        "200 GET /users - Response schema parsing failed",
      )
      expect(result.error.cause).toBeInstanceOf(ZodError)
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        {
          error: expect.objectContaining({
            message: "200 GET /users - Response schema parsing failed",
          }) as unknown,
          baseUrl,
          path,
          method: "GET",
        },
        expect.any(String),
      )
    })
  })
})
