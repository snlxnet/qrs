/**
 * Sets up a connection with the coordination server
 * @async
 * @param {Object} params - The config
 * @param {string} params.id - This node's UUID. Generate a random one if you don't have it.
 * @param {Function} params.onConnect - When another node connects to this one, passes the `sendData` function as the argument
 * @param {Function} params.onDisconnect - When another node disconnects
 * @param {Function} params.onData - When another node sends something
 * @returns {Promise<{ sendData: (data: Record<string, any>) => Promise<void>, connect: (peerId: string) => Promise<void> }>} Resolves when the coordination server has accepted the connection
 */
async function setupNode({ id, onConnect, onDisconnect, onData }) {
  return new Promise((resolve) => {
    const node = new Peer(id, {
      host: "peer.snlx.net",
      port: 443,
      path: "/",
      config: {
        iceServers: [
          { url: "stun:snlx.net:3478" },
          { url: "turn:snlx.net:3478", credential: "hunter2", username: "qrs" },
        ],
      },
    });

    async function connect(peerId) {
      const connection = await node.connect(peerId);
      connection.on("data", onData);
      connection.on("close", onDisconnect);

      openConnections.push(connection);
    }

    async function sendData(packet) {
      await Promise.allSettled(
        openConnections.map((conn) => conn.send(packet)),
      );
    }

    const openConnections = [];

    node.on("open", () =>
      resolve({
        connect,
        sendData,
      }),
    );

    node.on("connection", (connection) => {
      openConnections.push(connection);
      onConnect(sendData);
      connection.on("data", onData);
      connection.on("close", onDisconnect);
    });
  });
}
