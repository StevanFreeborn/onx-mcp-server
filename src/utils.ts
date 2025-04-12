import { OnspringClient, PagingRequest } from "onspring-api-sdk";

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

export async function* getApps(client: OnspringClient) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;

  do {
    const appsResponse = await client.getApps(pagingRequest);

    if (appsResponse.isSuccessful === false || appsResponse.data === null) {
      throw new Error(`${appsResponse.message} (${appsResponse.statusCode})`);
    }

    yield* appsResponse.data.items;
    pagingRequest.pageNumber++;
    totalPages = appsResponse.data.totalPages;
  } while (pagingRequest.pageNumber <= totalPages);
}

export async function* getFields(client: OnspringClient, appId: number) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;

  do {
    const fieldsResponse = await client.getFieldsByAppId(appId, pagingRequest);

    if (fieldsResponse.isSuccessful === false || fieldsResponse.data === null) {
      throw new Error(
        `${fieldsResponse.message} (${fieldsResponse.statusCode})`,
      );
    }

    yield* fieldsResponse.data.items;
    pagingRequest.pageNumber++;
    totalPages = fieldsResponse.data.totalPages;
  } while (pagingRequest.pageNumber <= totalPages);
}
