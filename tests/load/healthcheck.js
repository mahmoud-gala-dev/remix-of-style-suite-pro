import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 20,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<300", "p(75)<150"],
  },
};

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:8080";

export default function () {
  const res = http.get(`${BASE_URL}/api/public/healthcheck`);
  check(res, {
    "status is 200": (r) => r.status === 200,
    "body has ok": (r) => r.body && r.body.includes("ok"),
  });
  sleep(1);
}
