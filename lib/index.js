import httpProxy from "http-proxy";
import https from "https";
import http from "http";
import {
  readStreamData,
  temperResponse,
  forwardRequestToTarget,
} from "./utils.js";

export function createGhostProxyServer(targetUrl, proxyPort) {
  const proxyOptions = {
    target: targetUrl,
    ws: targetUrl.startsWith("ws"),
    agent: targetUrl.startsWith("https") ? https.globalAgent : http.globalAgent,
    xfwd: true,
    ignorePath: true,
    changeOrigin: true,
  };

  const proxyServer = httpProxy.createProxyServer(proxyOptions);

  proxyServer.on("error", (err) => {
    console.error("Proxy server error", err);
  });

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
    "Access-Control-Max-Age": 2592000, // 30 days
  };

  const server = http.createServer(async function (req, res) {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Request-Method", "*");
    res.setHeader("Access-Control-Allow-Methods", "OPTIONS, GET, POST");
    res.setHeader("Access-Control-Allow-Headers", "*");

    if (req.method === "OPTIONS") {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.url === "/proxy") {
      proxyServer.web(req, res);
      return;
    }

    try {
      const payload = await readStreamData(req);
      const { response, headers } = await forwardRequestToTarget(
        payload,
        "0.0.0.0",
        proxyPort
      );
      const newResponse = await temperResponse(payload, response);
      for (const [key, value] of Object.entries(corsHeaders)) {
        if (!["content-length", "connection"].includes(key)) {
          res.setHeader(key, value);
        }
      }
      res.setHeader(
        "content-type",
        headers["content-type"] || "application/json"
      );
      res.write(JSON.stringify(newResponse));
      res.end();
    } catch (err) {
      console.error("Error forwarding request to target", err);
    }
  });

  server.on("upgrade", function proxyRequestUpgrade(req, socket, head) {
    console.info("Upgrading the ws connection");
    proxyServer.ws(req, socket, head);
  });

  server.on("listening", () => {
    console.info(`Proxy forwarding to ${targetUrl}`);
  });

  server.on("error", (err) => {
    console.error("Server error", err);
  });

  function exitHandler() {
    console.info("Shutting down proxy server");
    proxyServer.close();
    server.close();
    process.exit(0);
  }
  // process.on("SIGINT", exitHandler);
  // process.on("SIGKILL", exitHandler);
  process.on("exit", exitHandler);

  process.on("uncaughtException", console.error);
  process.on("unhandledRejection", console.error);

  return server;
}
