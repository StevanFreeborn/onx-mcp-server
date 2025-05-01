import { describe, expect, it, vi } from 'vitest';
import { createOnspringClient } from '../src/utils';

describe('createOnspringClient', () => {
  it('should throw an error if ONSPRING_BASE_URL is not set', () => {
    vi.spyOn(process, 'env', 'get').mockImplementation(() => ({
      ONSPRING_BASE_URL: undefined,
    }));

    expect(() => createOnspringClient()).toThrowError(
      'Unable to create Onspring client because ONSPRING_BASE_URL is not set',
    );
  });

  it('should throw an error if API_KEY is not set', () => {
    vi.spyOn(process, 'env', 'get').mockImplementation(() => ({
      ONSPRING_BASE_URL: 'https://example.com',
      ONSPRING_API_KEY: undefined,
    }));

    expect(() => createOnspringClient()).toThrowError(
      'Unable to create Onspring client because ONSPRING_API_KEY is not set',
    );
  });

  it('should create an Onspring client when ONSPRING_BASE_URL and ONSPRING_API_KEY are set', () => {
    vi.spyOn(process, 'env', 'get').mockImplementation(() => ({
      ONSPRING_BASE_URL: 'https://example.com',
      ONSPRING_API_KEY: 'my-api-key',
    }));

    const client = createOnspringClient();

    expect(client).toBeDefined();
  });
});
