import { ApiResponse, DataFormat, GetRecordsByAppIdRequest, OnspringClient, PagedResponse, PagingRequest } from "onspring-api-sdk";

export function createOnspringClient() {
  const baseUrl = process.env.BASE_URL;
  const apiKey = process.env.API_KEY;

  if (!baseUrl) {
    throw new Error(
      "Unable to create Onspring client because BASE_URL is not set",
    );
  }

  if (!apiKey) {
    throw new Error(
      "Unable to create Onspring client because API_KEY is not set",
    );
  }

  return new OnspringClient(baseUrl, apiKey);
}

// TODO: Finish implementing this
// the callback needs to accept a paging request
// so that this function can mutate and pass
// it in on each iteration
async function* getPage<T>(
  callback: (request: PagingRequest) => Promise<ApiResponse<PagedResponse<T>>>
) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;

  do {
    const response = await callback(pagingRequest);

    if (response.isSuccessful === false || response.data === null) {
      throw new Error(`${response.message} (${response.statusCode})`);
    }

    yield* response.data.items;
    pagingRequest.pageNumber++;
    totalPages = response.data.totalPages;
  } while (pagingRequest.pageNumber <= totalPages);
}

export async function* getApps(client: OnspringClient) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;
  
  do {
    const appsResponse = await client.getApps(pagingRequest);

    if (appsResponse.isSuccessful === false || appsResponse.data === null) {
      throw new Error(
        `${appsResponse.message} (${appsResponse.statusCode})`,
      );
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

export async function* getRecords(
  client: OnspringClient, 
  appId: number,
  fieldIds: number[],
  pageNumber: number,
  numberOfPages: number,
) {
  const recordsPagingRequest = new PagingRequest(pageNumber, 100);
  let totalRecordPages = 0;

  do {
    const request = new GetRecordsByAppIdRequest(
      appId,
      fieldIds,
      DataFormat.Formatted,
      recordsPagingRequest,
    );

    const recordsResponse = await client.getRecordsByAppId(request);

    if (
      recordsResponse.isSuccessful === false ||
      recordsResponse.data === null
    ) {
      throw new Error(
        `Unable to get records for app ${appId} with fields ${fieldIds.join(", ")}: ${recordsResponse.message} (${recordsResponse.statusCode})`,
      );
    }

    totalRecordPages = recordsResponse.data.totalPages;
    // TODO: This feels stupid Stevan...think about
    // a better way.
    yield { records: recordsResponse.data.items, totalPages: totalRecordPages };
    recordsPagingRequest.pageNumber++;
  } while (recordsPagingRequest.pageNumber <= numberOfPages);
}

export async function* getReports(
  client: OnspringClient,
  appId: number,
) {
  const pagingRequest = new PagingRequest(1, 100);
  let totalPages = 1;

  do {
    const reportsResponse = await client.getReportsByAppId(appId, pagingRequest);

    if (reportsResponse.isSuccessful === false || reportsResponse.data === null) {
      throw new Error(
        `${reportsResponse.message} (${reportsResponse.statusCode})`,
      );
    }

    yield* reportsResponse.data.items;
    pagingRequest.pageNumber++;
    totalPages = reportsResponse.data.totalPages;
  } while (pagingRequest.pageNumber <= totalPages);
}
