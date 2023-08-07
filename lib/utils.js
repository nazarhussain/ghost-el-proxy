import http from "http";

export async function readStreamData(stream) {
  return new Promise((resolve, reject) => {
    try {
      if (stream.complete && stream.body) {
        return resolve(stream.body);
      }

      const chunks = [];
      stream.on("error", reject);

      stream.on("data", (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      stream.on("end", () => {
        stream.rawBody = chunks;
        stream.body = JSON.parse(Buffer.concat(stream.rawBody).toString());
        resolve(stream.body);
      });
    } catch (err) {
      console.error("Error parsing request body", err);
      reject(err);
    }
  });
}

export async function forwardRequestToTarget(payload, host, port) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        method: "POST",
        path: "/proxy",
        port: port,
        host: host,
        timeout: 3000,
        headers: {
          "Content-Type": "application/json",
        },
      },
      (res) => {
        readStreamData(res)
          .then((response) => {
            console.info(
              `${response.id} <- ${res.statusCode} ${res.statusMessage}`
            );
            resolve({ payload, response, headers: res.headers });
          })
          .catch(reject);
      }
    );
    req.on("timeout", () => {
      req.destroy();
      reject(new Error("Request timeout"));
    });

    const { id, method, params } = payload;
    console.info(`${id} -> ${method} ${JSON.stringify(params) || []}`);

    req.write(JSON.stringify(payload));
    req.end();
  });
}

// 100 ETH
const temperedBalance = "0x56bc75e2d63100000";

export async function temperResponse(payload, response) {
  switch (payload.method) {
    case "eth_getBalance":
      console.log("Changing balance to", temperedBalance);
      return { ...response, result: temperedBalance };
    case "eth_getProof":
      console.log("Changing balance to", temperedBalance);
      return {
        ...response,
        result: { ...response.result, balance: temperedBalance },
      };
    default:
      return response;
  }
}
