import { expect, type Mock } from "vitest";

export function mockSession(authMock: Mock, userId: number | null) {
  authMock.mockResolvedValue(
    userId
      ? {
          user: {
            id: String(userId),
            name: "Usuario Teste",
            email: "teste@example.com",
          },
        }
      : null,
  );
}

export function postJson(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function readJsonResponse(response: Response) {
  const data = (await response.json()) as Record<string, unknown>;
  return { status: response.status, data };
}

export async function expectStatus(response: Response, status: number) {
  const body = await readJsonResponse(response);
  expect(body.status).toBe(status);
  return body;
}
