export function createCamera() {
  const state = {
    rotX: 0.25,
    rotY: 0.5,
    zoom: 1,
    panX: 0,
    panY: 0,
    width: 0,
    height: 0
  };

  return { state };
}
