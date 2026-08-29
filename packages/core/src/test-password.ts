import { createPasswordHasher } from './shared/password-hasher';

async function test() {
  const hasher = createPasswordHasher();
  const hash = await hasher.hash('validpassword123');
  console.log('Hash:', hash);
  const valid = await hasher.verify(hash, 'validpassword123');
  console.log('Verify valid:', valid);
  const invalid = await hasher.verify(hash, 'wrongpassword');
  console.log('Verify invalid:', invalid);
}

test();
