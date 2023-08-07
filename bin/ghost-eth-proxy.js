#!/usr/bin/env node

import { URL } from "url";
import { createGhostProxyServer } from "../lib/index.js";

const proxyPort = parseInt(process.argv[1]) || 8080;
const targetUrl = process.argv[2] || "https://lodestar-mainnetrpc.chainsafe.io";

if (!Number.isInteger(proxyPort)) {
  console.error("Invalid port number", proxyPort);
  console.info("Use `eth-el-ghost-proxy <port> <targetUrl>`");
  process.exit(1);
}

try {
  new URL(targetUrl);
} catch {
  console.error("Invalid target url", targetUrl);
  console.info("Use `eth-el-ghost-proxy <port> <targetUrl>`");
  process.exit(1);
}

createGhostProxyServer(targetUrl, proxyPort).listen(proxyPort, "0.0.0.0");
console.info(`Proxy listening http://0.0.0.0:${proxyPort}`);
