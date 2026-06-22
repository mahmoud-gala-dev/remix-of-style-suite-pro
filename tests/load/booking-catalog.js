import http from "k6/http";
import { check } from "k6";

export const options = {
  scenarios: {
    ramp: {
      executor: "ramping-vus",
      startVUs: 0,
      stages: [
        { duration: "20s", target: 10 },
        { duration: "30s", target: 10 },
        { duration: "10s", target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ["rate<0.02"],
    http_req_duration: ["p(95)<800", "p(75)<400"],
  },
};

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:8080";

export default function () {
  const res = http.get(`${BASE_URL}/_serverFn/getPublicBookingCatalog`);
  check(res, {
    "status is 200": (r) => r.status === 200,
  });
}
