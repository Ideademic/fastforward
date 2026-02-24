import * as Lab from '@hapi/lab';
import { expect } from '@hapi/code';
import { createTestServer, createTestUser, cleanup } from './helpers.js';
import FormData from 'form-data';
import { Readable } from 'stream';

const lab = Lab.script();
const { experiment, test, before: labBefore, after: labAfter } = lab;
export { lab };

experiment('Uploads', () => {
  let server;

  labBefore(async () => {
    server = await createTestServer();
  });

  labAfter(async () => {
    await cleanup(server);
  });

  test('POST /api/uploads — requires auth', async () => {
    const res = await server.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: { 'content-type': 'multipart/form-data; boundary=test' },
      payload: '--test\r\nContent-Disposition: form-data; name="file"; filename="test.txt"\r\nContent-Type: text/plain\r\n\r\nhello\r\n--test--\r\n',
    });

    expect(res.statusCode).to.equal(401);
  });

  test('POST /api/uploads — valid file upload', async () => {
    const { headers } = await createTestUser(server);
    const boundary = 'testboundary123';
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="test.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `hello world\r\n` +
      `--${boundary}--\r\n`;

    const res = await server.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: {
        ...headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    expect(res.statusCode).to.equal(201);
    const file = JSON.parse(res.payload);
    expect(file.original_name).to.equal('test.txt');
    expect(file.mime_type).to.equal('text/plain');
  });

  test('GET /api/uploads/{id} — returns uploaded file', async () => {
    const { headers } = await createTestUser(server);
    const boundary = 'getboundary';
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="get.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `get content\r\n` +
      `--${boundary}--\r\n`;

    const uploadRes = await server.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: {
        ...headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    const file = JSON.parse(uploadRes.payload);

    const getRes = await server.inject({
      method: 'GET',
      url: `/api/uploads/${file.id}`,
    });

    expect(getRes.statusCode).to.equal(200);
  });

  test('GET /api/uploads/{id} — 404 for non-existent file', async () => {
    const res = await server.inject({
      method: 'GET',
      url: '/api/uploads/99999',
    });

    expect(res.statusCode).to.equal(404);
  });

  test('DELETE /api/uploads/{id} — owner can delete', async () => {
    const { headers } = await createTestUser(server);
    const boundary = 'delboundary';
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="del.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `delete me\r\n` +
      `--${boundary}--\r\n`;

    const uploadRes = await server.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: {
        ...headers,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    const file = JSON.parse(uploadRes.payload);

    const delRes = await server.inject({
      method: 'DELETE',
      url: `/api/uploads/${file.id}`,
      headers,
    });

    expect(delRes.statusCode).to.equal(200);
    expect(JSON.parse(delRes.payload).deleted).to.be.true();
  });

  test('DELETE /api/uploads/{id} — non-owner gets 403', async () => {
    const { headers: ownerHeaders } = await createTestUser(server);
    const { headers: otherHeaders } = await createTestUser(server);

    const boundary = 'nonownerbnd';
    const body =
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="owned.txt"\r\n` +
      `Content-Type: text/plain\r\n\r\n` +
      `my file\r\n` +
      `--${boundary}--\r\n`;

    const uploadRes = await server.inject({
      method: 'POST',
      url: '/api/uploads',
      headers: {
        ...ownerHeaders,
        'content-type': `multipart/form-data; boundary=${boundary}`,
      },
      payload: body,
    });

    const file = JSON.parse(uploadRes.payload);

    const delRes = await server.inject({
      method: 'DELETE',
      url: `/api/uploads/${file.id}`,
      headers: otherHeaders,
    });

    expect(delRes.statusCode).to.equal(403);
  });

  test('DELETE /api/uploads/{id} — unauthenticated gets 401', async () => {
    const res = await server.inject({
      method: 'DELETE',
      url: '/api/uploads/1',
    });

    expect(res.statusCode).to.equal(401);
  });
});
