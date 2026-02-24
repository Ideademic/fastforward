import * as Lab from '@hapi/lab';
import { expect } from '@hapi/code';
import Nes from '@hapi/nes';
import { createTestServer, createTestUser, cleanup } from './helpers.js';

const lab = Lab.script();
const { experiment, test, before: labBefore, after: labAfter } = lab;
export { lab };

experiment('WebSocket', () => {
  let server;

  labBefore(async () => {
    server = await createTestServer();
    await server.start();
  });

  labAfter(async () => {
    await cleanup(server);
  });

  test('Nes client can subscribe and receive published messages', async () => {
    const { user, headers } = await createTestUser(server);

    const client = new Nes.Client(`http://localhost:${server.info.port}`);
    await client.connect();

    let received = null;

    await client.subscribe('/notifications', (message) => {
      received = message;
    });

    // Broadcast a message
    await server.inject({
      method: 'POST',
      url: '/api/broadcast',
      payload: { message: 'ws test' },
      headers,
    });

    // Wait a moment for message delivery
    await new Promise((resolve) => setTimeout(resolve, 200));

    expect(received).to.not.be.null();
    expect(received.from).to.equal(user.username);
    expect(received.message).to.equal('ws test');

    client.disconnect();
  });
});
