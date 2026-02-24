import * as Lab from '@hapi/lab';
import { expect } from '@hapi/code';
import { db } from '../db.js';
import { createTestServer, createTestUser, cleanup } from './helpers.js';

const lab = Lab.script();
const { experiment, test, before: labBefore, after: labAfter } = lab;
export { lab };

experiment('OAuth', () => {
  let server;

  labBefore(async () => {
    server = await createTestServer();
  });

  labAfter(async () => {
    await cleanup(server);
  });

  test('oauth_accounts table exists and can be queried', async () => {
    const { rows } = await db.query(
      "SELECT table_name FROM information_schema.tables WHERE table_name = 'oauth_accounts'",
    );
    expect(rows.length).to.equal(1);
  });

  test('can insert and query oauth_accounts', async () => {
    const { user } = await createTestUser(server);

    await db.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_id, email, display_name)
       VALUES ($1, $2, $3, $4, $5)`,
      [user.id, 'github', 'gh123', user.email, user.username],
    );

    const { rows } = await db.query(
      'SELECT * FROM oauth_accounts WHERE user_id = $1',
      [user.id],
    );

    expect(rows.length).to.equal(1);
    expect(rows[0].provider).to.equal('github');
    expect(rows[0].provider_id).to.equal('gh123');
  });

  test('oauth_accounts cascade deletes with user', async () => {
    const { user, headers } = await createTestUser(server);

    await db.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_id, email)
       VALUES ($1, $2, $3, $4)`,
      [user.id, 'google', 'goog456', user.email],
    );

    // Delete the user
    await server.inject({
      method: 'DELETE',
      url: '/api/auth/account',
      headers,
    });

    const { rows } = await db.query(
      'SELECT * FROM oauth_accounts WHERE user_id = $1',
      [user.id],
    );

    expect(rows.length).to.equal(0);
  });
});
