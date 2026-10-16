import assert from 'node:assert/strict'
const base = process.env.API_URL ?? 'http://127.0.0.1:8080'
const scenarios = [
  ['add', 12, 8, 20], ['subtract', 12, 8, 4], ['multiply', -3, 4, -12],
  ['divide', 7, 2, 3.5], ['power', 2, 3, 8], ['sqrt', 81, undefined, 9], ['percent', 15, 200, 30],
]
const health = await fetch(`${base}/api/v1/health`, { signal: AbortSignal.timeout(5000) })
assert.equal(health.status, 200)
assert.deepEqual(await health.json(), { status: 'ok' })
for (const [operation, a, b, expected] of scenarios) {
  const request = b === undefined ? { operation, a } : { operation, a, b }
  const response = await fetch(`${base}/api/v1/calculate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal: AbortSignal.timeout(5000),
  })
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { ...request, result: expected })
  console.log(`PASS ${operation}`)
}
for (const [body, status, code] of [
  ['{"operation":"divide","a":1,"b":0}', 422, 'math_error'],
  ['{"operation":"sqrt","a":-1}', 422, 'math_error'],
  ['{"operation":"add","a":"1","b":2}', 400, 'invalid_json'],
  ['null', 400, 'invalid_json'],
  ['{"operation":"add","a":1,"b":2}' + ' '.repeat(17000), 413, 'payload_too_large'],
]) {
  const response = await fetch(`${base}/api/v1/calculate`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body, signal: AbortSignal.timeout(5000),
  })
  assert.equal(response.status, status)
  assert.equal((await response.json()).error.code, code)
  console.log(`PASS HTTP ${status} ${code}`)
}
console.log('Live API smoke checks passed.')
