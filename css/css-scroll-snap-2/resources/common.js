function checkSnapEventSupport(event_type) {
  if (event_type == "snapchanged") {
    assert_true(window.onsnapchanged !== undefined, "snapchanged not supported");
  } else if (event_type == "snapchanging") {
    assert_true(window.onsnapchanging !== undefined, "snapchanging not supported");
  } else {
    assert_unreached(`Unknown snap event type selected: ${event_type}`);
  }
}

function assertSnapEvent(evt, expected_ids) {
  assert_equals(evt.bubbles, false, "snap events don't bubble");
  assert_false(evt.cancelable, "snap events are not cancelable.");
  assert_equals(evt.snapTargetBlock, expected_ids.block,
    "snap event supplied expected target in block axis");
  assert_equals(evt.snapTargetInline, expected_ids.inline,
    "snap event supplied expected target in inline axis");
}

async function snap_test_setup(test, scroller, event_type) {
  checkSnapEventSupport(event_type);
  await waitForScrollReset(test, scroller);
  await waitForCompositorCommit();
  test.add_cleanup(async () => {
    await waitForScrollReset(test, scroller);
  });
}

async function test_snap_event(test, test_data, event_type) {
  await snap_test_setup(test, test_data.scroller, event_type);

  let listener = test_data.scroller ==
    document.scrollingElement ? document : test_data.scroller;

  const event_promise = waitForSnapEvent(listener, event_type);
  await test_data.scrolling_function();
  let evt = await event_promise;

  assertSnapEvent(evt, test_data.expected_snap_targets);
  assert_approx_equals(test_data.scroller.scrollTop,
    test_data.expected_scroll_offsets.y, 1,
    "vertical scroll offset mismatch.");
  assert_approx_equals(test_data.scroller.scrollLeft,
    test_data.expected_scroll_offsets.x, 1,
    "horizontal scroll offset mismatch.");
}

async function test_snapchanged(test, test_data) {
  await test_snap_event(test, test_data, "snapchanged");
}

function waitForEventUntil(event_target, event_type, wait_until) {
  return new Promise(resolve => {
    let result = null;
    const listener = (evt) => {
      result = evt;
    };
    event_target.addEventListener(event_type, listener);
    wait_until.then(() => {
      event_target.removeEventListener(event_type, listener);
      resolve(result);
    });
  });
}

function waitForEventsUntil(event_target, event_type, wait_until) {
  return new Promise(resolve => {
    let result = [];
    const listener = (evt) => {
      result.push(evt);
    };
    event_target.addEventListener(event_type, listener);
    wait_until.then(() => {
      event_target.removeEventListener(event_type, listener);
      resolve(result);
    });
  });
}

function waitForOnSnapchanging(event_target) {
  return new Promise(resolve => {
    let result = null;
    const listener = (evt) => {
      result = evt;
    };
    event_target.onsnapchanging = listener;
    waitForScrollendEventNoTimeout(event_target).then(() => {
      event_target.onsnapchanging = null;
      resolve(result);
    });
  });
}

// Proxy a wait for a snap event. We want to avoid having a test
// timeout in the event of an expected snap event not firing in a particular
// test case as that would cause the entire file to fail.
// Snap events should fire before scrollend, so if a scroll should happen, wait
// for a scrollend event. Otherwise, just do a rAF-based wait.
function waitForSnapEvent(event_target, event_type, scroll_happens = true) {
  return scroll_happens ? waitForEventUntil(event_target, event_type,
                                   waitForScrollendEventNoTimeout(event_target))
                        : waitForEventUntil(event_target, event_type,
                                   waitForAnimationFrames(2));
}

function waitForSnapChangedEvent(event_target, scroll_happens = true) {
  return waitForSnapEvent(event_target, "snapchanged", scroll_happens);
}

function getScrollbarToScrollerRatio(scroller) {
  // Ideally we'd subtract the length of the scrollbar thumb from
  // the dividend but there isn't currently a way to get the
  // scrollbar thumb length.
  return scroller.clientHeight /
      (scroller.scrollHeight - scroller.clientHeight);
}
