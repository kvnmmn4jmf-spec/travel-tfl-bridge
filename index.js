
const STOPS = {
  N: "490014389N",
  P: "490014389S",
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...CORS,
      "Content-Type": "application/json; charset=utf-8",
      ...extra,
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: CORS,
      });
    }

    if (request.method !== "GET") {
      return json({ error: "Method not allowed" }, 405);
    }

    if (url.pathname === "/health") {
      return json({
        service: "Travel HQ TfL Bridge",
        status: "online",
        checkedAt: new Date().toISOString(),
      });
    }

    const paths = {
      "/arrivals/N": `/StopPoint/${STOPS.N}/Arrivals`,
      "/arrivals/P": `/StopPoint/${STOPS.P}/Arrivals`,
      "/status/51": "/Line/51/Status",
    };

    const endpoint = paths[url.pathname];

    if (!endpoint) {
      return json({ error: "Not found" }, 404);
    }

    try {
      const upstream = await fetch(
        `https://api.tfl.gov.uk${endpoint}`,
        {
          headers: { Accept: "application/json" },
          cf: {
            cacheTtl: 0,
            cacheEverything: false,
          },
        }
      );

      const body = await upstream.text();

      return new Response(body, {
        status: upstream.status,
        headers: {
          ...CORS,
          "Content-Type":
            upstream.headers.get("Content-Type") ||
            "application/json",
          "X-TravelHQ-Source": "TfL Unified API",
          "X-TravelHQ-Fetched-At":
            new Date().toISOString(),
        },
      });
    } catch (error) {
      return json({
        error: "TfL upstream unavailable",
        detail: String(error),
        checkedAt: new Date().toISOString(),
      }, 502);
    }
  },
};
