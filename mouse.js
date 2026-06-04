export function createMouseTracker(element) {
  const mouse = {
    x: 0,
    y: 0,
    event: null,
    isDown: false
  };

  function updatePosition(event) {
    const rect = element.getBoundingClientRect();

    mouse.x = event.clientX - rect.left;
    mouse.y = event.clientY - rect.top;
    mouse.event = event;
  }

  function onMouseMove(event) {
    updatePosition(event);
  }

  function onMouseDown(event) {
    mouse.isDown = true;
    updatePosition(event);
  }

  function onMouseUp(event) {
    mouse.isDown = false;
    updatePosition(event);
  }

  element.addEventListener("mousemove", onMouseMove);
  element.addEventListener("mousedown", onMouseDown);
  element.addEventListener("mouseup", onMouseUp);
  element.addEventListener("mouseleave", () => {
    mouse.isDown = false;
  });

  return mouse;
}