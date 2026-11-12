const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { createClient } = require('@supabase/supabase-js');
const url = process.env.STAGING_SUPABASE_URL;
assert.equal(new URL(url).hostname, 'rntqwmptuavqnbjovnae.supabase.co');
const options = {auth: {persistSession: false, autoRefreshToken: false}};
const admin = createClient(url, process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY, options);
const password = process.env.TEST_PERSONA_PASSWORD;
assert.ok(password);
const phone = '+12025550148';
async function result(operation) {
  const {data, error} = await operation;
  if (error) throw error;
  return data;
}
async function account(suffix) {
  const alias = 'circleqa-' + suffix;
  const email = alias + '@personas.example.com';
  const client = createClient(url, process.env.STAGING_SUPABASE_ANON_KEY, options);
  let signed = await client.auth.signInWithPassword({email,password});
  if (signed.error) {
    await result(admin.auth.admin.createUser({email,password,email_confirm:true,user_metadata:{fixture:'circleqa'}}));
    signed = await client.auth.signInWithPassword({email,password});
  }
  const {user} = await result(signed);
  assert.equal(user.user_metadata.fixture,'circleqa');
  await result(client.from('users').update({alias,discoverable_by_contacts:false}).eq('id',user.id).select('id').single());
  return {client,id:user.id,email};
}
async function main() {
  const a = await account('a');
  const b = await account('b');
  const matches = async (...values) => (await result(a.client.rpc('contact_friend_matches_v2',{
    identifiers: values.map(v=>createHash('sha256').update(v).digest('hex'))
  }))).map(row=>row.id);
  const toggle = enabled => result(b.client.from('users').update({discoverable_by_contacts:enabled}).eq('id',b.id).select('id').single());
  try {
    await result(admin.auth.admin.updateUserById(b.id,{phone,phone_confirm:true}));
    assert.deepEqual(await matches(phone,b.email),[]);
    await toggle(true);
    for (const identifiers of [[phone],[b.email],[phone,b.email]]) assert.deepEqual(await matches(...identifiers),[b.id]);
  } finally { await toggle(false); }
  assert.deepEqual(await matches(phone,b.email),[]);
  console.log('PASS: staging pair sign-in, default test state, phone only, email only, deduplication, caller independence and opt-out.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
