import http from "k6/http";
import { check } from "k6";

export const options = {
  vus: 50,
  duration: "30s",
  thresholds: {
    http_req_failed: ["rate<0.01"],
    http_req_duration: ["p(95)<250", "p(75)<120"],
  },
};

const BASE_URL = __ENV.BASE_URL ?? "http://localhost:8080";
const METRICS = ["LCP", "INP", "CLS", "FCP", "TTFB"];

export default function () {
  const name = METRICS[Math.floor(Math.random() * METRICS.length)];
  const payload = JSON.stringify({
    kind: "web-vital",
    name,
    value: Math.random() * (name === "CLS" ? 0.2 : 3000),
    route: "/",
    rating: "needs-improvement",
    id: `k6-${__VU}-${__ITER}`,
  });
  const res = http.post(`${BASE_URL}/api/public/web-vitals`, payload, {
    headers: { "Content-Type": "application/json" },
  });
  check(res, { "status is 200": (r) => r.status === 200 });
}
