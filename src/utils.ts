import { OnspringClient } from "onspring-api-sdk";

export function createOnspringClient() {
  const baseUrl = process.env.BASE_URL;
  const apiKey = process.env.API_KEY;

  if (!baseUrl) {
    throw new Error("Unable to create Onspring client because BASE_URL is not set");
  }

  if (!apiKey) {
    throw new Error("Unable to create Onspring client because API_KEY is not set");
  }

  return new OnspringClient(baseUrl, apiKey);
}
