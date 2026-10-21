// Exercise HDMI failure handling without sending any commands to a TV.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = readFileSync(new URL('../app/device.js', import.meta.url), 'utf8');
function fixture(options = {}) {
  const calls = [];
  const tizen = {
    systeminfo: {
      getPropertyValue(name, ok, fail) {
        calls.push(['read', name]);
        if (options.readError) return fail({ message: 'Source discovery failed' });
        ok({ connected: options.sources || [{ type: 'HDMI', number: 1 }, { type: 'HDMI', number: 4 }] });
      }
    },
    tvwindow: {
      setSource(value, ok, fail) {
        calls.push(['source', value.number]);
        if (options.setError) return fail({ message: 'Source change failed' });
        if (options.holdSource) { options.sourceReady = ok; return; }
        ok();
      },
      show(ok, fail, rectangle, type, position) {
        calls.push(['show', rectangle, type, position]);
        if (options.showError) return fail({ message: 'Display failed' });
        if (options.holdShow) { options.showReady = ok; return; }
        ok();
      },
      hide(ok, fail) {
        calls.push(['hide']);
        if (options.hideError) return fail({ message: 'Hide failed' });
        ok();
      }
    }
  };
  const context = { window: options.preview ? {} : { tizen }, tizen, setTimeout, clearTimeout };
  vm.runInNewContext(source, context);
  return { device: context.window.FrameDevice, calls };
}
const run = (device, number) => new Promise(resolve => device.input(number, resolve));
test('Fios and Playground select their exact HDMI inputs and return on Back', async () => {
  for (const number of [1, 4]) {
    const { device, calls } = fixture();
    assert.equal(await run(device, number), null);
    assert.equal(calls.find(c => c[0] === 'source')[1], number);
    assert.equal(device.inputVisible(), true);
    const shown = calls.find(c => c[0] === 'show');
    assert.equal(shown[2], 'MAIN');
    assert.equal(shown[3], 'FRONT');
    assert.equal(await new Promise(resolve => device.closeInput(resolve)), null);
    assert.equal(device.inputVisible(), false);
  }
});
test('Disconnected input does not switch or show another source', async () => {
  const { device, calls } = fixture({ sources: [{ type: 'HDMI', number: 2 }] });
  assert.match((await run(device, 4)).message, /not connected/);
  assert.equal(calls.length, 1);
  assert.equal(device.inputVisible(), false);
});
for (const failure of ['readError', 'setError', 'showError']) {
  test(`${failure} reports an error without entering input mode`, async () => {
    const { device } = fixture({ [failure]: true });
    assert.ok(await run(device, 1));
    assert.equal(device.inputVisible(), false);
  });
}
test('Failed hide keeps input mode so Back can be retried', async () => {
  const { device } = fixture({ hideError: true });
  await run(device, 1);
  assert.ok(await new Promise(resolve => device.closeInput(resolve)));
  assert.equal(device.inputVisible(), true);
});
test('Browser preview cannot claim to switch the TV', async () => {
  const { device, calls } = fixture({ preview: true });
  assert.match((await run(device, 1)).message, /TV/);
  assert.equal(calls.length, 0);
});
test('Back cancels a pending source switch; its late callback cannot open HDMI', async () => {
  const options = { holdSource: true };
  const { device, calls } = fixture(options);
  const pending = run(device, 4);
  assert.equal(device.inputVisible(), true);
  await new Promise(resolve => device.closeInput(resolve));
  assert.equal(await pending, null);
  options.sourceReady();
  assert.equal(calls.filter(c => c[0] === 'show').length, 0);
  assert.equal(device.inputVisible(), false);
});
test('Back works before show callback, and a late callback cannot restore input mode', async () => {
  const options = { holdShow: true };
  const { device, calls } = fixture(options);
  const pending = run(device, 4);
  assert.equal(device.inputVisible(), true);
  await new Promise(resolve => device.closeInput(resolve));
  await pending;
  options.showReady();
  assert.equal(device.inputVisible(), false);
  assert.equal(calls.filter(c => c[0] === 'hide').length, 2);
});
