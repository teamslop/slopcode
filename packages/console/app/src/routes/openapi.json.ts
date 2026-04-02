export async function GET() {
  const response = await fetch(
    "https://raw.githubusercontent.com/teamslop/slopcode/refs/heads/dev/packages/sdk/openapi.json",
  )
  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/json; charset=utf-8",
    },
  })
}
